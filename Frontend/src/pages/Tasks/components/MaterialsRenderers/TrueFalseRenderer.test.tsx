import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TrueFalseRenderer from "./TrueFalseRenderer";
import type { TrueFalseQuestion } from "@/api/mutations/generateQuiz";

const makeQuestion = (
  overrides: Partial<TrueFalseQuestion> = {},
): TrueFalseQuestion => ({
  type: "true_false",
  question: "The sky is blue.",
  correct_answer: "true",
  ...overrides,
});

describe("TrueFalseRenderer", () => {
  it("renders both buttons", () => {
    render(
      <TrueFalseRenderer
        question={makeQuestion()}
        answer={undefined}
        onChange={vi.fn()}
        revealed={false}
      />,
    );
    expect(screen.getByText("True")).toBeInTheDocument();
    expect(screen.getByText("False")).toBeInTheDocument();
  });

  it("calls onChange with 'true' when True clicked", () => {
    const onChange = vi.fn();
    render(
      <TrueFalseRenderer
        question={makeQuestion()}
        answer={undefined}
        onChange={onChange}
        revealed={false}
      />,
    );
    fireEvent.click(screen.getByText("True"));
    expect(onChange).toHaveBeenCalledWith("true");
  });

  it("disables buttons when revealed", () => {
    const onChange = vi.fn();
    render(
      <TrueFalseRenderer
        question={makeQuestion()}
        answer="true"
        onChange={onChange}
        revealed={true}
      />,
    );
    fireEvent.click(screen.getByText("False"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("marks selected button via aria-pressed", () => {
    render(
      <TrueFalseRenderer
        question={makeQuestion()}
        answer="false"
        onChange={vi.fn()}
        revealed={false}
      />,
    );
    const trueBtn = screen.getByText("True").closest("button")!;
    const falseBtn = screen.getByText("False").closest("button")!;
    expect(trueBtn).toHaveAttribute("aria-pressed", "false");
    expect(falseBtn).toHaveAttribute("aria-pressed", "true");
  });
});
