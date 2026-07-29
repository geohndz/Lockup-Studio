import { normalizeHex } from "@/lib/color";

export type SchemeMode =
  | "monochrome"
  | "monochrome-dark"
  | "monochrome-light"
  | "analogic"
  | "complement"
  | "analogic-complement"
  | "triad"
  | "quad";

export const SCHEME_MODES: SchemeMode[] = [
  "monochrome",
  "monochrome-dark",
  "monochrome-light",
  "analogic",
  "complement",
  "analogic-complement",
  "triad",
  "quad",
];

export const SCHEME_MODE_LABELS: Record<SchemeMode, string> = {
  monochrome: "Monochrome",
  "monochrome-dark": "Monochrome dark",
  "monochrome-light": "Monochrome light",
  analogic: "Analogic",
  complement: "Complement",
  "analogic-complement": "Analogic complement",
  triad: "Triad",
  quad: "Quad",
};

/** How many shades to request — wheel modes pad with seed-like repeats. */
export function schemeColorCount(mode: SchemeMode): number {
  switch (mode) {
    case "complement":
    case "triad":
      return 2;
    case "quad":
      return 3;
    default:
      return 5;
  }
}

export interface ColorApiColor {
  hex: { value: string; clean: string };
  name: { value: string };
  contrast?: { value: string };
}

export interface ColorIdResponse {
  hex: { value: string; clean: string };
  name: { value: string };
  contrast?: { value: string };
}

export interface ColorSchemeResponse {
  mode: string;
  count: string | number;
  colors: ColorApiColor[];
  seed: ColorApiColor;
}

/** Call upstream directly — CORS is open (`*`). Avoids Node TLS/proxy issues on the server. */
const COLOR_API = "https://www.thecolorapi.com";

function cleanHexParam(hex: string): string {
  return normalizeHex(hex).replace(/^#/, "");
}

/** Resolve a human-readable name for a hex via The Color API. */
export async function fetchColorName(hex: string): Promise<string | null> {
  const clean = cleanHexParam(hex);
  try {
    const res = await fetch(
      `${COLOR_API}/id?hex=${encodeURIComponent(clean)}&format=json`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as ColorIdResponse;
    return data.name?.value?.trim() || null;
  } catch {
    return null;
  }
}

/** Fetch a scheme for a seed hex. */
export async function fetchColorScheme(
  hex: string,
  mode: SchemeMode = "monochrome",
  count = 5,
): Promise<ColorSchemeResponse | null> {
  const clean = cleanHexParam(hex);
  try {
    const params = new URLSearchParams({
      hex: clean,
      mode,
      count: String(count),
      format: "json",
    });
    const res = await fetch(`${COLOR_API}/scheme?${params}`);
    if (!res.ok) return null;
    return (await res.json()) as ColorSchemeResponse;
  } catch {
    return null;
  }
}
