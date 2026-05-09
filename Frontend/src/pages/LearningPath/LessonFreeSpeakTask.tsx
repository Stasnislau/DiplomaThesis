import { useEffect, useRef, useState } from "react";

import Button from "@/components/common/Button";
import { SpeakingAnalysisResult } from "@/api/mutations/analyzeAudioFile";
import { useAnalyzeAudioFile } from "@/api/hooks/useAnalyzeAudioFile";
import { useTranslation } from "react-i18next";

interface LessonFreeSpeakTaskProps {
  language: string;
  topic: string;
  keywords: string[];
  /** Same contract as LessonSpeakingTask: lesson page reads
   *  pronunciation.fluencyScore from the analysis result and decides
   *  pass/fail (>=60). */
  onAnalyzed?: (result: SpeakingAnalysisResult) => void;
}

/**
 * Open-ended speaking practice — no target phrase. The learner sees
 * the lesson topic + keyword scaffolding and is asked to talk for
 * 30-60 seconds on it. Their recording goes through the same
 * /speaking/analyze endpoint, which transcribes whatever they said
 * and scores pronunciation, grammar and fluency on the spoken text.
 *
 * Distinct from LessonSpeakingTask (which generates a phrase to
 * read aloud) — this trains the learner's ability to produce their
 * own sentences, not just pronounce given ones.
 */
const LessonFreeSpeakTask = ({
  language,
  topic,
  keywords,
  onAnalyzed,
}: LessonFreeSpeakTaskProps) => {
  const { t, i18n } = useTranslation();

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioURL, setAudioURL] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] =
    useState<SpeakingAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { analyzeAudioFile, isLoading: isAnalyzing } = useAnalyzeAudioFile();

  // Free recordings are larger than the phrase-read ones. Free up the
  // ObjectURL when the component unmounts or the URL changes so we
  // don't hold the audio blob in memory after the learner moves on.
  useEffect(() => {
    return () => {
      if (audioURL) URL.revokeObjectURL(audioURL);
    };
  }, [audioURL]);

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
        const file = new File([blob], `freespeak-${Date.now()}.${ext}`, {
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

  const handleNew = () => {
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioFile(null);
    setAudioURL("");
    setAnalysisResult(null);
    setAnalysisError("");
  };

  return (
    <div className="space-y-5">
      {/* Prompt */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <span className="inline-block bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs px-2 py-1 rounded-full mb-3">
          🎤 {t("lessonFreeSpeak.label")}
        </span>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("lessonFreeSpeak.promptIntro")} <em>{topic}</em>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          {t("lessonFreeSpeak.promptInstruction")}
        </p>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {keywords.map((kw, i) => (
              <span
                key={i}
                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded"
              >
                {kw}
              </span>
            ))}
          </div>
        )}
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
            <Button onClick={handleNew}>
              {t("lessonFreeSpeak.tryAnother")}
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

export default LessonFreeSpeakTask;
