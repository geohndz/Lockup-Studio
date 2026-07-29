import type { LockupType } from "@/types/project";

export interface LockupAssets {
  iconRaw: string | null;
  wordmarkRaw: string | null;
  horizontalRaw: string | null;
  verticalRaw: string | null;
  submarkRaw: string | null;
  monogramRaw: string | null;
  composeFromParts: boolean;
}

/** Whether a lockup can be built from the current uploaded / composed assets. */
export function lockupHasSource(
  lockup: LockupType,
  assets: LockupAssets,
): boolean {
  const {
    iconRaw,
    wordmarkRaw,
    horizontalRaw,
    verticalRaw,
    submarkRaw,
    monogramRaw,
    composeFromParts,
  } = assets;

  if (lockup === "icon") return Boolean(iconRaw);
  if (lockup === "wordmark") return Boolean(wordmarkRaw);
  if (lockup === "submark") return Boolean(submarkRaw);
  if (lockup === "monogram") return Boolean(monogramRaw);
  if (lockup === "horizontal") {
    return (
      Boolean(horizontalRaw) ||
      (composeFromParts && Boolean(iconRaw && wordmarkRaw))
    );
  }
  if (lockup === "vertical") {
    return (
      Boolean(verticalRaw) ||
      (composeFromParts && Boolean(iconRaw && wordmarkRaw))
    );
  }
  return false;
}
