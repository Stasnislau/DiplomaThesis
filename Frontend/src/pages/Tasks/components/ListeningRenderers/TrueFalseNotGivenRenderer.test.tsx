import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TrueFalseNotGivenRenderer from "./TrueFalseNotGivenRenderer";
import type { ListeningTrueFalseNotGivenQuestion } from "@/types/responses/ListeningResponse";

const q: ListeningTrueFalseNotGivenQuestion = {
  type: "true_false_not_given",
  question: "The speaker visited Berlin.",
  correctAnswer: "not_given",
};

describe("TrueFalseNotGivenRenderer", () => {
  it("renders three buttons (T/F/Not Given)", () => {
    render(
      <TrueFalseNotGivenRenderer
        question={q}
        answer={undefined}
        onChange={vi.fn()}
        revealed={false}
      />,
    );
    expect(screen.getByText("True")).toBeInTheDocument();
    expect(screen.getByText("False")).toBeInTheDocument();
    expect(screen.getByText("Not Given")).toBeInTheDocument();
  });

  it("calls onChange with the right literal", () => {
    const onChange = vi.fn();
    render(
      <TrueFalseNotGivenRenderer
        question={q}
        answer={undefined}
        onChange={onChange}
        revealed={false}
      />,
    );
    fireEvent.click(screen.getByText("Not Given"));
    expect(onChange).toHaveBeenCalledWith("not_given");
  });

  it("does not call onChange when revealed", () => {
    const onChange = vi.fn();
    render(
      <TrueFalseNotGivenRenderer
        question={q}
        answer="not_given"
        onChange={onChange}
        revealed={true}
      />,
    );
    fireEvent.click(screen.getByText("False"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
