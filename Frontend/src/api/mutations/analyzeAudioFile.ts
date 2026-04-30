import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { BaseResponse } from "@/types/responses/BaseResponse";
import { extractApiError } from "../extractApiError";
import { fetchWithAuth } from "../fetchWithAuth";

export interface IdentifiedError {
  errorType: string;
  erroneousText: string;
  explanation: string;
  suggestion: string;
}

export interface PronunciationMetrics {
  overallConfidence: number;
  wordsPerMinute: number | null;
  avgPauseDuration: number | null;
  lowConfidenceWords: string[];
  fluencyScore: number;
}

export interface SpeakingAnalysisResult {
  transcription: string;
  detectedLanguage: string | null;
  overallAssessment: string;
  identifiedErrors: IdentifiedError[];
  positivePoints: string[];
  areasForImprovement: string[];
  pronunciation: PronunciationMetrics;
}

export interface AnalyzeSpeechRequest {
  audioFile: File;
  filename?: string;
  language: string;
}

/**
 * Analyzes the user's audio file and returns structured feedback with
 * transcription, language errors, and pronunciation metrics.
 */
export async function analyzeSpeech(
  input: AnalyzeSpeechRequest,
): Promise<SpeakingAnalysisResult> {
  const formData = new FormData();
  formData.append("audio_file", input.audioFile, input.filename);
  const url = new URL(BRIDGE_MICROSERVICE_URL + "/speaking/analyze");
  url.searchParams.set("language", input.language);

  const response = await fetchWithAuth(url.toString(), {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as BaseResponse<SpeakingAnalysisResult>;

  if (!data.success) {
    throw new Error(extractApiError(data, "Failed to analyze speech"));
  }

  return data.payload;
}
