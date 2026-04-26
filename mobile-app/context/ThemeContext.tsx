import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemeName = "light" | "dark" | "grey";

export type ThemeColors = {
  bgPage: string;
  bgCard: string;
  bgElevated: string;
  bgInput: string;
  bgChip: string;
  bgHover: string;
  bgStrong: string;       // primary CTA / inverse surface
  textOnStrong: string;   // text on bgStrong
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textSubtle: string;
  textFaint: string;
  borderDefault: string;
  borderSubtle: string;
  borderStrong: string;
  amber: string;          // accent
  amberSoft: string;      // chip bg
  amberSoftBorder: string;
  amberOnSoft: string;    // text on amberSoft
  rose: string;
  roseSoft: string;
  roseOnSoft: string;
  emerald: string;
  emeraldSoft: string;
  emeraldOnSoft: string;
  overlay: string;        // modal backdrop
  statusBar: "dark" | "light";
};

const lightPalette: ThemeColors = {
  bgPage: "#f8fafc",
  bgCard: "#ffffff",
  bgElevated: "#ffffff",
  bgInput: "#f8fafc",
  bgChip: "#f1f5f9",
  bgHover: "#e2e8f0",
  bgStrong: "#0f172a",
  textOnStrong: "#ffffff",
  textPrimary: "#0f172a",
  textSecondary: "#334155",
  textMuted: "#64748b",
  textSubtle: "#94a3b8",
  textFaint: "#cbd5e1",
  borderDefault: "#e2e8f0",
  borderSubtle: "#f1f5f9",
  borderStrong: "#cbd5e1",
  amber: "#fbbf24",
  amberSoft: "#fef3c7",
  amberSoftBorder: "#fde68a",
  amberOnSoft: "#92400e",
  rose: "#f43f5e",
  roseSoft: "#fee2e2",
  roseOnSoft: "#b91c1c",
  emerald: "#10b981",
  emeraldSoft: "#d1fae5",
  emeraldOnSoft: "#065f46",
  overlay: "rgba(15, 23, 42, 0.45)",
  statusBar: "dark"
};

const darkPalette: ThemeColors = {
  bgPage: "#0b1220",
  bgCard: "#111827",
  bgElevated: "#1e293b",
  bgInput: "#0f172a",
  bgChip: "#1e293b",
  bgHover: "#334155",
  bgStrong: "#f1f5f9",
  textOnStrong: "#0f172a",
  textPrimary: "#f1f5f9",
  textSecondary: "#cbd5e1",
  textMuted: "#94a3b8",
  textSubtle: "#64748b",
  textFaint: "#475569",
  borderDefault: "#1f2937",
  borderSubtle: "#1e293b",
  borderStrong: "#334155",
  amber: "#fbbf24",
  amberSoft: "#3b2f0a",
  amberSoftBorder: "#7c5e10",
  amberOnSoft: "#fde68a",
  rose: "#f43f5e",
  roseSoft: "#3b0c14",
  roseOnSoft: "#fda4af",
  emerald: "#34d399",
  emeraldSoft: "#0c2a20",
  emeraldOnSoft: "#86efac",
  overlay: "rgba(0, 0, 0, 0.6)",
  statusBar: "light"
};

const greyPalette: ThemeColors = {
  bgPage: "#1f1f22",
  bgCard: "#28282c",
  bgElevated: "#303034",
  bgInput: "#28282c",
  bgChip: "#3a3a3f",
  bgHover: "#48484e",
  bgStrong: "#f4f4f5",
  textOnStrong: "#18181b",
  textPrimary: "#f4f4f5",
  textSecondary: "#d4d4d8",
  textMuted: "#a1a1aa",
  textSubtle: "#71717a",
  textFaint: "#52525b",
  borderDefault: "#3a3a3f",
  borderSubtle: "#303034",
  borderStrong: "#52525b",
  amber: "#fbbf24",
  amberSoft: "#3b2f0a",
  amberSoftBorder: "#7c5e10",
  amberOnSoft: "#fde68a",
  rose: "#f43f5e",
  roseSoft: "#3b0c14",
  roseOnSoft: "#fda4af",
  emerald: "#34d399",
  emeraldSoft: "#1f2a23",
  emeraldOnSoft: "#86efac",
  overlay: "rgba(0, 0, 0, 0.55)",
  statusBar: "light"
};

const palettes: Record<ThemeName, ThemeColors> = {
  light: lightPalette,
  dark: darkPalette,
  grey: greyPalette
};

interface ThemeContextType {
  theme: ThemeName;
  colors: ThemeColors;
  setTheme: (name: ThemeName) => void;
  cycleTheme: () => void;
}

const STORAGE_KEY = "inv:theme";
const ORDER: ThemeName[] = ["light", "dark", "grey"];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeName>("light");

  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark" || stored === "grey") {
          setThemeState(stored);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const setTheme = useCallback((next: ThemeName) => {
    setThemeState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState((current) => {
      const idx = ORDER.indexOf(current);
      const next = ORDER[(idx + 1) % ORDER.length];
      void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, colors: palettes[theme], setTheme, cycleTheme }),
    [theme, setTheme, cycleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
};
