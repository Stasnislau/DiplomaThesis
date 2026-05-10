import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";
import type { DocumentMap } from "./uploadMaterial";

/**
 * Quiz question wire types — discriminated union by `type`.
 *
 * The shape mirrors the backend's Pydantic discriminated union in
 * Backend/BridgeMicroservice/models/dtos/material_dtos.py. The
 * MaterialsTask renderer dispatches on `type` to pick the right
 * component.
 */

interface QuizQuestionBase {
  question: string;
  context_text?: string | null;
}

export interface MultipleChoiceQuestion extends QuizQuestionBase {
  type: "multiple_choice";
  options: string[];
  correct_answer: string;
}

export interface OpenQuestion extends QuizQuestionBase {
  type: "open";
  options: string[]; // always []
  correct_answer: string;
}

export interface FillInTheBlankQuestion extends QuizQuestionBase {
  type: "fill_in_the_blank" | "gap_fill_grammar" | "gap_fill_vocab";
  options: string[];
  correct_answer: string | string[];
}

export interface TrueFalseQuestion extends QuizQuestionBase {
  type: "true_false";
  correct_answer: "true" | "false";
}

export interface MatchingPair {
  left: string;
  right: string;
}

export interface MatchingQuestion extends QuizQuestionBase {
  type: "matching";
  pairs: MatchingPair[];
}

export interface MultiSelectMCQuestion extends QuizQuestionBase {
  type: "multi_select_mc";
  options: string[];
  correct_answers: string[];
}

export interface ClozeBlank {
  id: string;
  correct_answer: string | string[];
}

export interface ClozePassageQuestion extends QuizQuestionBase {
  type: "cloze_passage";
  passage_with_blanks: string;
  blanks: ClozeBlank[];
}

export type QuizQuestion =
  | MultipleChoiceQuestion
  | OpenQuestion
  | FillInTheBlankQuestion
  | TrueFalseQuestion
  | MatchingQuestion
  | MultiSelectMCQuestion
  | ClozePassageQuestion;

/**
 * Backend returns either a quiz object with questions, or — when no
 * relevant material was found — a plain string explaining why.
 * Callers must handle both shapes.
 */
type QuizPayload = { questions: QuizQuestion[] } | string;

interface GenerateQuizResponse {
  quiz: QuizPayload;
}

export interface GenerateQuizParams {
  selectedTypes?: string[];
  /**
   * The language the user is currently studying. When set, the backend
   * is told to write question/options/correct_answer in this language
   * regardless of the source PDF's language.
   */
  targetLanguage?: string;
  /**
   * The DocumentMap returned from /materials/upload, round-tripped
   * back so the backend can skip re-classification and feed Stage 2/3
   * with the same exercises map the user saw upfront. Optional —
   * when omitted, the backend re-derives the map from indexed material.
   */
  documentMap?: DocumentMap;
}

export const generateQuiz = async (
  params: GenerateQuizParams = {},
): Promise<GenerateQuizResponse> => {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/materials/quiz`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        selected_types: params.selectedTypes,
        target_language: params.targetLanguage,
        document_map: params.documentMap,
      }),
    },
  );

  return parseApiPayload<GenerateQuizResponse>(
    response,
    "Failed to generate tasks",
  );
};
