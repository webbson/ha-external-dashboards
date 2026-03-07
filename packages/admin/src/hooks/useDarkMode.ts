import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "admin-theme";

export function useDarkMode() {
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "dark"
  );

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    document.body.style.background = isDark ? "#141414" : "#fff";
  }, [isDark]);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
      return next;
    });
  }, []);

  return { isDark, toggle } as const;
}
