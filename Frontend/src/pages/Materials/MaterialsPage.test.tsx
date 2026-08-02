import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const QUIZ = {
  questions: [
    {
      type: "multiple_choice",
      question: "According to the passage, what drives the diversification of species?",
      context_text: "Darwin sailed on the H.M.S. Beagle and studied finches.",
      options: ["Natural selection", "Genetic drift"],
      correct_answer: "Natural selection",
    },
    {
      type: "true_false",
      question: "Darwin published On the Origin of Species.",
      correct_answer: "true",
    },
  ],
};

vi.mock("@/api/hooks/useGenerateQuiz", () => ({
  useGenerateQuiz: () => ({
    mutate: (_vars: unknown, opts?: { onSuccess?: (d: unknown) => void }) =>
      opts?.onSuccess?.({ quiz: QUIZ }),
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
}));

vi.mock("@/api/hooks/useUploadMaterial", () => ({
  useUploadMaterial: () => ({
    mutate: (_file: unknown, opts?: { onSuccess?: (d: unknown) => void }) =>
      opts?.onSuccess?.({
        filename: "toefl-reading-practice.pdf",
        analyzed_types: [
          { type: "reading_comprehension", example: "According to paragraph 2..." },
        ],
      }),
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
}));

vi.mock("@/api/hooks/useSaveMaterial", () => ({
  useSaveMaterial: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/api/hooks/useGetUserMaterials", () => ({
  useGetUserMaterials: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/api/mutations/logMaterialsResult", () => ({
  logMaterialsResult: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string; defaultLabel?: string; n?: number }) => {
      if (key === "materialsPage.questionLabel") return `Question ${opts?.n}`;
      return opts?.defaultValue ?? opts?.defaultLabel ?? key;
    },
  }),
}));

import { MaterialsPage } from "./MaterialsPage";

function clickButton(pattern: RegExp) {
  const button = screen
    .getAllByRole("button")
    .find((b) => pattern.test(b.textContent ?? ""));
  if (!button) throw new Error(`no button matching ${pattern}`);
  fireEvent.click(button);
}

function renderQuiz() {
  const { container } = render(<MaterialsPage />);
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error("no file input rendered");
  fireEvent.change(input, {
    target: { files: [new File(["%PDF-1.4"], "toefl.pdf", { type: "application/pdf" })] },
  });
  clickButton(/analyz/i);
  clickButton(/generate/i);
}

describe("MaterialsPage quiz", () => {
  it("shows the question text of every generated item", () => {
    renderQuiz();

    expect(
      screen.getByText(
        "According to the passage, what drives the diversification of species?",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Darwin published On the Origin of Species."),
    ).toBeInTheDocument();
  });

  it("shows the passage only for the item that carries it", () => {
    renderQuiz();

    expect(
      screen.getAllByText(
        "Darwin sailed on the H.M.S. Beagle and studied finches.",
      ),
    ).toHaveLength(1);
  });

  it("renders the answer controls beside the question", () => {
    renderQuiz();

    expect(screen.getByText("Natural selection")).toBeInTheDocument();
    expect(screen.getByText("Genetic drift")).toBeInTheDocument();
  });
});
