import { sendGAEvent } from "@next/third-parties/google";
import type { AssetMode, LockupType } from "@/types/project";

type EventParams = Record<string, string | number | boolean | undefined>;

/** Fire a GA4 custom event (no-ops safely if GA isn't ready). */
export function trackEvent(name: string, params?: EventParams): void {
  try {
    const cleaned = params
      ? Object.fromEntries(
          Object.entries(params).filter(([, value]) => value !== undefined),
        )
      : undefined;
    if (cleaned && Object.keys(cleaned).length > 0) {
      sendGAEvent("event", name, cleaned);
    } else {
      sendGAEvent("event", name);
    }
  } catch {
    // Analytics must never break the product
  }
}

export const analytics = {
  tryExample: () => trackEvent("try_example"),

  selectAssetMode: (mode: AssetMode) =>
    trackEvent("select_asset_mode", { asset_mode: mode }),

  uploadSvg: (lockup: LockupType) =>
    trackEvent("upload_svg", { lockup_type: lockup }),

  openExport: (assetMode: AssetMode) =>
    trackEvent("open_export", { asset_mode: assetMode }),

  generatePackage: (params: {
    assetMode: AssetMode;
    fileCount: number;
    lockupCount: number;
    colorCount: number;
    svg: boolean;
    png: boolean;
    brandsheet: boolean;
  }) =>
    trackEvent("generate_package", {
      asset_mode: params.assetMode,
      file_count: params.fileCount,
      lockup_count: params.lockupCount,
      color_count: params.colorCount,
      include_svg: params.svg,
      include_png: params.png,
      include_brandsheet: params.brandsheet,
    }),

  generatePackageFailed: (message?: string) =>
    trackEvent("generate_package_failed", {
      error_message: message?.slice(0, 120),
    }),

  share: (method: string) => trackEvent("share", { method }),

  feedback: () => trackEvent("feedback_click"),
};
