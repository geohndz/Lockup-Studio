"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ColorPalette,
  StickyColorBar,
} from "@/components/studio/canvas/color-palette";
import { LockupEditor } from "@/components/studio/canvas/lockup-editor";
import { EmptyStateCarousel } from "@/components/studio/empty-state/empty-state-carousel";
import {
  useLivePreviews,
  usePrimaryColorHex,
  useContextLockupOptions,
  type ContextLockupOption,
  type PreviewItem,
} from "@/hooks/use-live-previews";
import {
  isLightHex,
  normalizeHex,
  pickRandomPassingPair,
  shadeHex,
  tintHex,
} from "@/lib/color";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/project-store";
import {
  COLOR_ROLE_LABELS,
  COLOR_ROLES,
  LOCKUP_LABELS,
  LOCKUP_ORDER,
  ORIGINAL_COLOR,
  colorsWithMonoVariations,
  type ColorRole,
  type LockupType,
} from "@/types/project";
import { ArrowLeftRight, Link2, Settings, ChevronLeft, ChevronRight, RotateCw, Home, Lock, X } from "lucide-react";
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

function SvgPreview({
  svg,
  className,
  align = "center",
}: {
  svg: string;
  className?: string;
  /** @deprecated kept for call-site compatibility */
  invertForDark?: boolean;
  align?: "center" | "start";
}) {
  const preserveAspectRatio =
    align === "start" ? "xMinYMid meet" : "xMidYMid meet";
  const svgStyle =
    align === "start"
      ? "height:100%;width:auto;max-width:100%;display:block;margin:0"
      : "width:100%;height:100%;max-width:100%;max-height:100%;display:block;margin:auto";

  return (
    <div
      className={cn(
        align === "center" && "flex items-center justify-center",
        className,
      )}
      dangerouslySetInnerHTML={{
        __html: svg.replace(
          "<svg",
          `<svg preserveAspectRatio="${preserveAspectRatio}" style="${svgStyle}"`,
        ),
      }}
    />
  );
}

export function StudioCanvas() {
  const brandName = useProjectStore((s) => s.brandName);
  const horizontal = useProjectStore((s) => s.horizontal);
  const vertical = useProjectStore((s) => s.vertical);
  const icon = useProjectStore((s) => s.icon);
  const wordmark = useProjectStore((s) => s.wordmark);
  const submark = useProjectStore((s) => s.submark);
  const monogram = useProjectStore((s) => s.monogram);
  const assetMode = useProjectStore((s) => s.assetMode);
  const colors = useProjectStore((s) => s.colors);
  const previews = useLivePreviews();
  const displayName = brandName.trim() || "Your brand";
  const hasAssets = Boolean(
    horizontal || vertical || icon || wordmark || submark || monogram,
  );
  const composeFromParts = assetMode === "build";
  const hasMainLockupSource = composeFromParts
    ? Boolean(icon && wordmark)
    : Boolean(horizontal || vertical);
  const buildMissingParts =
    composeFromParts && Boolean(icon || wordmark) && !(icon && wordmark);

  const scrollRootRef = useRef<HTMLDivElement>(null);
  const colorsSectionRef = useRef<HTMLElement>(null);
  const [showStickyColors, setShowStickyColors] = useState(false);

  useEffect(() => {
    const el = colorsSectionRef.current;
    if (!el) return;
    const root = scrollRootRef.current ?? el.closest("[data-studio-scroll]");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // Pin once the Colors section has scrolled above the scrollport
        const rootTop = entry.rootBounds?.top ?? 0;
        setShowStickyColors(
          !entry.isIntersecting && entry.boundingClientRect.top < rootTop,
        );
      },
      { root: root instanceof Element ? root : null, threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAssets]);

  // Drop legacy black/white palette entries once (they're fixed variations now)
  useEffect(() => {
    const legacy = colors.filter(
      (c) => c.role === "black" || c.role === "white",
    );
    if (legacy.length === 0) return;
    for (const c of legacy) {
      useProjectStore.getState().removeColor(c.id);
    }
  }, [colors]);

  const byColor = useMemo(() => {
    const map = new Map<
      string,
      {
        colorId: string;
        colorName: string;
        colorHex: string;
        items: PreviewItem[];
      }
    >();
    for (const item of previews) {
      const existing = map.get(item.colorId);
      if (existing) {
        existing.items.push(item);
      } else {
        map.set(item.colorId, {
          colorId: item.colorId,
          colorName: item.colorName,
          colorHex: item.colorHex,
          items: [item],
        });
      }
    }
    // Palette colors first, then automatic black / white; Original (if any) first
    const orderIds = [
      ORIGINAL_COLOR.id,
      ...colorsWithMonoVariations(colors).map((c) => c.id),
    ];
    const ordered = orderIds
      .map((id) => map.get(id))
      .filter((g): g is NonNullable<typeof g> => Boolean(g));
    for (const [id, group] of map) {
      if (!orderIds.includes(id)) ordered.push(group);
    }
    return ordered.map((group) => ({
      ...group,
      items: [...group.items].sort(
        (a, b) =>
          LOCKUP_ORDER.indexOf(a.lockup) - LOCKUP_ORDER.indexOf(b.lockup),
      ),
    }));
  }, [previews, colors]);

  const sectionNavItems = useMemo(() => {
    const items = [
      { id: "main-logo", label: "Main logo" },
      { id: "colors", label: "Colors" },
    ];
    if (byColor.length > 0) {
      items.push({ id: "color-variations", label: "Color variations" });
    }
    items.push({ id: "in-context", label: "In context" });
    return items;
  }, [byColor.length]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[var(--bk-field)]">
      <AnimatePresence initial={false}>
        {showStickyColors && hasAssets ? (
          <motion.div
            key="sticky-colors"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-20 shrink-0 overflow-hidden border-b border-[var(--bk-hairline)] bg-[var(--bk-card)]"
          >
            <div className="flex items-center px-6 py-2.5 sm:px-8">
              <StickyColorBar />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        ref={scrollRootRef}
        data-studio-scroll
        className={cn(
          "relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-10 sm:py-8",
          !hasAssets && "flex items-center justify-center",
        )}
      >
        {!hasAssets ? (
          <EmptyState />
        ) : (
          <div className="mx-auto flex max-w-[850px] flex-col gap-11">
            {/* Main logo */}
            <section id="main-logo" className="scroll-mt-6">
              <div className="bk-section-intro mb-4">
                <h2 className="bk-section-title m-0">
                  Main logo
                </h2>
                <p className="bk-support mt-1 mb-0">
                  {composeFromParts
                    ? buildMissingParts
                      ? "Build mode needs both Icon and Wordmark — upload the missing piece in the sidebar."
                      : hasMainLockupSource
                        ? "Composed from Icon + Wordmark — adjust size, space, and alignment."
                        : "Upload Icon and Wordmark in the sidebar to compose Horizontal and Vertical."
                    : hasMainLockupSource
                      ? "Uploaded horizontal and vertical lockups, shown in black for editing. Color lives below."
                      : "Upload Horizontal or Vertical in the sidebar — or switch to Build from parts."}
                </p>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="overflow-hidden rounded-[var(--bk-radius-card)] bg-[var(--bk-card)]">
                  <LockupEditor
                    orientation="horizontal"
                    title="Horizontal"
                    composeFromParts={composeFromParts}
                  />
                </div>
                <div className="overflow-hidden rounded-[var(--bk-radius-card)] bg-[var(--bk-card)]">
                  <LockupEditor
                    orientation="vertical"
                    title="Vertical"
                    composeFromParts={composeFromParts}
                  />
                </div>
              </div>
            </section>

            <ColorPalette sectionRef={colorsSectionRef} />

            {/* Color variations — grouped by color */}
            {byColor.length > 0 ? (
              <section id="color-variations" className="scroll-mt-6">
                <h2 className="bk-section-title bk-section-intro mb-4">
                  Color variations
                </h2>
                <div className="flex flex-col gap-5">
                  {byColor.map((group) => {
                    const isOriginal = group.colorId === ORIGINAL_COLOR.id;
                    const needsDarkBg =
                      !isOriginal && isLightHex(group.colorHex);
                    return (
                      <div
                        key={group.colorId}
                        className={`overflow-hidden rounded-[var(--bk-radius-card)] ${
                          needsDarkBg
                            ? "bg-[var(--bk-dark)]"
                            : "bg-[var(--bk-card)]"
                        }`}
                      >
                        <div
                          className="flex items-center gap-2.5 px-5 py-4"
                        >
                          {isOriginal ? (
                            <span
                              className="size-4 shrink-0 rounded-full"
                              style={{
                                background:
                                  "conic-gradient(#e11d48, #f59e0b, #22c55e, #3b82f6, #a855f7, #e11d48)",
                              }}
                              aria-hidden
                            />
                          ) : (
                            <span
                              className="size-4 shrink-0 rounded-full"
                              style={{ backgroundColor: group.colorHex }}
                            />
                          )}
                          <h3
                            className={`text-[15px] font-semibold ${
                              needsDarkBg ? "text-[var(--bk-on-dark)]" : "text-[var(--bk-ink)]"
                            }`}
                          >
                            {group.colorName}
                            {isOriginal ? (
                              <span className="ml-2 text-[13px] font-normal text-[var(--bk-ink-3)]">
                                Multi-color as uploaded
                              </span>
                            ) : null}
                          </h3>
                        </div>
                        <div className="grid gap-x-4 gap-y-10 px-5 py-7 sm:grid-cols-2 lg:grid-cols-4">
                          {group.items.map((item) => (
                            <div
                              key={`${item.lockup}-${item.colorId}`}
                              className="flex flex-col items-center justify-center gap-2.5"
                            >
                              <div className="flex h-14 w-full items-center justify-center">
                                <SvgPreview
                                  svg={item.svg}
                                  className="flex h-full w-full items-center justify-center [&_svg]:max-h-14 [&_svg]:max-w-full"
                                />
                              </div>
                              <p
                                className={`text-center text-[13px] ${
                                  needsDarkBg
                                    ? "text-[var(--bk-on-dark-3)]"
                                    : "text-[var(--bk-ink-3)]"
                                }`}
                              >
                                {LOCKUP_LABELS[item.lockup]}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {/* In context */}
            <section id="in-context" className="scroll-mt-6">
              <h2 className="bk-section-title bk-section-intro mb-4">
                In context
              </h2>
              <div className="flex flex-col gap-5">
                <div className="grid gap-5 lg:grid-cols-2">
                  <ContextProfilePicture name={displayName} />
                  <div className="flex flex-col gap-5">
                    <ContextFavicon name={displayName} />
                    <ContextInstagram name={displayName} />
                  </div>
                </div>
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)] lg:items-stretch">
                  <div className="flex flex-col gap-5">
                    <ContextSlideDeckCover name={displayName} />
                    <ContextBusinessCardBack name={displayName} />
                  </div>
                  <ContextPhoneApp name={displayName} />
                </div>
                <ContextNav name={displayName} />
                <ContextSocialBanner name={displayName} />
              </div>
            </section>
          </div>
        )}
      </div>

      {hasAssets ? (
        <SectionNav scrollRootRef={scrollRootRef} items={sectionNavItems} />
      ) : null}
    </div>
  );
}

function EmptyState() {
  return <EmptyStateCarousel />;
}

function SectionNav({
  items,
  scrollRootRef,
}: {
  items: { id: string; label: string }[];
  scrollRootRef: RefObject<HTMLDivElement | null>;
}) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const scrollingToRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (items.length === 0) return;
    if (!items.some((item) => item.id === activeId)) {
      setActiveId(items[0].id);
    }
  }, [items, activeId]);

  useEffect(() => {
    const root = scrollRootRef.current;
    if (!root || items.length === 0) return;

    const syncActive = () => {
      if (scrollingToRef.current) {
        setActiveId(scrollingToRef.current);
        return;
      }

      const rootTop = root.getBoundingClientRect().top;
      // Section whose top last crossed this marker wins — stable while scrolling
      const marker = rootTop + Math.min(120, root.clientHeight * 0.22);

      let current = items[0].id;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= marker) {
          current = item.id;
        }
      }
      setActiveId((prev) => (prev === current ? prev : current));
    };

    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        syncActive();
      });
    };

    const onScrollEnd = () => {
      scrollingToRef.current = null;
      syncActive();
    };

    syncActive();
    root.addEventListener("scroll", onScroll, { passive: true });
    root.addEventListener("scrollend", onScrollEnd);
    window.addEventListener("resize", onScroll);

    return () => {
      root.removeEventListener("scroll", onScroll);
      root.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [items, scrollRootRef]);

  const scrollTo = (id: string) => {
    const root = scrollRootRef.current;
    const el = document.getElementById(id);
    if (!root || !el) return;

    scrollingToRef.current = id;
    setActiveId(id);

    const rootRect = root.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    root.scrollTo({
      top: root.scrollTop + (elRect.top - rootRect.top) - 16,
      behavior: "smooth",
    });

    // Fallback when scrollend isn't fired (older Safari)
    window.setTimeout(() => {
      if (scrollingToRef.current === id) {
        scrollingToRef.current = null;
      }
    }, 700);
  };

  return (
    <nav
      aria-label="Page sections"
      className="pointer-events-none absolute top-1/2 right-3 z-30 hidden -translate-y-1/2 lg:block 2xl:right-5"
    >
      <ul className="pointer-events-auto m-0 flex list-none flex-col items-end gap-1 p-0">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id} className="flex w-full justify-end">
              <button
                type="button"
                onClick={() => scrollTo(item.id)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "group flex cursor-pointer flex-row-reverse items-center gap-2.5 rounded-md py-1.5 pl-2.5 pr-1 text-right transition-colors",
                  active
                    ? "text-[var(--bk-ink)]"
                    : "text-[var(--bk-ink-3)] hover:text-[var(--bk-ink-2)]",
                )}
              >
                <span
                  className={cn(
                    "h-px shrink-0 transition-all",
                    active
                      ? "w-5 bg-[var(--bk-ink)]"
                      : "w-3 bg-[var(--bk-ink-3)]/50 group-hover:w-4 group-hover:bg-[var(--bk-ink-2)]",
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "max-w-0 overflow-hidden text-[12px] tracking-tight whitespace-nowrap opacity-0 transition-all duration-200",
                    "group-hover:max-w-[10rem] group-hover:opacity-100",
                    active && "max-w-[10rem] font-semibold opacity-100",
                  )}
                >
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function useContextAssetSelection(
  preferred: LockupType,
  colorHex: string,
): {
  options: ContextLockupOption[];
  value: LockupType;
  setValue: (value: LockupType) => void;
  svg: string | null;
} {
  const options = useContextLockupOptions(colorHex);
  const [selected, setSelected] = useState<LockupType>(preferred);

  const value =
    options.find((o) => o.value === selected)?.value ??
    options.find((o) => o.value === preferred)?.value ??
    options[0]?.value ??
    preferred;

  const svg = options.find((o) => o.value === value)?.svg ?? null;

  return { options, value, setValue: setSelected, svg };
}

function ContextHeader({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: ContextLockupOption[];
  value: LockupType;
  onChange: (value: LockupType) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="bk-card-title min-w-0 truncate">{title}</span>
      {options.length > 0 ? (
        <Select
          value={value}
          onValueChange={(next) => onChange(next as LockupType)}
        >
          <SelectTrigger
            size="sm"
            className="h-[34px] max-w-[55%] shrink-0 rounded-[9px] border-0 bg-[var(--bk-tile)] px-3.5 text-[13px] font-medium text-[var(--bk-ink-2)] shadow-none"
            aria-label={`Logo for ${title}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end" position="popper">
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}

function ContextCardShell({
  title,
  options,
  value,
  onChange,
  stageClassName,
  stageStyle,
  children,
  className,
  colorPair,
  showColorDivider = false,
}: {
  title: string;
  options: ContextLockupOption[];
  value: LockupType;
  onChange: (value: LockupType) => void;
  stageClassName?: string;
  stageStyle?: CSSProperties;
  children: ReactNode;
  className?: string;
  colorPair: ContextColorPair;
  /** Keep hairline between stage and swatches (favicon / Instagram only). */
  showColorDivider?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-[var(--bk-radius-card)] bg-[var(--bk-card)] p-5",
        className,
      )}
    >
      <ContextHeader
        title={title}
        options={options}
        value={value}
        onChange={onChange}
      />
      <div
        className={cn(
          "mt-4 flex min-h-0 flex-1 flex-col",
          showColorDivider ? "gap-4" : "gap-0",
        )}
      >
        <div
          className={cn(
            "min-h-0 flex-1 overflow-hidden",
            stageClassName ?? "bg-[var(--bk-tile)]",
          )}
          style={stageStyle}
        >
          {children}
        </div>
        <ContextColorStrip pair={colorPair} showDivider={showColorDivider} />
      </div>
    </div>
  );
}

type ContextSwatch = {
  id: string;
  name: string;
  hex: string;
  role: ColorRole;
};

type ContextColorPair = {
  fgHex: string;
  bgHex: string;
  active: "fg" | "bg";
  setActive: (slot: "fg" | "bg") => void;
  select: (hex: string) => void;
  swap: () => void;
  swatches: ContextSwatch[];
  roleForHex: (hex: string) => string;
};

function useContextColorPair(): ContextColorPair {
  const colors = useProjectStore((s) => s.colors);
  const contrastMethod = useProjectStore((s) => s.contrastMethod);
  const primaryHex = usePrimaryColorHex();

  const swatches = useMemo<ContextSwatch[]>(
    () =>
      colors
        .filter((c) => c.role !== "black" && c.role !== "white")
        .map((c) => ({
          id: c.id,
          name: c.name,
          hex: normalizeHex(c.hex),
          role: (COLOR_ROLES.includes(c.role) ? c.role : "none") as ColorRole,
        })),
    [colors],
  );

  const paletteKey = useMemo(
    () =>
      `${contrastMethod}|${swatches.map((s) => `${s.id}:${s.hex}`).join(",")}`,
    [swatches, contrastMethod],
  );

  const fallbackBg = normalizeHex(primaryHex);
  const fallbackFg = "#FFFFFF";

  const [fgHex, setFgHex] = useState(fallbackFg);
  const [bgHex, setBgHex] = useState(fallbackBg);
  const [active, setActive] = useState<"fg" | "bg">("fg");

  useEffect(() => {
    const pair = pickRandomPassingPair(swatches, contrastMethod);
    setFgHex(pair?.fgHex ?? fallbackFg);
    setBgHex(pair?.bgHex ?? fallbackBg);
    // Reseed only when palette or contrast method changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paletteKey encodes deps
  }, [paletteKey]);

  const roleForHex = (hex: string) => {
    const match = swatches.find(
      (s) => normalizeHex(s.hex) === normalizeHex(hex),
    );
    if (match) return COLOR_ROLE_LABELS[match.role];
    if (normalizeHex(hex) === "#FFFFFF") return "White";
    if (normalizeHex(hex) === "#000000") return "Black";
    return "Color";
  };

  const swap = () => {
    setFgHex(bgHex);
    setBgHex(fgHex);
  };

  const select = (hex: string) => {
    const next = normalizeHex(hex);
    if (active === "fg") {
      if (next === normalizeHex(bgHex)) {
        setFgHex(bgHex);
        setBgHex(fgHex);
        return;
      }
      setFgHex(next);
      return;
    }
    if (next === normalizeHex(fgHex)) {
      setFgHex(bgHex);
      setBgHex(fgHex);
      return;
    }
    setBgHex(next);
  };

  return {
    fgHex,
    bgHex,
    active,
    setActive,
    select,
    swap,
    swatches,
    roleForHex,
  };
}

function ContextColorStrip({
  pair,
  showDivider,
}: {
  pair: ContextColorPair;
  showDivider: boolean;
}) {
  if (pair.swatches.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2.5",
        showDivider
          ? "border-t border-[var(--bk-hairline)] pt-3.5"
          : "pt-3.5",
      )}
    >
      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => pair.setActive("fg")}
              aria-label="Edit foreground color"
              aria-pressed={pair.active === "fg"}
              className={cn(
                "size-6 cursor-pointer rounded-full transition-shadow",
                pair.active === "fg"
                  ? "ring-2 ring-[var(--bk-ink)] ring-offset-1 ring-offset-[var(--bk-card)]"
                  : cn(
                      "hover:ring-2 hover:ring-[var(--bk-ink)]/35 hover:ring-offset-1 hover:ring-offset-[var(--bk-card)]",
                      isLightHex(pair.fgHex)
                        ? "ring-1 ring-inset ring-[var(--bk-hairline)]"
                        : "ring-1 ring-black/10",
                    ),
              )}
              style={{ backgroundColor: pair.fgHex }}
            />
          </TooltipTrigger>
          <TooltipContent side="top">
            Foreground · {pair.roleForHex(pair.fgHex)}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={pair.swap}
              className="flex size-6 cursor-pointer items-center justify-center rounded-full text-[var(--bk-ink-3)] transition-colors hover:bg-[var(--bk-tile)] hover:text-[var(--bk-ink)]"
              aria-label="Swap foreground and background"
            >
              <ArrowLeftRight className="size-3" strokeWidth={2} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Swap colors</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => pair.setActive("bg")}
              aria-label="Edit background color"
              aria-pressed={pair.active === "bg"}
              className={cn(
                "size-6 cursor-pointer rounded-full transition-shadow",
                pair.active === "bg"
                  ? "ring-2 ring-[var(--bk-ink)] ring-offset-1 ring-offset-[var(--bk-card)]"
                  : cn(
                      "hover:ring-2 hover:ring-[var(--bk-ink)]/35 hover:ring-offset-1 hover:ring-offset-[var(--bk-card)]",
                      isLightHex(pair.bgHex)
                        ? "ring-1 ring-inset ring-[var(--bk-hairline)]"
                        : "ring-1 ring-black/10",
                    ),
              )}
              style={{ backgroundColor: pair.bgHex }}
            />
          </TooltipTrigger>
          <TooltipContent side="top">
            Background · {pair.roleForHex(pair.bgHex)}
          </TooltipContent>
        </Tooltip>
      </div>

      <span className="h-4 w-px bg-[var(--bk-hairline)]" aria-hidden />

      <div className="flex flex-wrap items-center gap-1.5">
        {pair.swatches.map((swatch) => {
          const value = normalizeHex(swatch.hex);
          const light = isLightHex(value);
          const roleLabel = COLOR_ROLE_LABELS[swatch.role];
          return (
            <Tooltip key={swatch.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`Use ${swatch.name} (${roleLabel}) as ${pair.active === "fg" ? "foreground" : "background"}`}
                  onClick={() => pair.select(value)}
                  className={cn(
                    "size-6 cursor-pointer rounded-full transition-transform hover:scale-110",
                    light ? "ring-1 ring-inset ring-[var(--bk-hairline)]" : "",
                  )}
                  style={{ backgroundColor: value }}
                />
              </TooltipTrigger>
              <TooltipContent side="top">{roleLabel}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

function ContextFavicon({ name }: { name: string }) {
  const pair = useContextColorPair();
  const { fgHex, bgHex } = pair;
  const { options, value, setValue, svg } = useContextAssetSelection(
    "icon",
    fgHex,
  );
  const domain = `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "brand"}.com`;
  const onLightChrome = isLightHex(bgHex);
  const addressBg = onLightChrome
    ? "rgba(10,10,10,0.06)"
    : "rgba(255,255,255,0.12)";
  const chromeMuted = onLightChrome
    ? "text-[var(--bk-ink)]/70"
    : "text-white/75";

  return (
    <ContextCardShell
      title="Browser favicon"
      options={options}
      value={value}
      onChange={setValue}
      stageClassName="flex items-center justify-center bg-[var(--bk-tile)] p-4 sm:p-5"
      colorPair={pair}
    >
      <div
        className="flex w-full max-w-[420px] flex-col"
        style={{ color: fgHex }}
      >
        {/* Transparent row: dots + tab (only the tab is filled) */}
        <div className="flex items-end">
          <div className="flex shrink-0 items-center gap-1.5 px-3.5 pb-2.5">
            <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
              <circle cx="4" cy="4" r="3.5" fill={bgHex} />
            </svg>
            <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
              <circle cx="4" cy="4" r="3.5" fill={bgHex} />
            </svg>
            <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
              <circle cx="4" cy="4" r="3.5" fill={bgHex} />
            </svg>
          </div>

          <div
            className="flex w-[48%] min-w-0 items-center gap-2 px-3 py-2 sm:w-[42%] sm:px-3.5"
            style={{
              backgroundColor: bgHex,
              borderRadius: "10px 10px 0 0",
              boxShadow: onLightChrome
                ? "inset 0 0 0 1px rgba(10,10,10,0.08)"
                : undefined,
            }}
          >
            <div className="flex size-4 shrink-0 items-center justify-center overflow-hidden">
              {svg ? (
                <SvgPreview
                  svg={svg}
                  className="size-4 [&_svg]:size-4"
                  invertForDark
                />
              ) : (
                <span
                  className="block size-3 shrink-0 rounded-full opacity-40"
                  style={{ backgroundColor: fgHex }}
                />
              )}
            </div>
            <span className="min-w-0 truncate text-[11px] font-semibold tracking-tight sm:text-xs">
              {name}
            </span>
            <X
              className="ml-auto size-3 shrink-0 opacity-55"
              strokeWidth={2.5}
              aria-hidden
            />
          </div>
        </div>

        {/* Browser search / toolbar */}
        <div
          className="flex items-center gap-2.5 rounded-b-[12px] px-3.5 py-3 sm:gap-3 sm:px-4"
          style={{
            backgroundColor: bgHex,
            color: fgHex,
            borderTopRightRadius: 12,
            boxShadow: onLightChrome
              ? "inset 0 0 0 1px rgba(10,10,10,0.08)"
              : undefined,
          }}
        >
          <div className={cn("hidden items-center gap-2.5 sm:flex", chromeMuted)}>
            <ChevronLeft className="size-3.5" strokeWidth={2} aria-hidden />
            <ChevronRight
              className="size-3.5 opacity-60"
              strokeWidth={2}
              aria-hidden
            />
            <RotateCw className="size-3.5" strokeWidth={2} aria-hidden />
            <Home className="size-3.5" strokeWidth={2} aria-hidden />
          </div>
          <div className={cn("flex items-center gap-2 sm:hidden", chromeMuted)}>
            <ChevronLeft className="size-3.5" strokeWidth={2} aria-hidden />
            <RotateCw className="size-3.5" strokeWidth={2} aria-hidden />
          </div>

          <div
            className="flex min-w-0 flex-1 items-center gap-2 rounded-full px-3 py-1.5"
            style={{ backgroundColor: addressBg, color: fgHex }}
          >
            <Lock
              className="size-3 shrink-0 opacity-90"
              strokeWidth={2}
              aria-hidden
            />
            <span className="truncate text-[11px] font-medium tracking-tight sm:text-xs">
              {domain}
            </span>
          </div>
        </div>
      </div>
    </ContextCardShell>
  );
}

function ContextInstagram({ name }: { name: string }) {
  const pair = useContextColorPair();
  const { fgHex, bgHex } = pair;
  const { options, value, setValue, svg } = useContextAssetSelection(
    "icon",
    fgHex,
  );
  const handle = name.toLowerCase().replace(/\s+/g, "") || "brand";
  const website = `${handle}.com`;

  return (
    <ContextCardShell
      title="Instagram profile"
      options={options}
      value={value}
      onChange={setValue}
      stageClassName="bg-white p-5"
      colorPair={pair}
      showColorDivider
    >
        <div className="flex gap-5">
          <div
            className="flex size-[88px] shrink-0 items-center justify-center overflow-hidden rounded-full p-4 sm:size-[104px]"
            style={{ backgroundColor: bgHex }}
          >
            {svg ? (
              <SvgPreview
                svg={svg}
                className="flex size-full items-center justify-center [&_svg]:max-h-full [&_svg]:max-w-full"
                invertForDark
              />
            ) : (
              <span
                className="size-10 rounded-full opacity-20"
                style={{ backgroundColor: fgHex }}
              />
            )}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-2">
              <p className="truncate text-base font-semibold tracking-tight text-foreground">
                {handle}
              </p>
              <Settings
                className="size-4 shrink-0 text-foreground"
                aria-hidden
              />
            </div>
            <p className="mt-0.5 text-sm text-foreground">{name}</p>
            <p className="mt-2 text-sm text-foreground">
              <span className="font-semibold">128</span>
              <span className="text-muted-foreground"> posts</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="font-semibold">24.8K</span>
              <span className="text-muted-foreground"> followers</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="font-semibold">312</span>
              <span className="text-muted-foreground"> following</span>
            </p>
            <p className="mt-2 text-sm leading-snug text-foreground">
              Designed with intention. Built with precision.
            </p>
            <p className="mt-1.5 flex items-center gap-1 text-sm font-medium text-[#00376b]">
              <Link2 className="size-3.5 shrink-0" aria-hidden />
              {website}
            </p>
          </div>
        </div>
    </ContextCardShell>
  );
}

function ContextProfilePicture({ name }: { name: string }) {
  const pair = useContextColorPair();
  const { fgHex, bgHex } = pair;
  const { options, value, setValue, svg } = useContextAssetSelection(
    "vertical",
    fgHex,
  );

  return (
    <ContextCardShell
      title="Profile picture"
      options={options}
      value={value}
      onChange={setValue}
      className="h-full"
      stageClassName="flex flex-1 items-center justify-center bg-[var(--bk-tile)] p-6"
      colorPair={pair}
    >
        <div
          className="relative aspect-square w-full max-w-[320px] overflow-hidden shadow-sm"
          style={{ backgroundColor: bgHex }}
          role="img"
          aria-label={`${name} profile picture, 1080 by 1080 pixels`}
        >
          {svg ? (
            <div className="absolute inset-[18%] flex items-center justify-center">
              <SvgPreview
                svg={svg}
                className="flex h-full w-full items-center justify-center [&_svg]:max-h-full [&_svg]:max-w-full"
                invertForDark
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-xs text-white/50">Upload logo assets</span>
            </div>
          )}
          <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/25 px-1.5 py-0.5 text-[10px] font-medium text-white/90">
            1080×1080
          </span>
        </div>
    </ContextCardShell>
  );
}

function ContextNav({ name }: { name: string }) {
  const pair = useContextColorPair();
  const { fgHex, bgHex } = pair;
  const { options, value, setValue, svg } = useContextAssetSelection(
    "horizontal",
    fgHex,
  );
  const onLightBg = isLightHex(bgHex);

  return (
    <ContextCardShell
      title="Website navigation"
      options={options}
      value={value}
      onChange={setValue}
      stageClassName="flex items-center justify-center bg-[var(--bk-tile)] p-4 sm:p-5"
      colorPair={pair}
    >
      <div
        className={cn(
          "flex w-[99%] items-center justify-between px-5 py-4",
          onLightBg ? "text-[var(--bk-ink)]" : "text-white",
        )}
        style={{ backgroundColor: bgHex }}
      >
        <div className="flex h-9 items-center">
          {svg ? (
            value === "icon" ||
            value === "submark" ||
            value === "monogram" ? (
              <div className="size-8 [&_svg]:size-8">
                <SvgPreview
                  svg={svg}
                  className="size-8"
                  invertForDark
                  align="start"
                />
              </div>
            ) : (
              <div className="h-8 w-fit max-w-[45%] [&_svg]:h-8 [&_svg]:w-auto">
                <SvgPreview
                  svg={svg}
                  className="h-8 w-auto"
                  invertForDark
                  align="start"
                />
              </div>
            )
          ) : (
            <span
              className="h-4 w-20 rounded opacity-20"
              style={{ backgroundColor: fgHex }}
            />
          )}
        </div>
        <div
          className={cn(
            "hidden items-center gap-4 text-xs sm:flex",
            onLightBg ? "text-[var(--bk-ink)]/70" : "text-white/75",
          )}
        >
          <span>Work</span>
          <span>About</span>
          <span>Contact</span>
        </div>
      </div>
      <p className="sr-only">{name} website navigation preview</p>
    </ContextCardShell>
  );
}

function slideDeckCoverWash(hex: string): string {
  const base = normalizeHex(hex);
  const deep = shadeHex(base, 0.3);
  const soft = tintHex(base, 0.2);
  const bloom = tintHex(base, 0.38);
  return [
    `radial-gradient(ellipse 88% 100% at 10% 48%, ${deep} 0%, transparent 58%)`,
    `radial-gradient(ellipse 78% 90% at 94% 55%, ${deep} 0%, transparent 52%)`,
    `radial-gradient(ellipse 72% 82% at 40% 16%, ${soft} 0%, transparent 56%)`,
    `radial-gradient(ellipse 55% 60% at 68% 28%, ${bloom} 0%, transparent 50%)`,
    base,
  ].join(", ");
}

function ContextSlideDeckCover({ name }: { name: string }) {
  const pair = useContextColorPair();
  const { fgHex, bgHex } = pair;
  const { options, value, setValue, svg } = useContextAssetSelection(
    "horizontal",
    fgHex,
  );
  const isMark =
    value === "icon" || value === "submark" || value === "monogram";
  const onLightBg = isLightHex(bgHex);
  const accent = onLightBg ? shadeHex(bgHex, 0.35) : tintHex(bgHex, 0.45);
  const wash = slideDeckCoverWash(bgHex);

  return (
    <ContextCardShell
      title="Slide deck cover"
      options={options}
      value={value}
      onChange={setValue}
      className="h-full"
      stageClassName="flex flex-1 items-center justify-center bg-[var(--bk-tile)] p-4 sm:p-5"
      colorPair={pair}
    >
      <div
        className={cn(
          "relative aspect-[16/9] w-[99%] overflow-hidden",
          onLightBg ? "text-[var(--bk-ink)]" : "text-white",
        )}
        style={{ background: wash }}
        role="img"
        aria-label={`${name} slide deck cover`}
      >
        {/* Logo — top left */}
        <div className="absolute top-0 left-0 z-10 px-4 pt-3.5 sm:px-5 sm:pt-4">
          {svg ? (
            <div
              className={
                isMark
                  ? "flex size-7 items-center justify-center sm:size-8 [&_svg]:max-h-full [&_svg]:max-w-full"
                  : "flex h-5 w-fit max-w-[42%] items-center sm:h-6 [&_svg]:h-full [&_svg]:w-auto"
              }
            >
              <SvgPreview
                svg={svg}
                className={
                  isMark
                    ? "flex size-full items-center justify-center"
                    : "h-full w-auto"
                }
                invertForDark
                align="start"
              />
            </div>
          ) : (
            <span
              className="block h-4 w-20 rounded opacity-30 sm:h-5"
              style={{ backgroundColor: fgHex }}
            />
          )}
        </div>

        {/* Title — bottom left */}
        <div className="absolute bottom-0 left-0 z-10 px-4 pb-3.5 sm:px-5 sm:pb-4">
          <p className="m-0 text-[15px] leading-[1.15] font-medium tracking-[-0.02em] sm:text-[18px]">
            Earnings
            <br />
            Presentation
          </p>
        </div>

        {/* Quarter — bottom right */}
        <div className="absolute right-0 bottom-0 z-10 px-4 pb-3.5 sm:px-5 sm:pb-4">
          <span
            className="text-[15px] leading-none font-medium tracking-[-0.02em] sm:text-[18px]"
            style={{ color: accent }}
          >
            Q1
          </span>
        </div>
      </div>
    </ContextCardShell>
  );
}

function FakeQrCode({
  className,
  color = "#ffffff",
}: {
  className?: string;
  color?: string;
}) {
  // Deterministic pattern so it looks like a QR without being scannable.
  const cells = [
    1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1,
    1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1,
    1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1,
    1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1,
    1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1,
    1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1,
    1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1,
    0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0,
    0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1,
    1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0,
    0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1,
    1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0,
    1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1,
    1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0,
    1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1,
    1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0,
    1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1,
  ];

  return (
    <div
      className={className}
      aria-hidden
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(19, 1fr)",
        gap: 0,
      }}
    >
      {cells.map((on, i) => (
        <span
          key={i}
          style={{
            aspectRatio: "1",
            backgroundColor: on ? color : "transparent",
          }}
        />
      ))}
    </div>
  );
}

function ContextBusinessCardBack({ name }: { name: string }) {
  const pair = useContextColorPair();
  const { fgHex, bgHex } = pair;
  const { options, value, setValue, svg } = useContextAssetSelection(
    "horizontal",
    fgHex,
  );
  const email = `hello@${name.toLowerCase().replace(/\s+/g, "") || "brand"}.com`;
  const onLightBg = isLightHex(bgHex);

  return (
    <ContextCardShell
      title="Business card"
      options={options}
      value={value}
      onChange={setValue}
      className="h-full"
      stageClassName="flex flex-1 items-center justify-center bg-[var(--bk-tile)] p-4 sm:p-5"
      colorPair={pair}
    >
      <div
        className={cn(
          "aspect-[1.75/1] w-[70%] p-5",
          onLightBg ? "text-[var(--bk-ink)]" : "text-white",
        )}
        style={{ backgroundColor: bgHex }}
        role="img"
        aria-label={`${name} business card back`}
      >
        <div className="flex h-full flex-col justify-between">
          {svg ? (
            <div className="h-8 w-fit max-w-[55%] [&_svg]:h-8 [&_svg]:w-auto">
              <SvgPreview
                svg={svg}
                className="h-8 w-auto"
                invertForDark
                align="start"
              />
            </div>
          ) : (
            <span
              className="h-6 w-32 rounded opacity-20"
              style={{ backgroundColor: fgHex }}
            />
          )}
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{name}</p>
              <p
                className={cn(
                  "truncate text-[11px]",
                  onLightBg ? "text-[var(--bk-ink)]/60" : "text-white/60",
                )}
              >
                {email}
              </p>
            </div>
            <FakeQrCode
              className="size-9 shrink-0 sm:size-10"
              color={fgHex}
            />
          </div>
        </div>
      </div>
    </ContextCardShell>
  );
}

function formatStatusTime(date: Date) {
  return date
    .toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\s*(AM|PM|am|pm)/, "");
}

function ContextPhoneApp({ name }: { name: string }) {
  const pair = useContextColorPair();
  const { fgHex, bgHex } = pair;
  const { options, value, setValue, svg } = useContextAssetSelection(
    "icon",
    fgHex,
  );
  const label = (name.trim() || "Brand").toLowerCase();
  const wallpaper = `linear-gradient(165deg, #1c1410 0%, ${bgHex}bb 58%, ${bgHex} 100%)`;
  const [time, setTime] = useState(() => formatStatusTime(new Date()));

  useEffect(() => {
    const tick = () => setTime(formatStatusTime(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <ContextCardShell
      title="App icon"
      options={options}
      value={value}
      onChange={setValue}
      className="h-full"
      stageClassName="flex flex-1 items-center justify-center bg-[var(--bk-tile)] p-5 sm:p-6"
      colorPair={pair}
    >
        <div
          className="relative flex aspect-[9/19] w-full max-w-[220px] flex-col overflow-hidden rounded-[2rem] border border-black/15 bg-black p-[7px] shadow-sm"
          role="img"
          aria-label={`${label} phone app icon preview`}
        >
          <div
            className="relative flex flex-1 flex-col overflow-hidden rounded-[1.55rem]"
            style={{ background: wallpaper }}
          >
            {/* Status bar */}
            <div className="relative z-10 flex items-center justify-between px-5 pt-3">
              <span className="text-[11px] font-semibold tracking-tight text-white">
                {time}
              </span>
              <div className="absolute left-1/2 top-2.5 h-6 w-[72px] -translate-x-1/2 rounded-full bg-black" />
              <div className="h-2.5 w-5 overflow-hidden rounded-sm border border-white/85">
                <div className="h-full w-3/5 bg-white/85" />
              </div>
            </div>

            {/* Home grid */}
            <div className="grid flex-1 grid-cols-4 content-start gap-x-3 gap-y-4 px-4 pt-7">
              <div className="flex flex-col items-center gap-1">
                <div className="relative aspect-square w-full">
                  <div
                    className="flex size-full items-center justify-center overflow-hidden rounded-[22%]"
                    style={{ backgroundColor: bgHex }}
                  >
                    {svg ? (
                      <div className="flex size-[58%] items-center justify-center">
                        <SvgPreview
                          svg={svg}
                          className="flex size-full items-center justify-center [&_svg]:max-h-full [&_svg]:max-w-full"
                          invertForDark
                        />
                      </div>
                    ) : (
                      <span
                        className="size-6 rounded-md opacity-25"
                        style={{ backgroundColor: fgHex }}
                      />
                    )}
                  </div>
                  <span className="absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full bg-[#ff3b30] text-[9px] font-semibold leading-none text-white">
                    3
                  </span>
                </div>
                <p className="w-full truncate text-center text-[9px] font-medium leading-tight text-white">
                  {label}
                </p>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="aspect-square w-full rounded-[22%] bg-white/90" />
                <span className="h-1.5 w-8 rounded-full bg-white/40" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="aspect-square w-full rounded-[22%] bg-white/25" />
                <span className="h-1.5 w-8 rounded-full bg-white/25" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="aspect-square w-full rounded-[22%] bg-white/20" />
                <span className="h-1.5 w-7 rounded-full bg-white/20" />
              </div>
            </div>

            <div className="flex shrink-0 justify-center pb-2 pt-2">
              <div className="h-1 w-28 rounded-full bg-white/50" />
            </div>
          </div>
        </div>
    </ContextCardShell>
  );
}

function ContextSocialBanner({ name }: { name: string }) {
  const pair = useContextColorPair();
  const { fgHex, bgHex } = pair;
  const { options, value, setValue, svg } = useContextAssetSelection(
    "vertical",
    fgHex,
  );
  const slug = name.toLowerCase().replace(/\s+/g, "");
  const email = `hello@${slug || "brand"}.com`;
  const phone = "+1 (555) 012-3456";
  const website = `${slug || "brand"}.com`;
  const onLightBg = isLightHex(bgHex);

  return (
    <ContextCardShell
      title="Social media banner"
      options={options}
      value={value}
      onChange={setValue}
      stageClassName="flex items-center justify-center bg-[var(--bk-tile)] p-4 sm:p-5"
      colorPair={pair}
    >
      <div
        className={cn(
          "relative aspect-[6/1] w-[99%] overflow-hidden",
          onLightBg ? "text-[var(--bk-ink)]" : "text-white",
        )}
        style={{ backgroundColor: bgHex }}
        role="img"
        aria-label={`${name} social media banner`}
      >
        <div className="absolute inset-0 flex items-end justify-between gap-4 px-5 pb-3.5 sm:px-8 sm:pb-4">
          <div
            className={cn(
              "relative flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-[10px] sm:gap-x-6 sm:text-xs",
              onLightBg ? "text-[var(--bk-ink)]/90" : "text-white/90",
            )}
          >
            <span className="truncate">{email}</span>
            <span
              className={cn(
                "hidden h-3 w-px sm:block",
                onLightBg ? "bg-[var(--bk-ink)]/30" : "bg-white/30",
              )}
              aria-hidden
            />
            <span className="truncate">{phone}</span>
            <span
              className={cn(
                "hidden h-3 w-px sm:block",
                onLightBg ? "bg-[var(--bk-ink)]/30" : "bg-white/30",
              )}
              aria-hidden
            />
            <span className="truncate">{website}</span>
          </div>

          <div className="absolute top-1/2 right-4 flex h-[55%] w-[20%] max-w-[130px] -translate-y-1/2 items-center justify-center sm:right-7">
            {svg ? (
              <SvgPreview
                svg={svg}
                className="flex h-full w-full items-center justify-center [&_svg]:max-h-full [&_svg]:max-w-full"
              />
            ) : (
              <span
                className="h-14 w-10 rounded opacity-15"
                style={{ backgroundColor: fgHex }}
              />
            )}
          </div>
        </div>
      </div>
    </ContextCardShell>
  );
}
