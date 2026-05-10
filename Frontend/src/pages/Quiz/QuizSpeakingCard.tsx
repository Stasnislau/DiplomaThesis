import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import Button from "@/components/common/Button";
import {
  fetchSpeakingPrompt,
  gradeSpeakingResponse,
} from "@/api/mutations/speakingFormat";
import type {
  SpeakingFormat,
  SpeakingGradeResponse,
  SpeakingPromptResponse,
} from "@/types/responses/SpeakingResponse";
import { useLocalizedError } from "@/utils/useLocalizedError";
import GradeDisplay from "@/pages/Tasks/components/SpeakingFormat/GradeDisplay";
import PictureScene from "@/pages/Tasks/components/SpeakingFormat/PictureScene";
import RecorderPanel from "@/pages/Tasks/components/SpeakingFormat/RecorderPanel";

interface QuizSpeakingCardProps {
  language: string;
  level: string;
  /** Picker already rolled the format. We just render that one — no
   *  selector, no extra clicks. Auto-load the prompt on mount. */
  format: SpeakingFormat;
}

const FORMAT_EMOJI: Record<SpeakingFormat, string> = {
  read_aloud: "🗣️",
  timed_response: "⏱️",
  repeat_after_me: "🔁",
  picture_description: "🖼️",
  free_monologue: "🎤",
};

const QuizSpeakingCard = ({
  language,
  level,
  format,
}: QuizSpeakingCardProps) => {
  const { t, i18n } = useTranslation();
  const localizeError = useLocalizedError();
  const [prompt, setPrompt] = useState<SpeakingPromptResponse | null>(null);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [grade, setGrade] = useState<SpeakingGradeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGrading, setIsGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetchSpeakingPrompt({ language, level, format })
      .then((data) => {
        if (!cancelled) setPrompt(data);
      })
      .catch((e) => {
        if (!cancelled) setError(localizeError(e, t("tasks.analysisFailed")));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setError(localizeError(e, t("tasks.analysisFailed")));
    } finally {
      setIsGrading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-900/10 p-8 text-center">
        <div className="w-10 h-10 mx-auto rounded-full border-4 border-violet-300 border-t-transparent animate-spin mb-3" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("lessonSpeaking.generating", {
            defaultValue: "Generating speaking task…",
          })}
        </p>
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
        {error || t("tasks.analysisFailed")}
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-white dark:bg-gray-800 rounded-2xl p-5 border border-violet-200 dark:border-violet-900/50 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-xl">{FORMAT_EMOJI[format]}</span>
        <span className="text-[11px] uppercase tracking-wider font-semibold text-violet-700 dark:text-violet-300">
          {t(`tasks.speakingFormat.${format}`, { defaultValue: format })}
        </span>
      </div>

      <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-5">
        {prompt.format === "picture_description" && prompt.imageUrl ? (
          <PictureScene imageUrl={prompt.imageUrl} caption={prompt.prompt} />
        ) : (
          <>
            <p className="text-base font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
              {prompt.prompt}
            </p>
            {prompt.translation && prompt.translation !== prompt.prompt && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                {prompt.translation}
              </p>
            )}
          </>
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
        resetSignal={0}
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

      {grade && <GradeDisplay result={grade} />}
    </div>
  );
};

export default QuizSpeakingCard;
