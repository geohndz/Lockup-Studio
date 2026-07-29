"use client";

import { Pipette, XIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  hexToHsv,
  hsvToHex,
  hueToHex,
  isLightHex,
  normalizeHex,
  type Hsv,
} from "@/lib/color";
import { cn } from "@/lib/utils";

export type ColorPickerSwatch = {
  id: string;
  name: string;
  hex: string;
};

type EyeDropperCtor = new () => {
  open: () => Promise<{ sRGBHex: string }>;
};

function getEyeDropper(): EyeDropperCtor | null {
  if (typeof window === "undefined") return null;
  return (
    (window as Window & { EyeDropper?: EyeDropperCtor }).EyeDropper ?? null
  );
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function ColorPickerPanel({
  hex,
  onChange,
  swatches,
  confirmLabel,
  onConfirm,
}: {
  hex: string;
  onChange: (hex: string) => void;
  swatches: ColorPickerSwatch[];
  confirmLabel?: string;
  onConfirm?: (hex: string) => void;
}) {
  const normalized = normalizeHex(hex);
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(normalized));
  const [hexDraft, setHexDraft] = useState(normalized.slice(1));
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"sv" | "hue" | null>(null);
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

  useEffect(() => {
    const next = normalizeHex(hex);
    const fromHsv = hsvToHex(hsvRef.current.h, hsvRef.current.s, hsvRef.current.v);
    if (next !== fromHsv) {
      const parsed = hexToHsv(next);
      setHsv(parsed);
      hsvRef.current = parsed;
      setHexDraft(next.slice(1));
    }
  }, [hex]);

  const commitHsv = useCallback(
    (next: Hsv) => {
      setHsv(next);
      hsvRef.current = next;
      const value = hsvToHex(next.h, next.s, next.v);
      setHexDraft(value.slice(1));
      onChange(value);
    },
    [onChange],
  );

  const updateSvFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = svRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const s = clamp01((clientX - rect.left) / rect.width);
      const v = clamp01(1 - (clientY - rect.top) / rect.height);
      commitHsv({ ...hsvRef.current, s, v });
    },
    [commitHsv],
  );

  const updateHueFromPointer = useCallback(
    (clientX: number) => {
      const el = hueRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const h = clamp01((clientX - rect.left) / rect.width) * 360;
      commitHsv({ ...hsvRef.current, h });
    },
    [commitHsv],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (dragging.current === "sv") updateSvFromPointer(e.clientX, e.clientY);
      if (dragging.current === "hue") updateHueFromPointer(e.clientX);
    };
    const onUp = () => {
      dragging.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [updateHueFromPointer, updateSvFromPointer]);

  const onSvPointerDown = (e: ReactPointerEvent) => {
    e.preventDefault();
    dragging.current = "sv";
    updateSvFromPointer(e.clientX, e.clientY);
  };

  const onHuePointerDown = (e: ReactPointerEvent) => {
    e.preventDefault();
    dragging.current = "hue";
    updateHueFromPointer(e.clientX);
  };

  const pickWithEyeDropper = async () => {
    const Ctor = getEyeDropper();
    if (!Ctor) return;
    try {
      const result = await new Ctor().open();
      const value = normalizeHex(result.sRGBHex);
      setHsv(hexToHsv(value));
      setHexDraft(value.slice(1));
      onChange(value);
    } catch {
      // User cancelled
    }
  };

  const pureHue = hueToHex(hsv.h);
  const current = hsvToHex(hsv.h, hsv.s, hsv.v);
  const [eyeDropperSupported, setEyeDropperSupported] = useState(false);

  useEffect(() => {
    setEyeDropperSupported(Boolean(getEyeDropper()));
  }, []);

  return (
    <div className="w-[260px] p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="m-0 text-[13px] font-semibold tracking-tight text-[var(--bk-ink)]">
          Custom
        </p>
        <PopoverClose asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="text-[var(--bk-ink-2)]"
            aria-label="Close color picker"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </Button>
        </PopoverClose>
      </div>

      <div
        ref={svRef}
        role="slider"
        aria-label="Saturation and brightness"
        aria-valuetext={`${Math.round(hsv.s * 100)}% saturation, ${Math.round(hsv.v * 100)}% brightness`}
        tabIndex={0}
        onPointerDown={onSvPointerDown}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 0.08 : 0.02;
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            commitHsv({ ...hsv, s: clamp01(hsv.s - step) });
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            commitHsv({ ...hsv, s: clamp01(hsv.s + step) });
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            commitHsv({ ...hsv, v: clamp01(hsv.v + step) });
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            commitHsv({ ...hsv, v: clamp01(hsv.v - step) });
          }
        }}
        className="relative aspect-square w-full cursor-crosshair touch-none overflow-hidden rounded-[10px]"
        style={{
          backgroundImage: `
            linear-gradient(to top, #000, transparent),
            linear-gradient(to right, #fff, ${pureHue})
          `,
        }}
      >
        <span
          className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            backgroundColor: current,
          }}
        />
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        {eyeDropperSupported ? (
          <button
            type="button"
            onClick={() => void pickWithEyeDropper()}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[9px] text-[var(--bk-ink-2)] transition-colors hover:bg-[var(--bk-tile)] hover:text-[var(--bk-ink)]"
            aria-label="Pick color from screen"
          >
            <Pipette className="size-4" strokeWidth={1.75} />
          </button>
        ) : null}
        <div
          ref={hueRef}
          role="slider"
          aria-label="Hue"
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={Math.round(hsv.h)}
          tabIndex={0}
          onPointerDown={onHuePointerDown}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 12 : 2;
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              commitHsv({ ...hsv, h: (hsv.h - step + 360) % 360 });
            } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              commitHsv({ ...hsv, h: (hsv.h + step) % 360 });
            }
          }}
          className="relative h-3.5 min-w-0 flex-1 cursor-ew-resize touch-none rounded-full"
          style={{
            background:
              "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
          }}
        >
          <span
            className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
            style={{
              left: `${(hsv.h / 360) * 100}%`,
              backgroundColor: pureHue,
            }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="flex h-9 shrink-0 items-center rounded-[9px] bg-[var(--bk-tile)] px-3 text-[12px] font-semibold text-[var(--bk-ink-2)]">
          Hex
        </span>
        <div className="flex h-9 min-w-0 flex-1 items-center rounded-[9px] bg-[var(--bk-tile)] px-3">
          <span className="mr-0.5 text-[13px] font-medium text-[var(--bk-ink-3)]">
            #
          </span>
          <input
            value={hexDraft}
            onChange={(e) => {
              const raw = e.target.value
                .replace(/[^0-9A-Fa-f]/g, "")
                .slice(0, 6)
                .toUpperCase();
              setHexDraft(raw);
              if (raw.length === 6) {
                const value = `#${raw}`;
                setHsv(hexToHsv(value));
                onChange(value);
              }
            }}
            onBlur={() => {
              if (hexDraft.length === 6) {
                const value = normalizeHex(`#${hexDraft}`);
                setHexDraft(value.slice(1));
                setHsv(hexToHsv(value));
                onChange(value);
              } else {
                setHexDraft(normalizeHex(hex).slice(1));
              }
            }}
            className="w-full bg-transparent font-mono text-[13px] font-medium uppercase tracking-wide text-[var(--bk-ink)] outline-none"
            aria-label="Hex color"
            spellCheck={false}
            autoComplete="off"
            inputMode="text"
          />
        </div>
      </div>

      {swatches.length > 0 ? (
        <>
          <div className="my-3.5 h-px bg-[var(--bk-hairline)]" />
          <div className="grid grid-cols-8 gap-1.5">
            {swatches.map((swatch) => {
              const value = normalizeHex(swatch.hex);
              const selected = value === current;
              const light = isLightHex(value);
              return (
                <button
                  key={swatch.id}
                  type="button"
                  title={`${swatch.name} · ${value}`}
                  aria-label={`Use ${swatch.name}`}
                  aria-pressed={selected}
                  onClick={() => {
                    setHsv(hexToHsv(value));
                    setHexDraft(value.slice(1));
                    onChange(value);
                  }}
                  className={cn(
                    "aspect-square cursor-pointer rounded-full transition-transform hover:scale-105",
                    selected
                      ? "ring-2 ring-[var(--bk-ink)] ring-offset-1 ring-offset-[var(--bk-card)]"
                      : light
                        ? "ring-1 ring-inset ring-[var(--bk-hairline)]"
                        : "",
                  )}
                  style={{ backgroundColor: value }}
                />
              );
            })}
          </div>
        </>
      ) : null}

      {onConfirm ? (
        <button
          type="button"
          onClick={() => onConfirm(current)}
          className="mt-3.5 flex h-9 w-full cursor-pointer items-center justify-center rounded-[9px] bg-[var(--bk-ink)] text-[13px] font-medium text-white transition-colors hover:bg-[var(--bk-ink)]/90"
        >
          {confirmLabel ?? "Add color"}
        </button>
      ) : null}
    </div>
  );
}

export function ColorPicker({
  hex,
  onChange,
  swatches,
  children,
  side = "right",
  align = "start",
  open,
  onOpenChange,
  confirmLabel,
  onConfirm,
}: {
  hex: string;
  onChange: (hex: string) => void;
  swatches: ColorPickerSwatch[];
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When set, closing (X / outside) cancels; color commits only via this action. */
  confirmLabel?: string;
  onConfirm?: (hex: string) => void;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={10}
        className="rounded-[12px] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ColorPickerPanel
          hex={hex}
          onChange={onChange}
          swatches={swatches}
          confirmLabel={confirmLabel}
          onConfirm={
            onConfirm
              ? (value) => {
                  onConfirm(value);
                  onOpenChange?.(false);
                }
              : undefined
          }
        />
      </PopoverContent>
    </Popover>
  );
}
