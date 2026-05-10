import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MatchingRenderer from "./MatchingRenderer";
import type { MatchingQuestion } from "@/api/mutations/generateQuiz";

const makeQuestion = (): MatchingQuestion => ({
  type: "matching",
  question: "Match each term to its definition.",
  pairs: [
    { left: "ephemeral", right: "short-lived" },
    { left: "perennial", right: "lasting" },
    { left: "transient", right: "passing" },
  ],
});

describe("MatchingRenderer", () => {
  it("renders all left-side terms", () => {
    render(
      <MatchingRenderer
        question={makeQuestion()}
        answer={undefined}
        onChange={vi.fn()}
        revealed={false}
      />,
    );
    expect(screen.getByText("ephemeral")).toBeInTheDocument();
    expect(screen.getByText("perennial")).toBeInTheDocument();
    expect(screen.getByText("transient")).toBeInTheDocument();
  });

  it("renders all right-side options (regardless of order)", () => {
    render(
      <MatchingRenderer
        question={makeQuestion()}
        answer={undefined}
        onChange={vi.fn()}
        revealed={false}
      />,
    );
    expect(screen.getByText("short-lived")).toBeInTheDocument();
    expect(screen.getByText("lasting")).toBeInTheDocument();
    expect(screen.getByText("passing")).toBeInTheDocument();
  });

  it("creates a pair when user picks left then right", () => {
    const onChange = vi.fn();
    render(
      <MatchingRenderer
        question={makeQuestion()}
        answer={undefined}
        onChange={onChange}
        revealed={false}
      />,
    );
    fireEvent.click(screen.getByText("ephemeral"));
    fireEvent.click(screen.getByText("short-lived"));
    expect(onChange).toHaveBeenCalledWith({ ephemeral: "short-lived" });
  });

  it("replaces an old pair if user re-pairs the same right side", () => {
    const onChange = vi.fn();
    render(
      <MatchingRenderer
        question={makeQuestion()}
        answer={{ perennial: "lasting" }}
        onChange={onChange}
        revealed={false}
      />,
    );
    // User decides "lasting" actually goes with ephemeral.
    fireEvent.click(screen.getByText("ephemeral"));
    fireEvent.click(screen.getByText("lasting"));
    expect(onChange).toHaveBeenCalledWith({ ephemeral: "lasting" });
  });

  it("clicking right does nothing if no left is pending", () => {
    const onChange = vi.fn();
    render(
      <MatchingRenderer
        question={makeQuestion()}
        answer={undefined}
        onChange={onChange}
        revealed={false}
      />,
    );
    fireEvent.click(screen.getByText("short-lived"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
