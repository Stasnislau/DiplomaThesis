/**
 * Mirrors Backend/BridgeMicroservice/models/responses/speaking_format_response.py.
 */

export type SpeakingFormat =
  | "read_aloud"
  | "timed_response"
  | "repeat_after_me"
  | "picture_description"
  | "free_monologue";

export const SPEAKING_FORMATS: SpeakingFormat[] = [
  "timed_response",
  "repeat_after_me",
  "picture_description",
  "free_monologue",
];

export interface SpeakingPromptResponse {
  format: SpeakingFormat;
  prompt: string;
  translation?: string;
  audioUrl?: string | null;
  targetPhrase?: string | null;
  /** picture_description only — Pollinations.ai PNG of the scene the
   *  learner is asked to describe. Frontend renders this as the main
   *  content; `prompt` becomes a caption / fallback if the image
   *  fails to load. */
  imageUrl?: string | null;
  durationSeconds: number;
  rubricHints: string[];
  targetedWeaknesses?: string[];
  derivedFromHistory?: boolean;
}

export interface SpeakingIdentifiedError {
  errorType: string;
  erroneousText: string;
  explanation: string;
  suggestion: string;
}

export interface SpeakingPronunciationMetrics {
  overallConfidence: number;
  wordsPerMinute?: number | null;
  avgPauseDuration?: number | null;
  lowConfidenceWords: string[];
  fluencyScore: number;
}

export interface SpeakingGradeResponse {
  format: SpeakingFormat;
  transcription: string;
  detectedLanguage?: string | null;
  overallAssessment: string;
  positivePoints: string[];
  areasForImprovement: string[];
  identifiedErrors: SpeakingIdentifiedError[];
  pronunciation: SpeakingPronunciationMetrics;

  /** 0-100 — populated for content-graded formats. */
  contentScore?: number | null;
  /** 0-100 — picture_description, free_monologue. */
  coherenceScore?: number | null;
  /** 0-100 — picture_description, free_monologue. */
  vocabularyScore?: number | null;
  /** 0-1 — repeat_after_me only (lower = better). */
  wordErrorRate?: number | null;
  /** 0-100 — repeat_after_me only (higher = better). */
  matchPercent?: number | null;
}
