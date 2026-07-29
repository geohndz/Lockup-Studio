"use client";

import { create } from "zustand";
import { isNearBlackOrWhite, normalizeHex, type ContrastMethod } from "@/lib/color";
import { lockupHasSource } from "@/lib/lockups";
import {
  DEFAULT_COLORS,
  DEFAULT_EXPORT,
  DEFAULT_LOCKUPS,
  DEFAULT_SPACING,
  LOCKUP_ORDER,
  colorsWithMonoVariations,
  type AssetMode,
  type BrandColor,
  type ColorRole,
  type ExportSettings,
  type LockupConfig,
  type LockupType,
  type PngSize,
  type SpacingConfig,
  type SvgAsset,
} from "@/types/project";

export interface ProjectState {
  brandName: string;
  horizontal: SvgAsset | null;
  vertical: SvgAsset | null;
  icon: SvgAsset | null;
  wordmark: SvgAsset | null;
  submark: SvgAsset | null;
  monogram: SvgAsset | null;
  /** upload = use H/V files; build = compose H/V from icon + wordmark */
  assetMode: AssetMode;
  lockups: LockupConfig;
  spacing: SpacingConfig;
  colors: BrandColor[];
  /** Contrast algorithm for combination checks + in-context seeding. */
  contrastMethod: ContrastMethod;
  exportSettings: ExportSettings;
  isGenerating: boolean;
  generateProgress: string | null;
  /** Brief notice when palette auto-updates from an upload. */
  paletteNotice: string | null;

  setBrandName: (name: string) => void;
  setHorizontal: (asset: SvgAsset | null) => void;
  setVertical: (asset: SvgAsset | null) => void;
  setIcon: (asset: SvgAsset | null) => void;
  setWordmark: (asset: SvgAsset | null) => void;
  setSubmark: (asset: SvgAsset | null) => void;
  setMonogram: (asset: SvgAsset | null) => void;
  setAssetMode: (mode: AssetMode) => void;
  setLockup: (lockup: LockupType, enabled: boolean) => void;
  setSpacing: <K extends keyof SpacingConfig>(
    key: K,
    value: SpacingConfig[K],
  ) => void;
  addColor: (
    color: Omit<BrandColor, "id" | "role"> & { role?: ColorRole },
  ) => string;
  updateColor: (id: string, patch: Partial<Omit<BrandColor, "id">>) => void;
  assignColorRole: (id: string, role: ColorRole) => void;
  removeColor: (id: string) => void;
  /**
   * Apply extracted hexes to primary → secondary → tertiary.
   * When replaceMonoDefaults, drop leftover near-B/W swatches not in the seed set.
   */
  seedColorsFromHexes: (
    hexes: string[],
    options?: { replaceMonoDefaults?: boolean },
  ) => string[];
  setContrastMethod: (method: ContrastMethod) => void;
  setExportFormat: (format: "svg" | "png", enabled: boolean) => void;
  togglePngSize: (size: PngSize) => void;
  setTransparent: (transparent: boolean) => void;
  setPngBackground: (hex: string) => void;
  setIncludeOriginal: (include: boolean) => void;
  setBrandsheet: (include: boolean) => void;
  toggleExportColor: (colorId: string) => void;
  setGenerating: (isGenerating: boolean, progress?: string | null) => void;
  clearPaletteNotice: () => void;
  /** One-shot load for the empty-state example brand (skips SVG palette seeding). */
  applyExampleProject: (input: {
    brandName: string;
    horizontal: SvgAsset;
    vertical: SvgAsset;
    icon: SvgAsset;
    wordmark: SvgAsset;
    monogram: SvgAsset;
    spacing: SpacingConfig;
    colors: BrandColor[];
  }) => void;
  canGenerate: () => boolean;
  getGenerateBlockers: () => string[];
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function seedFromUploadedSvg(raw: string | undefined) {
  if (!raw) return;
  void import("@/lib/seed-palette")
    .then(({ seedPaletteFromSvgRaw }) => {
      seedPaletteFromSvgRaw(raw);
    })
    .catch((err) => {
      console.error("[lockup] Failed to seed palette from SVG", err);
    });
}

function withAssetLockup(
  state: ProjectState,
  lockup: LockupType,
  asset: SvgAsset | null,
): Partial<ProjectState> {
  return {
    lockups: asset
      ? { ...state.lockups, [lockup]: true }
      : state.lockups,
  };
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  brandName: "",
  horizontal: null,
  vertical: null,
  icon: null,
  wordmark: null,
  submark: null,
  monogram: null,
  assetMode: "upload",
  lockups: { ...DEFAULT_LOCKUPS },
  spacing: { ...DEFAULT_SPACING },
  colors: DEFAULT_COLORS.map((c) => ({ ...c })),
  contrastMethod: "wcag2",
  exportSettings: {
    ...DEFAULT_EXPORT,
    pngSizes: [...DEFAULT_EXPORT.pngSizes],
    includedColorIds: [...DEFAULT_EXPORT.includedColorIds],
  },
  isGenerating: false,
  generateProgress: null,
  paletteNotice: null,

  setBrandName: (name) => set({ brandName: name }),

  setHorizontal: (asset) => {
    set((state) => ({
      horizontal: asset,
      ...withAssetLockup(state, "horizontal", asset),
    }));
    seedFromUploadedSvg(asset?.raw);
  },

  setVertical: (asset) => {
    set((state) => ({
      vertical: asset,
      ...withAssetLockup(state, "vertical", asset),
    }));
    seedFromUploadedSvg(asset?.raw);
  },

  setIcon: (asset) => {
    set((state) => ({
      icon: asset,
      ...withAssetLockup(state, "icon", asset),
    }));
    seedFromUploadedSvg(asset?.raw);
  },

  setWordmark: (asset) => {
    set((state) => ({
      wordmark: asset,
      ...withAssetLockup(state, "wordmark", asset),
    }));
    seedFromUploadedSvg(asset?.raw);
  },

  setSubmark: (asset) => {
    set((state) => ({
      submark: asset,
      ...withAssetLockup(state, "submark", asset),
    }));
    seedFromUploadedSvg(asset?.raw);
  },

  setMonogram: (asset) => {
    set((state) => ({
      monogram: asset,
      ...withAssetLockup(state, "monogram", asset),
    }));
    seedFromUploadedSvg(asset?.raw);
  },

  setAssetMode: (mode) => set({ assetMode: mode }),

  setLockup: (lockup, enabled) =>
    set((state) => ({
      lockups: { ...state.lockups, [lockup]: enabled },
    })),

  setSpacing: (key, value) =>
    set((state) => ({
      spacing: { ...state.spacing, [key]: value },
    })),

  addColor: (color) => {
    const id = createId("color");
    set((state) => {
      const hasPrimary = state.colors.some((c) => c.role === "primary");
      const hasSecondary = state.colors.some((c) => c.role === "secondary");
      const role =
        color.role ??
        (!hasPrimary ? "primary" : !hasSecondary ? "secondary" : "none");
      const included = state.exportSettings.includedColorIds;
      return {
        colors: [
          ...state.colors,
          {
            name: color.name,
            hex: color.hex,
            role,
            id,
          },
        ],
        exportSettings:
          included.length > 0
            ? {
                ...state.exportSettings,
                includedColorIds: [...included, id],
              }
            : state.exportSettings,
      };
    });
    return id;
  },

  updateColor: (id, patch) =>
    set((state) => ({
      colors: state.colors.map((c) => {
        if (c.id !== id) return c;
        return { ...c, ...patch };
      }),
    })),

  assignColorRole: (id, role) =>
    set((state) => ({
      colors: state.colors.map((c) => {
        if (c.id === id) return { ...c, role };
        if (role !== "none" && c.role === role) {
          return { ...c, role: "none" as ColorRole };
        }
        return c;
      }),
    })),

  removeColor: (id) =>
    set((state) => ({
      colors: state.colors.filter((c) => c.id !== id),
      exportSettings: {
        ...state.exportSettings,
        includedColorIds: state.exportSettings.includedColorIds.filter(
          (cid) => cid !== id,
        ),
      },
    })),

  seedColorsFromHexes: (hexes, options) => {
    const roles: ColorRole[] = ["primary", "secondary", "tertiary"];
    const replaceMonoDefaults = options?.replaceMonoDefaults ?? false;
    const updatedIds: string[] = [];
    const seededHexes = new Set(
      hexes.map((h) => normalizeHex(h).toUpperCase()),
    );

    set((state) => {
      let colors = state.colors.map((c) => ({ ...c }));
      for (let i = 0; i < Math.min(hexes.length, roles.length); i++) {
        const role = roles[i];
        const hex = normalizeHex(hexes[i]).toUpperCase();
        const existingIdx = colors.findIndex((c) => c.role === role);
        if (existingIdx >= 0) {
          const existing = colors[existingIdx];
          colors[existingIdx] = {
            ...existing,
            hex,
            name: hex,
          };
          updatedIds.push(existing.id);
        } else {
          const id = createId("color");
          colors.push({
            id,
            name: hex,
            hex,
            role,
          });
          updatedIds.push(id);
        }
      }

      if (replaceMonoDefaults) {
        colors = colors.filter((c) => {
          if (!isNearBlackOrWhite(c.hex)) return true;
          return seededHexes.has(normalizeHex(c.hex).toUpperCase());
        });
      }

      const included = state.exportSettings.includedColorIds;
      let nextIncluded = included;
      if (included.length > 0) {
        const known = new Set(included);
        for (const id of updatedIds) {
          if (!known.has(id)) {
            nextIncluded = [...nextIncluded, id];
            known.add(id);
          }
        }
      }

      const chromaticCount = hexes.filter((h) => !isNearBlackOrWhite(h)).length;
      const notice =
        chromaticCount > 0
          ? "Colors pulled from your logo — Black & White lockups still export automatically."
          : "Palette set from your logo.";

      return {
        colors,
        paletteNotice: notice,
        exportSettings:
          nextIncluded !== included
            ? { ...state.exportSettings, includedColorIds: nextIncluded }
            : state.exportSettings,
      };
    });
    return updatedIds;
  },

  setContrastMethod: (contrastMethod) => set({ contrastMethod }),

  setExportFormat: (format, enabled) =>
    set((state) => ({
      exportSettings: { ...state.exportSettings, [format]: enabled },
    })),

  togglePngSize: (size) =>
    set((state) => {
      const sizes = state.exportSettings.pngSizes;
      const next = sizes.includes(size)
        ? sizes.filter((s) => s !== size)
        : [...sizes, size].sort((a, b) => a - b);
      return {
        exportSettings: { ...state.exportSettings, pngSizes: next },
      };
    }),

  setTransparent: (transparent) =>
    set((state) => ({
      exportSettings: { ...state.exportSettings, transparent },
    })),

  setPngBackground: (hex) =>
    set((state) => ({
      exportSettings: {
        ...state.exportSettings,
        pngBackground: normalizeHex(hex),
      },
    })),

  setIncludeOriginal: (includeOriginal) =>
    set((state) => ({
      exportSettings: { ...state.exportSettings, includeOriginal },
    })),

  setBrandsheet: (brandsheet) =>
    set((state) => ({
      exportSettings: { ...state.exportSettings, brandsheet },
    })),

  toggleExportColor: (colorId) =>
    set((state) => {
      const allIds = colorsWithMonoVariations(state.colors).map((c) => c.id);
      const current =
        state.exportSettings.includedColorIds.length === 0
          ? allIds
          : state.exportSettings.includedColorIds;
      const has = current.includes(colorId);
      let next = has
        ? current.filter((id) => id !== colorId)
        : [...current, colorId];
      // If everything is selected again, collapse to empty (= all)
      if (next.length === allIds.length && allIds.every((id) => next.includes(id))) {
        next = [];
      }
      return {
        exportSettings: {
          ...state.exportSettings,
          includedColorIds: next,
        },
      };
    }),

  setGenerating: (isGenerating, progress = null) =>
    set({ isGenerating, generateProgress: progress ?? null }),

  clearPaletteNotice: () => set({ paletteNotice: null }),

  applyExampleProject: (input) =>
    set({
      brandName: input.brandName,
      assetMode: "build",
      horizontal: input.horizontal,
      vertical: input.vertical,
      icon: input.icon,
      wordmark: input.wordmark,
      submark: null,
      monogram: input.monogram,
      spacing: { ...input.spacing },
      colors: input.colors.map((c) => ({ ...c })),
      lockups: {
        horizontal: true,
        vertical: true,
        icon: true,
        wordmark: true,
        submark: false,
        monogram: true,
      },
      paletteNotice: null,
      exportSettings: {
        ...DEFAULT_EXPORT,
        pngSizes: [...DEFAULT_EXPORT.pngSizes],
        includedColorIds: input.colors.map((c) => c.id),
      },
    }),

  canGenerate: () => get().getGenerateBlockers().length === 0,

  getGenerateBlockers: () => {
    const state = get();
    const blockers: string[] = [];
    if (!state.brandName.trim()) {
      blockers.push("Add a brand name in the sidebar");
    }
    const hasAsset = Boolean(
      state.horizontal ||
        state.vertical ||
        state.icon ||
        state.wordmark ||
        state.submark ||
        state.monogram,
    );
    if (!hasAsset) {
      blockers.push("Upload at least one SVG");
    }
    const assets = {
      iconRaw: state.icon?.raw ?? null,
      wordmarkRaw: state.wordmark?.raw ?? null,
      horizontalRaw: state.horizontal?.raw ?? null,
      verticalRaw: state.vertical?.raw ?? null,
      submarkRaw: state.submark?.raw ?? null,
      monogramRaw: state.monogram?.raw ?? null,
      composeFromParts: state.assetMode === "build",
    };
    const hasEnabledSource = LOCKUP_ORDER.some(
      (lockup) => state.lockups[lockup] && lockupHasSource(lockup, assets),
    );
    if (hasAsset && !hasEnabledSource) {
      blockers.push("Enable at least one lockup with an asset");
    }
    return blockers;
  },
}));
