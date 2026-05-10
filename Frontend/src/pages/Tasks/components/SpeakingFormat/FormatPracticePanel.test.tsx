import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import FormatPracticePanel from "./FormatPracticePanel";
import * as speakingFormat from "@/api/mutations/speakingFormat";

vi.mock("@/api/mutations/speakingFormat", () => ({
  fetchSpeakingPrompt: vi.fn(),
  gradeSpeakingResponse: vi.fn(),
}));

describe("FormatPracticePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The recorder's media APIs aren't exercised in this test — we
    // only verify the prompt-load + format-switch wiring.
  });

  it("renders all four format chips", () => {
    render(<FormatPracticePanel language="English" level="B1" />);
    expect(screen.getByText(/Timed response/)).toBeInTheDocument();
    expect(screen.getByText(/Repeat after me/)).toBeInTheDocument();
    expect(screen.getByText(/Describe the scene/)).toBeInTheDocument();
    expect(screen.getByText(/Free monologue/)).toBeInTheDocument();
  });

  it("calls fetchSpeakingPrompt with the active format", async () => {
    (speakingFormat.fetchSpeakingPrompt as any).mockResolvedValue({
      format: "timed_response",
      prompt: "What's a meal you cook well?",
      durationSeconds: 30,
      rubricHints: ["task achievement"],
    });

    render(<FormatPracticePanel language="English" level="B1" />);
    fireEvent.click(screen.getByRole("button", { name: /Load task/i }));

    await waitFor(() => {
      expect(speakingFormat.fetchSpeakingPrompt).toHaveBeenCalledWith({
        language: "English",
        level: "B1",
        format: "timed_response",
      });
    });
    expect(
      await screen.findByText("What's a meal you cook well?"),
    ).toBeInTheDocument();
  });

  it("switching format wipes prior prompt", async () => {
    (speakingFormat.fetchSpeakingPrompt as any).mockResolvedValue({
      format: "timed_response",
      prompt: "Sample prompt",
      durationSeconds: 30,
      rubricHints: [],
    });
    render(<FormatPracticePanel language="English" level="B1" />);
    fireEvent.click(screen.getByRole("button", { name: /Load task/i }));
    expect(await screen.findByText("Sample prompt")).toBeInTheDocument();

    // Toggle to a different format — old prompt must disappear.
    fireEvent.click(screen.getByText(/Free monologue/));
    expect(screen.queryByText("Sample prompt")).not.toBeInTheDocument();
  });

  it("disables Load prompt button when language is missing", () => {
    render(<FormatPracticePanel language="" level="B1" />);
    const btn = screen.getByRole("button", { name: /Load task/i });
    expect(btn).toBeDisabled();
  });
});
