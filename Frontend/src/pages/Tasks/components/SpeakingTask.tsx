import Button from "@/components/common/Button";
import React, { useState, useRef } from "react";
import { useAnalyzeAudioFile } from "@/api/hooks/useAnalyzeAudioFile";

const LANGUAGES = [
  { code: "English", flag: "🇬🇧" },
  { code: "Spanish", flag: "🇪🇸" },
  { code: "French", flag: "🇫🇷" },
  { code: "German", flag: "🇩🇪" },
  { code: "Russian", flag: "🇷🇺" },
  { code: "Polish", flag: "🇵🇱" },
  { code: "Italian", flag: "🇮🇹" },
];

const SpeakingTask = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioURL, setAudioURL] = useState<string>("");
  const [language, setLanguage] = useState<string>(LANGUAGES[0].code);
  const { analyzeAudioFile, isLoading: isAnalyzingAudioFile } = useAnalyzeAudioFile();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleAudioFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
      const newAudioFile = event.target.files[0];
      setAudioFile(newAudioFile);
      setAudioURL(URL.createObjectURL(newAudioFile));
      setAnalysisResult("");
    }
  };

  const startRecording = async () => {
    try {
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let chosenMimeType = 'audio/webm';
      const mediaRecorderOptions: MediaRecorderOptions = { mimeType: chosenMimeType };

      if (!MediaRecorder.isTypeSupported(chosenMimeType)) {
        console.warn(`Recording in ${chosenMimeType} is not supported. Trying browser default.`);
        if (MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')) {
          chosenMimeType = 'audio/ogg; codecs=opus';
          mediaRecorderOptions.mimeType = chosenMimeType;
        } else {
          delete mediaRecorderOptions.mimeType;
          chosenMimeType = 'browser-default';
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
        const actualMimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        let fileExtension = 'webm';
        if (actualMimeType.includes('webm')) fileExtension = 'webm';
        else if (actualMimeType.includes('ogg')) fileExtension = 'ogg';

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
      setAnalysisResult("");
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setAnalysisResult("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleRecordButtonClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleClearAudio = () => {
    if (isRecording) {
      stopRecording();
    }
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    setAudioFile(null);
    setAudioURL("");
    setAnalysisResult("");
    const fileInput = document.getElementById("audioFile-speaking") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleAnalyzeClick = async () => {
    if (!audioFile) {
      setAnalysisResult("Please upload or record an audio file first.");
      return;
    }

    setAnalysisResult("");
    const result = await analyzeAudioFile({ audioFile, filename: audioFile.name, language: language }) as string;
    setAnalysisResult(result);
  };

  return (
    <div className="space-y-6">
      {/* Language Selection */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <span className="text-lg">🌍</span>
          </div>
          <label className="text-sm font-semibold text-gray-800">
            Choose Language
          </label>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 flex flex-col items-center gap-1 ${
                language === lang.code
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 hover:scale-102"
              }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <span className="text-xs">{lang.code}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recording Section */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
            <span className="text-lg">🎙️</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-800">Record or Upload Audio</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Record Button */}
          <button
            onClick={handleRecordButtonClick}
            className={`relative flex items-center justify-center gap-3 py-5 px-6 rounded-2xl font-semibold transition-all duration-300 overflow-hidden ${
              isRecording
                ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-xl shadow-red-500/40"
                : "bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 border-2 border-dashed border-gray-300 hover:border-red-300 hover:from-red-50 hover:to-rose-50"
            }`}
          >
            {isRecording && (
              <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-rose-600/20 animate-pulse" />
            )}
            <div className={`relative w-5 h-5 rounded-full ${isRecording ? "bg-white animate-pulse" : "bg-red-500"}`}>
              {isRecording && (
                <div className="absolute inset-0 rounded-full bg-white animate-ping" />
              )}
            </div>
            <span className="relative">{isRecording ? "Stop Recording" : "Start Recording"}</span>
          </button>

          {/* Upload Button */}
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
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 border-2 border-dashed border-gray-300 hover:border-indigo-300 hover:from-indigo-50 hover:to-purple-50"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Audio File
            </label>
          </div>
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border border-red-200">
            <div className="flex items-center gap-1">
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i}
                  className="w-1 bg-red-500 rounded-full animate-pulse"
                  style={{ 
                    height: `${12 + Math.random() * 12}px`,
                    animationDelay: `${i * 0.15}s`
                  }}
                />
              ))}
            </div>
            <span className="text-red-600 font-medium">Recording in progress...</span>
          </div>
        )}
      </div>

      {/* Audio Preview */}
      {audioURL && (
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 border border-indigo-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Your Recording</h3>
                {audioFile && (
                  <p className="text-xs text-indigo-600">{audioFile.name}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleClearAudio}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 font-medium rounded-lg transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove
            </button>
          </div>
          
          <audio src={audioURL} controls className="w-full rounded-xl" />
        </div>
      )}

      {/* Analyze Button */}
      <Button
        onClick={handleAnalyzeClick}
        disabled={isAnalyzingAudioFile || !audioFile}
        variant="primary"
        isLoading={isAnalyzingAudioFile}
        className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300"
      >
        {isAnalyzingAudioFile ? "Analyzing Speech..." : "🎯 Analyze My Speech"}
      </Button>

      {/* Analysis Result */}
      {analysisResult && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Speech Analysis Result</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">
                {analysisResult}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakingTask;
