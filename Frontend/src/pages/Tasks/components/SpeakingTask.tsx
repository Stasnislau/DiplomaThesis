import React, { useRef, useState } from "react";

import Button from "@/components/common/Button";
import { SpeakingAnalysisResult } from "@/api/mutations/analyzeAudioFile";
import { useAnalyzeAudioFile } from "@/api/hooks/useAnalyzeAudioFile";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "english", flag: "🇬🇧" },
  { code: "spanish", flag: "🇪🇸" },
  { code: "french", flag: "🇫🇷" },
  { code: "german", flag: "🇩🇪" },
  { code: "russian", flag: "🇷🇺" },
  { code: "polish", flag: "🇵🇱" },
  { code: "italian", flag: "🇮🇹" },
];

const SpeakingTask = () => {
  const { t } = useTranslation();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<SpeakingAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioURL, setAudioURL] = useState<string>("");
  const [language, setLanguage] = useState<string>(LANGUAGES[0].code);
  const { analyzeAudioFile, isLoading: isAnalyzingAudioFile } = useAnalyzeAudioFile();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleAudioFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      if (audioURL) URL.revokeObjectURL(audioURL);
      const newAudioFile = event.target.files[0];
      setAudioFile(newAudioFile);
      setAudioURL(URL.createObjectURL(newAudioFile));
      setAnalysisResult(null);
      setErrorMessage("");
    }
  };

  const startRecording = async () => {
    try {
      if (audioURL) URL.revokeObjectURL(audioURL);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let chosenMimeType = "audio/webm";
      const mediaRecorderOptions: MediaRecorderOptions = { mimeType: chosenMimeType };

      if (!MediaRecorder.isTypeSupported(chosenMimeType)) {
        if (MediaRecorder.isTypeSupported("audio/ogg; codecs=opus")) {
          chosenMimeType = "audio/ogg; codecs=opus";
          mediaRecorderOptions.mimeType = chosenMimeType;
        } else {
          delete mediaRecorderOptions.mimeType;
        }
      }

      try {
        mediaRecorderRef.current = new MediaRecorder(stream, mediaRecorderOptions);
      } catch {
        mediaRecorderRef.current = new MediaRecorder(stream);
      }

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const actualMimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
        let fileExtension = "webm";
        if (actualMimeType.includes("webm")) fileExtension = "webm";
        else if (actualMimeType.includes("ogg")) fileExtension = "ogg";

        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        const recordedFile = new File([audioBlob], `recorded_audio.${fileExtension}`, { type: actualMimeType });
        setAudioFile(recordedFile);
        setAudioURL(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setAudioURL("");
      setAudioFile(null);
      setAnalysisResult(null);
      setErrorMessage("");
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setErrorMessage("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleRecordButtonClick = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const handleClearAudio = () => {
    if (isRecording) stopRecording();
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioFile(null);
    setAudioURL("");
    setAnalysisResult(null);
    setErrorMessage("");
    const fileInput = document.getElementById("audioFile-speaking") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleAnalyzeClick = async () => {
    if (!audioFile) {
      setErrorMessage("Please upload or record an audio file first.");
      return;
    }

    setAnalysisResult(null);
    setErrorMessage("");
    const backendLanguage = language.charAt(0).toUpperCase() + language.slice(1);
    try {
      const result = await analyzeAudioFile({
        audioFile,
        filename: audioFile.name,
        language: backendLanguage,
      });
      setAnalysisResult(result);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Analysis failed");
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-emerald-500";
    if (confidence >= 0.5) return "text-amber-500";
    return "text-red-500";
  };

  const getFluencyLabel = (score: number): { label: string; color: string } => {
    if (score >= 80) return { label: "Excellent", color: "bg-emerald-500" };
    if (score >= 60) return { label: "Good", color: "bg-blue-500" };
    if (score >= 40) return { label: "Fair", color: "bg-amber-500" };
    return { label: "Needs Work", color: "bg-red-500" };
  };

  const getErrorTypeColor = (errorType: string) => {
    switch (errorType.toLowerCase()) {
      case "grammar": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "vocabulary": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "phrasing": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "fluency": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Language Selection */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 border border-indigo-100 dark:border-gray-600 transition-colors duration-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
            <span className="text-lg" role="img" aria-hidden="true">🌍</span>
          </div>
          <label className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {t("languages.chooseLanguage")}
          </label>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 flex flex-col items-center gap-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                language === lang.code
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-indigo-50 dark:hover:bg-gray-600 hover:border-indigo-200 hover:scale-102"
              }`}
              aria-pressed={language === lang.code}
              aria-label={t(`languages.${lang.code}`)}
            >
              <span className="text-xl" role="img" aria-hidden="true">{lang.flag}</span>
              <span className="text-xs">{t(`languages.${lang.code}`)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recording Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
            <span className="text-lg" role="img" aria-hidden="true">🎙️</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Record or Upload Audio</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <button
            onClick={handleRecordButtonClick}
            className={`relative flex items-center justify-center gap-3 py-5 px-6 rounded-2xl font-semibold transition-all duration-300 overflow-hidden focus:outline-none focus:ring-2 focus:ring-red-500 ${
              isRecording
                ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-xl shadow-red-500/40"
                : "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-200 border-2 border-dashed border-gray-300 dark:border-gray-500 hover:border-red-300 dark:hover:border-red-400 hover:from-red-50 dark:hover:from-gray-600 hover:to-rose-50 dark:hover:to-gray-500"
            }`}
          >
            {isRecording && (
              <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-rose-600/20 animate-pulse" />
            )}
            <div className={`relative w-5 h-5 rounded-full ${isRecording ? "bg-white animate-pulse" : "bg-red-500"}`}>
              {isRecording && <div className="absolute inset-0 rounded-full bg-white animate-ping" />}
            </div>
            <span className="relative">{isRecording ? "Stop Recording" : "Start Recording"}</span>
          </button>

          <div>
            <input
              type="file"
              id="audioFile-speaking"
              accept="audio/mpeg,audio/webm,audio/ogg"
              onChange={handleAudioFileChange}
              className="hidden"
              disabled={isRecording}
            />
            <label
              htmlFor="audioFile-speaking"
              className={`flex items-center justify-center gap-3 py-5 px-6 rounded-2xl font-semibold cursor-pointer transition-all duration-200 ${
                isRecording
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-200 border-2 border-dashed border-gray-300 dark:border-gray-500 hover:border-indigo-300 dark:hover:border-indigo-400 hover:from-indigo-50 dark:hover:from-gray-600 hover:to-purple-50 dark:hover:to-gray-500"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Audio File
            </label>
          </div>
        </div>

        {isRecording && (
          <div className="flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-red-500 rounded-full animate-pulse"
                  style={{
                    height: `${12 + Math.random() * 12}px`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
            <span className="text-red-600 dark:text-red-400 font-medium">Recording in progress...</span>
          </div>
        )}
      </div>

      {/* Audio Preview */}
      {audioURL && (
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800 shadow-sm transition-colors duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Your Recording</h3>
                {audioFile && <p className="text-xs text-indigo-600 dark:text-indigo-400">{audioFile.name}</p>}
              </div>
            </div>
            <button
              onClick={handleClearAudio}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 font-medium rounded-lg transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove
            </button>
          </div>
          <audio src={audioURL} controls className="w-full rounded-xl dark:bg-gray-700" />
        </div>
      )}

      {/* Analyze Button */}
      <Button
        onClick={handleAnalyzeClick}
        disabled={isAnalyzingAudioFile || !audioFile}
        variant="primary"
        isLoading={isAnalyzingAudioFile}
        className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAnalyzingAudioFile ? "Analyzing Speech..." : "🎯 Analyze My Speech"}
      </Button>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Structured Analysis Results */}
      {analysisResult && (
        <div className="space-y-5">
          {/* Pronunciation Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Fluency Score */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Fluency</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analysisResult.pronunciation.fluencyScore}
                </span>
                <span className="text-xs text-gray-400 mb-1">/100</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${getFluencyLabel(analysisResult.pronunciation.fluencyScore).color}`}
                  style={{ width: `${analysisResult.pronunciation.fluencyScore}%` }}
                />
              </div>
              <p className={`text-xs mt-1 font-medium ${getFluencyLabel(analysisResult.pronunciation.fluencyScore).color.replace("bg-", "text-")}`}>
                {getFluencyLabel(analysisResult.pronunciation.fluencyScore).label}
              </p>
            </div>

            {/* Confidence */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Clarity</p>
              <span className={`text-2xl font-bold ${getConfidenceColor(analysisResult.pronunciation.overallConfidence)}`}>
                {Math.round(analysisResult.pronunciation.overallConfidence * 100)}%
              </span>
              <p className="text-xs text-gray-400 mt-1">pronunciation confidence</p>
            </div>

            {/* WPM */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Speed</p>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {analysisResult.pronunciation.wordsPerMinute
                  ? `${analysisResult.pronunciation.wordsPerMinute}`
                  : "—"}
              </span>
              <p className="text-xs text-gray-400 mt-1">words/min</p>
            </div>

            {/* Avg Pause */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Pauses</p>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {analysisResult.pronunciation.avgPauseDuration
                  ? `${analysisResult.pronunciation.avgPauseDuration}s`
                  : "—"}
              </span>
              <p className="text-xs text-gray-400 mt-1">avg duration</p>
            </div>
          </div>

          {/* Low Confidence Words */}
          {analysisResult.pronunciation.lowConfidenceWords.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-500">⚠️</span>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Unclear Pronunciation Detected
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {analysisResult.pronunciation.lowConfidenceWords.map((word, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs font-mono"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Transcription */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-3 flex items-center gap-2">
              <span className="text-white">📝</span>
              <h3 className="text-sm font-semibold text-white">Transcription</h3>
              {analysisResult.detectedLanguage && (
                <span className="ml-auto text-xs text-white/70 bg-white/20 px-2 py-0.5 rounded-full">
                  {analysisResult.detectedLanguage}
                </span>
              )}
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {analysisResult.transcription}
              </p>
            </div>
          </div>

          {/* Overall Assessment */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-emerald-500">📊</span>
              <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Overall Assessment</h3>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {analysisResult.overallAssessment}
            </p>
          </div>

          {/* Identified Errors */}
          {analysisResult.identifiedErrors.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 to-rose-500 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-white">⚠️</span>
                  <h3 className="text-sm font-semibold text-white">Identified Errors</h3>
                </div>
                <span className="text-xs text-white/80 bg-white/20 px-2 py-0.5 rounded-full">
                  {analysisResult.identifiedErrors.length} found
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {analysisResult.identifiedErrors.map((error, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold shrink-0 mt-0.5 ${getErrorTypeColor(error.errorType)}`}>
                        {error.errorType}
                      </span>
                      <div className="space-y-1.5 min-w-0">
                        <p className="text-sm font-mono text-red-600 dark:text-red-400 break-words">
                          "{error.erroneousText}"
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {error.explanation}
                        </p>
                        <div className="flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-0.5 shrink-0">→</span>
                          <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                            {error.suggestion}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Positive Points & Areas for Improvement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysisResult.positivePoints.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-emerald-500">✅</span>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Positive Points</h3>
                </div>
                <ul className="space-y-2">
                  {analysisResult.positivePoints.map((point, i) => (
                    <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                      <span className="text-emerald-400 shrink-0">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysisResult.areasForImprovement.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-amber-500">📈</span>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Areas for Improvement</h3>
                </div>
                <ul className="space-y-2">
                  {analysisResult.areasForImprovement.map((area, i) => (
                    <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                      <span className="text-amber-400 shrink-0">•</span>
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakingTask;
