"use client";

import { AtSign, Check, FileIcon, FolderIcon, Link2, Package, Share2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { generateBrandPackage } from "@/lib/export/generate-package";
import {
  buildPackageSummary,
  formatByteEstimate,
  type PackageFolderEntry,
} from "@/lib/export/package-summary";
import { analytics } from "@/lib/analytics";
import { lockupHasSource } from "@/lib/lockups";
import { cn } from "@/lib/utils";
import { useHasMultiColorAssets } from "@/hooks/use-live-previews";
import { useProjectStore } from "@/store/project-store";
import {
  LOCKUP_LABELS,
  LOCKUP_ORDER,
  PNG_SIZE_OPTIONS,
  colorsWithMonoVariations,
  type LockupType,
  type PngSize,
} from "@/types/project";

const SHARE_TEXT = "Enjoying Lockup Studio? Share it with other creatives.";

function BlueskyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.848 1.561 1.51.902 2.585.364 3.438.254 5.14.516 6.98c.34 2.413 1.268 4.792 2.288 4.792.456 0 .822-.293 1.693-1.71.87-1.417 1.516-2.286 2.003-2.286.27 0 .486.24.648.72C8.34 11.46 9.72 14.7 12 14.7s3.66-3.24 4.852-6.504c.162-.48.378-.72.648-.72.487 0 1.133.869 2.003 2.286.871 1.417 1.237 1.71 1.693 1.71 1.02 0 1.948-2.379 2.288-4.792.262-1.84.152-3.542-.386-4.395-.659-1.075-1.664-1.737-4.3.22C16.046 4.747 13.087 8.686 12 10.8Z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M14 8.2h2.2V5H14c-2.4 0-4 1.7-4 4.3V11H7.5v3.2H10V22h3.3v-7.8h2.4l.6-3.2h-3V9.4c0-.7.3-1.2 1.2-1.2Z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M6.4 9.3H3.5V20h2.9V9.3ZM5 7.8c.9 0 1.7-.7 1.7-1.7S5.9 4.4 5 4.4s-1.7.7-1.7 1.7.8 1.7 1.7 1.7Zm15.5 6.4c0-2.7-1.5-4.5-4.1-4.5-1.3 0-2.3.6-2.8 1.5h-.1V9.3h-2.8c0 .8 0 10.7 0 10.7h2.8v-6c0-.3 0-.7.1-1 .3-.7.9-1.4 2-1.4 1.4 0 2 1.1 2 2.6v5.8H20.5v-6.1Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.9 2H22l-6.8 7.8L23 22h-6.5l-5.1-6.7L5.7 22H2.5l7.3-8.3L1 2h6.7l4.6 6.1L18.9 2Zm-1.1 18h1.8L6.3 3.9H4.4L17.8 20Z" />
    </svg>
  );
}

function getShareUrl() {
  return typeof window !== "undefined" ? window.location.href : "";
}

function openShareWindow(url: string) {
  window.open(url, "_blank", "noopener,noreferrer,width=600,height=560");
}

function ShareMenuItem({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[14px] font-medium text-[var(--bk-ink-2)] transition-colors hover:bg-[var(--bk-tile)] hover:text-[var(--bk-ink)]"
    >
      <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
        {icon}
      </span>
      {label}
    </button>
  );
}

const TREE_INDENT = 16;

function isLastSibling(
  entries: PackageFolderEntry[],
  index: number,
): boolean {
  const depth = entries[index].depth;
  for (let i = index + 1; i < entries.length; i++) {
    if (entries[i].depth < depth) return true;
    if (entries[i].depth === depth) return false;
  }
  return true;
}

/** Whether a vertical guide should continue under an ancestor at `ancestorDepth`. */
function hasAncestorContinuation(
  entries: PackageFolderEntry[],
  index: number,
  ancestorDepth: number,
): boolean {
  for (let i = index + 1; i < entries.length; i++) {
    if (entries[i].depth <= ancestorDepth) return false;
    return true;
  }
  return false;
}

function FolderTreeView({ entries }: { entries: PackageFolderEntry[] }) {
  return (
    <ul className="m-0 list-none space-y-0 p-0">
      {entries.map((entry, index) => {
        const Icon = entry.kind === "folder" ? FolderIcon : FileIcon;
        const last = isLastSibling(entries, index);
        return (
          <li
            key={`${entry.kind}-${entry.label}-${index}`}
            className="relative flex h-7 items-center font-mono text-[12px] text-[var(--bk-ink-2)]"
          >
            {Array.from({ length: entry.depth }, (_, level) => {
              const isBranch = level === entry.depth - 1;
              const showStem =
                isBranch ||
                hasAncestorContinuation(entries, index, level);
              return (
                <span
                  key={level}
                  className="relative h-full shrink-0"
                  style={{ width: TREE_INDENT }}
                  aria-hidden
                >
                  {showStem ? (
                    <span
                      className="absolute left-1/2 w-px -translate-x-1/2 bg-[var(--bk-hairline)]"
                      style={{
                        top: 0,
                        bottom: isBranch && last ? "50%" : 0,
                      }}
                    />
                  ) : null}
                  {isBranch ? (
                    <span className="absolute top-1/2 left-1/2 h-px w-[8px] -translate-y-1/2 bg-[var(--bk-hairline)]" />
                  ) : null}
                </span>
              );
            })}
            <Icon
              className="size-3.5 shrink-0 text-[var(--bk-ink-3)]"
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="ml-2 min-w-0 truncate">{entry.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function StudioToolbar() {
  const brandName = useProjectStore((s) => s.brandName);
  const horizontal = useProjectStore((s) => s.horizontal);
  const vertical = useProjectStore((s) => s.vertical);
  const icon = useProjectStore((s) => s.icon);
  const wordmark = useProjectStore((s) => s.wordmark);
  const submark = useProjectStore((s) => s.submark);
  const monogram = useProjectStore((s) => s.monogram);
  const assetMode = useProjectStore((s) => s.assetMode);
  const lockups = useProjectStore((s) => s.lockups);
  const setLockup = useProjectStore((s) => s.setLockup);
  const spacing = useProjectStore((s) => s.spacing);
  const colors = useProjectStore((s) => s.colors);
  const exportSettings = useProjectStore((s) => s.exportSettings);
  const setExportFormat = useProjectStore((s) => s.setExportFormat);
  const togglePngSize = useProjectStore((s) => s.togglePngSize);
  const setTransparent = useProjectStore((s) => s.setTransparent);
  const setPngBackground = useProjectStore((s) => s.setPngBackground);
  const setIncludeOriginal = useProjectStore((s) => s.setIncludeOriginal);
  const setBrandsheet = useProjectStore((s) => s.setBrandsheet);
  const toggleExportColor = useProjectStore((s) => s.toggleExportColor);
  const isGenerating = useProjectStore((s) => s.isGenerating);
  const generateProgress = useProjectStore((s) => s.generateProgress);
  const setGenerating = useProjectStore((s) => s.setGenerating);
  const canGenerate = useProjectStore((s) => s.canGenerate);
  const getGenerateBlockers = useProjectStore((s) => s.getGenerateBlockers);
  const hasMultiColor = useHasMultiColorAssets();

  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const hasAssets = Boolean(
    horizontal || vertical || icon || wordmark || submark || monogram,
  );
  const ready = canGenerate();
  const blockers = getGenerateBlockers();
  const hasExportFormat =
    exportSettings.svg ||
    (exportSettings.png && exportSettings.pngSizes.length > 0) ||
    exportSettings.brandsheet;

  const exportColorOptions = useMemo(
    () => colorsWithMonoVariations(colors),
    [colors],
  );

  const isColorIncluded = (colorId: string) => {
    if (exportSettings.includedColorIds.length === 0) return true;
    return exportSettings.includedColorIds.includes(colorId);
  };

  const assets = useMemo(
    () => ({
      iconRaw: icon?.raw ?? null,
      wordmarkRaw: wordmark?.raw ?? null,
      horizontalRaw: horizontal?.raw ?? null,
      verticalRaw: vertical?.raw ?? null,
      submarkRaw: submark?.raw ?? null,
      monogramRaw: monogram?.raw ?? null,
      composeFromParts: assetMode === "build",
    }),
    [
      icon,
      wordmark,
      horizontal,
      vertical,
      submark,
      monogram,
      assetMode,
    ],
  );

  const summary = useMemo(
    () =>
      buildPackageSummary({
        brandName: brandName.trim() || "Brand",
        assets,
        lockups,
        colors,
        exportSettings,
      }),
    [brandName, assets, lockups, colors, exportSettings],
  );

  if (!hasAssets) return null;

  function openExportDialog() {
    setError(null);
    // Enable available lockups that were never explicitly considered —
    // but don't re-force ones the user already unchecked (they stay false).
    for (const lockup of LOCKUP_ORDER) {
      if (!lockupHasSource(lockup, assets) && lockups[lockup]) {
        setLockup(lockup, false);
      }
    }
    analytics.openExport(assetMode);
    setOpen(true);
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      analytics.share("copy");
      setShareCopied(true);
      window.setTimeout(() => {
        setShareCopied(false);
        setShareOpen(false);
      }, 3000);
    } catch {
      // Clipboard unavailable
    }
  }

  function shareTo(network: "bluesky" | "facebook" | "linkedin" | "threads" | "x") {
    const url = getShareUrl();
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(SHARE_TEXT);
    const href =
      network === "bluesky"
        ? `https://bsky.app/intent/compose?text=${encodeURIComponent(`${SHARE_TEXT} ${url}`)}`
        : network === "facebook"
          ? `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
          : network === "linkedin"
            ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
            : network === "threads"
              ? `https://www.threads.net/intent/post?text=${encodeURIComponent(`${SHARE_TEXT} ${url}`)}`
              : `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    analytics.share(network);
    openShareWindow(href);
    setShareOpen(false);
  }

  async function handleDownload() {
    if (!ready || isGenerating || !hasExportFormat || summary.totalFiles === 0)
      return;
    setError(null);
    setGenerating(true, "Preparing…");
    try {
      await generateBrandPackage({
        brandName,
        iconRaw: icon?.raw ?? null,
        wordmarkRaw: wordmark?.raw ?? null,
        horizontalRaw: horizontal?.raw ?? null,
        verticalRaw: vertical?.raw ?? null,
        submarkRaw: submark?.raw ?? null,
        monogramRaw: monogram?.raw ?? null,
        composeFromParts: assetMode === "build",
        lockups,
        spacing,
        colors,
        exportSettings,
        onProgress: (message) => setGenerating(true, message),
      });
      analytics.generatePackage({
        assetMode,
        fileCount: summary.totalFiles,
        lockupCount: LOCKUP_ORDER.filter(
          (lockup) => lockups[lockup] && lockupHasSource(lockup, assets),
        ).length,
        colorCount: summary.colorCount,
        svg: exportSettings.svg,
        png: exportSettings.png,
        brandsheet: exportSettings.brandsheet,
      });
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      analytics.generatePackageFailed(message);
      setError(message);
    } finally {
      setGenerating(false, null);
    }
  }

  return (
    <>
      <footer className="grid h-[76px] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-t border-[var(--bk-hairline)] bg-[var(--bk-card)] px-5 sm:px-10">
        <div className="flex min-w-0 items-center gap-3">
          {error && !open ? (
            <p className="truncate text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : (
            <>
              <p className="min-w-0 truncate text-sm text-[var(--bk-ink)]">
                {shareCopied
                  ? "Link copied — thanks for sharing Lockup Studio"
                  : SHARE_TEXT}
              </p>
              <Popover open={shareOpen} onOpenChange={setShareOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[var(--bk-ink)] px-3 text-[13px] font-medium text-white transition-colors hover:bg-[var(--bk-ink)]/90"
                  >
                    <Share2 className="size-3.5" strokeWidth={2} />
                    Share
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="start"
                  sideOffset={10}
                  className="w-[220px] rounded-[14px] border border-[var(--bk-hairline)] p-1.5 shadow-[var(--bk-shadow-dialog)]"
                >
                  <ShareMenuItem
                    icon={
                      shareCopied ? (
                        <Check className="size-4" strokeWidth={2.25} />
                      ) : (
                        <Link2 className="size-4" strokeWidth={1.75} />
                      )
                    }
                    label={shareCopied ? "Copied" : "Copy link"}
                    onClick={() => void copyShareLink()}
                  />
                  <div className="my-1 h-px bg-[var(--bk-hairline)]" />
                  <ShareMenuItem
                    icon={<BlueskyIcon />}
                    label="Share on Bluesky"
                    onClick={() => shareTo("bluesky")}
                  />
                  <ShareMenuItem
                    icon={<FacebookIcon />}
                    label="Share on Facebook"
                    onClick={() => shareTo("facebook")}
                  />
                  <ShareMenuItem
                    icon={<LinkedInIcon />}
                    label="Share on LinkedIn"
                    onClick={() => shareTo("linkedin")}
                  />
                  <ShareMenuItem
                    icon={<AtSign strokeWidth={1.75} />}
                    label="Share on Threads"
                    onClick={() => shareTo("threads")}
                  />
                  <ShareMenuItem
                    icon={<XIcon />}
                    label="Share on X"
                    onClick={() => shareTo("x")}
                  />
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
        <Link
          href="/privacy"
          className="shrink-0 rounded-full px-3 py-2 text-[13px] font-medium text-[var(--bk-ink-3)] transition-colors hover:bg-[var(--bk-tile)] hover:text-[var(--bk-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--bk-ink)]"
        >
          Privacy & Terms
        </Link>
        <div className="flex min-w-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          {!ready && blockers.length > 0 ? (
            <p className="max-w-[240px] text-right text-[13px] leading-snug text-[var(--bk-ink-3)] sm:max-w-[280px]">
              {blockers[0]}
            </p>
          ) : null}
          <Button
            size="lg"
            disabled={!ready || isGenerating}
            onClick={openExportDialog}
            className="shrink-0"
            title={!ready ? blockers.join(". ") : undefined}
          >
            <Package className="size-[17px]" />
            Generate Lockup Package
          </Button>
        </div>
      </footer>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!isGenerating) setOpen(next);
        }}
      >
        <DialogContent showCloseButton={!isGenerating} className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Export</DialogTitle>
            <DialogDescription>
              Choose lockups, formats, and optional brand sheet, then download
              your lockup package ZIP.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-5">
            <div className="space-y-2.5">
              <p className="bk-card-title m-0">Include</p>
              <p className="bk-support m-0">
                Choose which lockups appear in the export package.
              </p>
              <div className="space-y-0.5 rounded-[var(--bk-radius-tile)] bg-[var(--bk-tile)] p-2">
                {LOCKUP_ORDER.map((lockup: LockupType) => {
                  const available = lockupHasSource(lockup, assets);
                  const checked = Boolean(lockups[lockup] && available);
                  return (
                    <div
                      key={lockup}
                      className={cn(
                        "flex min-h-12 items-center gap-3.5 rounded-[14px] px-2.5 py-2 text-[15px]",
                        available
                          ? "cursor-pointer"
                          : "cursor-not-allowed opacity-45",
                      )}
                      onClick={() => {
                        if (!available || isGenerating) return;
                        setLockup(lockup, !lockups[lockup]);
                      }}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={!available || isGenerating}
                        onCheckedChange={(value) =>
                          setLockup(lockup, value === true)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="font-semibold text-[var(--bk-ink)]">
                        {LOCKUP_LABELS[lockup]}
                      </span>
                      {!available ? (
                        <span className="ml-auto text-[13px] text-[var(--bk-ink-3)]">
                          No asset
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="bk-card-title m-0">Colors</p>
              <p className="bk-support m-0">
                Choose which color variations go in the ZIP. Black and White are
                always listed when available.
              </p>
              <div className="space-y-0.5 rounded-[var(--bk-radius-tile)] bg-[var(--bk-tile)] p-2">
                {exportColorOptions.map((color) => {
                  const checked = isColorIncluded(color.id);
                  return (
                    <div
                      key={color.id}
                      className="flex min-h-12 cursor-pointer items-center gap-3.5 rounded-[14px] px-2.5 py-2 text-[15px]"
                      onClick={() => {
                        if (!isGenerating) toggleExportColor(color.id);
                      }}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={isGenerating}
                        onCheckedChange={() => toggleExportColor(color.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span
                        className="size-4 shrink-0 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: color.hex }}
                        aria-hidden
                      />
                      <span className="font-semibold text-[var(--bk-ink)]">
                        {color.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {hasMultiColor ? (
              <div className="flex min-h-12 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 text-[15px] font-semibold">Original colors</p>
                  <p className="bk-support m-0 mt-0.5">
                    Keep multi-color marks as uploaded (no recolor).
                  </p>
                </div>
                <Switch
                  checked={exportSettings.includeOriginal}
                  onCheckedChange={setIncludeOriginal}
                  disabled={isGenerating}
                  aria-label="Include original multi-color assets"
                />
              </div>
            ) : null}

            <div className="flex min-h-12 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="m-0 text-[15px] font-semibold">Brand sheet PDF</p>
                <p className="bk-support m-0 mt-0.5">
                  2-page+ overview: logo variations, colors, and contrast.
                </p>
              </div>
              <Switch
                checked={exportSettings.brandsheet}
                onCheckedChange={setBrandsheet}
                disabled={isGenerating}
                aria-label="Include brand sheet PDF"
              />
            </div>

            <div className="flex min-h-12 items-center justify-between gap-3">
              <span className="text-[15px] font-semibold">SVG</span>
              <Switch
                checked={exportSettings.svg}
                onCheckedChange={(v) => setExportFormat("svg", v)}
                disabled={isGenerating}
                aria-label="Include SVG"
              />
            </div>

            <div className="flex min-h-12 items-center justify-between gap-3">
              <span className="text-[15px] font-semibold">PNG</span>
              <Switch
                checked={exportSettings.png}
                onCheckedChange={(v) => setExportFormat("png", v)}
                disabled={isGenerating}
                aria-label="Include PNG"
              />
            </div>

            {exportSettings.png ? (
              <div className="space-y-2.5 rounded-[var(--bk-radius-tile)] bg-[var(--bk-tile)] p-4">
                <p className="m-0 text-sm font-semibold text-[var(--bk-ink-2)]">
                  PNG width
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {PNG_SIZE_OPTIONS.map((size) => {
                    const checked = exportSettings.pngSizes.includes(size);
                    return (
                      <div
                        key={size}
                        className="flex min-h-12 cursor-pointer items-center gap-3.5 rounded-[14px] px-1 text-[15px]"
                        onClick={() => {
                          if (!isGenerating) togglePngSize(size as PngSize);
                        }}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() =>
                            togglePngSize(size as PngSize)
                          }
                          disabled={isGenerating}
                          onClick={(e) => e.stopPropagation()}
                        />
                        {size}px
                      </div>
                    );
                  })}
                </div>

                <div className="flex min-h-12 items-center justify-between gap-3 border-t border-[var(--bk-hairline)] pt-3">
                  <span className="text-[15px] font-semibold">Transparent</span>
                  <Switch
                    checked={exportSettings.transparent}
                    onCheckedChange={setTransparent}
                    disabled={isGenerating}
                    aria-label="Transparent PNG background"
                  />
                </div>

                {!exportSettings.transparent ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[14px] font-medium text-[var(--bk-ink-2)]">
                      Opaque plate
                    </span>
                    <label className="flex cursor-pointer items-center gap-2">
                      <span
                        className="size-6 rounded-full ring-1 ring-black/10"
                        style={{
                          backgroundColor: exportSettings.pngBackground,
                        }}
                        aria-hidden
                      />
                      <input
                        type="color"
                        value={exportSettings.pngBackground}
                        disabled={isGenerating}
                        onChange={(e) => setPngBackground(e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                        aria-label="PNG background color"
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-4 rounded-[var(--bk-radius-tile)] bg-[var(--bk-tile)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="bk-card-title m-0">Package summary</p>
                  <p className="mt-1 truncate font-mono text-[13px] text-[var(--bk-ink-2)]">
                    {summary.zipName}
                  </p>
                </div>
                <p className="shrink-0 font-mono text-[13px] tabular-nums text-[var(--bk-ink-3)]">
                  {formatByteEstimate(summary.estimatedBytes)}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="rounded-[var(--bk-radius-tile)] bg-[var(--bk-card)] px-2 py-3">
                  <p className="m-0 text-lg font-semibold tabular-nums tracking-tight">
                    {summary.totalFiles}
                  </p>
                  <p className="bk-meta m-0 mt-0.5">Files</p>
                </div>
                <div className="rounded-[var(--bk-radius-tile)] bg-[var(--bk-card)] px-2 py-3">
                  <p className="m-0 text-lg font-semibold tabular-nums tracking-tight">
                    {summary.lockups.length}
                  </p>
                  <p className="bk-meta m-0 mt-0.5">Lockups</p>
                </div>
                <div className="rounded-[var(--bk-radius-tile)] bg-[var(--bk-card)] px-2 py-3">
                  <p className="m-0 text-lg font-semibold tabular-nums tracking-tight">
                    {summary.colorCount}
                  </p>
                  <p className="bk-meta m-0 mt-0.5">Colors</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <p className="bk-meta m-0">
                  {summary.svgCount} SVG
                  {summary.svgCount === 1 ? "" : "s"}
                  {summary.pngCount > 0
                    ? ` · ${summary.pngCount} PNG${summary.pngCount === 1 ? "" : "s"}`
                    : ""}
                  {summary.pdfCount > 0 ? " · 1 PDF" : ""}
                  {summary.lockups.length > 0
                    ? ` · ${summary.lockups.map((l) => l.label).join(", ")}`
                    : ""}
                </p>

                {summary.folderTree.length > 0 ? (
                  <div className="rounded-[var(--bk-radius-tile)] bg-[var(--bk-card)] px-3 py-3">
                    <FolderTreeView entries={summary.folderTree} />
                  </div>
                ) : null}
              </div>
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {!hasExportFormat ? (
              <p className="bk-support m-0">
                Enable SVG, PNG, and/or Brand sheet PDF to download.
              </p>
            ) : null}
            {hasExportFormat && summary.totalFiles === 0 ? (
              <p className="bk-support m-0">
                No files to export — enable at least one lockup with an asset
                above, or include the brand sheet PDF.
              </p>
            ) : null}
            {isGenerating && generateProgress ? (
              <p className="bk-support m-0">{generateProgress}</p>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="secondary"
              disabled={isGenerating}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                !hasExportFormat || isGenerating || summary.totalFiles === 0
              }
              onClick={() => void handleDownload()}
            >
              <Package className="size-[17px]" />
              {isGenerating ? "Generating…" : "Download ZIP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
