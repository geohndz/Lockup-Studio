"use client";

import { Check, Copy, Pipette, Plus, Trash2, X } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CONTRAST_METHOD_COPY,
  contrastPassLabel,
  CONTRAST_METHOD_LABELS,
  formatCmyk,
  formatContrast,
  formatRgb,
  isLightHex,
  isNearBlackOrWhite,
  normalizeHex,
  passesContrastCheck,
  type ContrastMethod,
} from "@/lib/color";
import { cn } from "@/lib/utils";
import {
  fetchColorScheme,
  schemeColorCount,
  SCHEME_MODE_LABELS,
  SCHEME_MODES,
  type ColorApiColor,
  type SchemeMode,
} from "@/lib/color-api";
import { resolveColorNames, scheduleColorRename } from "@/lib/seed-palette";
import { buildLockupSvg } from "@/lib/svg";
import { useProjectStore } from "@/store/project-store";
import {
  COLOR_ROLE_LABELS,
  COLOR_ROLES,
  type BrandColor,
  type ColorRole,
  type LockupType,
} from "@/types/project";

const STICKY_ROLE_ORDER: ColorRole[] = [
  "primary",
  "secondary",
  "tertiary",
  "none",
];

const SCHEME_SEED_ROLES: ColorRole[] = ["primary", "secondary", "tertiary"];

const NEW_COLOR_DEFAULT = "#B91C1C";

function isPaletteColor(color: BrandColor): boolean {
  return color.role !== "black" && color.role !== "white";
}

function useMainColorSwatches() {
  const colors = useProjectStore((s) => s.colors);
  return useMemo(
    () =>
      colors
        .filter(isPaletteColor)
        .sort(
          (a, b) =>
            STICKY_ROLE_ORDER.indexOf(
              COLOR_ROLES.includes(a.role) ? a.role : "none",
            ) -
            STICKY_ROLE_ORDER.indexOf(
              COLOR_ROLES.includes(b.role) ? b.role : "none",
            ),
        )
        .map((c) => ({
          id: c.id,
          name: c.name,
          hex: c.hex,
        })),
    [colors],
  );
}

export function ColorPalette({
  sectionRef,
}: {
  sectionRef?: RefObject<HTMLElement | null>;
}) {
  const colors = useProjectStore((s) => s.colors);
  const addColor = useProjectStore((s) => s.addColor);
  const updateColor = useProjectStore((s) => s.updateColor);
  const assignColorRole = useProjectStore((s) => s.assignColorRole);
  const removeColor = useProjectStore((s) => s.removeColor);
  const paletteNotice = useProjectStore((s) => s.paletteNotice);
  const clearPaletteNotice = useProjectStore((s) => s.clearPaletteNotice);
  const renameTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [addOpen, setAddOpen] = useState(false);
  const [draftHex, setDraftHex] = useState(NEW_COLOR_DEFAULT);
  const draftHexRef = useRef(NEW_COLOR_DEFAULT);
  const swatches = useMainColorSwatches();

  const paletteColors = colors.filter(isPaletteColor);

  useEffect(() => {
    if (!paletteNotice) return;
    const id = window.setTimeout(() => clearPaletteNotice(), 6000);
    return () => window.clearTimeout(id);
  }, [paletteNotice, clearPaletteNotice]);

  // Drop leftover default White/Black when a chromatic brand color is present
  useEffect(() => {
    const hasChromatic = colors.some(
      (c) => isPaletteColor(c) && !isNearBlackOrWhite(c.hex),
    );
    if (!hasChromatic) return;
    for (const c of colors) {
      if (!isPaletteColor(c)) continue;
      if (!isNearBlackOrWhite(c.hex)) continue;
      // Keep only if user explicitly added (non-default id) — defaults use "primary"/"secondary"
      if (c.id === "primary" || c.id === "secondary" || c.name === "White" || c.name === "Black") {
        removeColor(c.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unnamedKey = paletteColors
    .filter((c) => {
      const name = c.name.trim().toUpperCase();
      const hex = normalizeHex(c.hex).toUpperCase();
      return (
        name === "BRAND" ||
        name === hex ||
        name === hex.slice(1) ||
        /^#[0-9A-F]{6}$/.test(name)
      );
    })
    .map((c) => `${c.id}:${normalizeHex(c.hex)}`)
    .join("|");

  // Name any swatches still labeled with a hex (e.g. after seed before API resolved)
  useEffect(() => {
    if (!unnamedKey) return;
    const ids = unnamedKey.split("|").map((part) => part.split(":")[0]);
    void resolveColorNames(ids);
  }, [unnamedKey]);

  const handleHexUpdate = (id: string, hex: string) => {
    updateColor(id, { hex });
    scheduleColorRename(id, hex, renameTimers.current);
  };

  return (
    <div className="space-y-8">
      <section id="colors" ref={sectionRef} className="scroll-mt-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div className="bk-section-intro">
            <h2 className="bk-section-title m-0">Colors</h2>
            <p className="bk-support mt-1 mb-0">
              Assign primary and secondary for mockups and the social banner.
              Black and white lockup variations are always generated separately.
            </p>
          </div>
          <ColorPicker
            hex={draftHex}
            onChange={(hex) => {
              draftHexRef.current = hex;
              setDraftHex(hex);
            }}
            swatches={swatches}
            open={addOpen}
            onOpenChange={(open) => {
              if (open) {
                draftHexRef.current = NEW_COLOR_DEFAULT;
                setDraftHex(NEW_COLOR_DEFAULT);
              }
              setAddOpen(open);
            }}
            confirmLabel="Add color"
            onConfirm={(hex) => {
              const id = addColor({ name: hex, hex });
              void resolveColorNames([id]);
            }}
            side="bottom"
            align="end"
          >
            <button
              type="button"
              className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 text-[13px] font-medium text-[var(--bk-ink-2)] shadow-[var(--bk-shadow-input)] transition-colors hover:text-[var(--bk-ink)]"
            >
              <Plus className="size-3.5" />
              Add color
            </button>
          </ColorPicker>
        </div>

        {paletteNotice ? (
          <div
            role="status"
            className="mb-4 flex items-start justify-between gap-3 rounded-[var(--bk-radius-tile)] bg-[var(--bk-tile)] px-4 py-3"
          >
            <p className="m-0 text-[13px] leading-relaxed text-[var(--bk-ink-2)]">
              {paletteNotice}
            </p>
            <button
              type="button"
              onClick={clearPaletteNotice}
              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--bk-ink-3)] transition-colors hover:bg-[var(--bk-card)] hover:text-[var(--bk-ink)]"
              aria-label="Dismiss"
            >
              <X className="size-3.5" strokeWidth={2} />
            </button>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[var(--bk-radius-card)] bg-[var(--bk-card)]">
          <div className="flex min-h-[224px] w-full">
            {paletteColors.map((color) => (
              <ColorStripe
                key={color.id}
                color={color}
                canRemove={paletteColors.length > 1}
                onUpdate={(patch) => {
                  if (patch.hex) {
                    handleHexUpdate(color.id, patch.hex);
                    const { hex: _hex, ...rest } = patch;
                    if (Object.keys(rest).length > 0) {
                      updateColor(color.id, rest);
                    }
                    return;
                  }
                  updateColor(color.id, patch);
                }}
                onAssignRole={(role) => assignColorRole(color.id, role)}
                onRemove={() => removeColor(color.id)}
              />
            ))}
          </div>
        </div>
      </section>

      <SuggestedSchemes />
      <ColorCombinations />
    </div>
  );
}

function ColorStripe({
  color,
  canRemove,
  onUpdate,
  onAssignRole,
  onRemove,
}: {
  color: BrandColor;
  canRemove: boolean;
  onUpdate: (patch: Partial<Omit<BrandColor, "id">>) => void;
  onAssignRole: (role: ColorRole) => void;
  onRemove: () => void;
}) {
  const [editingHex, setEditingHex] = useState(false);
  const [hexDraft, setHexDraft] = useState(color.hex.replace("#", ""));
  const [nameDraft, setNameDraft] = useState(color.name);
  const [editingName, setEditingName] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const swatches = useMainColorSwatches();

  const light = isLightHex(color.hex);
  const fg = light ? "text-[#14110F]" : "text-white";
  const muted = light ? "text-[#14110F]/50" : "text-white/80";
  const chip = light
    ? "bg-black/8 hover:bg-black/12"
    : "bg-white/12 hover:bg-white/18";
  const hexValue = editingHex ? hexDraft : color.hex.replace("#", "");
  const nameValue = editingName ? nameDraft : color.name;
  const rgbLabel = formatRgb(color.hex);
  const cmykLabel = formatCmyk(color.hex);

  const roleValue = COLOR_ROLES.includes(color.role) ? color.role : "none";

  return (
    <div
      className="group relative flex min-w-0 flex-1 flex-col justify-end"
      style={{ backgroundColor: normalizeHex(color.hex) }}
    >
      <div
          className={`relative z-10 flex flex-col items-center gap-2 px-2.5 pb-5 pt-10 sm:px-3 ${fg}`}
      >
        <div className="flex flex-col items-center gap-1">
          <ColorPicker
            hex={color.hex}
            onChange={(hex) => onUpdate({ hex })}
            swatches={swatches}
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            side="right"
            align="start"
          >
            <button
              type="button"
              className={`flex size-10 cursor-pointer items-center justify-center rounded-full transition-colors ${chip}`}
              aria-label={`Pick ${color.name} color`}
            >
              <Pipette className="size-3.5" strokeWidth={1.75} />
            </button>
          </ColorPicker>
          {canRemove ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onRemove}
                  className={`flex size-10 cursor-pointer items-center justify-center rounded-full transition-colors ${chip}`}
                  aria-label={`Remove ${color.name}`}
                >
                  <Trash2 className="size-3.5" strokeWidth={1.75} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Remove</TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        <input
          value={nameValue}
          onFocus={() => {
            setEditingName(true);
            setNameDraft(color.name);
          }}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => {
            const next = nameDraft.trim() || color.name;
            onUpdate({ name: next });
            setEditingName(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Color name"
          className={`w-full bg-transparent text-center font-sans text-lg font-semibold tracking-tight outline-none sm:text-xl ${fg}`}
          aria-label="Color name"
        />

        <div className="flex w-full flex-col items-center gap-1">
          <div className="flex items-center justify-center gap-1">
            <span className={`text-sm font-normal ${muted}`}>#</span>
            <input
              value={hexValue}
              onFocus={() => {
                setEditingHex(true);
                setHexDraft(color.hex.replace("#", ""));
              }}
              onChange={(e) => {
                const raw = e.target.value
                  .replace(/[^0-9A-Fa-f]/g, "")
                  .slice(0, 6);
                setHexDraft(raw.toUpperCase());
                if (raw.length === 6) {
                  onUpdate({ hex: `#${raw.toUpperCase()}` });
                }
              }}
              onBlur={() => {
                if (hexDraft.length === 6) {
                  onUpdate({ hex: `#${hexDraft.toUpperCase()}` });
                } else {
                  setHexDraft(color.hex.replace("#", ""));
                }
                setEditingHex(false);
              }}
              className={`w-[5.25rem] bg-transparent text-center font-sans text-sm font-normal uppercase tracking-wide outline-none sm:text-[15px] ${muted}`}
              aria-label={`${color.name} hex`}
              spellCheck={false}
              inputMode="text"
              autoComplete="off"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        normalizeHex(color.hex),
                      );
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1200);
                    } catch {
                      // Clipboard may be unavailable
                    }
                  }}
                  className={`flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors ${chip}`}
                  aria-label={`Copy ${normalizeHex(color.hex)}`}
                >
                  {copied ? (
                    <Check className="size-3" strokeWidth={2.25} />
                  ) : (
                    <Copy className="size-3" strokeWidth={1.75} />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {copied ? "Copied" : "Copy hex"}
              </TooltipContent>
            </Tooltip>
          </div>
          <p
            className={`m-0 font-sans text-[13px] font-normal tabular-nums tracking-wide ${muted}`}
          >
            {rgbLabel}
          </p>
          <p
            className={`m-0 font-sans text-[13px] font-normal tabular-nums tracking-wide ${muted}`}
          >
            {cmykLabel}
          </p>
        </div>

        <div className="mt-1 flex w-full justify-center">
          <Select
            value={roleValue}
            onValueChange={(next) => onAssignRole(next as ColorRole)}
          >
            <SelectTrigger
              size="sm"
              className="h-[34px] w-full max-w-[148px] rounded-[9px] border-0 bg-[var(--bk-tile)] px-3.5 text-[13px] font-medium text-[var(--bk-ink-2)] shadow-none hover:bg-[var(--bk-tile)]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLOR_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {COLOR_ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function SuggestedSchemes() {
  const colors = useProjectStore((s) => s.colors);
  const addColor = useProjectStore((s) => s.addColor);
  const [mode, setMode] = useState<SchemeMode>("monochrome");
  const [schemes, setSchemes] = useState<
    Record<string, { loading: boolean; colors: ColorApiColor[] }>
  >({});

  const seeds = useMemo(() => {
    const roleColors = SCHEME_SEED_ROLES.map((role) => {
      const color = colors.find((c) => c.role === role);
      return color ? { role, color } : null;
    }).filter(Boolean) as { role: ColorRole; color: BrandColor }[];

    // Custom swatches (role none) also get scheme cards
    const customs = colors
      .filter((c) => c.role === "none")
      .map((color) => ({ role: "none" as ColorRole, color }));

    const combined = [...roleColors, ...customs];
    const chromatic = combined.filter(
      (s) => !isNearBlackOrWhite(s.color.hex),
    );
    // Chromatic brand colors only — skip default B/W leftovers.
    // If the logo was black-only, both black and white stay as scheme seeds.
    return chromatic.length > 0 ? chromatic : combined;
  }, [colors]);

  const seedKey = seeds
    .map((s) => `${s.role}:${s.color.id}:${s.color.hex}`)
    .join("|");

  useEffect(() => {
    let cancelled = false;
    if (seeds.length === 0) {
      setSchemes({});
      return;
    }

    setSchemes((prev) => {
      const next: typeof prev = {};
      for (const { color } of seeds) {
        next[color.id] = {
          loading: true,
          colors: prev[color.id]?.colors ?? [],
        };
      }
      return next;
    });

    void (async () => {
      const results = await Promise.all(
        seeds.map(async ({ color }) => {
          const count = schemeColorCount(mode);
          const scheme = await fetchColorScheme(color.hex, mode, count);
          return {
            id: color.id,
            colors: (scheme?.colors ?? []).slice(0, count),
          };
        }),
      );
      if (cancelled) return;
      setSchemes(
        Object.fromEntries(
          results.map((r) => [r.id, { loading: false, colors: r.colors }]),
        ),
      );
    })();

    return () => {
      cancelled = true;
    };
    // seedKey captures hex+role identity; seeds array identity changes often
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey, mode]);

  if (seeds.length === 0) return null;

  const existingHexes = new Set(
    colors.map((c) => normalizeHex(c.hex).toUpperCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="bk-section-intro">
          <h3 className="bk-card-title m-0">Suggested schemes</h3>
          <p className="bk-support mt-1 mb-0">
            Shades from your brand and custom colors — click to add.
          </p>
        </div>
        <Select
          value={mode}
          onValueChange={(next) => setMode(next as SchemeMode)}
        >
          <SelectTrigger
            size="sm"
            className="h-[34px] shrink-0 rounded-[9px] border-0 bg-[var(--bk-card)] px-3.5 text-[13px] font-medium text-[var(--bk-ink-2)] shadow-[var(--bk-shadow-input)]"
            aria-label="Scheme mode"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {SCHEME_MODES.map((m) => (
              <SelectItem key={m} value={m}>
                {SCHEME_MODE_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-1">
        {seeds.map(({ role, color }) => {
          const entry = schemes[color.id];
          const shadeColors = entry?.colors ?? [];
          const loading = entry?.loading ?? true;
          return (
            <div
              key={color.id}
              className="flex flex-col gap-4 rounded-[var(--bk-radius-card)] bg-[var(--bk-card)] p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 text-[13px] font-medium text-[var(--bk-ink-2)]">
                    {COLOR_ROLE_LABELS[role]}
                  </p>
                  <p className="m-0 truncate text-[15px] font-semibold tracking-tight text-[var(--bk-ink)]">
                    {color.name}
                    <span className="ml-2 text-[14px] font-normal text-[var(--bk-ink-3)]">
                      {normalizeHex(color.hex)}
                    </span>
                  </p>
                </div>
              </div>
              <div className="overflow-hidden rounded-[var(--bk-radius-tile)]">
                {loading && shadeColors.length === 0
                  ? Array.from({ length: schemeColorCount(mode) }, (_, i) => (
                      <div
                        key={i}
                        className="h-12 animate-pulse bg-[var(--bk-tile)]"
                      />
                    ))
                  : shadeColors.map((shade) => {
                      const hex = normalizeHex(shade.hex.value);
                      const name = shade.name?.value || hex;
                      const light = isLightHex(hex);
                      const already = existingHexes.has(hex.toUpperCase());
                      const rgbLabel = formatRgb(hex);
                      const cmykLabel = formatCmyk(hex);
                      const metaMuted = light
                        ? "text-[#14110F]/50"
                        : "text-white/80";
                      return (
                        <button
                          key={`${color.id}-${hex}`}
                          type="button"
                          disabled={already}
                          onClick={() => {
                            if (already) return;
                            const id = addColor({ name, hex, role: "none" });
                            void resolveColorNames([id]);
                          }}
                          className={`group relative flex h-12 w-full items-center justify-between gap-3 px-5 text-left ${
                            already
                              ? "cursor-default opacity-55"
                              : "cursor-pointer"
                          } ${light ? "text-[#14110F]" : "text-white"}`}
                          style={{ backgroundColor: hex }}
                          title={
                            already
                              ? `${name} · already in palette`
                              : `Add ${name}`
                          }
                        >
                          <span className="min-w-0 truncate text-[14px] font-semibold tracking-tight">
                            {name}
                          </span>
                          <span
                            className={`shrink-0 text-[13px] font-normal tabular-nums ${metaMuted}`}
                          >
                            <span className="group-hover:hidden">
                              {hex}
                              {already ? " · added" : ""}
                            </span>
                            <span className="hidden items-center gap-2.5 group-hover:inline-flex">
                              <span>{hex}</span>
                              <span>{rgbLabel}</span>
                              <span>{cmykLabel}</span>
                            </span>
                          </span>
                          {!already ? (
                            <span
                              className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
                              aria-hidden
                            >
                              <span
                                className={`flex size-9 items-center justify-center rounded-full shadow-[var(--bk-shadow-input)] ${
                                  light
                                    ? "bg-[var(--bk-ink)] text-white"
                                    : "bg-white text-[var(--bk-ink)]"
                                }`}
                              >
                                <Plus className="size-4" strokeWidth={2.25} />
                              </span>
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MARK_PRIORITY: LockupType[] = [
  "icon",
  "monogram",
  "submark",
  "wordmark",
  "horizontal",
  "vertical",
];

function CombinationMark({
  svg,
  className,
}: {
  svg: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{
        __html: svg.replace(
          "<svg",
          '<svg preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;max-width:100%;max-height:100%;display:block;margin:auto"',
        ),
      }}
    />
  );
}

function ContrastMethodExplainer({ method }: { method: ContrastMethod }) {
  const [expanded, setExpanded] = useState(false);
  const copy = CONTRAST_METHOD_COPY[method];

  useEffect(() => {
    setExpanded(false);
  }, [method]);

  return (
    <div className="mt-1">
      <p
        className={cn(
          "bk-support m-0 leading-relaxed",
          !expanded && "line-clamp-2",
        )}
      >
        {copy.body}
        {expanded && copy.sourceHref ? (
          <>
            {" "}
            <a
              href={copy.sourceHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--bk-ink)] underline underline-offset-2"
            >
              Extract from {copy.sourceLabel}
            </a>
            .
          </>
        ) : null}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-1 cursor-pointer text-[13px] font-semibold text-[var(--bk-ink)] underline underline-offset-2"
      >
        {expanded ? "Show less" : "Read more"}
      </button>
    </div>
  );
}

function ColorCombinations() {
  const colors = useProjectStore((s) => s.colors);
  const contrastMethod = useProjectStore((s) => s.contrastMethod);
  const setContrastMethod = useProjectStore((s) => s.setContrastMethod);
  const horizontal = useProjectStore((s) => s.horizontal);
  const vertical = useProjectStore((s) => s.vertical);
  const icon = useProjectStore((s) => s.icon);
  const wordmark = useProjectStore((s) => s.wordmark);
  const submark = useProjectStore((s) => s.submark);
  const monogram = useProjectStore((s) => s.monogram);
  const assetMode = useProjectStore((s) => s.assetMode);
  const spacing = useProjectStore((s) => s.spacing);

  const palette = useMemo(
    () =>
      colors
        .filter(isPaletteColor)
        .sort(
          (a, b) =>
            STICKY_ROLE_ORDER.indexOf(
              COLOR_ROLES.includes(a.role) ? a.role : "none",
            ) -
            STICKY_ROLE_ORDER.indexOf(
              COLOR_ROLES.includes(b.role) ? b.role : "none",
            ),
        ),
    [colors],
  );

  const markLockup = useMemo(() => {
    const available: Record<LockupType, boolean> = {
      icon: Boolean(icon?.raw),
      monogram: Boolean(monogram?.raw),
      submark: Boolean(submark?.raw),
      wordmark: Boolean(wordmark?.raw),
      horizontal: Boolean(horizontal?.raw) || (assetMode === "build" && Boolean(icon?.raw && wordmark?.raw)),
      vertical: Boolean(vertical?.raw) || (assetMode === "build" && Boolean(icon?.raw && wordmark?.raw)),
    };
    return MARK_PRIORITY.find((type) => available[type]) ?? null;
  }, [icon, monogram, submark, wordmark, horizontal, vertical, assetMode]);

  const marksByFg = useMemo(() => {
    const map = new Map<string, string | null>();
    if (!markLockup) return map;

    const base = {
      iconRaw: icon?.raw ?? null,
      wordmarkRaw: wordmark?.raw ?? null,
      horizontalRaw: horizontal?.raw ?? null,
      verticalRaw: vertical?.raw ?? null,
      submarkRaw: submark?.raw ?? null,
      monogramRaw: monogram?.raw ?? null,
      composeFromParts: assetMode === "build",
      gapHorizontal: spacing.horizontal,
      gapVertical: spacing.vertical,
      padding: spacing.padding,
      iconScaleHorizontal: spacing.iconScaleHorizontal,
      iconScaleVertical: spacing.iconScaleVertical,
      alignHorizontal: spacing.alignHorizontal,
      alignVertical: spacing.alignVertical,
    };

    for (const color of palette) {
      const hex = normalizeHex(color.hex);
      try {
        map.set(
          hex,
          buildLockupSvg({
            ...base,
            lockup: markLockup,
            color: hex,
          }),
        );
      } catch {
        map.set(hex, null);
      }
    }
    return map;
  }, [
    markLockup,
    palette,
    icon,
    wordmark,
    horizontal,
    vertical,
    submark,
    monogram,
    assetMode,
    spacing,
  ]);

  const pairs = useMemo(() => {
    const out: { fg: BrandColor; bg: BrandColor }[] = [];
    for (const bg of palette) {
      for (const fg of palette) {
        if (normalizeHex(fg.hex) === normalizeHex(bg.hex)) continue;
        out.push({ fg, bg });
      }
    }
    return out;
  }, [palette]);

  const [hideFails, setHideFails] = useState(false);

  const visiblePairs = useMemo(() => {
    if (!hideFails) return pairs;
    return pairs.filter(({ fg, bg }) =>
      passesContrastCheck(
        normalizeHex(fg.hex),
        normalizeHex(bg.hex),
        contrastMethod,
      ),
    );
  }, [pairs, hideFails, contrastMethod]);

  const totalFails = useMemo(
    () =>
      pairs.filter(
        ({ fg, bg }) =>
          !passesContrastCheck(
            normalizeHex(fg.hex),
            normalizeHex(bg.hex),
            contrastMethod,
          ),
      ).length,
    [pairs, contrastMethod],
  );

  if (palette.length < 2 || pairs.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="bk-section-intro min-w-0 flex-1">
          <h3 className="bk-card-title m-0">Color combinations</h3>
          <ContrastMethodExplainer method={contrastMethod} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="grid grid-cols-2 gap-1 rounded-[var(--bk-radius-pill)] bg-[var(--bk-card)] p-1 shadow-[var(--bk-shadow-input)]"
            role="group"
            aria-label="Contrast method"
          >
            {(["wcag2", "apca"] as ContrastMethod[]).map((method) => {
              const active = contrastMethod === method;
              return (
                <button
                  key={method}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setContrastMethod(method)}
                  className={`cursor-pointer rounded-[var(--bk-radius-pill)] px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                    active
                      ? "bg-[var(--bk-ink)] text-white"
                      : "bg-transparent text-[var(--bk-ink-2)] hover:text-[var(--bk-ink)]"
                  }`}
                >
                  {CONTRAST_METHOD_LABELS[method]}
                </button>
              );
            })}
          </div>
          {totalFails > 0 ? (
            <button
              type="button"
              onClick={() => setHideFails((v) => !v)}
              aria-pressed={hideFails}
              className={`flex h-[34px] shrink-0 cursor-pointer items-center gap-1.5 rounded-[9px] px-3.5 text-[13px] font-medium transition-colors ${
                hideFails
                  ? "bg-[var(--bk-ink)] text-white"
                  : "bg-[var(--bk-card)] text-[var(--bk-ink-2)] shadow-[var(--bk-shadow-input)] hover:text-[var(--bk-ink)]"
              }`}
            >
              {hideFails ? (
                <>
                  <Check className="size-3.5" strokeWidth={2.25} />
                  Showing passes
                </>
              ) : (
                <>
                  Hide {totalFails} fail{totalFails === 1 ? "" : "s"}
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>

      {visiblePairs.length === 0 ? (
        <p className="bk-support m-0">
          No combinations pass {CONTRAST_METHOD_LABELS[contrastMethod]}{" "}
          contrast.
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {visiblePairs.map(({ fg, bg }) => {
            const fgHex = normalizeHex(fg.hex);
            const bgHex = normalizeHex(bg.hex);
            const svg = marksByFg.get(fgHex) ?? null;
            const ratio = formatContrast(fgHex, bgHex, contrastMethod);
            const pass = passesContrastCheck(fgHex, bgHex, contrastMethod);
            const passLabel = contrastPassLabel(contrastMethod);
            return (
              <div
                key={`${fg.id}-${bg.id}`}
                className="overflow-hidden rounded-[var(--bk-radius-card)] bg-[var(--bk-card)]"
              >
                <div
                  className="relative flex aspect-[5/4] items-center justify-center p-7"
                  style={{ backgroundColor: bgHex }}
                >
                  {svg ? (
                    <CombinationMark
                      svg={svg}
                      className="flex h-[55%] w-[55%] items-center justify-center [&_svg]:max-h-full [&_svg]:max-w-full"
                    />
                  ) : (
                    <span
                      className="size-10 rounded-full opacity-35"
                      style={{ backgroundColor: fgHex }}
                    />
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={`absolute right-3 bottom-3 flex size-8 items-center justify-center rounded-full shadow-[var(--bk-shadow-input)] ${
                          pass
                            ? "bg-[#E4F6EA] text-[#1B7A3D]"
                            : "bg-[#FCE8E8] text-[#C23131]"
                        }`}
                        aria-label={
                          pass
                            ? `Contrast ${ratio}, passes ${passLabel}`
                            : `Contrast ${ratio}, fails ${passLabel}`
                        }
                      >
                        {pass ? (
                          <Check className="size-4" strokeWidth={2.5} />
                        ) : (
                          <X className="size-4" strokeWidth={2.5} />
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {pass
                        ? `Passes ${passLabel} · ${ratio}`
                        : `Fails ${passLabel} · ${ratio}`}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="space-y-0.5 border-t border-[var(--bk-hairline)] px-5 py-3">
                  <p className="m-0 truncate text-[13px] font-semibold tracking-tight text-[var(--bk-ink)]">
                    {fg.name}
                    <span className="font-normal text-[var(--bk-ink-3)]">
                      {" "}
                      on {bg.name}
                    </span>
                  </p>
                  <p
                    className={`m-0 text-[12px] font-medium ${
                      pass ? "text-[var(--bk-ink-3)]" : "text-destructive"
                    }`}
                  >
                    {ratio}
                    {pass ? ` · ${passLabel}` : " · fail"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Compact role + swatch strip while scrolling past Colors. */
export function StickyColorBar() {
  const colors = useProjectStore((s) => s.colors);
  const updateColor = useProjectStore((s) => s.updateColor);
  const addColor = useProjectStore((s) => s.addColor);
  const removeColor = useProjectStore((s) => s.removeColor);
  const renameTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [addOpen, setAddOpen] = useState(false);
  const [draftHex, setDraftHex] = useState(NEW_COLOR_DEFAULT);
  const draftHexRef = useRef(NEW_COLOR_DEFAULT);
  const swatches = useMainColorSwatches();

  const ordered = colors
    .filter(isPaletteColor)
    .sort(
      (a, b) =>
        STICKY_ROLE_ORDER.indexOf(
          COLOR_ROLES.includes(a.role) ? a.role : "none",
        ) -
        STICKY_ROLE_ORDER.indexOf(
          COLOR_ROLES.includes(b.role) ? b.role : "none",
        ),
    );

  const canRemove = ordered.length > 1;

  return (
    <div className="flex min-w-0 items-center gap-3 overflow-x-auto py-1">
      <div className="flex items-center gap-4 px-0.5">
        {ordered.map((color) => (
          <div key={color.id} className="flex shrink-0 items-center gap-2">
            <span className="text-[13px] font-medium text-[var(--bk-ink-2)]">
              {COLOR_ROLE_LABELS[
                COLOR_ROLES.includes(color.role) ? color.role : "none"
              ]}
              :
            </span>
            <StickySwatch
              color={color}
              canRemove={canRemove}
              onChange={(hex) => {
                updateColor(color.id, { hex });
                scheduleColorRename(color.id, hex, renameTimers.current);
              }}
              onRemove={() => removeColor(color.id)}
            />
          </div>
        ))}
        <ColorPicker
          hex={draftHex}
          onChange={(hex) => {
            draftHexRef.current = hex;
            setDraftHex(hex);
          }}
          swatches={swatches}
          open={addOpen}
          onOpenChange={(open) => {
            if (open) {
              draftHexRef.current = NEW_COLOR_DEFAULT;
              setDraftHex(NEW_COLOR_DEFAULT);
            }
            setAddOpen(open);
          }}
          confirmLabel="Add color"
          onConfirm={(hex) => {
            const id = addColor({ name: hex, hex });
            void resolveColorNames([id]);
          }}
          side="bottom"
          align="start"
        >
          <button
            type="button"
            className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[var(--bk-tile)] px-3 text-[13px] font-medium text-[var(--bk-ink-2)] transition-colors hover:text-[var(--bk-ink)]"
            aria-label="Add color"
          >
            <Plus className="size-3.5" />
            Add
          </button>
        </ColorPicker>
      </div>
    </div>
  );
}

function StickySwatch({
  color,
  canRemove,
  onChange,
  onRemove,
}: {
  color: BrandColor;
  canRemove: boolean;
  onChange: (hex: string) => void;
  onRemove: () => void;
}) {
  const roleLabel =
    COLOR_ROLE_LABELS[COLOR_ROLES.includes(color.role) ? color.role : "none"];
  const light = isLightHex(color.hex);
  const swatches = useMainColorSwatches();

  return (
    <div className="group relative flex h-8 w-8 shrink-0 items-end justify-start">
      <ColorPicker
        hex={color.hex}
        onChange={onChange}
        swatches={swatches}
        side="bottom"
        align="start"
      >
        <button
          type="button"
          className={`size-8 cursor-pointer rounded-full shadow-[var(--bk-shadow-input)] ${
            light ? "ring-1 ring-inset ring-[var(--bk-hairline)]" : ""
          }`}
          style={{ backgroundColor: normalizeHex(color.hex) }}
          aria-label={`Edit ${roleLabel} (${color.name})`}
        />
      </ColorPicker>
      {canRemove ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="absolute -right-0.5 -top-0.5 flex size-5 cursor-pointer items-center justify-center rounded-full bg-[var(--bk-card)] text-[var(--bk-ink-2)] opacity-100 shadow-[var(--bk-shadow-input)] transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              aria-label={`Remove ${color.name}`}
            >
              <Trash2 className="size-2.5" strokeWidth={2.25} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Remove color</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
