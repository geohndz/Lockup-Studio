export type LockupType =
  | "horizontal"
  | "vertical"
  | "icon"
  | "wordmark"
  | "submark"
  | "monogram";

export type PngSize = 256 | 512 | 1024 | 2048;

/** How horizontal / vertical lockups are sourced. */
export type AssetMode = "upload" | "build";

export type ColorRole =
  | "primary"
  | "secondary"
  | "tertiary"
  | "black"
  | "white"
  | "none";

export interface BrandColor {
  id: string;
  name: string;
  /** Display / mono recolor hex. */
  hex: string;
  role: ColorRole;
}

export interface LockupConfig {
  horizontal: boolean;
  vertical: boolean;
  icon: boolean;
  wordmark: boolean;
  submark: boolean;
  monogram: boolean;
}

export type LockupAlign = "start" | "center" | "end";

export interface SpacingConfig {
  horizontal: number;
  vertical: number;
  padding: number;
  /** Icon size as % of auto-fit scale for horizontal lockups (100 = match wordmark height). */
  iconScaleHorizontal: number;
  /** Icon size as % of auto-fit scale for vertical lockups (100 = match wordmark height). */
  iconScaleVertical: number;
  /** Vertical alignment of icon + wordmark in the horizontal lockup (top / middle / bottom). */
  alignHorizontal: LockupAlign;
  /** Horizontal alignment of icon + wordmark in the vertical lockup (left / center / right). */
  alignVertical: LockupAlign;
}

export interface ExportSettings {
  svg: boolean;
  png: boolean;
  pngSizes: PngSize[];
  transparent: boolean;
  /** Opaque PNG fill when transparent is false. */
  pngBackground: string;
  /** Include original multi-color assets without recoloring. */
  includeOriginal: boolean;
  /**
   * Color variation ids included in the ZIP.
   * Empty means all palette + mono variations.
   */
  includedColorIds: string[];
  /** Include a 2-page Brand Sheet PDF in the ZIP. */
  brandsheet: boolean;
}

export interface SvgAsset {
  raw: string;
  fileName: string;
}

export const LOCKUP_LABELS: Record<LockupType, string> = {
  horizontal: "Horizontal",
  vertical: "Vertical",
  icon: "Icon",
  wordmark: "Wordmark",
  submark: "Submark",
  monogram: "Monogram",
};

export const LOCKUP_ORDER: LockupType[] = [
  "horizontal",
  "vertical",
  "icon",
  "wordmark",
  "submark",
  "monogram",
];

export const COLOR_ROLE_LABELS: Record<ColorRole, string> = {
  primary: "Primary",
  secondary: "Secondary",
  tertiary: "Tertiary",
  black: "Black",
  white: "White",
  none: "Custom",
};

/** Roles assignable in the palette UI (black/white are fixed variations). */
export const COLOR_ROLES: ColorRole[] = [
  "primary",
  "secondary",
  "tertiary",
  "none",
];

export const PNG_SIZE_OPTIONS: PngSize[] = [256, 512, 1024, 2048];

/** Always included in color variations / export — not shown in the palette. */
export const FIXED_MONO_COLORS: BrandColor[] = [
  { id: "__mono-black", name: "Black", hex: "#000000", role: "black" },
  { id: "__mono-white", name: "White", hex: "#FFFFFF", role: "white" },
];

/** Sentinel for original / multi-color export (buildLockupSvg color: null). */
export const ORIGINAL_COLOR: BrandColor = {
  id: "__original",
  name: "Original",
  hex: "#000000",
  role: "none",
};

/** Default palette: black primary + white secondary (editable brand colors). */
export const DEFAULT_COLORS: BrandColor[] = [
  { id: "primary", name: "Black", hex: "#000000", role: "primary" },
  { id: "secondary", name: "White", hex: "#FFFFFF", role: "secondary" },
];

/** Palette colors + fixed black/white for previews and export (deduped by hex). */
export function colorsWithMonoVariations(
  palette: BrandColor[],
): BrandColor[] {
  const paletteOnly = palette.filter(
    (c) => c.role !== "black" && c.role !== "white",
  );
  const hexes = new Set(
    paletteOnly.map((c) => c.hex.replace(/^#/, "").toLowerCase()),
  );
  const monos = FIXED_MONO_COLORS.filter(
    (c) => !hexes.has(c.hex.replace(/^#/, "").toLowerCase()),
  );
  return [...paletteOnly, ...monos];
}

/** Colors included in the ZIP given export settings. */
export function resolveExportColors(
  palette: BrandColor[],
  settings: Pick<ExportSettings, "includedColorIds">,
): BrandColor[] {
  const all = colorsWithMonoVariations(palette);
  if (settings.includedColorIds.length === 0) return all;
  const allowed = new Set(settings.includedColorIds);
  return all.filter((c) => allowed.has(c.id));
}

export const ASSET_MODE_LABELS: Record<AssetMode, string> = {
  upload: "Upload",
  build: "Build",
};

export const DEFAULT_LOCKUPS: LockupConfig = {
  horizontal: true,
  vertical: true,
  icon: true,
  wordmark: true,
  submark: true,
  monogram: true,
};

export const DEFAULT_SPACING: SpacingConfig = {
  horizontal: 24,
  vertical: 16,
  padding: 0,
  iconScaleHorizontal: 100,
  iconScaleVertical: 100,
  alignHorizontal: "center",
  alignVertical: "center",
};

export const DEFAULT_EXPORT: ExportSettings = {
  svg: true,
  png: true,
  pngSizes: [256, 512, 1024, 2048],
  transparent: true,
  pngBackground: "#FFFFFF",
  includeOriginal: false,
  includedColorIds: [],
  brandsheet: true,
};
