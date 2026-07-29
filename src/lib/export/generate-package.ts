import { saveAs } from "file-saver";
import JSZip from "jszip";
import { generateBrandsheetPdf } from "@/lib/export/generate-brandsheet";
import { svgToPngBlob } from "@/lib/export/svg-to-png";
import { lockupHasSource } from "@/lib/lockups";
import {
  buildAssetPath,
  buildBrandsheetPath,
  buildPngFileName,
  buildSvgFileName,
  buildZipFileName,
} from "@/lib/naming";
import { buildLockupSvg, prepareSvgForExport } from "@/lib/svg";
import type {
  BrandColor,
  ExportSettings,
  LockupConfig,
  SpacingConfig,
} from "@/types/project";
import {
  ORIGINAL_COLOR,
  resolveExportColors,
  LOCKUP_ORDER,
} from "@/types/project";

export { svgToPngBlob } from "@/lib/export/svg-to-png";

export interface GeneratePackageInput {
  brandName: string;
  iconRaw: string | null;
  wordmarkRaw: string | null;
  horizontalRaw: string | null;
  verticalRaw: string | null;
  submarkRaw: string | null;
  monogramRaw: string | null;
  composeFromParts: boolean;
  lockups: LockupConfig;
  spacing: SpacingConfig;
  colors: BrandColor[];
  exportSettings: ExportSettings;
  onProgress?: (message: string) => void;
}

function pngPlateForColor(
  color: BrandColor,
  settings: ExportSettings,
  isOriginal: boolean,
): string {
  if (settings.transparent) return "#ffffff";
  if (isOriginal) return settings.pngBackground;
  if (color.hex.toLowerCase() === "#ffffff") {
    // White logos need a dark plate when opaque
    return "#111111";
  }
  return settings.pngBackground;
}

export async function generateBrandPackage(
  input: GeneratePackageInput,
): Promise<void> {
  const {
    brandName,
    iconRaw,
    wordmarkRaw,
    horizontalRaw,
    verticalRaw,
    submarkRaw,
    monogramRaw,
    composeFromParts,
    lockups,
    spacing,
    colors,
    exportSettings,
    onProgress,
  } = input;

  const assets = {
    iconRaw,
    wordmarkRaw,
    horizontalRaw,
    verticalRaw,
    submarkRaw,
    monogramRaw,
    composeFromParts,
  };

  const zip = new JSZip();
  const variationColors = resolveExportColors(colors, exportSettings);

  for (const lockup of LOCKUP_ORDER) {
    if (!lockups[lockup]) continue;
    if (!lockupHasSource(lockup, assets)) continue;

    const colorPasses: { color: BrandColor; recolor: string | null }[] = [
      ...variationColors.map((color) => ({
        color,
        recolor: color.hex as string | null,
      })),
    ];
    if (exportSettings.includeOriginal) {
      colorPasses.unshift({ color: ORIGINAL_COLOR, recolor: null });
    }

    for (const { color, recolor } of colorPasses) {
      onProgress?.(`Building ${lockup} · ${color.name}`);

      const svgString = prepareSvgForExport(
        buildLockupSvg({
          lockup,
          iconRaw,
          wordmarkRaw,
          horizontalRaw,
          verticalRaw,
          submarkRaw,
          monogramRaw,
          composeFromParts,
          color: recolor,
          gapHorizontal: spacing.horizontal,
          gapVertical: spacing.vertical,
          padding: spacing.padding,
          iconScaleHorizontal: spacing.iconScaleHorizontal,
          iconScaleVertical: spacing.iconScaleVertical,
          alignHorizontal: spacing.alignHorizontal,
          alignVertical: spacing.alignVertical,
        }),
      );

      if (exportSettings.svg) {
        const fileName = buildSvgFileName(brandName, lockup, color.name);
        const path = buildAssetPath(brandName, lockup, "SVG", fileName);
        zip.file(path, svgString);
      }

      if (exportSettings.png && exportSettings.pngSizes.length > 0) {
        for (const size of exportSettings.pngSizes) {
          onProgress?.(
            `Rendering ${lockup} · ${color.name} · ${size}px wide`,
          );
          const pngBlob = await svgToPngBlob(
            svgString,
            size,
            exportSettings.transparent,
            pngPlateForColor(color, exportSettings, recolor === null),
          );
          const fileName = buildPngFileName(
            brandName,
            lockup,
            color.name,
            size,
          );
          const path = buildAssetPath(brandName, lockup, "PNG", fileName);
          zip.file(path, pngBlob);
        }
      }
    }
  }

  if (exportSettings.brandsheet) {
    onProgress?.("Building brand sheet PDF…");
    const pdfBlob = await generateBrandsheetPdf({
      brandName,
      assets,
      lockups,
      spacing,
      colors,
      exportSettings,
      onProgress,
    });
    zip.file(buildBrandsheetPath(brandName), pdfBlob);
  }

  onProgress?.("Compressing ZIP…");
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, buildZipFileName(brandName));
}
