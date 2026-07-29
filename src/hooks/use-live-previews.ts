"use client";

import { useMemo } from "react";
import { lockupHasSource } from "@/lib/lockups";
import { buildLockupSvg, isMultiColorSvg } from "@/lib/svg";
import { useProjectStore } from "@/store/project-store";
import { LOCKUP_LABELS, LOCKUP_ORDER, ORIGINAL_COLOR, colorsWithMonoVariations, type LockupType } from "@/types/project";

export interface PreviewItem {
  lockup: LockupType;
  colorId: string;
  colorName: string;
  colorHex: string;
  svg: string;
}

export function useLivePreviews(): PreviewItem[] {
  const brandName = useProjectStore((s) => s.brandName);
  const horizontal = useProjectStore((s) => s.horizontal);
  const vertical = useProjectStore((s) => s.vertical);
  const icon = useProjectStore((s) => s.icon);
  const wordmark = useProjectStore((s) => s.wordmark);
  const submark = useProjectStore((s) => s.submark);
  const monogram = useProjectStore((s) => s.monogram);
  const assetMode = useProjectStore((s) => s.assetMode);
  const spacing = useProjectStore((s) => s.spacing);
  const colors = useProjectStore((s) => s.colors);

  return useMemo(() => {
    const items: PreviewItem[] = [];
    const iconRaw = icon?.raw ?? null;
    const wordmarkRaw = wordmark?.raw ?? null;
    const horizontalRaw = horizontal?.raw ?? null;
    const verticalRaw = vertical?.raw ?? null;
    const submarkRaw = submark?.raw ?? null;
    const monogramRaw = monogram?.raw ?? null;
    const composeFromParts = assetMode === "build";
    const assets = {
      iconRaw,
      wordmarkRaw,
      horizontalRaw,
      verticalRaw,
      submarkRaw,
      monogramRaw,
      composeFromParts,
    };

    if (
      !iconRaw &&
      !wordmarkRaw &&
      !horizontalRaw &&
      !verticalRaw &&
      !submarkRaw &&
      !monogramRaw
    ) {
      return items;
    }

    const hasMultiColor = [
      iconRaw,
      wordmarkRaw,
      horizontalRaw,
      verticalRaw,
      submarkRaw,
      monogramRaw,
    ].some((raw) => raw && isMultiColorSvg(raw));

    const variationColors = [
      ...(hasMultiColor ? [ORIGINAL_COLOR] : []),
      ...colorsWithMonoVariations(colors),
    ];

    for (const lockup of LOCKUP_ORDER) {
      if (!lockupHasSource(lockup, assets)) continue;

      for (const color of variationColors) {
        const isOriginal = color.id === ORIGINAL_COLOR.id;
        try {
          const svg = buildLockupSvg({
            lockup,
            iconRaw,
            wordmarkRaw,
            horizontalRaw,
            verticalRaw,
            submarkRaw,
            monogramRaw,
            composeFromParts,
            color: isOriginal ? null : color.hex,
            gapHorizontal: spacing.horizontal,
            gapVertical: spacing.vertical,
            padding: spacing.padding,
            iconScaleHorizontal: spacing.iconScaleHorizontal,
            iconScaleVertical: spacing.iconScaleVertical,
            alignHorizontal: spacing.alignHorizontal,
            alignVertical: spacing.alignVertical,
          });
          items.push({
            lockup,
            colorId: color.id,
            colorName: color.name,
            colorHex: isOriginal ? "original" : color.hex,
            svg,
          });
        } catch {
          // Skip invalid combinations
        }
      }
    }

    void brandName;
    return items;
  }, [
    brandName,
    horizontal,
    vertical,
    icon,
    wordmark,
    submark,
    monogram,
    assetMode,
    spacing,
    colors,
  ]);
}

/** True when any uploaded asset has more than one solid paint color. */
export function useHasMultiColorAssets(): boolean {
  const horizontal = useProjectStore((s) => s.horizontal);
  const vertical = useProjectStore((s) => s.vertical);
  const icon = useProjectStore((s) => s.icon);
  const wordmark = useProjectStore((s) => s.wordmark);
  const submark = useProjectStore((s) => s.submark);
  const monogram = useProjectStore((s) => s.monogram);

  return useMemo(() => {
    const raws = [
      horizontal?.raw,
      vertical?.raw,
      icon?.raw,
      wordmark?.raw,
      submark?.raw,
      monogram?.raw,
    ].filter((r): r is string => Boolean(r));
    return raws.some((raw) => isMultiColorSvg(raw));
  }, [horizontal, vertical, icon, wordmark, submark, monogram]);
}

export function usePrimaryColorHex(): string {
  const colors = useProjectStore((s) => s.colors);
  return useMemo(() => {
    const primary =
      colors.find((c) => c.role === "primary") ??
      colors.find((c) => c.id === "primary") ??
      colors[0];
    return primary?.hex ?? "#0A0A0A";
  }, [colors]);
}

export function useSecondaryColorHex(): string {
  const colors = useProjectStore((s) => s.colors);
  const primaryHex = usePrimaryColorHex();
  return useMemo(() => {
    const secondary =
      colors.find((c) => c.role === "secondary") ??
      colors.find((c) => c.id === "secondary") ??
      colors.find(
        (c) =>
          c.role !== "primary" &&
          c.hex.toLowerCase() !== primaryHex.toLowerCase(),
      );
    return secondary?.hex ?? "#FFFFFF";
  }, [colors, primaryHex]);
}

export function useWhiteColorHex(): string {
  return "#FFFFFF";
}

export interface ContextLockupOption {
  value: LockupType;
  label: string;
  svg: string;
}

/** Available lockup SVGs recolored for in-context mockups. */
export function useContextLockupOptions(colorHex: string): ContextLockupOption[] {
  const horizontal = useProjectStore((s) => s.horizontal);
  const vertical = useProjectStore((s) => s.vertical);
  const icon = useProjectStore((s) => s.icon);
  const wordmark = useProjectStore((s) => s.wordmark);
  const submark = useProjectStore((s) => s.submark);
  const monogram = useProjectStore((s) => s.monogram);
  const assetMode = useProjectStore((s) => s.assetMode);
  const spacing = useProjectStore((s) => s.spacing);

  return useMemo(() => {
    const iconRaw = icon?.raw ?? null;
    const wordmarkRaw = wordmark?.raw ?? null;
    const horizontalRaw = horizontal?.raw ?? null;
    const verticalRaw = vertical?.raw ?? null;
    const submarkRaw = submark?.raw ?? null;
    const monogramRaw = monogram?.raw ?? null;
    const composeFromParts = assetMode === "build";
    const assets = {
      iconRaw,
      wordmarkRaw,
      horizontalRaw,
      verticalRaw,
      submarkRaw,
      monogramRaw,
      composeFromParts,
    };
    const options: ContextLockupOption[] = [];

    for (const lockup of LOCKUP_ORDER) {
      if (!lockupHasSource(lockup, assets)) continue;

      try {
        options.push({
          value: lockup,
          label: LOCKUP_LABELS[lockup],
          svg: buildLockupSvg({
            lockup,
            iconRaw,
            wordmarkRaw,
            horizontalRaw,
            verticalRaw,
            submarkRaw,
            monogramRaw,
            composeFromParts,
            color: colorHex,
            gapHorizontal: spacing.horizontal,
            gapVertical: spacing.vertical,
            padding: 0,
            iconScaleHorizontal: spacing.iconScaleHorizontal,
            iconScaleVertical: spacing.iconScaleVertical,
            alignHorizontal: spacing.alignHorizontal,
            alignVertical: spacing.alignVertical,
          }),
        });
      } catch {
        // Skip invalid combinations
      }
    }

    return options;
  }, [
    horizontal,
    vertical,
    icon,
    wordmark,
    submark,
    monogram,
    assetMode,
    spacing,
    colorHex,
  ]);
}
