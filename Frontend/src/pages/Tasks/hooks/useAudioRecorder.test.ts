import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAudioRecorder } from "./useAudioRecorder";

class FakeMediaRecorder {
  state: "inactive" | "recording" = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  mimeType = "audio/webm";

  static last: FakeMediaRecorder | null = null;

  constructor(_stream: MediaStream, _options?: MediaRecorderOptions) {
    FakeMediaRecorder.last = this;
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["fake-bytes"], { type: this.mimeType }) });
    this.onstop?.();
  }
  static isTypeSupported(_mime: string): boolean {
    return true;
  }
}

const installFakeMediaRecorder = () => {
  // @ts-expect-error — JSDOM doesn't ship MediaRecorder.
  globalThis.MediaRecorder = FakeMediaRecorder;
};

const installFakeGetUserMedia = (shouldFail = false) => {
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: shouldFail
        ? vi.fn().mockRejectedValue(new Error("denied"))
        : vi.fn().mockResolvedValue({
            getTracks: () => [{ stop: vi.fn() }],
          } as unknown as MediaStream),
    },
  });
};

const installFakeObjectURL = () => {
  if (!(globalThis.URL as any).createObjectURL) {
    (globalThis.URL as any).createObjectURL = vi.fn(() => "blob:fake");
  }
  if (!(globalThis.URL as any).revokeObjectURL) {
    (globalThis.URL as any).revokeObjectURL = vi.fn();
  }
};

describe("useAudioRecorder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installFakeMediaRecorder();
    installFakeGetUserMedia();
    installFakeObjectURL();
  });

  afterEach(() => {
    vi.useRealTimers();
    FakeMediaRecorder.last = null;
  });

  it("starts in idle state", () => {
    const { result } = renderHook(() => useAudioRecorder());
    expect(result.current.isRecording).toBe(false);
    expect(result.current.audioFile).toBe(null);
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it("flips to recording after start()", async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.isRecording).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it("auto-stops at maxDurationSeconds and exposes the recorded file", async () => {
    const onStop = vi.fn();
    const { result } = renderHook(() =>
      useAudioRecorder({ maxDurationSeconds: 2, onStop }),
    );
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.isRecording).toBe(false);
    expect(result.current.audioFile).not.toBeNull();
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("surfaces a friendly error when mic access is denied", async () => {
    installFakeGetUserMedia(true);
    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toBe("denied");
  });

  it("reset() wipes recording state without throwing", async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      result.current.reset();
    });
    expect(result.current.isRecording).toBe(false);
    expect(result.current.audioFile).toBe(null);
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it("unmounting mid-recording stops the recorder and revokes the URL", async () => {
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    const { result, unmount } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      result.current.stop();
      await Promise.resolve();
    });
    expect(result.current.audioUrl).not.toBe("");
    const url = result.current.audioUrl;

    revokeSpy.mockClear();
    unmount();
    expect(revokeSpy).toHaveBeenCalledWith(url);
  });
});
