import { BaseResponse } from "@/types/responses/BaseResponse";
import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";

export interface SpeechAnalysisResult {
  overall_assessment: string;
  identified_errors: {
    error_type: string;
    erroneous_text: string;
    explanation: string;
    suggestion: string;
  }[];
  positive_points: string[];
  areas_for_improvement: string[];
}


export interface AnalyzeSpeechRequest {
  audioFile: File;
  filename?: string;
  language: string;
}

export async function analyzeSpeech(
  input: AnalyzeSpeechRequest
): Promise<string> {
  const formData = new FormData();
  formData.append("audio_file", input.audioFile, input.filename);
  const url = new URL(BRIDGE_MICROSERVICE_URL + "/speaking/analyze");
  url.searchParams.set("language", input.language);

  const response = await fetchWithAuth(
    url.toString(),
    {
      method: "POST",
      body: formData,
    }
  );

  const data = (await response.json()) as BaseResponse<SpeechAnalysisResult>;
  if (!data.success) {
    throw new Error((data.payload as unknown as Error).message || "Failed to analyze speech");
  }

  if (typeof data.payload === 'string') {
    try {
      return data.payload;
    } catch (e) {
      console.error("Failed to parse payload string as JSON:", e);
      throw new Error("Received string payload, but failed to parse as JSON object for SpeechAnalysisResult");
    }
  }
  return data.payload as unknown as string;
}
