import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

/**
 * Per-question wrong-answer trace. The adaptive-focus deriver reads
 * `errorExamples[].text` to give the next task generator real
 * mistakes to riff on, so be specific: include the actual question
 * text and the canonical correct answer.
 */
export interface ListeningErrorExample {
  type?: string;
  text?: string;
  suggestion?: string;
}

export interface LogListeningResultRequest {
  language: string;
  level: string;
  /** 0-100 — usually round((correctCount / questionCount) * 100). */
  score: number;
  questionCount: number;
  correctCount: number;
  questionTypes?: string[];
  errorExamples?: ListeningErrorExample[];
  /** Carry-over from /tasks/listening/adaptive so the next adaptive
   *  call can see whether the targeted weakness was actually beaten. */
  targetedWeaknesses?: string[];
}

/**
 * Fire-and-forget logger for finished listening sessions. Same
 * pattern as logWritingResult — UX never blocks on a logging
 * failure; we just console.warn so a regression where the endpoint
 * disappears stays visible in dev tools.
 */
export const logListeningResult = async (
  body: LogListeningResultRequest,
): Promise<boolean> => {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/tasks/listening/result`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return parseApiPayload<boolean>(
    response,
    "Failed to log listening result",
  );
};
