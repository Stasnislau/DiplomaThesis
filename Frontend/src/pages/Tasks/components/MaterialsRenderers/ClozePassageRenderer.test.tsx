import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ClozePassageRenderer from "./ClozePassageRenderer";
import type { ClozePassageQuestion } from "@/api/mutations/generateQuiz";

const makeQuestion = (): ClozePassageQuestion => ({
  type: "cloze_passage",
  question: "Fill in the blanks.",
  passage_with_blanks: "Birds fly {{1}} for {{2}}.",
  blanks: [
    { id: "1", correct_answer: "south" },
    { id: "2", correct_answer: ["winter", "the cold"] },
  ],
});

describe("ClozePassageRenderer", () => {
  it("renders one input per declared blank", () => {
    render(
      <ClozePassageRenderer
        question={makeQuestion()}
        answer={undefined}
        onChange={vi.fn()}
        revealed={false}
      />,
    );
    expect(screen.getByPlaceholderText("#1")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("#2")).toBeInTheDocument();
  });

  it("propagates input change as a per-blank map", () => {
    const onChange = vi.fn();
    render(
      <ClozePassageRenderer
        question={makeQuestion()}
        answer={{ "1": "south" }}
        onChange={onChange}
        revealed={false}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("#2"), {
      target: { value: "winter" },
    });
    expect(onChange).toHaveBeenCalledWith({ "1": "south", "2": "winter" });
  });

  it("disables inputs when revealed", () => {
    render(
      <ClozePassageRenderer
        question={makeQuestion()}
        answer={{ "1": "south", "2": "winter" }}
        onChange={vi.fn()}
        revealed={true}
      />,
    );
    expect(screen.getByPlaceholderText("#1")).toBeDisabled();
  });

  it("shows accepted variants when an answer is wrong & revealed", () => {
    render(
      <ClozePassageRenderer
        question={makeQuestion()}
        answer={{ "1": "north", "2": "winter" }}
        onChange={vi.fn()}
        revealed={true}
      />,
    );
    expect(screen.getByText("south")).toBeInTheDocument();
  });

  it("renders orphan blanks (declared but not in passage) as fallback list", () => {
    const q: ClozePassageQuestion = {
      type: "cloze_passage",
      question: "?",
      passage_with_blanks: "Text with only {{1}}.",
      blanks: [
        { id: "1", correct_answer: "x" },
        { id: "2", correct_answer: "y" }, // orphan — no marker for it
      ],
    };
    render(
      <ClozePassageRenderer
        question={q}
        answer={undefined}
        onChange={vi.fn()}
        revealed={false}
      />,
    );
    expect(screen.getByPlaceholderText("#2")).toBeInTheDocument();
  });
});
