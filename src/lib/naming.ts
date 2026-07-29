import type { LockupType } from "@/types/project";
import { LOCKUP_LABELS } from "@/types/project";

/** Strip spaces and non-alphanumerics; PascalCase each segment. */
export function toPascalCase(input: string): string {
  const parts = input
    .trim()
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .split(/[\s-_]+/)
    .filter(Boolean);

  if (parts.length === 0) return "Brand";

  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function lockupFolderName(lockup: LockupType): string {
  return LOCKUP_LABELS[lockup];
}

export function buildSvgFileName(
  brandName: string,
  lockup: LockupType,
  colorName: string,
): string {
  return `${toPascalCase(brandName)}-${LOCKUP_LABELS[lockup]}-${toPascalCase(colorName)}.svg`;
}

export function buildPngFileName(
  brandName: string,
  lockup: LockupType,
  colorName: string,
  size: number,
): string {
  return `${toPascalCase(brandName)}-${LOCKUP_LABELS[lockup]}-${toPascalCase(colorName)}-${size}.png`;
}

export function buildZipFileName(brandName: string): string {
  return `${toPascalCase(brandName)}-Lockup.zip`;
}

export function buildBrandsheetFileName(brandName: string): string {
  return `${toPascalCase(brandName)}-BrandSheet.pdf`;
}

export function buildBrandsheetPath(brandName: string): string {
  const root = toPascalCase(brandName);
  return `${root}/${buildBrandsheetFileName(brandName)}`;
}

export function buildAssetPath(
  brandName: string,
  lockup: LockupType,
  format: "SVG" | "PNG",
  fileName: string,
): string {
  const root = toPascalCase(brandName);
  return `${root}/Logos/${format}/${lockupFolderName(lockup)}/${fileName}`;
}
