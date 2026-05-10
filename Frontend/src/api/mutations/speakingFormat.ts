import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";
import { asApiError } from "../extractApiError";
import type {
  SpeakingFormat,
  SpeakingPromptResponse,
  SpeakingGradeResponse,
} from "@/types/responses/SpeakingResponse";

interface PracticePromptRequest {
  language: string;
  level: string;
  format: SpeakingFormat;
}

export const fetchSpeakingPrompt = async (
  body: PracticePromptRequest,
): Promise<SpeakingPromptResponse> => {
  const res = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/speaking/practice-prompt`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return parseApiPayload<SpeakingPromptResponse>(
    res,
    "Failed to load speaking prompt",
  );
};

interface GradeResponseRequest {
  audioFile: File;
  language: string;
  format: SpeakingFormat;
  promptText: string;
  targetPhrase?: string | null;
  uiLocale?: string;
}

export const gradeSpeakingResponse = async (
  input: GradeResponseRequest,
): Promise<SpeakingGradeResponse> => {
  // Multipart body matches the controller's File()/Query() shape.
  const formData = new FormData();
  formData.append("audio_file", input.audioFile, input.audioFile.name);

  const url = new URL(`${BRIDGE_MICROSERVICE_URL}/speaking/grade-response`);
  url.searchParams.set("language", input.language);
  url.searchParams.set("format", input.format);
  url.searchParams.set("promptText", input.promptText);
  if (input.targetPhrase) url.searchParams.set("targetPhrase", input.targetPhrase);
  if (input.uiLocale) url.searchParams.set("uiLocale", input.uiLocale);

  const res = await fetchWithAuth(url.toString(), {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || data?.success === false) {
    throw asApiError(data, "Failed to grade speaking response");
  }
  if (data && typeof data === "object" && "payload" in data) {
    return data.payload as SpeakingGradeResponse;
  }
  return data as SpeakingGradeResponse;
};
