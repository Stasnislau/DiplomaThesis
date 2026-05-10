import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MultiSelectRenderer from "./MultiSelectRenderer";
import type { MultiSelectMCQuestion } from "@/api/mutations/generateQuiz";

const makeQuestion = (): MultiSelectMCQuestion => ({
  type: "multi_select_mc",
  question: "Select all true.",
  options: ["A", "B", "C", "D"],
  correct_answers: ["A", "C"],
});

describe("MultiSelectRenderer", () => {
  it("renders all options", () => {
    render(
      <MultiSelectRenderer
        question={makeQuestion()}
        answer={undefined}
        onChange={vi.fn()}
        revealed={false}
      />,
    );
    ["A", "B", "C", "D"].forEach((opt) => {
      expect(screen.getByText(opt)).toBeInTheDocument();
    });
  });

  it("toggles selection on click — adds new", () => {
    const onChange = vi.fn();
    render(
      <MultiSelectRenderer
        question={makeQuestion()}
        answer={[]}
        onChange={onChange}
        revealed={false}
      />,
    );
    fireEvent.click(screen.getByText("A"));
    expect(onChange).toHaveBeenCalledWith(["A"]);
  });

  it("toggles selection on click — removes existing", () => {
    const onChange = vi.fn();
    render(
      <MultiSelectRenderer
        question={makeQuestion()}
        answer={["A", "C"]}
        onChange={onChange}
        revealed={false}
      />,
    );
    fireEvent.click(screen.getByText("A"));
    expect(onChange).toHaveBeenCalledWith(["C"]);
  });

  it("does not mutate selection when revealed", () => {
    const onChange = vi.fn();
    render(
      <MultiSelectRenderer
        question={makeQuestion()}
        answer={["A"]}
        onChange={onChange}
        revealed={true}
      />,
    );
    fireEvent.click(screen.getByText("C"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("flags missed correct options when revealed", () => {
    render(
      <MultiSelectRenderer
        question={makeQuestion()}
        answer={["A"]} // C is correct but missed
        onChange={vi.fn()}
        revealed={true}
      />,
    );
    expect(screen.getByText("Missed")).toBeInTheDocument();
  });
});
