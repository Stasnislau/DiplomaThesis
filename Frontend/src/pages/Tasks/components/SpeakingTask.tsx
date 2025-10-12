import Button from "@/components/common/Button";
import React, { useState, useRef } from "react";
import { useAnalyzeAudioFile } from "@/api/hooks/useAnalyzeAudioFile";

const LANGUAGES = ["English", "Spanish", "French", "German", "Russian", "Polish", "Italian"];

const SpeakingTask = () => {
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [analysisResult, setAnalysisResult] = useState<string>("");
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [audioURL, setAudioURL] = useState<string>("");
    const [language, setLanguage] = useState<string>(LANGUAGES[0]);
    const { analyzeAudioFile, isLoading: isAnalyzingAudioFile } =
        useAnalyzeAudioFile();
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const handleAudioFileChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
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
                    console.log("Using audio/ogg for recording.");
                } else {
                    delete mediaRecorderOptions.mimeType;
                    chosenMimeType = 'browser-default';
                    console.warn("audio/webm and audio/ogg not supported, using browser default for recording. This might not be compatible with Whisper.");
                }
            }

            try {
                mediaRecorderRef.current = new MediaRecorder(stream, mediaRecorderOptions);
            } catch (e) {
                console.warn("Failed to set specific mimeType, falling back to new MediaRecorder(stream) without options:", e);
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

                const audioBlob = new Blob(audioChunksRef.current, {
                    type: actualMimeType,
                });
                const recordedFile = new File([audioBlob], `recorded_audio.${fileExtension}`, {
                    type: actualMimeType,
                });
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
            setAnalysisResult(
                "Could not access microphone. Please check permissions."
            );
        }
    };

    const stopRecording = () => {
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== "inactive"
        ) {
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
        <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Speaking Task</h2>
            <div className="mb-4">
                <label className="block text-lg font-medium text-gray-700 mb-2">
                    Choose Language
                </label>
                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white hover:bg-gray-50"
                >
                    {LANGUAGES.map(
                        (lang) => (
                            <option key={lang} value={lang}>
                                {lang}
                            </option>
                        )
                    )}
                </select>
            </div>
            <div className="mb-4">
                <label
                    htmlFor="audioFile-speaking"
                    className="block text-lg font-medium text-gray-700 mb-2"
                >
                    Upload Audio File (MP3 recommended):
                </label>
                <input
                    type="file"
                    id="audioFile-speaking"
                    accept="audio/mpeg,audio/webm,audio/ogg"
                    onChange={handleAudioFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    disabled={isRecording}
                />
            </div>
            <div className="mb-6">
                <Button
                    type="button"
                    onClick={handleRecordButtonClick}
                    variant={isRecording ? "danger" : "primary"}
                >
                    {isRecording ? "Stop Recording" : "Start Recording"}
                </Button>
            </div>

            {audioURL && (
                <div className="mb-6 border p-4 rounded-md">
                    <h3 className="text-md font-medium text-gray-700 mb-2">
                        Your Audio:
                    </h3>
                    <audio src={audioURL} controls className="w-full mb-2" />
                    {audioFile && (
                        <p className="mt-1 text-xs text-gray-600">
                            File: {audioFile.name}
                        </p>
                    )}
                    <Button
                        type="button"
                        onClick={handleClearAudio}
                        variant="tertiary"
                        className="w-full mt-2"
                    >
                        Remove Audio
                    </Button>
                </div>
            )}

            <div className="mb-8">
                <Button
                    type="button"
                    onClick={handleAnalyzeClick}
                    disabled={isAnalyzingAudioFile || !audioFile}
                    variant="secondary"
                    isLoading={isAnalyzingAudioFile}
                >
                    {isAnalyzingAudioFile ? "Analyzing..." : "Analyze Speech"}
                </Button>
            </div>

            {analysisResult && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg shadow">
                    <h2 className="text-xl font-semibold text-gray-800 mb-3">
                        Analysis Result:
                    </h2>
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-white p-3 rounded-md border border-gray-200">
                        {analysisResult}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default SpeakingTask;
