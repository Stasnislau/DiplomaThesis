
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

  contentScore?: number | null;
  coherenceScore?: number | null;
  vocabularyScore?: number | null;
  wordErrorRate?: number | null;
  matchPercent?: number | null;
}
