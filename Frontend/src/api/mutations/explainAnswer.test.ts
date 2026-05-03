import { ExplainAnswerRequest, explainAnswer } from "./explainAnswer";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../fetchWithAuth", () => ({
  fetchWithAuth: vi.fn(),
}));

describe("explainAnswer", () => {
  const mockRequest: ExplainAnswerRequest = {
    language: "English",
    level: "B1",
    task: "Choose the correct word",
    correctAnswer: "went",
    userAnswer: "go",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns explanation when request is successful", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        payload: {
          isCorrect: false,
          explanation: 'The correct answer is "went" because...',
          topicsToReview: ["Past Tense"],
        },
      }),
    };
    vi.mocked(fetchWithAuth).mockResolvedValue(
      mockResponse as unknown as Response,
    );

    const result = await explainAnswer(mockRequest);

    expect(result.isCorrect).toBe(false);
    expect(result.explanation).toBe('The correct answer is "went" because...');
    expect(result.topicsToReview).toEqual(["Past Tense"]);
  });

  it("returns correct when user answer matches", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    const correctRequest = { ...mockRequest, userAnswer: "went" };
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        payload: {
          isCorrect: true,
          explanation: 'Correct! "Went" is the past tense of "go".',
        },
      }),
    };
    vi.mocked(fetchWithAuth).mockResolvedValue(
      mockResponse as unknown as Response,
    );

    const result = await explainAnswer(correctRequest);

    expect(result.isCorrect).toBe(true);
  });

  it("throws error when response is not ok", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    const mockResponse = {
      ok: false,
      status: 500,
    };
    vi.mocked(fetchWithAuth).mockResolvedValue(
      mockResponse as unknown as Response,
    );

    await expect(explainAnswer(mockRequest)).rejects.toThrow(
      "An error occurred while explaining the answer",
    );
  });

  it("throws error with message when success is false", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: false,
        errors: ["AI service unavailable", "Rate limit exceeded"],
      }),
    };
    vi.mocked(fetchWithAuth).mockResolvedValue(
      mockResponse as unknown as Response,
    );

    await expect(explainAnswer(mockRequest)).rejects.toThrow(
      "AI service unavailable\nRate limit exceeded",
    );
  });

  it("calls fetchWithAuth with correct parameters", async () => {
    const { fetchWithAuth } = await import("../fetchWithAuth");
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        payload: { isCorrect: true, explanation: "OK" },
      }),
    };
    vi.mocked(fetchWithAuth).mockResolvedValue(
      mockResponse as unknown as Response,
    );

    await explainAnswer(mockRequest);

    expect(fetchWithAuth).toHaveBeenCalledWith(
      expect.stringContaining("/writing/explainanswer"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(mockRequest),
      }),
    );
  });
});
