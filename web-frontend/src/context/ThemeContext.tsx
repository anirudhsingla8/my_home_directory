import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export type Theme = "light" | "dark" | "grey";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
}

const STORAGE_KEY = "inv:theme";
const THEMES: Theme[] = ["light", "dark", "grey"];

const isTheme = (value: unknown): value is Theme =>
  value === "light" || value === "dark" || value === "grey";

const readStored = (): Theme | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isTheme(raw) ? raw : null;
  } catch {
    return null;
  }
};

const detectSystemTheme = (): Theme => {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => readStored() ?? detectSystemTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore quota errors */
    }
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState((current) => {
      const idx = THEMES.indexOf(current);
      const next = THEMES[(idx + 1) % THEMES.length];
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, setTheme, cycleTheme }), [theme, setTheme, cycleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
};
