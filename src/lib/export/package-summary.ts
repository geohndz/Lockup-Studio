import {
  buildAssetPath,
  buildBrandsheetPath,
  buildPngFileName,
  buildSvgFileName,
  buildZipFileName,
  lockupFolderName,
  toPascalCase,
} from "@/lib/naming";
import { lockupHasSource, type LockupAssets } from "@/lib/lockups";
import type {
  BrandColor,
  ExportSettings,
  LockupConfig,
  LockupType,
} from "@/types/project";
import {
  ORIGINAL_COLOR,
  resolveExportColors,
  LOCKUP_LABELS,
  LOCKUP_ORDER,
} from "@/types/project";

export interface PackageFileEntry {
  path: string;
  kind: "svg" | "png" | "pdf";
}

export interface PackageLockupSummary {
  lockup: LockupType;
  label: string;
  svgCount: number;
  pngCount: number;
  fileCount: number;
}

export interface PackageFolderEntry {
  kind: "folder" | "files";
  label: string;
  depth: number;
}

export interface PackageSummary {
  zipName: string;
  rootFolder: string;
  colors: BrandColor[];
  colorCount: number;
  lockups: PackageLockupSummary[];
  files: PackageFileEntry[];
  svgCount: number;
  pngCount: number;
  pdfCount: number;
  brandsheet: boolean;
  totalFiles: number;
  /** Rough uncompressed-ish estimate for UI only. */
  estimatedBytes: number;
  folderTree: PackageFolderEntry[];
}

/** Rough PNG byte estimate for simple logo marks (UI guidance only). */
function estimatePngBytes(width: number): number {
  const height = width * 0.6;
  return Math.round(width * height * 0.08);
}

function estimateSvgBytes(brandName: string): number {
  return 4_000 + brandName.trim().length * 8;
}

export function buildPackageSummary(input: {
  brandName: string;
  assets: LockupAssets;
  lockups: LockupConfig;
  colors: BrandColor[];
  exportSettings: ExportSettings;
}): PackageSummary {
  const { brandName, assets, lockups, colors, exportSettings } = input;
  const variationColors = resolveExportColors(colors, exportSettings);
  const exportColors = exportSettings.includeOriginal
    ? [ORIGINAL_COLOR, ...variationColors]
    : variationColors;
  const rootFolder = toPascalCase(brandName);
  const zipName = buildZipFileName(brandName);
  const files: PackageFileEntry[] = [];
  const lockupSummaries: PackageLockupSummary[] = [];
  let estimatedBytes = 0;
  const svgEst = estimateSvgBytes(brandName);

  for (const lockup of LOCKUP_ORDER) {
    if (!lockups[lockup]) continue;
    if (!lockupHasSource(lockup, assets)) continue;

    let svgCount = 0;
    let pngCount = 0;

    for (const color of exportColors) {
      if (exportSettings.svg) {
        const fileName = buildSvgFileName(brandName, lockup, color.name);
        files.push({
          path: buildAssetPath(brandName, lockup, "SVG", fileName),
          kind: "svg",
        });
        svgCount += 1;
        estimatedBytes += svgEst;
      }

      if (exportSettings.png && exportSettings.pngSizes.length > 0) {
        for (const size of exportSettings.pngSizes) {
          const fileName = buildPngFileName(
            brandName,
            lockup,
            color.name,
            size,
          );
          files.push({
            path: buildAssetPath(brandName, lockup, "PNG", fileName),
            kind: "png",
          });
          pngCount += 1;
          estimatedBytes += estimatePngBytes(size);
        }
      }
    }

    const fileCount = svgCount + pngCount;
    if (fileCount > 0) {
      lockupSummaries.push({
        lockup,
        label: LOCKUP_LABELS[lockup],
        svgCount,
        pngCount,
        fileCount,
      });
    }
  }

  let pdfCount = 0;
  if (exportSettings.brandsheet) {
    files.push({
      path: buildBrandsheetPath(brandName),
      kind: "pdf",
    });
    pdfCount = 1;
    estimatedBytes += 450_000;
  }

  const folderTree = buildFolderTree(
    rootFolder,
    lockupSummaries,
    exportSettings,
    pdfCount > 0,
  );

  return {
    zipName,
    rootFolder,
    colors: exportColors,
    colorCount: exportColors.length,
    lockups: lockupSummaries,
    files,
    svgCount: files.filter((f) => f.kind === "svg").length,
    pngCount: files.filter((f) => f.kind === "png").length,
    pdfCount,
    brandsheet: exportSettings.brandsheet,
    totalFiles: files.length,
    estimatedBytes,
    folderTree,
  };
}

function buildFolderTree(
  rootFolder: string,
  lockups: PackageLockupSummary[],
  exportSettings: ExportSettings,
  includeBrandsheet: boolean,
): PackageFolderEntry[] {
  const entries: PackageFolderEntry[] = [
    { kind: "folder", label: rootFolder, depth: 0 },
  ];

  if (includeBrandsheet) {
    entries.push({
      kind: "files",
      label: "BrandSheet.pdf",
      depth: 1,
    });
  }

  const withSvg = lockups.filter((item) => item.svgCount > 0);
  const withPng = lockups.filter((item) => item.pngCount > 0);
  const hasLogos = withSvg.length > 0 || withPng.length > 0;

  if (hasLogos) {
    entries.push({ kind: "folder", label: "Logos", depth: 1 });
  }

  if (exportSettings.svg && withSvg.length > 0) {
    entries.push({ kind: "folder", label: "SVG", depth: 2 });
    for (const item of withSvg) {
      entries.push({
        kind: "folder",
        label: lockupFolderName(item.lockup),
        depth: 3,
      });
      entries.push({
        kind: "files",
        label: `${item.svgCount} file${item.svgCount === 1 ? "" : "s"}`,
        depth: 4,
      });
    }
  }

  if (exportSettings.png && withPng.length > 0) {
    entries.push({ kind: "folder", label: "PNG", depth: 2 });
    for (const item of withPng) {
      entries.push({
        kind: "folder",
        label: lockupFolderName(item.lockup),
        depth: 3,
      });
      entries.push({
        kind: "files",
        label: `${item.pngCount} file${item.pngCount === 1 ? "" : "s"}`,
        depth: 4,
      });
    }
  }

  return entries;
}

export function formatByteEstimate(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `~${Math.max(1, Math.round(bytes / 1024))} KB`;
  const mb = bytes / (1024 * 1024);
  return mb < 10 ? `~${mb.toFixed(1)} MB` : `~${Math.round(mb)} MB`;
}
