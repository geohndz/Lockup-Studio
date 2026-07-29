import { useProjectStore } from "@/store/project-store";
import type { BrandColor, SpacingConfig, SvgAsset } from "@/types/project";
import { DEFAULT_SPACING } from "@/types/project";

const EXAMPLE_BRAND_NAME = "ZoneTwo running";

const EXAMPLE_FILES = {
  horizontal: "/examples/horizontal.svg",
  vertical: "/examples/vertical.svg",
  icon: "/examples/icon.svg",
  wordmark: "/examples/wordmark.svg",
  monogram: "/examples/monogram.svg",
} as const;

/** Spacing from the ZoneTwo example session. */
export const EXAMPLE_SPACING: SpacingConfig = {
  ...DEFAULT_SPACING,
  iconScaleHorizontal: 123,
  horizontal: 163,
  iconScaleVertical: 214,
  vertical: 220,
  alignHorizontal: "center",
  alignVertical: "center",
};

export const EXAMPLE_COLORS: BrandColor[] = [
  { id: "primary", name: "Matisse", hex: "#1B7A91", role: "primary" },
  { id: "secondary", name: "White", hex: "#FFFFFF", role: "secondary" },
  { id: "violet", name: "Violet", hex: "#180D4D", role: "none" },
];

async function fetchSvgAsset(
  path: string,
  fileName: string,
): Promise<SvgAsset> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to load example asset: ${fileName}`);
  }
  const raw = await res.text();
  return { raw, fileName };
}

/** Load ZoneTwo example assets, spacing, and palette into the studio. */
export async function loadExampleBrand(): Promise<void> {
  const [horizontal, vertical, icon, wordmark, monogram] = await Promise.all([
    fetchSvgAsset(EXAMPLE_FILES.horizontal, "horizontal.svg"),
    fetchSvgAsset(EXAMPLE_FILES.vertical, "vertical.svg"),
    fetchSvgAsset(EXAMPLE_FILES.icon, "icon.svg"),
    fetchSvgAsset(EXAMPLE_FILES.wordmark, "wordmark.svg"),
    fetchSvgAsset(EXAMPLE_FILES.monogram, "monogram.svg"),
  ]);

  useProjectStore.getState().applyExampleProject({
    brandName: EXAMPLE_BRAND_NAME,
    horizontal,
    vertical,
    icon,
    wordmark,
    monogram,
    spacing: EXAMPLE_SPACING,
    colors: EXAMPLE_COLORS.map((c) => ({ ...c })),
  });
}
