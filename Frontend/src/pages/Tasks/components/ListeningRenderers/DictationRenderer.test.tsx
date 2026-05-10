import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import DictationRenderer from "./DictationRenderer";
import type { ListeningDictationQuestion } from "@/types/responses/ListeningResponse";

const q: ListeningDictationQuestion = {
  type: "dictation",
  question: "Type what you heard.",
  correctAnswer: "She left for Madrid on Tuesday morning.",
};

describe("DictationRenderer", () => {
  it("propagates typed text via onChange", () => {
    const onChange = vi.fn();
    render(
      <DictationRenderer
        question={q}
        answer={undefined}
        onChange={onChange}
        revealed={false}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "she left" },
    });
    expect(onChange).toHaveBeenCalledWith("she left");
  });

  it("disables textarea when revealed", () => {
    render(
      <DictationRenderer
        question={q}
        answer="anything"
        onChange={vi.fn()}
        revealed={true}
      />,
    );
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("shows expected answer when revealed and incorrect", () => {
    render(
      <DictationRenderer
        question={q}
        answer="totally wrong"
        onChange={vi.fn()}
        revealed={true}
      />,
    );
    expect(
      screen.getByText("She left for Madrid on Tuesday morning."),
    ).toBeInTheDocument();
  });

  it("does NOT show expected answer when revealed and correct (punctuation-tolerant)", () => {
    render(
      <DictationRenderer
        question={q}
        answer="she left for madrid on tuesday morning"
        onChange={vi.fn()}
        revealed={true}
      />,
    );
    // The expected-answer hint should be hidden because the user
    // got it right (modulo punctuation/case).
    expect(
      screen.queryByText("She left for Madrid on Tuesday morning."),
    ).not.toBeInTheDocument();
  });
});
