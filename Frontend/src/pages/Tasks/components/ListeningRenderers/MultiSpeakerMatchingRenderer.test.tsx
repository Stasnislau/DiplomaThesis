import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MultiSpeakerMatchingRenderer from "./MultiSpeakerMatchingRenderer";
import type { ListeningMultiSpeakerMatchingQuestion } from "@/types/responses/ListeningResponse";

const q: ListeningMultiSpeakerMatchingQuestion = {
  type: "multi_speaker_matching",
  question: "Who said what?",
  speakers: ["Speaker 1", "Speaker 2"],
  statements: [
    { statement: "Solar is the future.", correctSpeaker: "Speaker 1" },
    { statement: "Wind is more reliable.", correctSpeaker: "Speaker 2" },
  ],
};

describe("MultiSpeakerMatchingRenderer", () => {
  it("renders one speaker chip per speaker per statement", () => {
    render(
      <MultiSpeakerMatchingRenderer
        question={q}
        answer={undefined}
        onChange={vi.fn()}
        revealed={false}
      />,
    );
    // 2 statements × 2 speakers = 4 chip buttons total.
    expect(screen.getAllByRole("button", { name: /Speaker 1/i })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /Speaker 2/i })).toHaveLength(2);
  });

  it("calls onChange with statement-index → speaker map", () => {
    const onChange = vi.fn();
    render(
      <MultiSpeakerMatchingRenderer
        question={q}
        answer={undefined}
        onChange={onChange}
        revealed={false}
      />,
    );
    // Pick "Speaker 1" for the first statement.
    const firstSpeakerOneChip = screen.getAllByRole("button", { name: /Speaker 1/i })[0];
    fireEvent.click(firstSpeakerOneChip);
    expect(onChange).toHaveBeenCalledWith({ "0": "Speaker 1" });
  });

  it("does not call onChange when revealed", () => {
    const onChange = vi.fn();
    render(
      <MultiSpeakerMatchingRenderer
        question={q}
        answer={{ "0": "Speaker 1", "1": "Speaker 2" }}
        onChange={onChange}
        revealed={true}
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: /Speaker 1/i })[0]);
    expect(onChange).not.toHaveBeenCalled();
  });
});
