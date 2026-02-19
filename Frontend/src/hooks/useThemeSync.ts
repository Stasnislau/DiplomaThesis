import { useEffect } from "react";
import { useThemeStore } from "@/store/useThemeStore";

export const useThemeSync = () => {
  const { theme, isDark } = useThemeStore();

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark, theme]);
};
