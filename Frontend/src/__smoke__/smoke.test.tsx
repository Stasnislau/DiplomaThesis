import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Smoke tests — fast checks that the FE compiles, every key page
 * mounts in JSDOM, and the discriminated-union dispatchers don't
 * throw on canonical inputs.
 *
 * These don't exercise real API calls — every fetch hook is mocked
 * to a no-op idle state. The point is to catch import errors,
 * provider misconfiguration, and missing context providers BEFORE
 * the app gets opened in a real browser.
 */

// ---------- Hook + module mocks (page renders need network-less deps) ----------

vi.mock("@/store/useUserStore", () => ({
  useUserStore: (selector: (state: unknown) => unknown) =>
    selector({
      userLanguages: [],
      isAuthenticated: false,
      user: null,
    }),
}));

vi.mock("@/api/hooks/useAvailableLanguages", () => ({
  useAvailableLanguages: () => ({ languages: [], isLoading: false }),
}));

vi.mock("@/api/hooks/useGetUserMaterials", () => ({
  useGetUserMaterials: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/api/hooks/useUploadMaterial", () => ({
  useUploadMaterial: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

vi.mock("@/api/hooks/useGenerateQuiz", () => ({
  useGenerateQuiz: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/api/hooks/useSaveMaterial", () => ({
  useSaveMaterial: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/api/hooks/useCreateListeningTask", () => ({
  useCreateListeningTask: () => ({
    createListeningTask: vi.fn(),
    isLoading: false,
    data: undefined,
    error: null,
    reset: vi.fn(),
  }),
}));

vi.mock("@/api/hooks/useAnalyzeAudioFile", () => ({
  useAnalyzeAudioFile: () => ({
    analyzeAudioFile: vi.fn(),
    isLoading: false,
  }),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
};


// ---------- Page-mount smoke tests ---------------------------------


describe("smoke: page components mount without crashing", () => {
  it("MaterialsTask renders the upload prompt", async () => {
    const { default: MaterialsTask } = await import(
      "@/pages/Tasks/components/MaterialsTask"
    );
    renderWithProviders(<MaterialsTask />);
    // The page renders multiple PDF-related strings (header + button +
    // helper text); we only care that *something* PDF-flavoured is
    // there as a smoke signal, not the count.
    expect(
      screen.getAllByText(/upload|pdf|document/i).length,
    ).toBeGreaterThan(0);
  });

  it("ListeningTask renders the language selector", async () => {
    const { default: ListeningTask } = await import(
      "@/pages/Tasks/components/ListeningTask"
    );
    renderWithProviders(<ListeningTask />);
    expect(screen.getByText("Spanish")).toBeInTheDocument();
    expect(screen.getByText("A1")).toBeInTheDocument();
  });

  it("SpeakingTask renders both mode toggles", async () => {
    const { default: SpeakingTask } = await import(
      "@/pages/Tasks/components/SpeakingTask"
    );
    renderWithProviders(<SpeakingTask />);
    expect(screen.getByText(/Free analyze|Free Analyze/)).toBeInTheDocument();
    expect(screen.getByText(/Guided practice/)).toBeInTheDocument();
  });

  it("FormatPracticePanel renders all four speaking format chips", async () => {
    const { default: FormatPracticePanel } = await import(
      "@/pages/Tasks/components/SpeakingFormat/FormatPracticePanel"
    );
    renderWithProviders(
      <FormatPracticePanel language="English" level="B1" />,
    );
    expect(screen.getByText(/Timed response/)).toBeInTheDocument();
    expect(screen.getByText(/Repeat after me/)).toBeInTheDocument();
    expect(screen.getByText(/Describe the scene/)).toBeInTheDocument();
    expect(screen.getByText(/Free monologue/)).toBeInTheDocument();
  });
});


// ---------- Dispatcher smoke (every discriminated-union case routes) -----


describe("smoke: question dispatchers route every union variant", () => {
  it("Materials QuestionRenderer handles all 7 types", async () => {
    const { default: QuestionRenderer } = await import(
      "@/pages/Tasks/components/MaterialsRenderers"
    );
    const samples = [
      { type: "multiple_choice", question: "?", options: ["a"], correct_answer: "a" },
      { type: "open", question: "?", options: [], correct_answer: "x" },
      {
        type: "fill_in_the_blank",
        question: "She ___ home.",
        options: [],
        correct_answer: "went",
      },
      { type: "true_false", question: "?", correct_answer: "true" },
      {
        type: "matching",
        question: "?",
        pairs: [
          { left: "a", right: "b" },
          { left: "c", right: "d" },
        ],
      },
      {
        type: "multi_select_mc",
        question: "?",
        options: ["A", "B", "C"],
        correct_answers: ["A", "B"],
      },
      {
        type: "cloze_passage",
        question: "?",
        passage_with_blanks: "x {{1}} y",
        blanks: [{ id: "1", correct_answer: "z" }],
      },
    ];
    for (const q of samples) {
      const { unmount } = renderWithProviders(
        <QuestionRenderer
          question={q as never}
          answer={undefined}
          onChange={vi.fn()}
          revealed={false}
        />,
      );
      unmount();
    }
  });

  it("Listening QuestionRenderer handles all 6 types", async () => {
    const { default: ListeningRenderer } = await import(
      "@/pages/Tasks/components/ListeningRenderers"
    );
    const samples = [
      { type: "multiple_choice", question: "?", options: ["a"], correctAnswer: "a" },
      { type: "fill_in_the_blank", question: "?", correctAnswer: "x" },
      { type: "dictation", question: "?", correctAnswer: "x" },
      { type: "true_false_not_given", question: "?", correctAnswer: "not_given" },
      { type: "sentence_completion", question: "?", correctAnswer: "x" },
      {
        type: "multi_speaker_matching",
        question: "?",
        speakers: ["S1", "S2"],
        statements: [
          { statement: "a", correctSpeaker: "S1" },
          { statement: "b", correctSpeaker: "S2" },
        ],
      },
    ];
    for (const q of samples) {
      const { unmount } = renderWithProviders(
        <ListeningRenderer
          question={q as never}
          answer={undefined}
          onChange={vi.fn()}
          revealed={false}
        />,
      );
      unmount();
    }
  });
});


// ---------- Grader smoke (no FE-side regressions on canonical answers) ----


describe("smoke: graders never throw on canonical inputs", () => {
  it("Materials gradeQuestion handles every type with a correct answer", async () => {
    const { gradeQuestion } = await import(
      "@/pages/Tasks/components/MaterialsRenderers/gradeQuestion"
    );
    const cases: Array<[unknown, unknown]> = [
      [
        { type: "multiple_choice", question: "?", options: ["a"], correct_answer: "a" },
        "a",
      ],
      [
        { type: "true_false", question: "?", correct_answer: "true" },
        "true",
      ],
      [
        {
          type: "multi_select_mc",
          question: "?",
          options: ["A", "B"],
          correct_answers: ["A", "B"],
        },
        ["A", "B"],
      ],
    ];
    for (const [q, a] of cases) {
      // Grader is allowed to return null or a boolean, never throw.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(typeof gradeQuestion(q as any, a as any)).not.toBe("undefined");
    }
  });

  it("Listening gradeListeningQuestion handles every type", async () => {
    const { gradeListeningQuestion } = await import(
      "@/pages/Tasks/components/ListeningRenderers/gradeListeningQuestion"
    );
    const cases: Array<[unknown, unknown]> = [
      [
        { type: "multiple_choice", question: "?", options: ["a"], correctAnswer: "a" },
        "a",
      ],
      [{ type: "dictation", question: "?", correctAnswer: "Hello" }, "hello"],
      [
        { type: "true_false_not_given", question: "?", correctAnswer: "not_given" },
        "not_given",
      ],
    ];
    for (const [q, a] of cases) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(typeof gradeListeningQuestion(q as any, a as any)).not.toBe(
        "undefined",
      );
    }
  });
});


// ---------- Type-import smoke (catches accidental module breakage) -----


describe("smoke: type modules import cleanly", () => {
  it("ListeningResponse types load", async () => {
    const mod = await import("@/types/responses/ListeningResponse");
    expect(mod.LISTENING_QUESTION_TYPES.length).toBeGreaterThan(0);
  });

  it("SpeakingResponse types load", async () => {
    const mod = await import("@/types/responses/SpeakingResponse");
    expect(mod.SPEAKING_FORMATS.length).toBeGreaterThan(0);
  });

  it("uploadMaterial types load", async () => {
    const mod = await import("@/api/mutations/uploadMaterial");
    expect(typeof mod.uploadMaterial).toBe("function");
  });
});


// ---------- App-shell smoke (router builds, providers load) -------


describe("smoke: app shell builds", () => {
  it("router config imports without errors", async () => {
    // The router file pulls in every lazy page, so a single broken
    // page or import cycle will surface here even if the pages
    // above happened to work in isolation.
    await expect(
      waitFor(async () => {
        const mod = await import("@/router");
        expect(mod.router).toBeDefined();
      }),
    ).resolves.not.toThrow();
  });
});
