import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SentenceCompletionRenderer from "./SentenceCompletionRenderer";
import type { ListeningSentenceCompletionQuestion } from "@/types/responses/ListeningResponse";

const q: ListeningSentenceCompletionQuestion = {
  type: "sentence_completion",
  question: "The speaker mentions ___ as the main reason.",
  correctAnswer: ["climate change", "global warming"],
};

describe("SentenceCompletionRenderer", () => {
  it("renders the question text with an inline input where the blank is", () => {
    render(
      <SentenceCompletionRenderer
        question={q}
        answer={undefined}
        onChange={vi.fn()}
        revealed={false}
      />,
    );
    expect(screen.getByText(/The speaker mentions/)).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("propagates input change", () => {
    const onChange = vi.fn();
    render(
      <SentenceCompletionRenderer
        question={q}
        answer={undefined}
        onChange={onChange}
        revealed={false}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "global warming" },
    });
    expect(onChange).toHaveBeenCalledWith("global warming");
  });

  it("shows accepted variants when revealed and incorrect", () => {
    render(
      <SentenceCompletionRenderer
        question={q}
        answer="rain"
        onChange={vi.fn()}
        revealed={true}
      />,
    );
    expect(screen.getByText(/climate change \/ global warming/)).toBeInTheDocument();
  });

  it("falls back to standalone input when prompt has no underscore marker", () => {
    const noMarker: ListeningSentenceCompletionQuestion = {
      ...q,
      question: "What did the speaker say?",
    };
    render(
      <SentenceCompletionRenderer
        question={noMarker}
        answer={undefined}
        onChange={vi.fn()}
        revealed={false}
      />,
    );
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
