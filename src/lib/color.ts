/** Shared color helpers for brand palette UI. */

import { calcAPCA } from "apca-w3";

export function normalizeHex(hex: string): string {
  const cleaned = hex.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) return cleaned.toUpperCase();
  if (/^[0-9A-Fa-f]{6}$/.test(cleaned)) return `#${cleaned.toUpperCase()}`;
  if (/^#[0-9A-Fa-f]{3}$/.test(cleaned)) {
    const [, r, g, b] = cleaned;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^[0-9A-Fa-f]{3}$/.test(cleaned)) {
    const [r, g, b] = cleaned;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return "#000000";
}

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = normalizeHex(hex).slice(1);
  return [
    parseInt(cleaned.slice(0, 2), 16),
    parseInt(cleaned.slice(2, 4), 16),
    parseInt(cleaned.slice(4, 6), 16),
  ];
}

/** `rgb(186, 136, 96)` */
export function formatRgb(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${r}, ${g}, ${b})`;
}

/** `cmyk(0, 27, 48, 27)` — channel values 0–100 */
export function formatCmyk(hex: string): string {
  const [r8, g8, b8] = hexToRgb(hex);
  const r = r8 / 255;
  const g = g8 / 255;
  const b = b8 / 255;
  const k = 1 - Math.max(r, g, b);
  if (k >= 1 - 1e-9) return "cmyk(0, 0, 0, 100)";
  const c = Math.round(((1 - r - k) / (1 - k)) * 100);
  const m = Math.round(((1 - g - k) / (1 - k)) * 100);
  const y = Math.round(((1 - b - k) / (1 - k)) * 100);
  const kk = Math.round(k * 100);
  return `cmyk(${c}, ${m}, ${y}, ${kk})`;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((c) =>
      Math.round(Math.min(255, Math.max(0, c)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase()}`;
}

export type Hsv = { h: number; s: number; v: number }; // h 0–360, s/v 0–1

export function hexToRgbChannels(hex: string): [number, number, number] {
  return hexToRgb(hex);
}

export function hexToHsv(hex: string): Hsv {
  const [r8, g8, b8] = hexToRgb(hex);
  const r = r8 / 255;
  const g = g8 / 255;
  const b = b8 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const hh = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

export function hueToHex(h: number): string {
  return hsvToHex(h, 1, 1);
}

const NAMED_CSS_COLORS: Record<string, string> = {
  black: "#000000",
  white: "#FFFFFF",
  red: "#FF0000",
  green: "#008000",
  blue: "#0000FF",
  yellow: "#FFFF00",
  cyan: "#00FFFF",
  aqua: "#00FFFF",
  magenta: "#FF00FF",
  fuchsia: "#FF00FF",
  orange: "#FFA500",
  purple: "#800080",
  pink: "#FFC0CB",
  gray: "#808080",
  grey: "#808080",
  silver: "#C0C0C0",
  maroon: "#800000",
  navy: "#000080",
  teal: "#008080",
  olive: "#808000",
  lime: "#00FF00",
};

/** Convert an SVG/CSS paint string to a normalized #RRGGBB hex, or null. */
export function paintToHex(paint: string): string | null {
  const v = paint.trim().toLowerCase();
  if (!v || v === "none" || v === "transparent" || v === "currentcolor") {
    return null;
  }
  if (v.startsWith("url(")) return null;

  if (v.startsWith("#") || /^[0-9a-f]{3,8}$/i.test(v)) {
    let hex = v.startsWith("#") ? v.slice(1) : v;
    if (hex.length === 8) hex = hex.slice(0, 6); // drop AA from RRGGBBAA
    if (hex.length === 4) hex = hex.slice(0, 3); // drop A from RGBA short
    const normalized = normalizeHex(`#${hex}`);
    return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : null;
  }

  const named = NAMED_CSS_COLORS[v];
  if (named) return named;

  const rgb = v.match(
    /^rgba?\(\s*([\d.]+)\s*[,/\s]\s*([\d.]+)\s*[,/\s]\s*([\d.]+)(?:\s*[,/]\s*[\d.]+%?)?\s*\)$/,
  );
  if (rgb) {
    return rgbToHex(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]));
  }

  const hsl = v.match(
    /^hsla?\(\s*([\d.]+)\s*[,/\s]\s*([\d.]+)%?\s*[,/\s]\s*([\d.]+)%?(?:\s*[,/]\s*[\d.]+%?)?\s*\)$/,
  );
  if (hsl) {
    return hslToHex(Number(hsl[1]), Number(hsl[2]), Number(hsl[3]));
  }

  return null;
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s > 1 ? s / 100 : s;
  const lig = l > 1 ? l / 100 : l;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = lig - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c);
  };
  return rgbToHex(f(0), f(8), f(4));
}

function colorDistance(a: string, b: string): number {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}

export function isNearBlackOrWhite(hex: string): boolean {
  const n = normalizeHex(hex);
  return colorDistance(n, "#000000") < 18 || colorDistance(n, "#FFFFFF") < 18;
}

/** Deduplicate hexes that are visually near each other; keep first occurrence. */
export function dedupeNearHexes(hexes: string[], threshold = 28): string[] {
  const out: string[] = [];
  for (const hex of hexes) {
    const n = normalizeHex(hex);
    if (out.some((existing) => colorDistance(existing, n) < threshold)) continue;
    out.push(n);
  }
  return out;
}

/** Linear blend between two hex colors. `amount` 0 = a, 1 = b. */
export function mixHex(a: string, b: string, amount: number): string {
  const t = Math.min(1, Math.max(0, amount));
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(
    ar + (br - ar) * t,
    ag + (bg - ag) * t,
    ab + (bb - ab) * t,
  );
}

export function tintHex(hex: string, amount: number): string {
  return mixHex(hex, "#FFFFFF", amount);
}

export function shadeHex(hex: string, amount: number): string {
  return mixHex(hex, "#000000", amount);
}

export function hexLuminance(hex: string): number {
  const [r8, g8, b8] = hexToRgb(hex);
  const r = r8 / 255;
  const g = g8 / 255;
  const b = b8 / 255;
  const toLin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

export function isLightHex(hex: string): boolean {
  return hexLuminance(hex) > 0.45;
}

/** WCAG 2 relative luminance contrast ratio between two hex colors (1–21). */
export function contrastRatio(a: string, b: string): number {
  const L1 = hexLuminance(a);
  const L2 = hexLuminance(b);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastMethod = "wcag2" | "apca";

export const CONTRAST_METHOD_LABELS: Record<ContrastMethod, string> = {
  wcag2: "WCAG 2",
  apca: "APCA",
};

/** WCAG 2.x AA normal text. */
export const WCAG2_AA_RATIO = 4.5;

/**
 * APCA Lc absolute threshold for body-text readability
 * (bronze/silver body guidance ≈ Lc 60).
 */
export const APCA_BODY_LC = 60;

/** Signed APCA Lc (text on background). Polarity: + BoW, − WoB. */
export function apcaContrastLc(fg: string, bg: string): number {
  const value = calcAPCA(normalizeHex(fg), normalizeHex(bg));
  return typeof value === "number" ? value : Number.parseFloat(String(value));
}

/** Absolute score used for pass/fail (ratio or |Lc|). */
export function contrastScore(
  fg: string,
  bg: string,
  method: ContrastMethod = "wcag2",
): number {
  if (method === "apca") return Math.abs(apcaContrastLc(fg, bg));
  return contrastRatio(fg, bg);
}

/** Format for UI: `4.8:1` (WCAG 2) or `Lc 75` (APCA). */
export function formatContrast(
  fg: string,
  bg: string,
  method: ContrastMethod = "wcag2",
): string {
  if (method === "apca") {
    const lc = Math.abs(apcaContrastLc(fg, bg));
    return `Lc ${Number.isFinite(lc) ? Math.round(lc) : 0}`;
  }
  return `${contrastRatio(fg, bg).toFixed(1)}:1`;
}

/** @deprecated Prefer formatContrast(..., "wcag2") */
export function formatContrastRatio(a: string, b: string): string {
  return formatContrast(a, b, "wcag2");
}

export function passesContrastCheck(
  fg: string,
  bg: string,
  method: ContrastMethod = "wcag2",
): boolean {
  if (method === "apca") {
    return contrastScore(fg, bg, "apca") >= APCA_BODY_LC;
  }
  return contrastRatio(fg, bg) >= WCAG2_AA_RATIO;
}

/** WCAG 2 AA normal text requires 4.5:1; non-text UI/icons often use 3:1. */
export function passesContrast(
  fg: string,
  bg: string,
  minimum = WCAG2_AA_RATIO,
): boolean {
  return contrastRatio(fg, bg) >= minimum;
}

export function contrastPassLabel(method: ContrastMethod): string {
  return method === "apca" ? "APCA" : "AA";
}

export type ContrastMethodCopy = {
  /** Full explainer body — truncated to 2 lines with Read more in the UI. */
  body: string;
  /** Optional citation link shown when expanded. */
  sourceHref?: string;
  sourceLabel?: string;
};

export const CONTRAST_METHOD_COPY: Record<ContrastMethod, ContrastMethodCopy> = {
  wcag2: {
    body: `WCAG (Web Content Accessibility Guidelines) 2 AA (${WCAG2_AA_RATIO}:1) is the bare minimum legal/common baseline for text contrast. Following these guidelines will make content more accessible to a wider range of people with disabilities, including accommodations for blindness and low vision, deafness and hearing loss, limited movement, speech disabilities, photosensitivity, and combinations of these, and some accommodation for learning disabilities and cognitive limitations; but will not address every user need for people with these disabilities.`,
    sourceHref: "https://www.w3.org/TR/WCAG21/",
    sourceLabel: "WCAG 2.1",
  },
  apca: {
    body: `APCA (Accessible Perceptual Contrast Algorithm) estimates how contrast is perceived on screens (Lc score). We treat Lc ${APCA_BODY_LC}+ as a pass for body-text readability. Unlike WCAG 2’s simple luminance ratio, APCA accounts for polarity (light-on-dark vs dark-on-light) and is aimed at real-world readability on self-illuminated displays. It is used here as a modern perceptual check — complementary to WCAG 2, not a drop-in legal replacement unless your policy says otherwise.`,
    sourceHref: "https://git.apcacontrast.com/documentation/README.html",
    sourceLabel: "APCA documentation",
  },
};

export type ContrastPairHex = { fgHex: string; bgHex: string };

/** All ordered fg/bg hex pairs from a palette that pass the selected method. */
export function getPassingContrastPairs(
  colors: { hex: string }[],
  method: ContrastMethod = "wcag2",
): ContrastPairHex[] {
  const out: ContrastPairHex[] = [];
  for (const bg of colors) {
    for (const fg of colors) {
      const fgHex = normalizeHex(fg.hex);
      const bgHex = normalizeHex(bg.hex);
      if (fgHex === bgHex) continue;
      if (passesContrastCheck(fgHex, bgHex, method)) {
        out.push({ fgHex, bgHex });
      }
    }
  }
  return out;
}

/** Pick one random passing pair, or null if none. */
export function pickRandomPassingPair(
  colors: { hex: string }[],
  method: ContrastMethod = "wcag2",
): ContrastPairHex | null {
  const pairs = getPassingContrastPairs(colors, method);
  if (pairs.length === 0) return null;
  return pairs[Math.floor(Math.random() * pairs.length)] ?? null;
}
