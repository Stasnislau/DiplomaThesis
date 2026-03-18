import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/**
 * Determines if dark mode should be active based on theme setting
 */
const getIsDark = (theme: Theme): boolean => {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return theme === "dark";
};

/**
 * Applies the theme to the document
 */
const applyTheme = (isDark: boolean): void => {
  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "system",
      isDark: typeof window !== "undefined" ? getIsDark("system") : false,

      setTheme: (theme: Theme) => {
        const isDark = getIsDark(theme);
        applyTheme(isDark);
        set({ theme, isDark });
      },

      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme: Theme = currentTheme === "dark" ? "light" : "dark";
        const isDark = getIsDark(newTheme);
        applyTheme(isDark);
        set({ theme: newTheme, isDark });
      },
    }),
    {
      name: "theme-storage",
      onRehydrateStorage: () => (state) => {
        if (state) {
          const isDark = getIsDark(state.theme);
          applyTheme(isDark);
          state.isDark = isDark;
        }
      },
    },
  ),
);

if (typeof window !== "undefined") {
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      const { theme, setTheme } = useThemeStore.getState();
      if (theme === "system") {
        setTheme("system");
      }
    });
}
