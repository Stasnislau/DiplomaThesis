import "@testing-library/jest-dom";

import * as useListening from "@/api/hooks/useCreateListeningTask";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import ListeningTask from "./ListeningTask";

window.HTMLMediaElement.prototype.play = vi.fn();
window.HTMLMediaElement.prototype.pause = vi.fn();

describe("ListeningTask Component", () => {
  const mockCreateTask = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(useListening, "useCreateListeningTask").mockReturnValue({
      createListeningTask: mockCreateTask,
      isLoading: false,
      data: undefined,
      error: null,
      reset: vi.fn(),
    });
  });

  it("renders correctly and has disabled generate button initially", () => {
    render(<ListeningTask />);
    expect(screen.getByText("Spanish")).toBeInTheDocument();
    expect(screen.getByText("A1")).toBeInTheDocument();

    const generateBtn = screen.getByRole("button", { name: /Generate Listening Task/i });
    expect(generateBtn).toBeDisabled();
  });

  it("enables generate button and submits with default question types", () => {
    render(<ListeningTask />);

    fireEvent.click(screen.getByText("Spanish"));
    fireEvent.click(screen.getByText("B1"));

    const generateBtn = screen.getByRole("button", { name: /Generate Listening Task/i });
    expect(generateBtn).not.toBeDisabled();

    fireEvent.click(generateBtn);
    // Default mix sends MC + FIB; the third button (Dictation) was
    // not toggled and must NOT be in the request.
    expect(mockCreateTask).toHaveBeenCalledWith({
      language: "Spanish",
      level: "B1",
      questionTypes: ["multiple_choice", "fill_in_the_blank"],
    });
  });

  it("toggles a question type and forwards it to the request", () => {
    render(<ListeningTask />);
    fireEvent.click(screen.getByText("Spanish"));
    fireEvent.click(screen.getByText("B1"));

    fireEvent.click(screen.getByText("Dictation"));
    fireEvent.click(screen.getByRole("button", { name: /Generate Listening Task/i }));

    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        questionTypes: expect.arrayContaining([
          "multiple_choice",
          "fill_in_the_blank",
          "dictation",
        ]),
      }),
    );
  });

  it("disables generate button when no question types are selected", () => {
    render(<ListeningTask />);
    fireEvent.click(screen.getByText("Spanish"));
    fireEvent.click(screen.getByText("B1"));

    // Toggle off both defaults.
    fireEvent.click(screen.getByText("Multiple choice"));
    fireEvent.click(screen.getByText("Fill in the blank"));

    expect(
      screen.getByRole("button", { name: /Generate Listening Task/i }),
    ).toBeDisabled();
  });

  it("shows transcript toggle and speaker chips when data has multiple speakers", () => {
    vi.spyOn(useListening, "useCreateListeningTask").mockReturnValue({
      createListeningTask: mockCreateTask,
      isLoading: false,
      data: {
        type: "listening",
        audioUrl: "http://test.com/audio.mp3",
        transcript: "[Speaker 1]: Hola amigo",
        questions: [
          {
            type: "multi_speaker_matching",
            question: "Who said what?",
            speakers: ["Speaker 1", "Speaker 2"],
            statements: [
              { statement: "Hola amigo", correctSpeaker: "Speaker 1" },
              { statement: "Adiós", correctSpeaker: "Speaker 2" },
            ],
          },
        ],
        speakers: ["Speaker 1", "Speaker 2"],
      },
      error: null,
      reset: vi.fn(),
    });

    render(<ListeningTask />);

    expect(screen.getByText("Show Transcript")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Show Transcript"));
    // "Hola amigo" appears both in the revealed transcript AND in the
    // matching-question statement, so query by all and expect ≥1.
    expect(screen.getAllByText(/Hola amigo/).length).toBeGreaterThanOrEqual(1);
    // Speaker chip rendered next to the audio player.
    expect(screen.getByText("🗣️ Speaker 1")).toBeInTheDocument();
    expect(screen.getByText("🗣️ Speaker 2")).toBeInTheDocument();
  });
});
