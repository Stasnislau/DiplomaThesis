import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MultipleChoiceRenderer from "./MultipleChoiceRenderer";
import type { MultipleChoiceQuestion } from "@/api/mutations/generateQuiz";

const q: MultipleChoiceQuestion = {
  type: "multiple_choice",
  question: "Capital of France?",
  options: ["Paris", "Berlin", "Madrid"],
  correct_answer: "Paris",
};

describe("MultipleChoiceRenderer", () => {
  it("calls onChange with picked option", () => {
    const onChange = vi.fn();
    render(
      <MultipleChoiceRenderer
        question={q}
        answer={undefined}
        onChange={onChange}
        revealed={false}
      />,
    );
    fireEvent.click(screen.getByText("Berlin"));
    expect(onChange).toHaveBeenCalledWith("Berlin");
  });

  it("does not call onChange when revealed", () => {
    const onChange = vi.fn();
    render(
      <MultipleChoiceRenderer
        question={q}
        answer="Paris"
        onChange={onChange}
        revealed={true}
      />,
    );
    fireEvent.click(screen.getByText("Berlin"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("supports keyboard activation (Enter / Space)", () => {
    const onChange = vi.fn();
    render(
      <MultipleChoiceRenderer
        question={q}
        answer={undefined}
        onChange={onChange}
        revealed={false}
      />,
    );
    const opt = screen.getByText("Madrid");
    fireEvent.keyDown(opt, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("Madrid");
  });
});
