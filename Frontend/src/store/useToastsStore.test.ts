import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { act } from "@testing-library/react";
import { useToastsStore } from "./useToastsStore";

describe("useToastsStore", () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useToastsStore.setState({ toasts: [] });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("starts with empty toasts array", () => {
      const state = useToastsStore.getState();
      expect(state.toasts).toEqual([]);
    });
  });

  describe("addToast", () => {
    it("adds a toast to the array", () => {
      const { addToast } = useToastsStore.getState();

      act(() => {
        addToast({
          title: "Test Toast",
          content: "Test content",
          severity: "success",
        });
      });

      const { toasts } = useToastsStore.getState();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].title).toBe("Test Toast");
      expect(toasts[0].content).toBe("Test content");
      expect(toasts[0].severity).toBe("success");
    });

    it("assigns unique ids to toasts", () => {
      const { addToast } = useToastsStore.getState();

      // Mock Date.now to return predictable values
      let timestamp = 1000;
      vi.spyOn(Date, "now").mockImplementation(() => timestamp++);

      act(() => {
        addToast({ title: "Toast 1", content: "Content 1" });
        addToast({ title: "Toast 2", content: "Content 2" });
      });

      const { toasts } = useToastsStore.getState();
      expect(toasts[0].id).not.toBe(toasts[1].id);
    });

    it("sets open to true for new toasts", () => {
      const { addToast } = useToastsStore.getState();

      act(() => {
        addToast({ title: "Test", content: "Content" });
      });

      const { toasts } = useToastsStore.getState();
      expect(toasts[0].open).toBe(true);
    });

    it("can add multiple toasts", () => {
      const { addToast } = useToastsStore.getState();

      act(() => {
        addToast({ title: "First", content: "Content 1" });
        addToast({ title: "Second", content: "Content 2" });
        addToast({ title: "Third", content: "Content 3" });
      });

      const { toasts } = useToastsStore.getState();
      expect(toasts).toHaveLength(3);
    });

    it("preserves existing toasts when adding new ones", () => {
      const { addToast } = useToastsStore.getState();

      act(() => {
        addToast({ title: "First", content: "Content 1" });
      });

      act(() => {
        addToast({ title: "Second", content: "Content 2" });
      });

      const { toasts } = useToastsStore.getState();
      expect(toasts).toHaveLength(2);
      expect(toasts[0].title).toBe("First");
      expect(toasts[1].title).toBe("Second");
    });
  });

  describe("removeToast", () => {
    it("removes toast by id", () => {
      const { addToast, removeToast } = useToastsStore.getState();

      act(() => {
        addToast({ title: "Test", content: "Content" });
      });

      const { toasts: toastsAfterAdd } = useToastsStore.getState();
      const toastId = toastsAfterAdd[0].id;

      act(() => {
        removeToast(toastId);
      });

      const { toasts: toastsAfterRemove } = useToastsStore.getState();
      expect(toastsAfterRemove).toHaveLength(0);
    });

    it("only removes the specified toast", () => {
      const { addToast, removeToast } = useToastsStore.getState();

      let timestamp = 1000;
      vi.spyOn(Date, "now").mockImplementation(() => timestamp++);

      act(() => {
        addToast({ title: "First", content: "Content 1" });
        addToast({ title: "Second", content: "Content 2" });
        addToast({ title: "Third", content: "Content 3" });
      });

      const { toasts: toastsAfterAdd } = useToastsStore.getState();
      const secondToastId = toastsAfterAdd[1].id;

      act(() => {
        removeToast(secondToastId);
      });

      const { toasts: toastsAfterRemove } = useToastsStore.getState();
      expect(toastsAfterRemove).toHaveLength(2);
      expect(
        toastsAfterRemove.find((t) => t.title === "Second"),
      ).toBeUndefined();
    });

    it("does nothing if id does not exist", () => {
      const { addToast, removeToast } = useToastsStore.getState();

      act(() => {
        addToast({ title: "Test", content: "Content" });
      });

      act(() => {
        removeToast("non-existent-id");
      });

      const { toasts } = useToastsStore.getState();
      expect(toasts).toHaveLength(1);
    });
  });
});
