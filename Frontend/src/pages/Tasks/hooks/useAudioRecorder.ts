import { useCallback, useEffect, useRef, useState } from "react";

interface RecorderState {
  isRecording: boolean;
  audioFile: File | null;
  audioUrl: string;
  error: string | null;
  elapsedSeconds: number;
}

interface RecorderControls {
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

interface UseAudioRecorderOptions {
  maxDurationSeconds?: number;
  onStop?: (file: File) => void;
}

const CANDIDATE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/mp4;codecs=mp4a.40.2",
];

const fileExtFor = (mime: string): string => {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  return "webm";
};

export const useAudioRecorder = (
  options: UseAudioRecorderOptions = {},
): RecorderState & RecorderControls => {
  const { maxDurationSeconds, onStop } = options;
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickIntervalRef = useRef<number | null>(null);
  const onStopRef = useRef<typeof onStop>(onStop);
  const audioUrlRef = useRef<string>("");
  useEffect(() => {
    audioUrlRef.current = audioUrl;
  }, [audioUrl]);
  useEffect(() => {
    onStopRef.current = onStop;
  }, [onStop]);

  const teardownTimer = useCallback(() => {
    if (tickIntervalRef.current !== null) {
      window.clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
  }, []);

  const teardownStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setElapsedSeconds(0);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl("");
    setAudioFile(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const supportedMime = CANDIDATE_MIME_TYPES.find((m) =>
        MediaRecorder.isTypeSupported(m),
      );
      const recorderOptions: MediaRecorderOptions = supportedMime
        ? { mimeType: supportedMime }
        : {};
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, recorderOptions);
      } catch {
        recorder = new MediaRecorder(stream);
      }
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const actualMime = recorder.mimeType || supportedMime || "audio/webm";
        const ext = fileExtFor(actualMime);
        const blob = new Blob(chunksRef.current, { type: actualMime });
        const file = new File([blob], `recording.${ext}`, { type: actualMime });
        const url = URL.createObjectURL(blob);
        setAudioFile(file);
        setAudioUrl(url);
        teardownStream();
        teardownTimer();
        setIsRecording(false);
        onStopRef.current?.(file);
      };

      recorder.start();
      setIsRecording(true);
      tickIntervalRef.current = window.setInterval(() => {
        setElapsedSeconds((s) => {
          const next = s + 1;
          if (maxDurationSeconds && next >= maxDurationSeconds) {
            queueMicrotask(() => {
              if (recorder.state !== "inactive") recorder.stop();
            });
          }
          return next;
        });
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Microphone access denied");
      setIsRecording(false);
      teardownStream();
    }
  }, [audioUrl, maxDurationSeconds, teardownStream, teardownTimer]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    } else {
      teardownStream();
      teardownTimer();
      setIsRecording(false);
    }
  }, [teardownStream, teardownTimer]);

  const reset = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch { void 0; }
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    teardownStream();
    teardownTimer();
    setIsRecording(false);
    setAudioFile(null);
    setAudioUrl("");
    setError(null);
    setElapsedSeconds(0);
  }, [audioUrl, teardownStream, teardownTimer]);

  useEffect(() => {
    return () => {
      teardownStream();
      teardownTimer();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const r = recorderRef.current;
      if (r && r.state !== "inactive") {
        try {
          r.stop();
        } catch { void 0; }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isRecording,
    audioFile,
    audioUrl,
    error,
    elapsedSeconds,
    start,
    stop,
    reset,
  };
};
