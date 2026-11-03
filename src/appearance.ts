import type { CSSProperties } from "react";
import appearances from "../electron/appearances.json";
export const themes = appearances.themes;
export const motifs = appearances.motifs;
export function themeStyle(id: string): CSSProperties {
  const t = themes.find((t) => t.id === id) || themes[0];
  return {
    "--bg": t.bg,
    "--sidebar": t.sidebar,
    "--surface": t.surface,
    "--input": t.surface,
    "--raised": t.border,
    "--text": t.text,
    "--muted": t.muted,
    "--faint": t.muted,
    "--border": t.border,
    "--subtle": t.sidebar,
    "--accent": t.accent,
    "--accent-hover": t.accent,
    "--accent-dim": t.accent + "18",
    "--accent-text": t.mode === "dark" ? t.bg : "#ffffff",
    "--scroll": t.border,
    "--writing": t.paper,
    "--paper-text": t.text,
    colorScheme: t.mode,
  } as CSSProperties;
}
