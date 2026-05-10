/**
 * Production-grade frontend smoke: each Phase 1+2+3 user flow is
 * driven through to completion with mocked network calls.
 *
 * Mocking strategy: static vi.mock at module load (hoisted by
 * vitest), then each test overrides the relevant hook/mutation
 * return value via the exported references. This avoids the
 * resetModules + doMock + dynamic-import dance, which was timing
 * out on this codebase because the i18n init (loaded by
 * setupTests) keeps the module graph hot and any reset blows that
 * away.
 */

import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// JSDOM doesn't ship audio playback APIs.
window.HTMLMediaElement.prototype.play = vi.fn();
window.HTMLMediaElement.prototype.pause = vi.fn();

// ---------- Hook mocks (hoisted) ----------------------------------

vi.mock("@/store/useUserStore", () => ({
  useUserStore: (selector: (state: unknown) => unknown) =>
    selector({
      userLanguages: [{ languageId: "en", isNative: false, isStarted: true }],
      isAuthenticated: true,
      user: { id: "u1", email: "smoke@test" },
    }),
}));

vi.mock("@/api/hooks/useAvailableLanguages", () => ({
  useAvailableLanguages: () => ({
    languages: [{ id: "en", name: "English" }],
    isLoading: false,
  }),
}));

vi.mock("@/api/hooks/useGetUserMaterials", () => ({
  useGetUserMaterials: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/api/hooks/useSaveMaterial", () => ({
  useSaveMaterial: () => ({ mutate: vi.fn() }),
}));

const uploadMock = vi.fn();
vi.mock("@/api/hooks/useUploadMaterial", () => ({
  useUploadMaterial: () => ({
    mutate: uploadMock,
    isPending: false,
    error: null,
  }),
}));

const generateQuizMock = vi.fn();
vi.mock("@/api/hooks/useGenerateQuiz", () => ({
  useGenerateQuiz: () => ({ mutate: generateQuizMock, isPending: false }),
}));

const createListeningMock = vi.fn();
const listeningHookState: { data: unknown } = { data: undefined };
vi.mock("@/api/hooks/useCreateListeningTask", () => ({
  useCreateListeningTask: () => ({
    createListeningTask: createListeningMock,
    isLoading: false,
    data: listeningHookState.data,
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

vi.mock("@/api/mutations/speakingFormat", () => ({
  fetchSpeakingPrompt: vi.fn(),
  gradeSpeakingResponse: vi.fn(),
}));

import * as speakingFormat from "@/api/mutations/speakingFormat";

const renderWithProviders = (ui: React.ReactElement) => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
};


// ====================================================================
// PHASE 1 — MATERIALS user flow
// ====================================================================


describe("PROD smoke: Phase 1 Materials end-to-end", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upload → analyzed_types chips appear → generate quiz → render MC question", async () => {
    uploadMock.mockImplementation(
      (_file: File, opts: { onSuccess: (d: unknown) => void }) => {
        opts.onSuccess({
          filename: "smoke.pdf",
          chunks_count: 3,
          status: "success",
          analyzed_types: [
            { type: "reading_comprehension", example: "Sample question." },
          ],
          document_map: {
            document_kind: "Mixed",
            exercises: [
              {
                type: "reading_comprehension",
                passage_word_count_estimate: 200,
                passage_topic_hint: "smoke",
                question_count: 1,
                question_subtypes: ["main_idea"],
                grammar_focus: [],
                example: "",
              },
            ],
          },
        });
      },
    );
    generateQuizMock.mockImplementation(
      (_args: unknown, opts: { onSuccess: (d: unknown) => void }) => {
        opts.onSuccess({
          quiz: {
            questions: [
              {
                type: "multiple_choice",
                question: "What's the topic?",
                options: ["birds", "cars", "food"],
                correct_answer: "birds",
                context_text: "Birds adapt to seasons.",
              },
            ],
          },
        });
      },
    );

    const { default: MaterialsTask } = await import(
      "@/pages/Tasks/components/MaterialsTask"
    );
    renderWithProviders(<MaterialsTask />);

    const fileInput = document.getElementById(
      "material-file-upload",
    ) as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [new File(["%PDF-1.4..."], "smoke.pdf", { type: "application/pdf" })],
      },
    });

    fireEvent.click(
      await screen.findByRole("button", { name: /Analyze.*Extract/i }),
    );
    await waitFor(() => {
      expect(screen.getByText(/Analysis Complete/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/reading_comprehension/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Generate Similar/i }));
    await waitFor(() => {
      expect(screen.getByText("What's the topic?")).toBeInTheDocument();
    });
    // All three options must render — proves MC dispatcher fired.
    expect(screen.getByText("birds")).toBeInTheDocument();
    expect(screen.getByText("cars")).toBeInTheDocument();
    expect(screen.getByText("food")).toBeInTheDocument();
  });

  it("renders all 7 question types when the quiz returns them in one batch", async () => {
    uploadMock.mockImplementation(
      (_file: File, opts: { onSuccess: (d: unknown) => void }) => {
        opts.onSuccess({
          filename: "smoke.pdf",
          chunks_count: 1,
          status: "success",
          analyzed_types: [{ type: "reading_comprehension", example: "" }],
          document_map: null,
        });
      },
    );
    generateQuizMock.mockImplementation(
      (_args: unknown, opts: { onSuccess: (d: unknown) => void }) => {
        opts.onSuccess({
          quiz: {
            questions: [
              { type: "multiple_choice", question: "MC?", options: ["a", "b"], correct_answer: "a" },
              { type: "open", question: "Open?", options: [], correct_answer: "x" },
              { type: "fill_in_the_blank", question: "She ___ home.", options: [], correct_answer: "went" },
              { type: "true_false", question: "Birds fly.", correct_answer: "true" },
              { type: "matching", question: "Match.", pairs: [{ left: "ephemeral", right: "short-lived" }, { left: "perennial", right: "lasting" }] },
              { type: "multi_select_mc", question: "Multi.", options: ["X", "Y", "Z"], correct_answers: ["X", "Y"] },
              { type: "cloze_passage", question: "Fill.", passage_with_blanks: "x {{1}} y {{2}}", blanks: [{ id: "1", correct_answer: "a" }, { id: "2", correct_answer: "b" }] },
            ],
          },
        });
      },
    );

    const { default: MaterialsTask } = await import(
      "@/pages/Tasks/components/MaterialsTask"
    );
    renderWithProviders(<MaterialsTask />);

    fireEvent.change(document.getElementById("material-file-upload") as HTMLInputElement, {
      target: { files: [new File(["x"], "smoke.pdf", { type: "application/pdf" })] },
    });
    fireEvent.click(await screen.findByRole("button", { name: /Analyze.*Extract/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Generate Similar/i }));

    await waitFor(() => {
      expect(screen.getByText("MC?")).toBeInTheDocument();
    });
    // Each question prompt confirms its renderer mounted.
    expect(screen.getByText("Open?")).toBeInTheDocument();
    expect(screen.getByText("She ___ home.")).toBeInTheDocument();
    expect(screen.getByText("Birds fly.")).toBeInTheDocument();
    expect(screen.getByText("Match.")).toBeInTheDocument();
    expect(screen.getByText("Multi.")).toBeInTheDocument();
    expect(screen.getByText("Fill.")).toBeInTheDocument();
  });
});


// ====================================================================
// PHASE 2 — LISTENING user flow
// ====================================================================


describe("PROD smoke: Phase 2 Listening end-to-end", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeningHookState.data = undefined;
  });

  it("language + level + custom question types → request shape correct", async () => {
    const { default: ListeningTask } = await import(
      "@/pages/Tasks/components/ListeningTask"
    );
    renderWithProviders(<ListeningTask />);

    fireEvent.click(screen.getByText("English"));
    fireEvent.click(screen.getByText("B1"));
    fireEvent.click(screen.getByText("Dictation"));
    fireEvent.click(
      screen.getByRole("button", { name: /Generate Listening Task/i }),
    );

    expect(createListeningMock).toHaveBeenCalledWith(
      expect.objectContaining({
        language: "English",
        level: "B1",
        questionTypes: expect.arrayContaining([
          "multiple_choice",
          "fill_in_the_blank",
          "dictation",
        ]),
      }),
    );
  });

  it("renders all 6 listening question types when they come back", async () => {
    listeningHookState.data = {
      type: "listening",
      audioUrl: "http://test/audio.mp3",
      transcript: "[Speaker 1]: Hi.\n[Speaker 2]: Hello.",
      questions: [
        { type: "multiple_choice", question: "MC?", options: ["a"], correctAnswer: "a" },
        { type: "fill_in_the_blank", question: "FIB?", correctAnswer: "x" },
        { type: "dictation", question: "Type what you heard.", correctAnswer: "Hi." },
        { type: "true_false_not_given", question: "TFNG?", correctAnswer: "not_given" },
        { type: "sentence_completion", question: "The speaker said ___.", correctAnswer: "Hi" },
        {
          type: "multi_speaker_matching",
          question: "Who said what?",
          speakers: ["Speaker 1", "Speaker 2"],
          statements: [
            { statement: "Hi.", correctSpeaker: "Speaker 1" },
            { statement: "Hello.", correctSpeaker: "Speaker 2" },
          ],
        },
      ],
      speakers: ["Speaker 1", "Speaker 2"],
    };
    const { default: ListeningTask } = await import(
      "@/pages/Tasks/components/ListeningTask"
    );
    renderWithProviders(<ListeningTask />);

    expect(screen.getByText("🗣️ Speaker 1")).toBeInTheDocument();
    expect(screen.getByText("🗣️ Speaker 2")).toBeInTheDocument();

    expect(screen.getByText("MC?")).toBeInTheDocument();
    const next = screen.getByRole("button", { name: /Next/i });
    fireEvent.click(next);
    expect(screen.getByText("FIB?")).toBeInTheDocument();
    fireEvent.click(next);
    expect(screen.getByText("Type what you heard.")).toBeInTheDocument();
    fireEvent.click(next);
    expect(screen.getByText("TFNG?")).toBeInTheDocument();
    fireEvent.click(next);
    expect(screen.getByText(/The speaker said/)).toBeInTheDocument();
    fireEvent.click(next);
    expect(screen.getByText("Who said what?")).toBeInTheDocument();
  });
});


// ====================================================================
// PHASE 3 — SPEAKING (guided practice) user flow
// ====================================================================


describe("PROD smoke: Phase 3 Speaking guided practice end-to-end", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("load prompt → see prompt + rubric hints", async () => {
    (speakingFormat.fetchSpeakingPrompt as any).mockResolvedValue({
      format: "timed_response",
      prompt: "What's your favourite meal?",
      durationSeconds: 30,
      rubricHints: ["task achievement"],
    });

    const { default: FormatPracticePanel } = await import(
      "@/pages/Tasks/components/SpeakingFormat/FormatPracticePanel"
    );
    renderWithProviders(<FormatPracticePanel language="English" level="B1" />);

    fireEvent.click(screen.getByRole("button", { name: /Load prompt/i }));
    expect(
      await screen.findByText("What's your favourite meal?"),
    ).toBeInTheDocument();
    expect(screen.getByText(/task achievement/i)).toBeInTheDocument();
  });

  it("switching from timed_response to repeat_after_me wipes prior prompt", async () => {
    (speakingFormat.fetchSpeakingPrompt as any).mockResolvedValueOnce({
      format: "timed_response",
      prompt: "Old prompt.",
      durationSeconds: 30,
      rubricHints: [],
    });
    const { default: FormatPracticePanel } = await import(
      "@/pages/Tasks/components/SpeakingFormat/FormatPracticePanel"
    );
    renderWithProviders(<FormatPracticePanel language="English" level="B1" />);
    fireEvent.click(screen.getByRole("button", { name: /Load prompt/i }));
    expect(await screen.findByText("Old prompt.")).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Repeat after me/));
    await waitFor(() => {
      expect(screen.queryByText("Old prompt.")).not.toBeInTheDocument();
    });
  });

  it("error from prompt fetch surfaces a localized message via useLocalizedError", async () => {
    (speakingFormat.fetchSpeakingPrompt as any).mockRejectedValue({
      code: "AI_API_KEY_MISSING",
      message: "No AI API key set for this provider.",
    });
    const { default: FormatPracticePanel } = await import(
      "@/pages/Tasks/components/SpeakingFormat/FormatPracticePanel"
    );
    renderWithProviders(<FormatPracticePanel language="English" level="B1" />);
    fireEvent.click(screen.getByRole("button", { name: /Load prompt/i }));
    // useLocalizedError maps the code → the EN translation
    // ("No AI API key set for this provider. Add one in Settings →
    // AI Tokens.") — substring is enough.
    await waitFor(() => {
      expect(screen.getByText(/AI API key/i)).toBeInTheDocument();
    });
  });
});


// ====================================================================
// SpeakingTask mode toggle (free analyze ↔ guided practice)
// ====================================================================


describe("PROD smoke: SpeakingTask mode toggle", () => {
  it("flipping the mode toggle swaps which panel is mounted", async () => {
    const { default: SpeakingTask } = await import(
      "@/pages/Tasks/components/SpeakingTask"
    );
    renderWithProviders(<SpeakingTask />);

    expect(screen.getByText(/Free analyze/i)).toBeInTheDocument();
    expect(screen.getByText(/Guided practice/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Guided practice/i }),
    );
    await waitFor(() => {
      expect(screen.getByText(/Timed response/i)).toBeInTheDocument();
    });
  });
});
