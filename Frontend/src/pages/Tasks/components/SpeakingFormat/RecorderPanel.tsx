import cn from "@/utils/cn";
import { useTranslation } from "react-i18next";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { useEffect } from "react";

interface RecorderPanelProps {
  /** Cap session length; the recorder auto-stops at this mark. */
  maxDurationSeconds: number;
  /** Surface the recorded file to the parent so it can be sent for grading. */
  onRecorded: (file: File) => void;
  /** When the parent resets state (e.g. new prompt loaded), nuke recorder state too. */
  resetSignal: number;
  /** Disable the record button (e.g. while grading is in flight). */
  disabled?: boolean;
}

const formatTimer = (s: number, total: number): string => {
  const remaining = Math.max(0, total - s);
  const mm = Math.floor(remaining / 60);
  const ss = (remaining % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
};

const RecorderPanel = ({
  maxDurationSeconds,
  onRecorded,
  resetSignal,
  disabled,
}: RecorderPanelProps) => {
  const { t } = useTranslation();
  const recorder = useAudioRecorder({
    maxDurationSeconds,
    onStop: onRecorded,
  });

  // Reset recording state when the parent passes a new resetSignal
  // (e.g. a new prompt was loaded). Putting it here keeps the
  // recorder's lifecycle co-located with its UI.
  useEffect(() => {
    recorder.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  const progress = Math.min(
    100,
    (recorder.elapsedSeconds / maxDurationSeconds) * 100,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={recorder.isRecording ? recorder.stop : recorder.start}
          disabled={disabled}
          className={cn(
            "relative flex items-center gap-3 px-5 py-3 rounded-2xl font-semibold transition-all",
            disabled && "opacity-50 cursor-not-allowed",
            recorder.isRecording
              ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-xl shadow-red-500/40"
              : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30",
          )}
          aria-label={
            recorder.isRecording
              ? t("tasks.stopRecording")
              : t("tasks.startRecording")
          }
        >
          <span
            className={cn(
              "w-3 h-3 rounded-full",
              recorder.isRecording ? "bg-white animate-pulse" : "bg-white",
            )}
          />
          {recorder.isRecording
            ? t("tasks.stopRecording")
            : t("tasks.startRecording")}
        </button>
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>
              {recorder.isRecording
                ? t("tasks.recordingInProgress")
                : t("tasks.timeRemaining", {
                    defaultValue: "Time remaining",
                  })}
            </span>
            <span className="font-mono">
              {formatTimer(recorder.elapsedSeconds, maxDurationSeconds)}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                progress > 90
                  ? "bg-rose-500"
                  : progress > 70
                  ? "bg-amber-500"
                  : "bg-indigo-500",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {recorder.error && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {recorder.error}
        </p>
      )}

      {recorder.audioUrl && !recorder.isRecording && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 p-3 bg-indigo-50 dark:bg-indigo-900/20">
          <audio src={recorder.audioUrl} controls className="w-full rounded-lg" />
        </div>
      )}
    </div>
  );
};

export default RecorderPanel;
