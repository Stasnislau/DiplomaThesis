import { useEffect, useRef, useState } from "react";

import Button from "@/components/common/Button";
import { SpeakingAnalysisResult } from "@/api/mutations/analyzeAudioFile";
import { getSpeakingPracticePhrase } from "@/api/mutations/getSpeakingPracticePhrase";
import { useAnalyzeAudioFile } from "@/api/hooks/useAnalyzeAudioFile";
import { useTranslation } from "react-i18next";

interface LessonSpeakingTaskProps {
  language: string;
  level: string;
  /** Lesson topic + keywords feed into the practice-phrase prompt so
   *  the phrase the learner records actually trains the lesson's
   *  intended skill (e.g. "academic discussion" phrases for a
   *  Seminar & Lecture Skills lesson). */
  topic?: string;
  keywords?: string[];
  /** Called once with the analysis result; fires whether the learner
   *  passed or not. The lesson page reads `pronunciation.fluencyScore`
   *  to decide whether to mark the lesson complete. */
  onAnalyzed?: (result: SpeakingAnalysisResult) => void;
}

/**
 * Single-shot speaking practice for the lesson flow:
 *   1. Fetch a practice phrase tied to the lesson topic / level.
 *   2. User records themselves reading it (or uploads audio).
 *   3. Bridge analyses the recording — pronunciation + grammar errors.
 *   4. Surface the score; >=60 fluency = pass.
 *
 * Distinct from the free-practice SpeakingTask in that it skips the
 * language picker and auto-loads the phrase on mount.
 */
const LessonSpeakingTask = ({
  language,
  level,
  topic: _topic,
  keywords: _keywords,
  onAnalyzed,
}: LessonSpeakingTaskProps) => {
  const { t, i18n } = useTranslation();

  const [phrase, setPhrase] = useState<string | null>(null);
  const [phraseError, setPhraseError] = useState<string | null>(null);
  const [phraseLoading, setPhraseLoading] = useState(false);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioURL, setAudioURL] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] =
    useState<SpeakingAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { analyzeAudioFile, isLoading: isAnalyzing } = useAnalyzeAudioFile();

  const fetchPhrase = async () => {
    setPhraseLoading(true);
    setPhraseError(null);
    setPhrase(null);
    setAudioFile(null);
    setAudioURL("");
    setAnalysisResult(null);
    setAnalysisError("");
    try {
      const backendLanguage =
        language.charAt(0).toUpperCase() + language.slice(1);
      const out = await getSpeakingPracticePhrase({
        language: backendLanguage,
        level,
      });
      setPhrase(out.phrase);
    } catch (e) {
      setPhraseError(e instanceof Error ? e.message : t("lessonSpeaking.phraseError"));
    } finally {
      setPhraseLoading(false);
    }
  };

  useEffect(() => {
    if (language && level) fetchPhrase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, level]);

  const startRecording = async () => {
    setAnalysisResult(null);
    setAnalysisError("");
    try {
      if (audioURL) URL.revokeObjectURL(audioURL);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];
      const mime = candidates.find((m) => MediaRecorder.isTypeSupported(m));
      const opts: MediaRecorderOptions = mime ? { mimeType: mime } : {};

      try {
        mediaRecorderRef.current = new MediaRecorder(stream, opts);
      } catch {
        mediaRecorderRef.current = new MediaRecorder(stream);
      }
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const actual = mediaRecorderRef.current?.mimeType || mime || "audio/webm";
        let ext = "webm";
        if (actual.includes("mp4")) ext = "mp4";
        else if (actual.includes("ogg")) ext = "ogg";
        const blob = new Blob(audioChunksRef.current, { type: actual });
        const file = new File([blob], `recording-${Date.now()}.${ext}`, {
          type: actual,
        });
        setAudioFile(file);
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach((tr) => tr.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch {
      setAnalysisError(t("tasks.micError"));
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (audioURL) URL.revokeObjectURL(audioURL);
      const f = e.target.files[0];
      setAudioFile(f);
      setAudioURL(URL.createObjectURL(f));
      setAnalysisResult(null);
      setAnalysisError("");
    }
  };

  const handleAnalyze = async () => {
    if (!audioFile) {
      setAnalysisError(t("tasks.uploadAudioFirst"));
      return;
    }
    setAnalysisError("");
    setAnalysisResult(null);
    try {
      const backendLanguage =
        language.charAt(0).toUpperCase() + language.slice(1);
      const result = await analyzeAudioFile({
        audioFile,
        filename: audioFile.name,
        language: backendLanguage,
        uiLocale: i18n.language,
      });
      setAnalysisResult(result);
      onAnalyzed?.(result);
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : t("tasks.analysisFailed"));
    }
  };

  if (phraseLoading && !phrase) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
        <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-700 dark:text-gray-300">
          {t("lessonSpeaking.generatingPhrase")}
        </p>
      </div>
    );
  }

  if (phraseError) {
    return (
      <div
        role="alert"
        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6"
      >
        <p className="text-red-700 dark:text-red-300 mb-3">{phraseError}</p>
        <Button onClick={fetchPhrase}>{t("essay.tryAgain")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Phrase prompt */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="inline-block bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs px-2 py-1 rounded-full">
            🗣️ {t("lessonSpeaking.label")}
          </span>
          <button
            onClick={fetchPhrase}
            className="text-sm text-gray-500 hover:text-rose-600 dark:hover:text-rose-400"
            title={t("lessonSpeaking.newPhrase")}
            aria-label={t("lessonSpeaking.newPhrase")}
          >
            ↻
          </button>
        </div>
        <p className="text-lg font-medium text-gray-900 dark:text-white">
          “{phrase}”
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          {t("lessonSpeaking.instruction")}
        </p>
      </div>

      {/* Recorder */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-3">
          {!isRecording ? (
            <Button onClick={startRecording} disabled={isAnalyzing}>
              🎙️ {t("lessonSpeaking.record")}
            </Button>
          ) : (
            <Button variant="danger" onClick={stopRecording}>
              ⏹️ {t("lessonSpeaking.stop")}
            </Button>
          )}
          <label className="text-sm font-medium px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
            📁 {t("lessonSpeaking.upload")}
            <input
              type="file"
              accept="audio/*"
              onChange={handleUpload}
              className="hidden"
              disabled={isRecording || isAnalyzing}
            />
          </label>
          {audioURL && (
            <audio src={audioURL} controls className="h-10 max-w-full" />
          )}
        </div>
        {audioFile && !analysisResult && (
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleAnalyze}
              isLoading={isAnalyzing}
              disabled={isAnalyzing}
            >
              {isAnalyzing
                ? t("lessonSpeaking.analyzing")
                : t("lessonSpeaking.analyze")}
            </Button>
          </div>
        )}
        {analysisError && (
          <p
            role="alert"
            className="text-sm text-red-600 dark:text-red-400 mt-3"
          >
            {analysisError}
          </p>
        )}
      </div>

      {/* Result */}
      {analysisResult && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex items-center gap-5">
            <ScoreCircle score={analysisResult.pronunciation.fluencyScore} />
            <div className="flex-1">
              <span
                className={`inline-block text-xs px-2 py-1 rounded-full mb-2 ${
                  analysisResult.pronunciation.fluencyScore >= 60
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                }`}
              >
                {analysisResult.pronunciation.fluencyScore >= 60
                  ? t("essay.passed")
                  : t("essay.notPassed")}
              </span>
              <p className="text-gray-800 dark:text-gray-100 text-sm">
                {analysisResult.overallAssessment}
              </p>
            </div>
          </div>

          {analysisResult.transcription && (
            <div className="text-sm bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <p className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 mb-1">
                {t("lessonSpeaking.transcription")}
              </p>
              <p className="text-gray-900 dark:text-gray-100">
                {analysisResult.transcription}
              </p>
            </div>
          )}

          {analysisResult.identifiedErrors.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">
                {t("lessonSpeaking.errors")}
              </p>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                {analysisResult.identifiedErrors.slice(0, 5).map((err, i) => (
                  <li key={i}>
                    <strong>{err.erroneousText}</strong> — {err.explanation}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.areasForImprovement.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">
                {t("essay.suggestions")}
              </p>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                {analysisResult.areasForImprovement.slice(0, 5).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={fetchPhrase}>
              {t("lessonSpeaking.tryAnother")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const ScoreCircle = ({ score }: { score: number }) => {
  const color =
    score >= 80
      ? "text-emerald-500"
      : score >= 60
        ? "text-amber-500"
        : "text-rose-500";
  return (
    <div
      className={`w-20 h-20 flex items-center justify-center rounded-full border-4 border-current ${color}`}
    >
      <span className={`text-2xl font-bold ${color}`}>{score}</span>
    </div>
  );
};

export default LessonSpeakingTask;
