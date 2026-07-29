"use client";

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  Info,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  normalizeSvgViewBox,
  parseSvg,
  recolorSvg,
  recolorSvgMarkup,
  serializeSvg,
} from "@/lib/svg";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/project-store";
import type { LockupAlign } from "@/types/project";

const WORDMARK_DISPLAY_H = 41;
const ICON_SCALE_MIN = 40;
const ICON_SCALE_MAX = 300;
const GAP_MIN = 0;
const GAP_MAX = 240;

type ActiveGuide = "space" | null;

const CONTROL_INFO = {
  iconSize: {
    title: "Icon size",
    body: "How tall the icon is relative to the wordmark. At 100%, they share the same height. Scale up or down to balance the mark.",
  },
  space: {
    title: "Space",
    body: "The gap between the icon and the wordmark in this lockup. Tighter feels connected; more space gives each piece room to breathe.",
  },
} as const;

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Compact numeric field beside a slider — type a value or scrub. */
function ValueInput({
  id,
  value,
  min,
  max,
  unit,
  ariaLabel,
  onCommit,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  ariaLabel: string;
  onCommit: (next: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number.parseInt(text.replace(/[^\d-]/g, ""), 10);
    const next = clampInt(
      Number.isFinite(parsed) ? parsed : value,
      min,
      max,
    );
    setText(String(next));
    if (next !== value) onCommit(next);
  };

  return (
    <div className="flex items-center gap-1">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        value={text}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
          commit();
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            setText(String(value));
            e.currentTarget.blur();
          }
        }}
        className="h-7 w-[38px] rounded-[8px] border-0 bg-[var(--bk-tile)] px-1.5 text-right text-sm font-semibold tabular-nums text-[var(--bk-ink)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bk-ink)]"
      />
      <span className="text-sm font-semibold tabular-nums text-[var(--bk-ink-3)]">
        {unit}
      </span>
    </div>
  );
}

function ControlInfo({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--bk-ink-3)] transition-colors hover:bg-[var(--bk-tile)] hover:text-[var(--bk-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bk-ink)]"
          aria-label={`About ${title}`}
        >
          <Info className="size-3.5" strokeWidth={2} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-[260px] border border-[var(--bk-hairline)] p-4"
      >
        <p className="m-0 text-[14px] font-semibold tracking-tight text-[var(--bk-ink)]">
          {title}
        </p>
        <p className="mt-1.5 mb-0 text-[13px] leading-relaxed text-[var(--bk-ink-2)]">
          {body}
        </p>
      </PopoverContent>
    </Popover>
  );
}

type Orientation = "horizontal" | "vertical";

const HORIZONTAL_ALIGNS: {
  value: LockupAlign;
  label: string;
  Icon: typeof AlignStartHorizontal;
}[] = [
  { value: "start", label: "Align top", Icon: AlignStartHorizontal },
  { value: "center", label: "Align middle", Icon: AlignCenterHorizontal },
  { value: "end", label: "Align bottom", Icon: AlignEndHorizontal },
];

const VERTICAL_ALIGNS: {
  value: LockupAlign;
  label: string;
  Icon: typeof AlignStartVertical;
}[] = [
  { value: "start", label: "Align left", Icon: AlignStartVertical },
  { value: "center", label: "Align center", Icon: AlignCenterVertical },
  { value: "end", label: "Align right", Icon: AlignEndVertical },
];

function assetToBlackSvg(raw: string): { svg: string; width: number; height: number } {
  const parsed = recolorSvg(parseSvg(recolorSvgMarkup(raw, "#000000")), "#000000");
  const bounds = normalizeSvgViewBox(parsed);
  return {
    svg: serializeSvg(parsed),
    width: bounds.width,
    height: bounds.height,
  };
}

function AlignToggle({
  options,
  value,
  onChange,
}: {
  options: typeof HORIZONTAL_ALIGNS;
  value: LockupAlign;
  onChange: (next: LockupAlign) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-[var(--bk-radius-pill)] bg-[var(--bk-tile)] p-1">
      {options.map(({ value: option, label, Icon }) => {
        const active = value === option;
        return (
          <Tooltip key={option}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={label}
                aria-pressed={active}
                onClick={() => onChange(option)}
                className={`flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--bk-ink)] ${
                  active
                    ? "bg-[var(--bk-ink)] text-white"
                    : "bg-transparent text-[var(--bk-ink-2)]"
                }`}
              >
                <Icon className="size-4" strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

function LockupCardShell({
  title,
  alignControl,
  stage,
  controls,
}: {
  title: string;
  alignControl?: ReactNode;
  stage: ReactNode;
  controls?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="bk-card-title">{title}</span>
        {alignControl}
      </div>
      <div className="flex min-h-[172px] items-center justify-center overflow-hidden rounded-[var(--bk-radius-tile)] bg-[var(--bk-tile)] px-6 py-10">
        {stage}
      </div>
      {controls}
    </div>
  );
}

/** Band between icon and wordmark while scrubbing Space. */
function SpaceGuide({
  horizontal,
  size,
  label,
}: {
  horizontal: boolean;
  size: number;
  label: string;
}) {
  if (size < 1) return null;
  return (
    <div
      className={cn(
        "pointer-events-none relative flex shrink-0 items-center justify-center",
        horizontal ? "self-stretch" : "w-full",
      )}
      style={horizontal ? { width: size } : { height: size }}
      aria-hidden
    >
      <div
        className={cn(
          "absolute bg-[var(--bk-ink)]/12",
          horizontal ? "inset-y-0 left-0 right-0" : "inset-x-0 top-0 bottom-0",
        )}
      />
      <div
        className={cn(
          "absolute bg-[var(--bk-ink)]/45",
          horizontal
            ? "top-1/2 left-0 right-0 h-px -translate-y-1/2"
            : "left-1/2 top-0 bottom-0 w-px -translate-x-1/2",
        )}
      />
      <span className="relative z-10 rounded-full bg-[var(--bk-ink)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums tracking-tight text-white shadow-[var(--bk-shadow-input)]">
        {label}
      </span>
    </div>
  );
}

export function LockupEditor({
  orientation,
  title,
  composeFromParts,
}: {
  orientation: Orientation;
  title: string;
  composeFromParts: boolean;
}) {
  const icon = useProjectStore((s) => s.icon);
  const wordmark = useProjectStore((s) => s.wordmark);
  const horizontal = useProjectStore((s) => s.horizontal);
  const vertical = useProjectStore((s) => s.vertical);
  const spacing = useProjectStore((s) => s.spacing);
  const setSpacing = useProjectStore((s) => s.setSpacing);
  const [activeGuide, setActiveGuide] = useState<ActiveGuide>(null);
  const guideHideTimer = useRef<number | null>(null);
  const pointerScrubbing = useRef(false);

  useEffect(() => {
    return () => {
      if (guideHideTimer.current != null) {
        window.clearTimeout(guideHideTimer.current);
      }
    };
  }, []);

  const beginGuide = (kind: Exclude<ActiveGuide, null>) => {
    if (guideHideTimer.current != null) {
      window.clearTimeout(guideHideTimer.current);
      guideHideTimer.current = null;
    }
    setActiveGuide(kind);
  };

  const endGuide = () => {
    pointerScrubbing.current = false;
    setActiveGuide(null);
  };

  const pulseGuide = (kind: Exclude<ActiveGuide, null>) => {
    beginGuide(kind);
    if (pointerScrubbing.current) return;
    guideHideTimer.current = window.setTimeout(() => {
      setActiveGuide(null);
      guideHideTimer.current = null;
    }, 700);
  };

  const iconScaleKey =
    orientation === "horizontal" ? "iconScaleHorizontal" : "iconScaleVertical";
  const gapKey = orientation === "horizontal" ? "horizontal" : "vertical";
  const alignKey =
    orientation === "horizontal" ? "alignHorizontal" : "alignVertical";

  const iconScale = spacing[iconScaleKey];
  const gap = spacing[gapKey];
  const align = spacing[alignKey];

  // Draft locally while scrubbing so we don't rebuild every color/context
  // SVG on each slider tick (expensive for complex marks).
  const [draftIconScale, setDraftIconScale] = useState(iconScale);
  const [draftGap, setDraftGap] = useState(gap);

  useEffect(() => {
    setDraftIconScale(iconScale);
  }, [iconScale]);

  useEffect(() => {
    setDraftGap(gap);
  }, [gap]);

  const commitSpacing = <K extends keyof typeof spacing>(
    key: K,
    value: (typeof spacing)[K],
  ) => {
    startTransition(() => {
      setSpacing(key, value);
    });
  };

  const uploadedRaw =
    orientation === "horizontal" ? horizontal?.raw : vertical?.raw;

  const originalPreview = useMemo(() => {
    if (!uploadedRaw) return null;
    try {
      // Main logo stage always shows black for editing clarity
      const parsed = recolorSvg(
        parseSvg(recolorSvgMarkup(uploadedRaw, "#000000")),
        "#000000",
      );
      const bounds = normalizeSvgViewBox(parsed);
      return {
        svg: serializeSvg(parsed),
        width: bounds.width,
        height: bounds.height,
      };
    } catch {
      return null;
    }
  }, [uploadedRaw]);

  const iconAsset = useMemo(
    () => (icon?.raw ? assetToBlackSvg(icon.raw) : null),
    [icon],
  );
  const wordmarkAsset = useMemo(
    () => (wordmark?.raw ? assetToBlackSvg(wordmark.raw) : null),
    [wordmark],
  );

  const displayScale = useMemo(() => {
    if (!wordmarkAsset || wordmarkAsset.height <= 0) return 1;
    return WORDMARK_DISPLAY_H / wordmarkAsset.height;
  }, [wordmarkAsset]);

  const iconDisplayH = WORDMARK_DISPLAY_H * (draftIconScale / 100);
  const iconDisplayW = iconAsset
    ? iconDisplayH * (iconAsset.width / Math.max(iconAsset.height, 1))
    : 0;
  const wordmarkDisplayW = wordmarkAsset
    ? WORDMARK_DISPLAY_H * (wordmarkAsset.width / Math.max(wordmarkAsset.height, 1))
    : 0;
  const gapDisplay = draftGap * displayScale;
  const showSpaceGuide = activeGuide === "space";

  const alignOptions =
    orientation === "horizontal" ? HORIZONTAL_ALIGNS : VERTICAL_ALIGNS;

  const itemsAlignClass =
    align === "start"
      ? "items-start"
      : align === "end"
        ? "items-end"
        : "items-center";

  const isHorizontal = orientation === "horizontal";

  // Upload mode — show lockup in black (color lives in the Colors section)
  if (!composeFromParts) {
    const maxW = 230;
    const maxH = orientation === "vertical" ? 81 : 55;
    const display = originalPreview
      ? (() => {
          const scale = Math.min(
            maxW / Math.max(originalPreview.width, 1),
            maxH / Math.max(originalPreview.height, 1),
          );
          return {
            width: originalPreview.width * scale,
            height: originalPreview.height * scale,
          };
        })()
      : null;

    return (
      <LockupCardShell
        title={title}
        stage={
          originalPreview && display ? (
            <InlineSvg
              svg={originalPreview.svg}
              className="mx-auto"
              style={{
                width: display.width,
                height: display.height,
                maxWidth: "100%",
              }}
            />
          ) : (
            <p className="bk-support m-0">
              Upload a {orientation} lockup in the sidebar
            </p>
          )
        }
      />
    );
  }

  // Build-from-parts mode
  if (!iconAsset && !wordmarkAsset) {
    return (
      <LockupCardShell
        title={title}
        stage={
          <p className="bk-support m-0">Upload icon and wordmark to adjust</p>
        }
      />
    );
  }

  if (!iconAsset || !wordmarkAsset) {
    const alone = iconAsset ?? wordmarkAsset!;
    const missing = iconAsset ? "wordmark" : "icon";
    return (
      <LockupCardShell
        title={title}
        stage={
          <div className="flex flex-col items-center gap-3">
            <InlineSvg
              svg={alone.svg}
              style={{
                height: WORDMARK_DISPLAY_H,
                width:
                  WORDMARK_DISPLAY_H * (alone.width / Math.max(alone.height, 1)),
              }}
            />
            <p className="bk-support m-0 text-center">
              Add a {missing} in the sidebar to compose this lockup.
            </p>
          </div>
        }
      />
    );
  }

  const lockupRow = (
    <div
      className={cn(
        "relative flex select-none",
        isHorizontal
          ? `flex-row ${itemsAlignClass}`
          : `flex-col ${itemsAlignClass}`,
      )}
      style={showSpaceGuide ? undefined : { gap: gapDisplay }}
    >
      <div
        className="relative flex shrink-0 items-center justify-center overflow-visible"
        style={{ width: iconDisplayW, height: iconDisplayH }}
      >
        <InlineSvg
          svg={iconAsset.svg}
          className="block size-full overflow-hidden"
          style={{ width: iconDisplayW, height: iconDisplayH }}
        />
      </div>

      {showSpaceGuide ? (
        <SpaceGuide
          horizontal={isHorizontal}
          size={Math.max(gapDisplay, 2)}
          label={`${draftGap}px`}
        />
      ) : null}

      <div
        className="relative flex shrink-0 items-center justify-center"
        style={{ width: wordmarkDisplayW, height: WORDMARK_DISPLAY_H }}
      >
        <InlineSvg
          svg={wordmarkAsset.svg}
          className="block size-full overflow-hidden"
          style={{ width: wordmarkDisplayW, height: WORDMARK_DISPLAY_H }}
        />
      </div>
    </div>
  );

  return (
    <LockupCardShell
      title={title}
      alignControl={
        <AlignToggle
          options={alignOptions}
          value={align}
          onChange={(next) => commitSpacing(alignKey, next)}
        />
      }
      stage={lockupRow}
      controls={
        <div className="space-y-4 pt-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor={`${orientation}-icon-size-input`}
                  className="text-sm font-medium text-[var(--bk-ink-2)]"
                >
                  Icon size
                </label>
                <ControlInfo {...CONTROL_INFO.iconSize} />
              </div>
              <ValueInput
                id={`${orientation}-icon-size-input`}
                value={draftIconScale}
                min={ICON_SCALE_MIN}
                max={ICON_SCALE_MAX}
                unit="%"
                ariaLabel="Icon size percent"
                onCommit={(next) => {
                  setDraftIconScale(next);
                  commitSpacing(iconScaleKey, next);
                }}
              />
            </div>
            <Slider
              id={`${orientation}-icon-size`}
              min={ICON_SCALE_MIN}
              max={ICON_SCALE_MAX}
              step={1}
              value={[draftIconScale]}
              onValueChange={([next]) => {
                if (typeof next === "number") setDraftIconScale(next);
              }}
              onValueCommit={([next]) => {
                if (typeof next === "number") {
                  commitSpacing(iconScaleKey, next);
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor={`${orientation}-space-input`}
                  className="text-sm font-medium text-[var(--bk-ink-2)]"
                >
                  Space
                </label>
                <ControlInfo {...CONTROL_INFO.space} />
              </div>
              <ValueInput
                id={`${orientation}-space-input`}
                value={draftGap}
                min={GAP_MIN}
                max={GAP_MAX}
                unit="px"
                ariaLabel="Space in pixels"
                onCommit={(next) => {
                  setDraftGap(next);
                  commitSpacing(gapKey, next);
                  pulseGuide("space");
                }}
              />
            </div>
            <Slider
              id={`${orientation}-space`}
              min={GAP_MIN}
              max={GAP_MAX}
              step={1}
              value={[draftGap]}
              onPointerDown={() => {
                pointerScrubbing.current = true;
                beginGuide("space");
              }}
              onValueChange={([next]) => {
                if (typeof next === "number") {
                  setDraftGap(next);
                  pulseGuide("space");
                }
              }}
              onValueCommit={([next]) => {
                if (typeof next === "number") {
                  commitSpacing(gapKey, next);
                }
                endGuide();
              }}
              onPointerUp={endGuide}
            />
          </div>
        </div>
      }
    />
  );
}

function InlineSvg({
  svg,
  className,
  style,
}: {
  svg: string;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastSvgRef = useRef<string | null>(null);

  // Only reinject markup when the SVG string changes — resizing via style
  // must not reparse complex paths on every slider frame.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || lastSvgRef.current === svg) return;
    lastSvgRef.current = svg;
    el.innerHTML = svg.replace(
      "<svg",
      '<svg preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block;margin:auto"',
    );
  }, [svg]);

  return <div ref={ref} className={className} style={style} />;
}
