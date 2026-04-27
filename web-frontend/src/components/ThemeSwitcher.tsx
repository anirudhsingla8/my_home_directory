import { useEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
  </svg>
);

const CircleHalfIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM10 4v12a6 6 0 000-12z" clipRule="evenodd" />
  </svg>
);

const themeIconMap = {
  light: SunIcon,
  dark: MoonIcon,
  grey: CircleHalfIcon
} as const;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const Icon = themeIconMap[theme];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
        aria-label={`Theme: ${theme}`}
        title={`Theme: ${theme}`}
      >
        <Icon />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/70">
          {(["light", "dark", "grey"] as const).map((t) => {
            const ThemeIcon = themeIconMap[t];
            const active = t === theme;
            return (
              <button
                key={t}
                type="button"
                onClick={() => { setTheme(t); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                  active ? "bg-amber-50 font-semibold text-amber-900" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <ThemeIcon />
                <span className="capitalize">{t}</span>
                {active && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="ml-auto h-4 w-4 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
