from typing import Dict, Any, Optional


def _ui_lang_clause(ui_locale_label: Optional[str], fields: list[str]) -> str:
    """Build a 'write the following fields in <UI language>' clause.

    Empty / English UI returns no clause so the prompt stays unchanged for the
    default case. Anything else gets a strict instruction listing which JSON
    keys must be in the UI language.
    """
    if not ui_locale_label or ui_locale_label.strip().lower() == "english":
        return ""
    field_list = ", ".join(f"`{f}`" for f in fields)
    return (
        f"\n\nLOCALIZATION (HARD RULE):\n"
        f"        - Write these fields in {ui_locale_label}: {field_list}.\n"
        f"        - All other fields stay in the target practice language.\n"
        f"        - Do not translate proper nouns, code, or quoted target-language text inside those fields."
    )


def writing_fill_in_the_blank_task_prompt(
    language: str,
    level: str,
    level_context: Dict[str, str],
    topic: str | None = None,
    keywords: list[str] | None = None,
    seed: str | None = None,
    ui_locale_label: Optional[str] = None,
) -> str:
    lesson_hint = ""
    if topic or keywords:
        lesson_hint = f"""
        LESSON CONTEXT (MANDATORY — your task MUST use this):
        - Topic: {topic or 'General'}
        - Key words / phrases to test: {', '.join(keywords) if keywords else 'any relevant to the topic'}
        The missing word in the blank MUST be one of the key words or phrases listed above.
        """
    # The little gloss in parens after the blank is a learner aid, NOT a
    # label — it should appear in the user's UI language so a Polish UI
    # learner studying Russian sees "(iść)" rather than "(go)".
    gloss_lang = (
        ui_locale_label if ui_locale_label and ui_locale_label.strip() else "English"
    )
    seed_letter = (seed or "x")[0].lower() if seed else None
    seed_constraint = (
        f"\n        - HARD CONSTRAINT FROM SEED: the first content word of the sentence "
        f"must start with the letter '{seed_letter}' (case-insensitive). "
        "This is a forced-randomness lever — do not ignore it."
        if seed_letter and seed_letter.isalpha()
        else ""
    )
    return f"""
        Generate a **fill-in-the-blank task** for language learners in {language} at {level} level.
        FOLLOW STRICTLY ALL THE GUIDELINES BELOW.

        Level proficiency description:
        {level_context}
        {lesson_hint}
        RANDOMNESS SEED: {seed or 'None'}{seed_constraint}
        *GUIDELINES:*
        1. Write one sentence in {language}. The sentence must test a key skill for {level} —
           grammar, vocabulary, or sentence structure.
        2. Choose ONE word or phrase that is genuinely characteristic of {language} at {level}.
           Remove it; leave a blank ("____") in its place.
        3. The blank must have **one canonical correct answer**. If equally-correct synonyms
           exist (e.g. perfective/imperfective pairs that both fit), return them all in
           `correctAnswer` as an array.
        4. Avoid ambiguity from the surrounding context: the rest of the sentence must
           uniquely determine the form (number, gender, tense, aspect…).
        5. After the blank, include a glossary hint in parentheses translating the
           missing word into {gloss_lang}, e.g. (go) for English UI, (iść) for Polish UI,
           (ir) for Spanish UI.
        6. Use everyday contexts relevant to the level (greetings, work, routines, food…).
           Don't reuse the example from the level context verbatim.
        7. Do not include any instructions inside the question — just the sentence.

        Return JSON only:
        {{
            "question": "The sentence with ____ ({gloss_lang.upper()} GLOSS), no instructions",
            "correctAnswer": ["primary form", "acceptable variant", ...]
        }}

        Examples (English UI):
        - Vocabulary: "Я ____ в парк каждый день. (go)"
        - Grammar:    "Она ____ в течение трех часов. (has been studying)"
        """


def writing_multiple_choice_task_prompt(
    language: str,
    level: str,
    level_context: Dict[str, str],
    topic: str | None = None,
    keywords: list[str] | None = None,
    seed: str | None = None,
    ui_locale_label: Optional[str] = None,
) -> str:
    lesson_hint = ""
    if topic or keywords:
        lesson_hint = f"""
        LESSON CONTEXT (MANDATORY — your task MUST use this):
        - Topic: {topic or 'General'}
        - Key words / phrases to include or test: {', '.join(keywords) if keywords else 'any relevant to the topic'}
        Build the sentence and options around the above words/phrases.
        """
    seed_letter = (seed or "x")[0].lower() if seed else None
    seed_constraint = (
        f"\n        - HARD CONSTRAINT FROM SEED: the first content word of the sentence "
        f"must start with the letter '{seed_letter}' (case-insensitive)."
        if seed_letter and seed_letter.isalpha()
        else ""
    )
    return f"""
        Generate a language learning task in {language} at {level} level. FOLLOW STRICTLY ALL THE GUIDELINES BELOW.

        Level proficiency description:
        {level_context}
        {lesson_hint}
        RANDOMNESS SEED: {seed or 'None'}{seed_constraint}
        *GUIDELINES:*
        1. The task is a SINGLE sentence with ONE clear objective — grammar OR vocabulary.
        2. Provide exactly 4 options: the correct one and 3 plausible distractors. Distractors
           must be wrong for a SPECIFIC reason (wrong tense, wrong gender, wrong preposition,
           false friend) — NOT random unrelated words.
        3. Avoid options that are visually identical except for an accent/diacritic — those
           are guess-cheese for the AI evaluator, not a learning signal.
        4. The correct option must be unambiguous given the surrounding context.
        5. Use everyday level-appropriate contexts. Don't copy the example from the level
           context verbatim.
        6. No instructions inside the sentence — just the sentence with a clear blank-or-pick.

        Return JSON only:
        {{
            "question": "The sentence/question for the user, no instructions",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": "<verbatim string of the correct option>"
        }}

        CORRECT-ANSWER FORMAT (this trips models up — read carefully):
        ✅ "correctAnswer": "идёт"             // literal string from options
        ❌ "correctAnswer": "B"                // never a letter
        ❌ "correctAnswer": 1                  // never an index
        ❌ "correctAnswer": "Option B"         // never a label
        The value MUST be a verbatim copy of one of the strings inside `options`.
        """


def explain_answer_prompt(
    language: str,
    level: str,
    task: str,
    correct_answer: str,
    user_answer: str,
    ui_locale_label: Optional[str] = None,
) -> str:
    locale_for_explanation = (
        ui_locale_label if ui_locale_label and ui_locale_label.strip() else "English"
    )
    return f"""
        You are tutoring a student studying {language} at {level} level.
        They just answered a task. Your job is to give SURGICAL feedback
        on their specific attempt — not a grammar lecture.

        Task            : {task}
        Correct answer  : {correct_answer}
        Student's answer: {user_answer}

        BEHAVIOUR RULES (HARD):
        1. If the student's answer is correct (allow minor typos, accents
           and synonymous variants), set is_correct=true and skip topics.
        2. If wrong, structure the explanation as TWO sentences max:
           a) Quote BOTH the student's answer and the correct one in the
              target language, and name the specific slip in one phrase
              ("wrong tense", "feminine where masculine is needed",
              "missing reflexive particle"…).
           b) ONE sentence on WHY (the underlying rule), tailored to the
              {level} level. No table of conjugations, no bulleted lists.
        3. NEVER paste the correct answer wholesale as a sentence on its
           own line. Use it inline inside the quote-and-compare phrase.
        4. NEVER lecture about the broader grammar topic. If the student
           confused two specific tenses, only address those two.
        5. `topics_to_review` lists 1–2 *very narrow* sub-topics they
           should drill — not "Russian grammar", but "Present-tense
           first-person endings of -ть verbs". Empty list if correct.
        6. Write `explanation` and `topics_to_review` in
           {locale_for_explanation}. Quoted target-language fragments
           inside `explanation` stay in the target language.

        Return JSON only, no prose around it:
        {{
            "is_correct": boolean,
            "explanation": "string, 1–2 sentences",
            "topics_to_review": ["narrow sub-topic 1", "narrow sub-topic 2"]
        }}
        """


def verify_french_task_prompt(task: Dict[str, Any]) -> str:
    return f"""
        Vérifiez rigoureusement la tâche d'apprentissage suivante :
        {task}

        CRITÈRES DE VÉRIFICATION :
        1. Précision linguistique :
            - Vérifiez l'exactitude grammaticale
            - Confirmez que l'orthographe est correcte
            - Assurez-vous que la conjugaison des verbes est appropriée

        2. Clarté et logique :
            - Confirmez que la tâche est claire et sans ambiguïté
            - Vérifiez que le contexte est cohérent et logique
            - Assurez-vous qu'il n'y a qu'UNE SEULE réponse possible

        3. Niveau de difficulté :
            - Vérifiez que le vocabulaire correspond au niveau ciblé
            - Confirmez que la structure grammaticale est appropriée au niveau

        4. Aspects culturels :
            - Assurez-vous que le contenu est culturellement approprié
            - Vérifiez que les références culturelles sont pertinentes

        Répondez en JSON avec le format suivant :
        {{
            "is_valid": boolean,
            "better_task": {{
                "question": "La question améliorée",
                "options": ["Option A améliorée", "Option B améliorée", "Option C améliorée", "Option D améliorée"],
                "correct_answer": "[La bonne réponse améliorée]", // array
            }} // Optionnel, seulement si la tâche n'est pas valide
        }}

        IMPORTANT : Si la tâche n'est pas valide, fournissez une version complètement
        améliorée qui corrige tous les problèmes identifiés. La structure de better_task
        doit correspondre exactement à la structure de la tâche originale, avec tous
        les champs nécessaires.
        """


def verify_polish_task_prompt(task: Dict[str, Any]) -> str:
    return f"""
        Sprawdź dokładnie następujące zadanie językowe:
        {task}

        Nie potrzeba tłumaczyć zadania, tylko sprawdzić czy jest poprawne.
        Nie zwracaj better_task jeśli zadanie jest poprawne.

        Kryteria weryfikacji:
        1. Poprawność językowa:
            - Sprawdź poprawność gramatyczną
            - Potwierdź poprawność pisowni
            - Upewnij się, że odmiana wyrazów jest prawidłowa

        2. Jasność i logika:
            - Potwierdź, że zadanie jest jasne i jednoznaczne
            - Sprawdź, czy kontekst jest spójny i logiczny
            - Upewnij się, że jest tylko JEDNA poprawna odpowiedź

        3. Poziom trudności:
            - Sprawdź, czy słownictwo odpowiada docelowemu poziomowi
            - Potwierdź, że struktura gramatyczna jest odpowiednia

        Odpowiedz w formacie JSON:
        {{
            "is_valid": boolean,
            "better_task": {{
                "question": "Ulepszone pytanie",
                "options": ["Opcja A ulepszona", "Opcja B ulepszona", "Opcja C ulepszona", "Opcja D ulepszona"],
                "correct_answer": "[Poprawna ulepszona odpowiedź]" // array
            }} // Opcjonalne, tylko jeśli zadanie nie jest poprawne
        }}
        Kiedy zwracasz odpowiedź, zwróć tylko JSON, bez dodatkowych komentarzy
        i nie zwracaj better_task jeśli zadanie jest poprawne.
        """
