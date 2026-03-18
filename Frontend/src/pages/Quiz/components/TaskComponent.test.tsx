import { FillInTheBlankTask, MultipleChoiceTask } from "@/types/responses/TaskResponse";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { TaskComponent } from "./TaskComponent";

describe("TaskComponent", () => {
  const mockMultipleChoiceTask: MultipleChoiceTask = {
    type: "multiple_choice",
    question: "What is the capital of Poland?",
    options: ["Warsaw", "Krakow", "Gdansk", "Wroclaw"],
    correctAnswer: "Warsaw",
    id: "1",
  };

  const mockFillInTheBlankTask: FillInTheBlankTask = {
    id: "task-2",
    type: "fill_in_the_blank" as const,
    question: "This is a ___.",
    correctAnswer: ["test"],
  };

  const defaultProps = {
    userAnswer: "",
    setUserAnswer: vi.fn(),
    onCheckAnswer: vi.fn(),
    onExplainAnswer: vi.fn(),
    isCorrect: null,
    isExplaining: false,
    showExplanation: false,
  };

  it("renders multiple choice options correctly", () => {
    render(<TaskComponent taskData={mockMultipleChoiceTask} {...defaultProps} />);
    
    expect(screen.getByText("What is the capital of Poland?")).toBeInTheDocument();
    expect(screen.getAllByText("Warsaw").length).toBeGreaterThan(0);
    expect(screen.getByText("Krakow")).toBeInTheDocument();
    expect(screen.getAllByRole("button").filter(btn => btn.textContent?.includes("Option"))).toHaveLength(4);
  });

  it("renders fill in the blank input correctly", () => {
    render(<TaskComponent taskData={mockFillInTheBlankTask} {...defaultProps} />);
    
    expect(screen.getByText("The capital of Poland is ____.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/tasks.fillInBlank/)).toBeInTheDocument();
  });

  it("calls setUserAnswer when clicking an option", () => {
    render(<TaskComponent taskData={mockMultipleChoiceTask} {...defaultProps} />);
    
    fireEvent.click(screen.getByText("Krakow"));
    expect(defaultProps.setUserAnswer).toHaveBeenCalledWith("Krakow");
  });

  it("calls setUserAnswer when typing in input", () => {
    render(<TaskComponent taskData={mockFillInTheBlankTask} {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/tasks.fillInBlank/);
    fireEvent.change(input, { target: { value: "Warsaw" } });
    expect(defaultProps.setUserAnswer).toHaveBeenCalledWith("Warsaw");
  });

  it("calls onCheckAnswer when Check Answer button is clicked", () => {
    render(<TaskComponent taskData={mockMultipleChoiceTask} {...defaultProps} userAnswer="Warsaw" />);
    
    fireEvent.click(screen.getByRole("button", { name: /tasks.checkAnswer/i }));
    expect(defaultProps.onCheckAnswer).toHaveBeenCalled();
  });

  it("displays success message when answer is correct", () => {
    render(
      <TaskComponent 
        taskData={mockMultipleChoiceTask} 
        {...defaultProps} 
        isCorrect={true} 
      />
    );
    
    expect(screen.getByText("tasks.correct")).toBeInTheDocument();
    expect(screen.queryByText("tasks.incorrect")).not.toBeInTheDocument();
  });

  it("displays error message and correct answer when incorrect", () => {
    render(
      <TaskComponent 
        taskData={mockMultipleChoiceTask} 
        {...defaultProps} 
        isCorrect={false} 
      />
    );
    
    expect(screen.getByText("tasks.incorrect")).toBeInTheDocument();
    expect(screen.getByText(/Correct answer:/)).toBeInTheDocument();
    expect(screen.getAllByText("Warsaw").length).toBeGreaterThan(0);
  });

  it("shows explanation when requested", () => {
    const explanationData = {
      explanation: "Warsaw has been the capital since 1596.",
      topics_to_review: ["Geography", "History"]
    };

    render(
      <TaskComponent 
        taskData={mockMultipleChoiceTask} 
        {...defaultProps} 
        isCorrect={false}
        showExplanation={true}
        explanationData={explanationData}
      />
    );
    
    expect(screen.getByText(explanationData.explanation)).toBeInTheDocument();
    expect(screen.getByText("Geography")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
  });
});
