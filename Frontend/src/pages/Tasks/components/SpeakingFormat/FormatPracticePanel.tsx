import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import cn from "@/utils/cn";
import Button from "@/components/common/Button";
import {
  SPEAKING_FORMATS,
  type SpeakingFormat,
  type SpeakingPromptResponse,
  type SpeakingGradeResponse,
} from "@/types/responses/SpeakingResponse";
import {
  fetchSpeakingPrompt,
  gradeSpeakingResponse,
} from "@/api/mutations/speakingFormat";
import RecorderPanel from "./RecorderPanel";
import GradeDisplay from "./GradeDisplay";

interface FormatPracticePanelProps {
  language: string;
  level: string;
}

const FORMAT_META: Record<SpeakingFormat, { emoji: string; defaultLabel: string }> = {
  read_aloud: { emoji: "🗣️", defaultLabel: "Read aloud" },
  timed_response: { emoji: "⏱️", defaultLabel: "Timed response (30s)" },
  repeat_after_me: { emoji: "🔁", defaultLabel: "Repeat after me" },
  picture_description: { emoji: "🖼️", defaultLabel: "Describe the scene" },
  free_monologue: { emoji: "🎤", defaultLabel: "Free monologue" },
};

const FormatPracticePanel = ({ language, level }: FormatPracticePanelProps) => {
  const { t, i18n } = useTranslation();
  const [format, setFormat] = useState<SpeakingFormat>("timed_response");
  const [prompt, setPrompt] = useState<SpeakingPromptResponse | null>(null);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [grade, setGrade] = useState<SpeakingGradeResponse | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped whenever a fresh prompt is loaded — RecorderPanel watches
  // it and resets its internal state so a stale recording doesn't
  // bleed into the new prompt.
  const [resetSignal, setResetSignal] = useState(0);

  // Wipe stale state when the user switches format mid-session.
  useEffect(() => {
    setPrompt(null);
    setRecordedFile(null);
    setGrade(null);
    setError(null);
    setResetSignal((s) => s + 1);
  }, [format, language, level]);

  const loadPrompt = async () => {
    if (!language || !level) return;
    setError(null);
    setGrade(null);
    setRecordedFile(null);
    setIsLoadingPrompt(true);
    try {
      const data = await fetchSpeakingPrompt({ language, level, format });
      setPrompt(data);
      setResetSignal((s) => s + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load prompt");
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  const handleGrade = async () => {
    if (!recordedFile || !prompt) return;
    setError(null);
    setIsGrading(true);
    try {
      const data = await gradeSpeakingResponse({
        audioFile: recordedFile,
        language,
        format: prompt.format,
        promptText: prompt.prompt,
        targetPhrase: prompt.targetPhrase ?? null,
        uiLocale: i18n.language,
      });
      setGrade(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to grade response");
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <div className="space-y-5 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-violet-200 dark:border-violet-900/50 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
          <span className="text-lg">🎯</span>
        </div>
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white">
            {t("tasks.guidedPractice", { defaultValue: "Guided practice" })}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("tasks.guidedPracticeHint", {
              defaultValue:
                "Pick a format, get a prompt, record, and get a structured grade.",
            })}
          </p>
        </div>
      </div>

      {/* Format selector */}
      <div className="flex flex-wrap gap-2">
        {SPEAKING_FORMATS.map((f) => {
          const meta = FORMAT_META[f];
          const isOn = format === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              aria-pressed={isOn}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all flex items-center gap-1.5",
                isOn
                  ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-violet-300",
              )}
            >
              <span>{meta.emoji}</span>
              <span>
                {t(`tasks.speakingFormat.${f}`, {
                  defaultValue: meta.defaultLabel,
                })}
              </span>
            </button>
          );
        })}
      </div>

      <Button
        onClick={loadPrompt}
        disabled={!language || !level || isLoadingPrompt}
        variant="secondary"
        isLoading={isLoadingPrompt}
        className="rounded-xl"
      >
        {prompt
          ? t("tasks.newPrompt", { defaultValue: "Generate new prompt" })
          : t("tasks.loadPrompt", { defaultValue: "Load prompt" })}
      </Button>

      {/* Prompt display */}
      {prompt && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-5">
            <p className="text-base font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
              {prompt.prompt}
            </p>
            {prompt.translation && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                {prompt.translation}
              </p>
            )}
            {prompt.audioUrl && (
              <audio
                src={prompt.audioUrl}
                controls
                className="w-full mt-3 rounded-lg"
              />
            )}
            {prompt.rubricHints.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {prompt.rubricHints.map((h) => (
                  <span
                    key={h}
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/60 dark:bg-gray-800/60 text-indigo-700 dark:text-indigo-300 font-semibold"
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}
          </div>

          <RecorderPanel
            maxDurationSeconds={prompt.durationSeconds}
            onRecorded={setRecordedFile}
            resetSignal={resetSignal}
            disabled={isGrading}
          />

          <Button
            onClick={handleGrade}
            disabled={!recordedFile || isGrading}
            variant="primary"
            isLoading={isGrading}
            className="w-full h-12 rounded-xl"
          >
            {isGrading
              ? t("tasks.grading", { defaultValue: "Grading…" })
              : t("tasks.gradeMyAnswer", { defaultValue: "Grade my answer" })}
          </Button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {grade && <GradeDisplay result={grade} />}
    </div>
  );
};

export default FormatPracticePanel;
