import "@testing-library/jest-dom";
// Initialise the real i18next instance for the entire test run so
// `useTranslation` returns the English fallback strings instead of
// raw keys like `a11y.loading`. Tests that need a different locale
// or a custom mock can still override per-suite with vi.mock.
import "@/config/i18n";

import { vi } from "vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: function (key: string) {
      return store.hasOwnProperty(key) ? store[key] : null;
    },
    setItem: function (key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem: function (key: string) {
      delete store[key];
    },
    clear: function () {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});
