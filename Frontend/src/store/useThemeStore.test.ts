import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { act } from "@testing-library/react";
import { useThemeStore } from "./useThemeStore";

const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe("useThemeStore", () => {
  beforeEach(() => {
    act(() => {
      useThemeStore.setState({ theme: "system", isDark: false });
    });
    document.documentElement.classList.remove("dark");
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts with system theme", () => {
      const state = useThemeStore.getState();
      expect(state.theme).toBe("system");
    });
  });

  describe("setTheme", () => {
    it("sets theme to dark and applies class", () => {
      act(() => {
        useThemeStore.getState().setTheme("dark");
      });

      const state = useThemeStore.getState();
      expect(state.theme).toBe("dark");
      expect(state.isDark).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("sets theme to light and removes dark class", () => {
      document.documentElement.classList.add("dark");

      act(() => {
        useThemeStore.getState().setTheme("light");
      });

      const state = useThemeStore.getState();
      expect(state.theme).toBe("light");
      expect(state.isDark).toBe(false);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("respects system preference when set to system", () => {
      mockMatchMedia(true);

      act(() => {
        useThemeStore.getState().setTheme("system");
      });

      const state = useThemeStore.getState();
      expect(state.theme).toBe("system");
      expect(state.isDark).toBe(true);
    });
  });

  describe("toggleTheme", () => {
    it("toggles from light to dark", () => {
      act(() => {
        useThemeStore.getState().setTheme("light");
      });

      act(() => {
        useThemeStore.getState().toggleTheme();
      });

      expect(useThemeStore.getState().theme).toBe("dark");
      expect(useThemeStore.getState().isDark).toBe(true);
    });

    it("toggles from dark to light", () => {
      act(() => {
        useThemeStore.getState().setTheme("dark");
      });

      act(() => {
        useThemeStore.getState().toggleTheme();
      });

      expect(useThemeStore.getState().theme).toBe("light");
      expect(useThemeStore.getState().isDark).toBe(false);
    });
  });
});
