from services.vector_db_service import VectorDBService
from langchain.text_splitter import RecursiveCharacterTextSplitter
from pypdf import PdfReader
import io
import asyncio
import re
from typing import List, Dict, Any, Optional, Union, Tuple, Set
from fastapi import HTTPException
from services.ai_service import AI_Service
from services.user_service import UserService
from utils.user_context import UserContext
import json
import logging
from models.dtos.material_dtos import (
    ProcessPdfResponse,
    GenerateQuizResponse,
    ChunkMetadata,
    QuizContent,
    QuizQuestion,
    QuizQuestionAdapter,
    DocumentMap,
    DocumentExercise,
    QuestionTypeExample,
)


# Stimulus length guidance is driven by the LLM's own
# `passage_word_count_estimate`. These constants only kick in when
# the estimate is missing or absurd, so we still produce a passage
# rather than a 50-word stub or a 3000-word essay.
_DEFAULT_PASSAGE_WORDS = 350
_MIN_PASSAGE_WORDS = 80
_MAX_PASSAGE_WORDS = 1200

# Exercise types that genuinely need a stimulus passage. Anything
# else (isolated grammar gap-fill, vocab MCQ on standalone sentences)
# skips Stage 2.
_STIMULUS_BEARING_TYPES = {
    "reading_comprehension",
    "listening_comprehension",
    "cloze_passage",
    "sentence_reordering",
}

# Verbatim-overlap settings. A stimulus that shares a 12-word
# contiguous chunk with the source PDF is almost certainly copy-paste
# masquerading as "new", so we retry once with a stronger anti-copy
# instruction. After the retry budget we accept whatever we have
# rather than fail the whole quiz.
_VERBATIM_NGRAM_SIZE = 12
_VERBATIM_RETRIES = 1


def _word_ngrams(text: str, n: int) -> Set[Tuple[str, ...]]:
    """Return the set of lowercase word n-grams in `text`. Punctuation
    and whitespace differences don't count — we tokenize on word
    characters only, so "Madrid." and "Madrid," produce the same
    token. This makes the verbatim check robust against trivial
    formatting changes the model uses to paper over copying."""
    words = re.findall(r"\w+", text.lower(), flags=re.UNICODE)
    if len(words) < n:
        return set()
    return {tuple(words[i : i + n]) for i in range(len(words) - n + 1)}


def _dedupe_preserve_order(options: List[Any]) -> List[str]:
    """Return options with case/whitespace-equal duplicates removed,
    keeping the first occurrence's exact casing/spelling. Used to
    sanitise MC option lists where the LLM occasionally produces a
    near-identical entry as a "distractor" that's actually the same
    string twice (visible bug: user picks dup, gets Correct! by
    accident).

    A duplicate is anything whose `.strip().lower()` matches one we
    already kept. NFKC-fold for unicode safety so e.g. "ё" vs
    composed "е + diaeresis" don't sneak past as distinct."""
    import unicodedata

    seen: set[str] = set()
    out: List[str] = []
    for raw in options:
        if not isinstance(raw, str):
            continue
        normalised = unicodedata.normalize("NFKC", raw).strip().lower()
        if not normalised or normalised in seen:
            continue
        seen.add(normalised)
        out.append(raw)
    return out


def _has_verbatim_overlap(
    candidate: str,
    source_chunks: List[str],
    n: int = _VERBATIM_NGRAM_SIZE,
) -> bool:
    """True if `candidate` shares any n-word contiguous slice with any
    of the source chunks. With n=12 this almost never fires on
    independently-written prose but reliably catches verbatim quotes."""
    cand_grams = _word_ngrams(candidate, n)
    if not cand_grams:
        return False
    for chunk in source_chunks:
        if cand_grams & _word_ngrams(chunk, n):
            return True
    return False

logger = logging.getLogger(__name__)

class MaterialService:
    def __init__(self, vector_db_service: VectorDBService, ai_service: AI_Service) -> None:
        self.vector_db_service = vector_db_service
        self.ai_service = ai_service
        self.user_service = UserService()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )

    async def process_pdf(self, file_content: bytes, filename: str, user_context: Optional[object] = None) -> ProcessPdfResponse:
        try:
            logger.info(f"Parsing PDF: {filename}")
            pdf_file = io.BytesIO(file_content)
            reader = PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"

            if not text.strip():
                from utils.error_codes import PDF_NO_TEXT, raise_with_code
                raise_with_code(
                    PDF_NO_TEXT,
                    400,
                    "No selectable text found. The PDF is likely a scan or has its text encoded with a custom font.",
                )

            # Detect garbled text from custom-font / encrypted-encoding PDFs.
                        # pypdf still 'extracts' something, but it comes out as
            # high-bit nonsense like '\x03URWRNRĄ\x03' that no LLM can
            # parse and that triggers Groq's json_validate_failed when
            # asked for a structured response. Cheap heuristic: count
            # the share of characters that aren't word characters,
            # whitespace, or basic punctuation. Above 30% means the
            # extraction is garbage.
            import re as _re
            non_text = sum(
                1 for c in text
                if not _re.match(r"[\w\s.,;:!?\"'()\[\]{}\-—–‑/\\]", c, _re.UNICODE)
            )
            non_text_share = non_text / max(len(text), 1)
            if non_text_share > 0.30:
                logger.warning(
                    "PDF text appears garbled (non-text share %.1f%%) for %s",
                    non_text_share * 100,
                    filename,
                )
                from utils.error_codes import PDF_GARBLED_TEXT, raise_with_code
                raise_with_code(
                    PDF_GARBLED_TEXT,
                    400,
                    "PDF text could not be read cleanly — likely a scan or custom embedded font.",
                )

            logger.info(f"Extracted {len(text)} characters from PDF.")

            chunks = self.text_splitter.split_text(text)
            logger.info(f"Split text into {len(chunks)} chunks.")
            
            metadatas = [ChunkMetadata(source=filename, chunk_index=i) for i in range(len(chunks))]
            logger.info("Saving chunks to Vector DB...")
            owner_id = (
                user_context.user_id
                if isinstance(user_context, UserContext)
                else None
            )
            self.vector_db_service.save_chunks(chunks, metadatas, user_id=owner_id)

            logger.info("Analyzing question types using AI...")
            total_chunks = len(chunks)
            if total_chunks <= 5:
                selected_chunks = chunks
            else:
                indices = [0, 1, 2, total_chunks // 2, total_chunks // 2 + 1, total_chunks - 1]
                selected_chunks = [chunks[i] for i in sorted(list(set(indices))) if i < total_chunks]
            
            analysis_context = "\n--CHUNK SEPARATOR--\n".join(selected_chunks)

            ui_lang = (
                getattr(user_context, "ui_locale_label", None) or "English"
            )
            # `example` and `passage_excerpt_for_style` stay verbatim
            # from the source — they're style anchors for the
            # generation step, not user-visible labels.
            type_locale_clause = (
                f"\n\nWrite the `type` and `document_kind` fields in {ui_lang}. "
                "Keep `example`, `passage_excerpt_for_style`, `passage_topic_hint`, "
                "and `grammar_focus` verbatim from the source — do not translate them."
            )

            prompt = f"""
            Analyze the following text segments from an educational document.
            Build a structured document map that drives downstream
            content generation. The map captures (a) what kind of
            document this is, (b) the genuinely distinct exercises
            present, and (c) for each exercise, the metadata a question
            generator needs: how long any stimulus passage was, what
            topic it covered, what subtypes of questions appeared.

            HARD RULES:
            - DO NOT propose exercises that aren't actually visible.
              An empty `exercises` list is acceptable if the document
              is prose only.
            - DO NOT pad with generic categories. "reading_comprehension"
              is only valid if there are actual questions tied to a
              passage; a passage alone is just text.
            - Merge near-duplicates: "Gap fill" and "Fill in the blank"
              are the same canonical type.
            - Ignore navigational / copyright / instructional boilerplate.
            - Every numeric estimate must be your honest best guess from
              what you can see; use null when you genuinely can't tell.

            CANONICAL TYPE NAMES (prefer these, but you may use another
            short snake_case name if none fits):
            - reading_comprehension
            - listening_comprehension
            - gap_fill_grammar
            - gap_fill_vocab
            - cloze_passage          (one connected text with multiple blanks)
            - multiple_choice
            - multi_select_mc        (≥2 correct answers)
            - true_false
            - matching               (pair items across two columns)
            - sentence_reordering
            - short_answer
            - essay
            - speaking_prompt

            CANONICAL QUESTION SUBTYPES (use them when applicable):
            - reading/listening: main_idea, detail, inference,
              vocab_in_context, negative_fact, purpose,
              sentence_simplification, prose_summary, attitude
            - grammar: tense, article, preposition, conditional,
              modal, passive, reported_speech, word_order
            - vocabulary: synonym, definition, collocation,
              phrasal_verb, idiom

            PASSAGE LENGTH GUIDANCE (use these reference points when
            estimating `passage_word_count_estimate`, but trust your
            own count of the actual passage in front of you):
            - TOEFL Reading: ~700 words.
            - IELTS Academic Reading: 700-900 words.
            - Cambridge B2 First reading: 350-450 words.
            - Cambridge C1 Advanced reading: 500-700 words.
            - Murphy / Headway grammar exercises: usually no passage
              (set to null) or short 100-200 word context.
            - Standalone gap-fill or MCQ on isolated sentences: null.

            Set `passage_word_count_estimate` to null when the exercise
            doesn't have a connected stimulus passage.

            For each exercise, also extract:
            - `example`: ONE short verbatim quote (≤ 200 chars) of an
              actual question or item, or "" if you can't quote one.
            - `passage_excerpt_for_style`: ONE verbatim 100-200 char
              chunk of the passage itself (NOT the questions) so a
              downstream generator can match register and tone. Leave
              "" or null when no passage exists.
            - `passage_topic_hint`: 3-8 word topic of the passage,
              verbatim or paraphrased, e.g. "evolution of bird flight"
              or "renewable energy in Germany". Null when no passage.
            - `question_count`: integer number of questions in this
              exercise as you see them, or null if unclear.
            - `question_subtypes`: list of canonical subtypes from the
              catalog above, only the ones you actually see.
            - `grammar_focus`: list of specific grammar/vocabulary
              targets being drilled, e.g. ["past perfect", "third
              conditional"]; empty list if not applicable.

            Set `document_kind` to one of: "TOEFL_Reading",
            "TOEFL_Listening", "IELTS_Reading", "IELTS_Listening",
            "Cambridge_FCE", "Cambridge_CAE", "Cambridge_CPE",
            "Murphy_Grammar", "Coursebook_Mixed", "Vocabulary_List",
            "Mixed", or another short tag if none fit.

            Return strictly valid JSON with this exact shape:
            {{
              "document_kind": "<one of the tags above>",
              "exercises": [
                {{
                  "type": "<canonical type>",
                  "passage_word_count_estimate": <int or null>,
                  "passage_topic_hint": "<3-8 word topic or null>",
                  "passage_excerpt_for_style": "<verbatim 100-200 char passage chunk or null>",
                  "question_count": <int or null>,
                  "question_subtypes": ["<canonical subtype>", ...],
                  "grammar_focus": ["<focus>", ...],
                  "example": "<verbatim ≤200 char example or empty string>"
                }}
              ]
            }}{type_locale_clause}

            Text Segments:
            {analysis_context}
            """

            try:
                response_json_str = await self.ai_service.get_ai_response(
                    prompt=prompt,
                    response_format={"type": "json_object"},
                    system_prompt="You are an expert pedagogue analyzing educational materials.",
                    user_context=user_context
                )
            except HTTPException as exc:
                # Groq sometimes returns 400 json_validate_failed on borderline
                # PDFs (the prompt produces a string with characters that
                # don't pass strict JSON validation, e.g. unescaped Unicode
                # control characters). Retry once WITHOUT strict mode and
                # parse loosely; if that still fails, surface a friendly
                # message instead of bubbling a raw 502.
                if exc.status_code in (400, 502):
                    logger.warning(
                        "Strict JSON mode failed on type analysis (%s); "
                        "retrying without response_format.",
                        exc.detail,
                    )
                    try:
                        response_json_str = await self.ai_service.get_ai_response(
                            prompt=prompt + "\n\nIMPORTANT: Respond with raw JSON only, no markdown fences.",
                            response_format=None,
                            system_prompt="You are an expert pedagogue analyzing educational materials.",
                            user_context=user_context,
                        )
                    except HTTPException:
                        from utils.error_codes import PDF_AI_REJECTED, raise_with_code
                        raise_with_code(
                            PDF_AI_REJECTED,
                            422,
                            "The AI couldn't produce a valid analysis from this PDF.",
                        )
                else:
                    raise

            document_map: Optional[DocumentMap] = None
            analyzed_types: Union[List[Dict[str, Any]], List[Any]] = []

            try:
                # Tolerate models that wrap JSON in ``` fences when strict mode is off.
                cleaned = response_json_str.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.strip("`")
                    cleaned = cleaned.lstrip("json").strip()
                analyzed_data = json.loads(cleaned)

                # New shape: {document_kind, exercises: [...]}.
                # Old shape (still tolerated as fallback): {types: [...]}.
                if isinstance(analyzed_data, dict) and "exercises" in analyzed_data:
                    try:
                        document_map = DocumentMap.model_validate(analyzed_data)
                    except Exception as parse_err:
                        # Pydantic validation may reject if a model
                        # returned `null` for a list field or used a
                        # non-string `type`. Coerce loosely and retry
                        # — better to surface a partial map than to
                        # drop everything.
                        logger.warning(
                            "Strict DocumentMap validation failed (%s); falling back to loose parse.",
                            parse_err,
                        )
                        loose_exercises: List[DocumentExercise] = []
                        for raw in analyzed_data.get("exercises") or []:
                            if not isinstance(raw, dict):
                                continue
                            try:
                                loose_exercises.append(
                                    DocumentExercise(
                                        type=str(raw.get("type") or "other"),
                                        passage_word_count_estimate=raw.get(
                                            "passage_word_count_estimate"
                                        ),
                                        passage_topic_hint=raw.get("passage_topic_hint"),
                                        passage_excerpt_for_style=raw.get(
                                            "passage_excerpt_for_style"
                                        ),
                                        question_count=raw.get("question_count"),
                                        question_subtypes=list(
                                            raw.get("question_subtypes") or []
                                        ),
                                        grammar_focus=list(raw.get("grammar_focus") or []),
                                        example=str(raw.get("example") or ""),
                                    )
                                )
                            except Exception:
                                continue
                        document_map = DocumentMap(
                            document_kind=str(
                                analyzed_data.get("document_kind") or "Mixed"
                            ),
                            exercises=loose_exercises,
                        )

                    # Derive the legacy `analyzed_types` view from
                    # exercises so existing frontend chip rendering
                    # keeps working until it's migrated to the rich map.
                    analyzed_types = [
                        QuestionTypeExample(
                            type=ex.type,
                            example=ex.example,
                        ).model_dump()
                        for ex in document_map.exercises
                    ]
                elif isinstance(analyzed_data, dict):
                    analyzed_types = analyzed_data.get("types", [])
                elif isinstance(analyzed_data, list):
                    analyzed_types = analyzed_data
                else:
                    analyzed_types = []

                logger.info(
                    "AI document map: kind=%s, exercises=%d, legacy_types=%d",
                    document_map.document_kind if document_map else "none",
                    len(document_map.exercises) if document_map else 0,
                    len(analyzed_types) if isinstance(analyzed_types, list) else 0,
                )
            except Exception as e:
                logger.error(f"Failed to parse AI response for document map: {e}")
                analyzed_types = []
                document_map = None

            return ProcessPdfResponse(
                filename=filename,
                chunks_count=len(chunks),
                status="success",
                analyzed_types=analyzed_types,
                document_map=document_map,
            )

        except Exception as e:
            logger.error(f"Error processing PDF: {e}")
            raise e

    async def generate_quiz(
        self,
        selected_types: Optional[List[str]] = None,
        user_context: Optional[object] = None,
        target_language: Optional[str] = None,
        document_map: Optional[DocumentMap] = None,
    ) -> GenerateQuizResponse:
        """Multi-stage quiz generation.

        Stage 1 — derive (or accept) a DocumentMap describing what's in
        the user's material.
        Stage 2 — for every exercise that needs a stimulus passage,
        generate a NEW passage of the right length and topic, NOT a
        copy of the source.
        Stage 3 — generate questions tied to that fresh stimulus, using
        the exercise's question_subtypes catalog.

        Stages 2+3 fan out per-exercise via asyncio.gather so a 4-exercise
        document doesn't pay 4× sequential latency.
        """
        try:
            logger.info(
                "Generating quiz. selected_types=%s, has_doc_map=%s, target_lang=%s",
                selected_types,
                document_map is not None,
                target_language,
            )
            owner_id = (
                user_context.user_id
                if isinstance(user_context, UserContext)
                else None
            )

            # Stage 1: get a DocumentMap. Trust the one the caller
            # passed in if they did; otherwise re-derive it from a
            # representative slice of the indexed material so we
            # don't lose continuity when the FE doesn't round-trip
            # the map.
            if document_map is None or not document_map.exercises:
                document_map = await self._classify_indexed_material(
                    user_context=user_context,
                    owner_id=owner_id,
                )

            if document_map is None or not document_map.exercises:
                logger.warning("No exercises derivable from indexed material.")
                return GenerateQuizResponse(
                    quiz="No relevant material found to generate tasks.",
                )

            # Filter exercises by user's chip selection. The FE sends
            # the exact strings it displayed, which match
            # `exercise.type` verbatim (case-insensitive guard for
            # safety).
            exercises = self._filter_exercises(
                document_map.exercises, selected_types
            )
            if not exercises:
                logger.warning(
                    "No exercises matched selected_types=%s; falling back to full map.",
                    selected_types,
                )
                exercises = document_map.exercises

            ui_lang = (
                getattr(user_context, "ui_locale_label", None) or "English"
            )

            # Stages 2+3 for every exercise, in parallel.
            per_exercise_results = await asyncio.gather(
                *(
                    self._build_questions_for_exercise(
                        exercise=ex,
                        owner_id=owner_id,
                        ui_lang=ui_lang,
                        target_language=target_language,
                        user_context=user_context,
                    )
                    for ex in exercises
                ),
                return_exceptions=True,
            )

            all_questions: List[QuizQuestion] = []
            for ex, result in zip(exercises, per_exercise_results):
                if isinstance(result, Exception):
                    logger.warning(
                        "Question pipeline failed for exercise type=%s: %s",
                        ex.type,
                        result,
                    )
                    continue
                all_questions.extend(result)

            if not all_questions:
                logger.warning("Quiz generation produced zero questions.")
                return GenerateQuizResponse(
                    quiz="No relevant material found to generate tasks.",
                )

            quiz_content = QuizContent(questions=all_questions)

            if user_context and isinstance(user_context, UserContext):
                await self.user_service.log_task_history(
                    user_context,
                    {
                        "taskType": "materials",
                        "title": "Materials quiz",
                        "score": None,
                        "language": None,
                        "metadata": {
                            "questionCount": len(quiz_content.questions or []),
                            "selectedTypes": selected_types or [],
                            "documentKind": document_map.document_kind,
                            "exerciseTypes": [ex.type for ex in exercises],
                        },
                    },
                )
            return GenerateQuizResponse(quiz=quiz_content)

        except Exception as e:
            logger.error(f"Error generating tasks: {e}", exc_info=True)
            raise e

    @staticmethod
    def _filter_exercises(
        exercises: List[DocumentExercise],
        selected_types: Optional[List[str]],
    ) -> List[DocumentExercise]:
        if not selected_types:
            return exercises
        wanted = {t.strip().lower() for t in selected_types if t and t.strip()}
        return [ex for ex in exercises if ex.type.strip().lower() in wanted]

    async def _classify_indexed_material(
        self,
        user_context: Optional[object],
        owner_id: Optional[str],
    ) -> Optional[DocumentMap]:
        """Stage 1 fallback when caller didn't round-trip the map.

        Pulls a topic-agnostic spread of chunks (instead of biasing
        toward "questions tasks" like the old retrieval did), feeds
        them to the same classification prompt as process_pdf, and
        returns the resulting DocumentMap. Best-effort: returns None
        if classification fails.
        """
        # A neutral query so the spread covers passages and exercises
        # alike; the old "exercises questions tasks" query starved
        # reading passages from the retrieved set.
        relevant_docs = self.vector_db_service.search_materials(
            "passage paragraph exercise question task",
            limit=12,
            user_id=owner_id,
        )
        if not relevant_docs:
            return None

        analysis_context = "\n--CHUNK SEPARATOR--\n".join(
            str(doc.text) for doc in relevant_docs
        )
        ui_lang = (
            getattr(user_context, "ui_locale_label", None) or "English"
        )
        # Reuse the exact same instruction set as process_pdf — the
        # only difference is `analysis_context` is sourced from the
        # vector DB rather than the freshly-parsed PDF chunks.
        prompt = self._build_classification_prompt(
            analysis_context=analysis_context, ui_lang=ui_lang
        )
        try:
            response_json_str = await self.ai_service.get_ai_response(
                prompt=prompt,
                response_format={"type": "json_object"},
                system_prompt="You are an expert pedagogue analyzing educational materials.",
                user_context=user_context,
            )
        except HTTPException as exc:
            logger.warning("Re-classification fell over (%s); skipping.", exc.detail)
            return None

        try:
            cleaned = response_json_str.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.strip("`").lstrip("json").strip()
            parsed = json.loads(cleaned)
            if isinstance(parsed, dict) and "exercises" in parsed:
                return DocumentMap.model_validate(parsed)
        except Exception as e:
            logger.warning("Re-classification JSON parse failed: %s", e)
        return None

    @staticmethod
    def _build_classification_prompt(analysis_context: str, ui_lang: str) -> str:
        # Mirror the prompt used by process_pdf so re-classification
        # produces the same shape. Kept as a static helper to avoid
        # duplicating the long instruction block.
        type_locale_clause = (
            f"\n\nWrite the `type` and `document_kind` fields in {ui_lang}. "
            "Keep `example`, `passage_excerpt_for_style`, `passage_topic_hint`, "
            "and `grammar_focus` verbatim from the source — do not translate them."
        )
        return f"""
        Analyze the following text segments from an educational document.
        Build a structured document map with `document_kind` and a list
        of `exercises`. For each exercise, estimate
        passage_word_count_estimate (or null), passage_topic_hint,
        passage_excerpt_for_style (verbatim 100-200 chars), question_count,
        question_subtypes (canonical), grammar_focus, and a short example.

        Type catalog: reading_comprehension, listening_comprehension,
        gap_fill_grammar, gap_fill_vocab, cloze_passage, multiple_choice,
        multi_select_mc, true_false, matching, sentence_reordering,
        short_answer, essay, speaking_prompt.

        Length guidance: TOEFL Reading ~700 words, IELTS Reading 700-900,
        FCE 350-450, CAE 500-700, Murphy null or 100-200.

        Return strictly valid JSON: {{"document_kind": "...", "exercises": [...]}}.
        {type_locale_clause}

        Text Segments:
        {analysis_context}
        """

    async def generate_standalone_task(
        self,
        task_type: str,
        language: str,
        level: str,
        user_context: Optional[object] = None,
        focus_keywords: Optional[List[str]] = None,
        topic: Optional[str] = None,
    ) -> Optional[QuizQuestion]:
        """Generate a SINGLE question of the requested type, no PDF
        context. Used by the /writing/typed-task endpoint to power
        the Quiz route — same renderer dispatcher and discriminated
        union the Materials surface uses, just standalone.

        Builds a synthetic DocumentExercise tagged with the requested
        type (and the optional adaptive topic / keywords), runs it
        through the same Stage 2 + Stage 3 pipeline, and returns the
        first parsed question. Returns None on a complete miss so
        callers can surface a friendly error.
        """
        ui_lang = (
            getattr(user_context, "ui_locale_label", None) or "English"
        )
        owner_id = (
            user_context.user_id
            if isinstance(user_context, UserContext)
            else None
        )
        # Build subtypes from the type itself so the prompt has
        # something to anchor on. Cloze passages need a stimulus
        # (the picker triggers Stage 2 automatically); MC/FIB/T-F
        # are self-contained.
        exercise = DocumentExercise(
            type=task_type,
            passage_word_count_estimate=200 if task_type == "cloze_passage" else None,
            passage_topic_hint=topic,
            question_count=1,
            question_subtypes=[],
            grammar_focus=focus_keywords or [],
        )
        questions = await self._build_questions_for_exercise(
            exercise=exercise,
            owner_id=owner_id,
            ui_lang=ui_lang,
            target_language=language,
            user_context=user_context,
        )
        if not questions:
            return None
        return questions[0]

    async def _build_questions_for_exercise(
        self,
        exercise: DocumentExercise,
        owner_id: Optional[str],
        ui_lang: str,
        target_language: Optional[str],
        user_context: Optional[object],
    ) -> List[QuizQuestion]:
        """Stage 2 + Stage 3 for one exercise.

        For exercises that have a stimulus (reading/listening/cloze),
        generate the passage first, then ask Stage 3 to write questions
        about that passage. For everything else (isolated grammar/vocab
        gap-fill, standalone MCQ), Stage 2 is skipped and Stage 3
        generates self-contained questions.
        """
        stimulus: Optional[str] = None
        if self._needs_stimulus(exercise):
            try:
                stimulus = await self._generate_stimulus(
                    exercise=exercise,
                    owner_id=owner_id,
                    target_language=target_language,
                    user_context=user_context,
                )
            except Exception as e:
                logger.warning(
                    "Stimulus generation failed for type=%s: %s — falling back to no-passage flow.",
                    exercise.type,
                    e,
                )

        return await self._generate_questions(
            exercise=exercise,
            stimulus=stimulus,
            ui_lang=ui_lang,
            target_language=target_language,
            user_context=user_context,
        )

    @staticmethod
    def _needs_stimulus(exercise: DocumentExercise) -> bool:
        # An exercise needs Stage 2 if its type implies a passage OR if
        # the LLM gave us a non-trivial passage_word_count_estimate.
        # Either signal is sufficient — sometimes the LLM tags a passage
        # with a fuzzy type but still estimates length; sometimes the
        # type is canonical but estimate is null.
        if exercise.type.strip().lower() in _STIMULUS_BEARING_TYPES:
            return True
        wc = exercise.passage_word_count_estimate
        return isinstance(wc, int) and wc >= _MIN_PASSAGE_WORDS

    @staticmethod
    def _clamp_word_count(estimate: Optional[int]) -> int:
        if not isinstance(estimate, int) or estimate <= 0:
            return _DEFAULT_PASSAGE_WORDS
        return max(_MIN_PASSAGE_WORDS, min(_MAX_PASSAGE_WORDS, estimate))

    async def _generate_stimulus(
        self,
        exercise: DocumentExercise,
        owner_id: Optional[str],
        target_language: Optional[str],
        user_context: Optional[object],
    ) -> str:
        """Stage 2: write a NEW passage matching the exercise's
        topic, length and register. Verbatim-checked against the
        retrieved source chunks — if the model copy-pastes a 12-word
        contiguous span, we retry once with a sharper warning before
        accepting whatever comes back."""
        word_count = self._clamp_word_count(exercise.passage_word_count_estimate)
        topic_hint = (exercise.passage_topic_hint or "").strip()
        style_excerpt = (exercise.passage_excerpt_for_style or "").strip()

        # Pull a few topic-anchored chunks for thematic flavor; the
        # generator is told NOT to copy them, only to match register.
        # We also hand these chunks to the verbatim-check so the
        # comparison set matches what the model actually saw.
        topic_query = topic_hint or exercise.type.replace("_", " ")
        topic_chunks = self.vector_db_service.search_materials(
            topic_query,
            limit=4,
            user_id=owner_id,
        )
        topic_anchor_texts = [str(d.text) for d in topic_chunks]
        topic_anchor = "\n\n".join(topic_anchor_texts)[:2400]
        # The style excerpt is also a piece of source text the model
        # saw — include it in the anti-copy comparison set so a model
        # that "matches style" by pasting the sample gets caught.
        comparison_corpus = topic_anchor_texts + (
            [style_excerpt] if style_excerpt else []
        )

        lang_clause = (
            f"Write the passage in {target_language}."
            if target_language
            else "Write the passage in the same language as the source document."
        )
        register_clause = (
            f"Match the register and tone of this verbatim style sample:\n"
            f'---STYLE SAMPLE---\n"{style_excerpt}"\n---END SAMPLE---'
            if style_excerpt
            else "Use a register appropriate to the exercise type and learner level."
        )
        flavor_clause = (
            f"\n\nThematic anchor (chunks from the source document — for topic context only, "
            f"do NOT copy any sentence verbatim):\n{topic_anchor}"
            if topic_anchor
            else ""
        )

        base_prompt = f"""
        You are writing a NEW practice passage for a language learner.
        This passage will be used as the stimulus for an exercise of
        type "{exercise.type}".

        Topic: {topic_hint or "appropriate to the exercise type"}.
        Length: about {word_count} words. Stay within ±15%.
        {lang_clause}

        {register_clause}

        Output JSON only: {{"passage": "<the passage>"}}.

        HARD RULES:
        - Do NOT copy any sentence from the style sample or the
          thematic anchor verbatim. Match style, not wording.
        - Do NOT include questions, headings, instructions, or
          numbering — passage prose only.
        - Coherent paragraphs. For reading_comprehension, multiple
          paragraphs with logical progression. For listening_comprehension,
          natural spoken register that reads aloud well.
        {flavor_clause}
        """

        passage = ""
        attempt_prompt = base_prompt
        for attempt in range(_VERBATIM_RETRIES + 1):
            response_json_str = await self.ai_service.get_ai_response(
                prompt=attempt_prompt,
                response_format={"type": "json_object"},
                system_prompt="You are an expert language-content author.",
                user_context=user_context,
            )
            cleaned = response_json_str.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.strip("`").lstrip("json").strip()
            parsed = json.loads(cleaned)
            candidate = str(parsed.get("passage", "")).strip()
            if not candidate:
                raise ValueError("Stimulus generation returned empty passage")

            if not _has_verbatim_overlap(candidate, comparison_corpus):
                passage = candidate
                break

            logger.warning(
                "Verbatim-overlap detected on attempt %d for type=%s; retrying with sharper warning.",
                attempt + 1,
                exercise.type,
            )
            # On retry, prepend an explicit warning. We don't echo the
            # offending span back at the model — that just gives it
            # ideas about what it can and can't say. We just demand
            # a from-scratch rewrite.
            attempt_prompt = (
                "PREVIOUS ATTEMPT WAS REJECTED: the passage you produced "
                "contained a verbatim phrase from the source document. "
                "Rewrite from scratch. Do NOT reuse any phrase of 12+ words "
                "found in the source.\n\n" + base_prompt
            )
            passage = candidate  # keep last attempt as fallback after budget

        return passage

    # Question types each exercise type may produce. The Stage 3
    # prompt tells the model which to pick from; the parser then
    # routes each item to the right discriminated-union variant.
    _ALLOWED_QUESTION_TYPES: Dict[str, List[str]] = {
        "reading_comprehension": [
            "multiple_choice",
            "multi_select_mc",
            "true_false",
            "fill_in_the_blank",
            "open",
        ],
        "listening_comprehension": [
            "multiple_choice",
            "true_false",
            "fill_in_the_blank",
            "open",
        ],
        "gap_fill_grammar": ["fill_in_the_blank"],
        "gap_fill_vocab": ["fill_in_the_blank"],
        "cloze_passage": ["cloze_passage"],
        "matching": ["matching"],
        "multiple_choice": ["multiple_choice"],
        "multi_select_mc": ["multi_select_mc"],
        "true_false": ["true_false"],
        "short_answer": ["open"],
        "essay": ["open"],
    }

    @classmethod
    def _allowed_question_types(cls, exercise_type: str) -> List[str]:
        # Default allow-list when the exercise type is something the
        # taxonomy doesn't recognise — safest is to let the model pick
        # any of the broadly-applicable variants.
        return cls._ALLOWED_QUESTION_TYPES.get(
            exercise_type.strip().lower(),
            ["multiple_choice", "true_false", "fill_in_the_blank", "open"],
        )

    async def _generate_questions(
        self,
        exercise: DocumentExercise,
        stimulus: Optional[str],
        ui_lang: str,
        target_language: Optional[str],
        user_context: Optional[object],
    ) -> List[QuizQuestion]:
        """Stage 3: write questions for one exercise.

        If `stimulus` is provided, every question is anchored to it
        and `context_text` carries the passage. If not, the generator
        creates self-contained items (typical for grammar gap-fill,
        standalone MCQ, etc.).

        Items are parsed through QuizQuestionAdapter, which routes
        each item to the right discriminated-union variant based on
        its `type` field.
        """
        question_count = exercise.question_count or 4
        question_count = max(2, min(question_count, 8))
        subtypes_clause = (
            f"Cover these question subtypes (use them as a checklist, "
            f"not a quota): {', '.join(exercise.question_subtypes)}."
            if exercise.question_subtypes
            else "Vary the angle of questioning so the set tests the learner broadly."
        )
        grammar_clause = (
            f"Drill these grammar/vocabulary targets specifically: "
            f"{', '.join(exercise.grammar_focus)}."
            if exercise.grammar_focus
            else ""
        )
        target_lang_clause = (
            f"Write all human-readable text fields (`question`, `options`, "
            f"`correct_answer`, `context_text`, `pairs.left`, `pairs.right`, "
            f"`passage_with_blanks`, blank answers) in {target_language}."
            if target_language
            else "Match the language of the source material for all human-readable fields."
        )
        passage_block = (
            f"\n\nPASSAGE (every question MUST be answerable from this passage and only this passage):\n"
            f'"""\n{stimulus}\n"""\n'
            if stimulus
            else "\n\nThis exercise has no passage stimulus — generate self-contained items.\n"
        )
        context_clause = (
            "Set `context_text` to the passage above, copied verbatim, for every question."
            if stimulus
            else "Set `context_text` to null."
        )

        allowed = self._allowed_question_types(exercise.type)
        type_catalog = ", ".join(f'"{t}"' for t in allowed)

        # Schemas inlined per type so the model knows exactly which
        # fields to emit. We only show schemas for the allowed types
        # to keep the prompt focused.
        per_type_schemas = []
        if "multiple_choice" in allowed:
            per_type_schemas.append(
                'multiple_choice: {"type":"multiple_choice","question":"...",'
                '"options":["A","B","C","D"],"correct_answer":"<one of options>",'
                '"context_text":...}'
            )
        if "multi_select_mc" in allowed:
            per_type_schemas.append(
                'multi_select_mc: {"type":"multi_select_mc","question":"...",'
                '"options":["A","B","C","D","E"],"correct_answers":'
                '["<option>","<option>"],"context_text":...} '
                '— correct_answers MUST contain ≥2 items.'
            )
        if "true_false" in allowed:
            per_type_schemas.append(
                'true_false: {"type":"true_false","question":"<a statement>",'
                '"correct_answer":"true" | "false","context_text":...}'
            )
        if "fill_in_the_blank" in allowed:
            per_type_schemas.append(
                'fill_in_the_blank: {"type":"fill_in_the_blank",'
                '"question":"... ___ ...","options":[],'
                '"correct_answer":"<word>" or ["<variant1>","<variant2>"],'
                '"context_text":...}'
            )
        if "open" in allowed:
            per_type_schemas.append(
                'open: {"type":"open","question":"...","options":[],'
                '"correct_answer":"<reference answer>","context_text":...}'
            )
        if "matching" in allowed:
            per_type_schemas.append(
                'matching: {"type":"matching","question":"<instruction>",'
                '"pairs":[{"left":"...","right":"..."},{"left":"...","right":"..."}],'
                '"context_text":...} '
                '— supply 4-6 pairs; "right" is the canonical correct match.'
            )
        if "cloze_passage" in allowed:
            per_type_schemas.append(
                'cloze_passage: {"type":"cloze_passage","question":"<instruction>",'
                '"passage_with_blanks":"... {{1}} ... {{2}} ...",'
                '"blanks":[{"id":"1","correct_answer":"<word>"},'
                '{"id":"2","correct_answer":["<variant1>","<variant2>"]}],'
                '"context_text":null}'
            )
        schema_block = "\n  - ".join(per_type_schemas)

        prompt = f"""
        You are an expert language teacher writing questions for an
        exercise of type "{exercise.type}". Write the `type` field in
        UI-{ui_lang} only when none of the canonical English values
        below applies; otherwise keep the canonical English token so
        the frontend can route the renderer.

        Generate {question_count} questions.
        {subtypes_clause}
        {grammar_clause}

        Allowed question `type` values for this exercise: [{type_catalog}].

        {passage_block}

        Output strictly valid JSON: {{"questions": [...]}}. Each item
        follows ONE of these shapes — pick whichever fits the question
        you're writing:
          - {schema_block}

        Locale rules:
        - {target_lang_clause}

        HARD RULES:
        - Do NOT copy questions from the source document. Originality
          per item is required.
        - For passage-based items, the answer must be derivable
          purely from the passage above.
        - {context_clause}
        - For multi_select_mc, `correct_answers` MUST list ≥2 of the options verbatim.
        - For true_false, `correct_answer` MUST be the lowercase string "true" or "false".
        - For matching, every `right` value must be the correct counterpart of its `left`.
        - For multiple_choice and multi_select_mc, the `options` list
          MUST contain pairwise-distinct strings. Two identical
          entries (or strings that differ only by an accent / case /
          trailing whitespace) are forbidden — that's a rendering
          bug, not a learning signal.
        - For matching, every `left` value must be unique and every
          `right` value must be unique.
        """
        response_json_str = await self.ai_service.get_ai_response(
            prompt=prompt,
            response_format={"type": "json_object"},
            system_prompt="You are an expert teacher creating practice questions.",
            user_context=user_context,
        )
        cleaned = response_json_str.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`").lstrip("json").strip()
        parsed = json.loads(cleaned)
        raw_questions = parsed.get("questions") or []

        out: List[QuizQuestion] = []
        for raw in raw_questions:
            if not isinstance(raw, dict):
                continue
            # Inject the stimulus into context_text when the model
            # forgot to and a stimulus exists. This keeps the wire
            # contract consistent for the frontend.
            if stimulus and not raw.get("context_text"):
                raw["context_text"] = stimulus
            # Dedupe options before validation. Models occasionally
            # produce e.g. ["диагностировать", "диагнозировать",
            # "диагностицировать", "диагностировать"] — two of those
            # are byte-identical and the user picks one of them and
            # gets "Correct!" without learning anything. Strip
            # adjacent-equal-after-trim duplicates before we hand the
            # question to the FE; if dedup leaves <2 options, drop
            # the whole item rather than render a broken question.
            if raw.get("type") in ("multiple_choice", "multi_select_mc"):
                deduped = _dedupe_preserve_order(raw.get("options") or [])
                if len(deduped) < 2:
                    logger.warning(
                        "Dropping %s question — too few distinct options after dedupe (%s)",
                        raw.get("type"),
                        raw.get("options"),
                    )
                    continue
                raw["options"] = deduped
                # multi_select_mc keeps `correct_answers` (plural).
                # multiple_choice picks ONE — verify the canonical
                # answer is still in the deduped option set; if it
                # was the dropped duplicate, we have to fail
                # gracefully instead of returning an unanswerable item.
                if raw.get("type") == "multiple_choice":
                    ca = str(raw.get("correct_answer") or "").strip().lower()
                    options_normalized = [
                        str(o).strip().lower() for o in raw["options"]
                    ]
                    if ca and ca not in options_normalized:
                        logger.warning(
                            "Dropping multiple_choice — correct_answer %r vanished after option dedupe",
                            raw.get("correct_answer"),
                        )
                        continue
            elif raw.get("type") == "matching":
                # Matching bug variant: identical lefts or identical
                # rights. The renderer pairs by `left` so dup lefts
                # silently overwrite each other. Drop the item.
                pairs = raw.get("pairs") or []
                lefts = [str(p.get("left") or "").strip() for p in pairs]
                rights = [str(p.get("right") or "").strip() for p in pairs]
                if len(set(lefts)) != len(lefts) or len(set(rights)) != len(rights):
                    logger.warning(
                        "Dropping matching question — duplicate left/right values"
                    )
                    continue
            try:
                out.append(QuizQuestionAdapter.validate_python(raw))
            except Exception as item_err:
                logger.debug(
                    "Skipping malformed question item (type=%s): %s",
                    raw.get("type"),
                    item_err,
                )
                continue
        return out
