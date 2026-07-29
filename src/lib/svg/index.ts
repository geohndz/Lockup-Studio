import type { LockupType } from "@/types/project";
import {
  dedupeNearHexes,
  isNearBlackOrWhite,
  paintToHex,
} from "@/lib/color";

export interface SvgBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SKIP_PAINT = new Set(["none", "transparent", "currentcolor"]);

/**
 * Parse CSS in <style> blocks for class → fill/stroke paints.
 * Handles Illustrator/Figma exports like `.st0{fill:#C4A484;}`.
 */
function parseCssClassPaints(cssText: string): Map<string, string> {
  const classPaints = new Map<string, string>();
  const ruleRe = /\.([a-zA-Z_][\w-]*)\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = ruleRe.exec(cssText)) !== null) {
    const className = match[1];
    const body = match[2];
    const fill = body.match(/(?:^|;)\s*fill\s*:\s*([^;!}]+)/i)?.[1]?.trim();
    const stroke = body.match(/(?:^|;)\s*stroke\s*:\s*([^;!}]+)/i)?.[1]?.trim();
    const stop = body.match(/(?:^|;)\s*stop-color\s*:\s*([^;!}]+)/i)?.[1]?.trim();
    const paint =
      (fill && shouldReplacePaint(fill) && fill) ||
      (stroke && shouldReplacePaint(stroke) && stroke) ||
      (stop && shouldReplacePaint(stop) && stop) ||
      null;
    if (paint) {
      classPaints.set(className, paint.trim().toLowerCase());
    }
  }
  return classPaints;
}

/** Collect solid fill/stroke paints with occurrence counts. */
export function collectSvgPaintCounts(raw: string): Map<string, number> {
  const counts = new Map<string, number>();

  const bump = (value: string, weight = 1) => {
    const key = value.trim().toLowerCase();
    if (!shouldReplacePaint(key)) return;
    counts.set(key, (counts.get(key) || 0) + weight);
  };

  try {
    const svg = parseSvg(raw);
    const classPaints = new Map<string, string>();

    // Class rules from <style> blocks (Illustrator / Figma / Sketch)
    svg.querySelectorAll("style").forEach((styleEl) => {
      const parsed = parseCssClassPaints(styleEl.textContent || "");
      for (const [cls, paint] of parsed) {
        classPaints.set(cls, paint);
        bump(paint, 1);
      }
    });

    const elements = [svg, ...Array.from(svg.querySelectorAll("*"))];

    for (const el of elements) {
      if (!(el instanceof Element)) continue;
      if (el.tagName.toLowerCase() === "style") continue;

      for (const attr of ["fill", "stroke", "stop-color", "flood-color"] as const) {
        const value = el.getAttribute(attr);
        if (value) bump(value);
      }

      const style = el.getAttribute("style");
      if (style) {
        for (const prop of ["fill", "stroke", "stop-color", "flood-color", "color"]) {
          const m = style.match(
            new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, "i"),
          );
          if (m?.[1]) bump(m[1]);
        }
      }

      const classAttr = el.getAttribute("class");
      if (classAttr) {
        for (const cls of classAttr.trim().split(/\s+/)) {
          const paint = classPaints.get(cls);
          if (paint) bump(paint, 2);
        }
      }
    }
  } catch {
    // ignore parse errors — fall through to raw scan
  }

  // Always merge hex literals from raw markup (style/attrs we might have missed)
  {
    const hexRe = /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
    let hexMatch: RegExpExecArray | null;
    while ((hexMatch = hexRe.exec(raw)) !== null) {
      const rawHex = hexMatch[1];
      // Drop alpha channel from #RRGGBBAA
      const rgb =
        rawHex.length === 8 ? rawHex.slice(0, 6) : rawHex;
      bump(`#${rgb}`);
    }
  }

  return counts;
}

/** Collect unique solid fill/stroke paints (ignores none, url(), currentColor). */
export function collectSvgPaints(raw: string): string[] {
  return Array.from(collectSvgPaintCounts(raw).keys());
}

/**
 * Extract up to `max` brand hexes from SVG paints.
 * Prefers chromatic colors over near-black / near-white when both exist.
 */
export function extractBrandHexes(raw: string, max = 3): string[] {
  const counts = collectSvgPaintCounts(raw);
  const scored: { hex: string; count: number; order: number }[] = [];
  let order = 0;

  for (const [paint, count] of counts) {
    const hex = paintToHex(paint);
    if (!hex) continue;
    scored.push({ hex, count, order: order++ });
  }

  scored.sort((a, b) => b.count - a.count || a.order - b.order);
  const orderedHexes = dedupeNearHexes(scored.map((s) => s.hex));

  const chromatic = orderedHexes.filter((h) => !isNearBlackOrWhite(h));
  const mono = orderedHexes.filter((h) => isNearBlackOrWhite(h));
  const ranked = chromatic.length > 0 ? [...chromatic, ...mono] : mono;

  return ranked.slice(0, max);
}

export function isMultiColorSvg(raw: string): boolean {
  return collectSvgPaints(raw).length > 1;
}

export function parseSvg(raw: string): SVGSVGElement {
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) {
    throw new Error("Invalid SVG: root <svg> element not found");
  }

  // Strip external references that cannot be resolved in-browser
  svg.querySelectorAll("image[href], image[xlink\\:href]").forEach((el) => {
    const href =
      el.getAttribute("href") || el.getAttribute("xlink:href") || "";
    if (href.startsWith("http://") || href.startsWith("https://")) {
      el.remove();
    }
  });

  // Keep artwork optically centered in preview/export viewports
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  return svg;
}

export function serializeSvg(svg: SVGSVGElement): string {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svg);
}

function isNearWhitePaint(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (v === "#fff" || v === "#ffffff" || v === "white") return true;
  const hex = v.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return r >= 245 && g >= 245 && b >= 245;
  }
  const rgb = v.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgb) {
    return (
      Number(rgb[1]) >= 245 && Number(rgb[2]) >= 245 && Number(rgb[3]) >= 245
    );
  }
  return false;
}

/** Intrinsic max edge for exported SVG width/height attributes (px). */
export const EXPORT_SVG_MAX_PX = 1080;

/**
 * Scale width/height so the longer edge is `maxPx`, preserving aspect ratio.
 * ViewBox / artwork units are unchanged — only the declared display size.
 */
export function exportDisplaySize(
  boundsWidth: number,
  boundsHeight: number,
  maxPx: number = EXPORT_SVG_MAX_PX,
): { width: number; height: number } {
  const w = Math.max(boundsWidth, 1);
  const h = Math.max(boundsHeight, 1);
  if (w >= h) {
    const width = maxPx;
    const height = Math.max(1, Math.round((maxPx * h) / w));
    return { width, height };
  }
  const height = maxPx;
  const width = Math.max(1, Math.round((maxPx * w) / h));
  return { width, height };
}

/**
 * Prepare SVG markup for export: keep natural aspect ratio, strip solid white
 * full-bleed background rects, avoid injecting a page background, and set
 * intrinsic size so the longer edge is 1080px (other edge auto).
 */
export function prepareSvgForExport(raw: string): string {
  const svg = parseSvg(raw);

  // Never force a document/page fill on export
  svg.removeAttribute("style");
  svg.style.removeProperty("background");
  svg.style.removeProperty("background-color");
  if (isNearWhitePaint(svg.getAttribute("fill") || "")) {
    svg.setAttribute("fill", "none");
  }

  // Prefer declared frame for detecting full-bleed bg rects
  const frame = readSvgFrame(svg);

  const rects = Array.from(svg.querySelectorAll("rect"));
  for (const rect of rects) {
    const fill =
      rect.getAttribute("fill") ||
      rect.style.fill ||
      (rect.getAttribute("style")?.match(/(?:^|;)\s*fill\s*:\s*([^;]+)/i)?.[1] ??
        "");
    if (!fill || !isNearWhitePaint(fill)) continue;

    const x = parseFloat(rect.getAttribute("x") || "0");
    const y = parseFloat(rect.getAttribute("y") || "0");
    const w = parseFloat(rect.getAttribute("width") || "0");
    const h = parseFloat(rect.getAttribute("height") || "0");
    const coversView =
      Math.abs(x - frame.x) <= 1 &&
      Math.abs(y - frame.y) <= 1 &&
      w >= frame.width * 0.95 &&
      h >= frame.height * 0.95;

    if (coversView) rect.remove();
  }

  // Measure after stripping so aspect follows artwork, not a square frame
  const bounds = getSvgBounds(svg);
  svg.setAttribute(
    "viewBox",
    `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`,
  );

  const { width, height } = exportDisplaySize(bounds.width, bounds.height);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  return serializeSvg(svg);
}

function readSvgFrame(svg: SVGSVGElement): SvgBounds {
  const viewBox = svg.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
      const [x, y, width, height] = parts;
      if (width > 0 && height > 0) return { x, y, width, height };
    }
  }
  const widthAttr = parseFloat(svg.getAttribute("width") || "");
  const heightAttr = parseFloat(svg.getAttribute("height") || "");
  if (widthAttr > 0 && heightAttr > 0) {
    return { x: 0, y: 0, width: widthAttr, height: heightAttr };
  }
  return { x: 0, y: 0, width: 100, height: 100 };
}

export function cloneSvg(svg: SVGSVGElement): SVGSVGElement {
  return svg.cloneNode(true) as SVGSVGElement;
}

export function getSvgBounds(svg: SVGSVGElement): SvgBounds {
  const tight = measureTightBounds(svg);
  if (tight) return tight;

  const viewBox = svg.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
      const [x, y, width, height] = parts;
      if (width > 0 && height > 0) {
        return { x, y, width, height };
      }
    }
  }

  const widthAttr = parseFloat(svg.getAttribute("width") || "");
  const heightAttr = parseFloat(svg.getAttribute("height") || "");
  if (widthAttr > 0 && heightAttr > 0) {
    return { x: 0, y: 0, width: widthAttr, height: heightAttr };
  }

  return { x: 0, y: 0, width: 100, height: 100 };
}

/** Measure ink bounds via getBBox (requires a live DOM mount). */
function measureTightBounds(svg: SVGSVGElement): SvgBounds | null {
  if (typeof document === "undefined") return null;

  const mount = document.createElement("div");
  mount.setAttribute(
    "style",
    "position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none",
  );
  const clone = svg.cloneNode(true) as SVGSVGElement;
  // Give the clone room to lay out paths for accurate bbox
  clone.setAttribute("width", "1000");
  clone.setAttribute("height", "1000");
  mount.appendChild(clone);
  document.body.appendChild(mount);

  try {
    const bbox = clone.getBBox();
    if (
      Number.isFinite(bbox.x) &&
      Number.isFinite(bbox.y) &&
      bbox.width > 0 &&
      bbox.height > 0
    ) {
      // Small padding so strokes near the edge aren't clipped
      const pad = 0.5;
      return {
        x: bbox.x - pad,
        y: bbox.y - pad,
        width: bbox.width + pad * 2,
        height: bbox.height + pad * 2,
      };
    }
  } catch {
    // getBBox can fail for empty/detached edge cases
  } finally {
    mount.remove();
  }

  return null;
}

/** Normalize an SVG so its viewBox tightly wraps the artwork. */
export function normalizeSvgViewBox(svg: SVGSVGElement): SvgBounds {
  const bounds = getSvgBounds(svg);
  svg.setAttribute(
    "viewBox",
    `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`,
  );
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  return bounds;
}

function shouldReplacePaint(value: string | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (SKIP_PAINT.has(normalized)) return false;
  if (normalized.startsWith("url(")) return false;
  return true;
}

function replaceStylePaints(style: string, color: string): string {
  return style.replace(
    /((?:^|;)\s*(?:fill|stroke|stop-color|flood-color|color)\s*:\s*)([^;]+)/gi,
    (match, prefix: string, value: string) => {
      if (!shouldReplacePaint(value)) return match;
      return `${prefix}${color}`;
    },
  );
}

/** Rewrite fill/stroke/stop-color declarations inside a CSS stylesheet string. */
function recolorCssText(css: string, color: string): string {
  return css.replace(
    /(fill|stroke|stop-color|flood-color|color)\s*:\s*([^;!}]+)/gi,
    (match, prop: string, value: string) => {
      if (!shouldReplacePaint(value.trim())) return match;
      return `${prop}:${color}`;
    },
  );
}

/**
 * Force every solid paint in SVG markup to `color`.
 * Handles Illustrator/Figma <style> classes, attributes, rgb(), and hex
 * (including #RRGGBBAA). Skips url(#…) references.
 */
export function recolorSvgMarkup(raw: string, color: string): string {
  const target = color.trim();
  let out = raw;

  // Hex paints: #RGB, #RRGGBB, #RRGGBBAA — not url(#id)
  out = out.replace(
    /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g,
    (match, _hex: string, offset: number, source: string) => {
      const before = source.slice(Math.max(0, offset - 6), offset).toLowerCase();
      if (before.includes("url(")) return match;
      return target;
    },
  );

  // rgb() / rgba() paints
  out = out.replace(/rgba?\(\s*[\d.%\s,/]+\s*\)/gi, target);

  // hsl() / hsla() paints
  out = out.replace(/hsla?\(\s*[\d.%\s,/]+\s*\)/gi, target);

  // Named CSS colors used as fills (common in exports)
  out = out.replace(
    /((?:fill|stroke|stop-color|flood-color|color)\s*:\s*)(black|white|red|blue|green|gray|grey|orange|purple|navy|maroon|teal|olive|silver|lime|aqua|fuchsia|magenta|cyan)(?=\s*[;!}])/gi,
    `$1${target}`,
  );
  out = out.replace(
    /((?:fill|stroke|stop-color|flood-color)\s*=\s*["'])(black|white|red|blue|green|gray|grey)(["'])/gi,
    `$1${target}$3`,
  );

  return out;
}

/** Recolor all non-none fills/strokes to the target hex. */
export function recolorSvg(svg: SVGSVGElement, color: string): SVGSVGElement {
  // String-level pass is authoritative for <style>/CDATA Illustrator exports
  const markup = recolorSvgMarkup(serializeSvg(svg), color);
  const result = parseSvg(markup);

  // DOM pass: force attributes on shapes (beats leftover class edge cases)
  const elements = [result, ...Array.from(result.querySelectorAll("*"))];
  const paintTags = new Set([
    "path",
    "rect",
    "circle",
    "ellipse",
    "polygon",
    "polyline",
    "text",
    "tspan",
    "line",
  ]);

  result.querySelectorAll("style").forEach((styleEl) => {
    const css = styleEl.textContent || "";
    if (css) styleEl.textContent = recolorCssText(css, color);
  });

  for (const el of elements) {
    if (!(el instanceof Element)) continue;
    const tag = el.tagName.toLowerCase();
    if (tag === "style") continue;

    for (const attr of ["fill", "stroke", "stop-color", "flood-color"] as const) {
      const value = el.getAttribute(attr);
      if (shouldReplacePaint(value)) {
        el.setAttribute(attr, color);
      }
    }

    const style = el.getAttribute("style");
    if (style && /(fill|stroke|stop-color|flood-color|color)\s*:/i.test(style)) {
      el.setAttribute("style", replaceStylePaints(style, color));
    }

    if (paintTags.has(tag)) {
      const fill = el.getAttribute("fill");
      // Don't paint over intentional fill="none"
      if (fill && !shouldReplacePaint(fill)) continue;

      el.setAttribute("fill", color);
      // Inline style beats stylesheet class rules (.st0 { fill: … })
      const inline = el.getAttribute("style") || "";
      if (!/(?:^|;)\s*fill\s*:/i.test(inline)) {
        el.setAttribute(
          "style",
          `${inline}${inline && !inline.trim().endsWith(";") ? ";" : ""}fill:${color}`,
        );
      } else {
        el.setAttribute("style", replaceStylePaints(inline, color));
      }
    }
  }

  return result;
}

function prepareContentGroup(
  svg: SVGSVGElement,
  id: string,
): { group: SVGGElement; bounds: SvgBounds } {
  const bounds = normalizeSvgViewBox(svg);
  const group = svg.ownerDocument!.createElementNS(
    "http://www.w3.org/2000/svg",
    "g",
  );
  group.setAttribute("id", id);

  // Normalize content so local origin is at 0,0
  const inner = svg.ownerDocument!.createElementNS(
    "http://www.w3.org/2000/svg",
    "g",
  );
  inner.setAttribute(
    "transform",
    `translate(${-bounds.x}, ${-bounds.y})`,
  );

  Array.from(svg.childNodes).forEach((node) => {
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      (node as Element).tagName.toLowerCase() === "defs"
    ) {
      // Keep defs at root later; skip for now by cloning to group parent
      return;
    }
    inner.appendChild(node.cloneNode(true));
  });

  group.appendChild(inner);
  return { group, bounds: { x: 0, y: 0, width: bounds.width, height: bounds.height } };
}

function collectDefs(svg: SVGSVGElement): Element[] {
  return Array.from(svg.querySelectorAll(":scope > defs"));
}

export type ComposeMode = "horizontal" | "vertical" | "single";

export interface ComposeOptions {
  mode: ComposeMode;
  icon?: SVGSVGElement | null;
  wordmark?: SVGSVGElement | null;
  gap?: number;
  padding?: number;
  /** Multiplier on auto-fit icon scale (1 = 100%). */
  iconScaleFactor?: number;
  /** Cross-axis alignment: start | center | end */
  align?: "start" | "center" | "end";
}

function alignOffset(
  trackSize: number,
  itemSize: number,
  align: "start" | "center" | "end",
): number {
  if (align === "start") return 0;
  if (align === "end") return trackSize - itemSize;
  return (trackSize - itemSize) / 2;
}

export function composeLockup(options: ComposeOptions): string {
  const {
    mode,
    icon = null,
    wordmark = null,
    gap = 24,
    padding = 16,
    iconScaleFactor = 1,
    align = "center",
  } = options;

  const doc = new DOMParser().parseFromString(
    '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    "image/svg+xml",
  );
  const root = doc.documentElement as unknown as SVGSVGElement;

  const defsHost = doc.createElementNS("http://www.w3.org/2000/svg", "defs");
  root.appendChild(defsHost);

  let contentWidth = 0;
  let contentHeight = 0;

  if (mode === "single") {
    const asset = icon || wordmark;
    if (!asset) throw new Error("No asset provided for single lockup");

    collectDefs(asset).forEach((d) => defsHost.appendChild(d.cloneNode(true)));
    const { group, bounds } = prepareContentGroup(asset, "asset");
    group.setAttribute("transform", `translate(${padding}, ${padding})`);
    root.appendChild(group);
    contentWidth = bounds.width;
    contentHeight = bounds.height;
  } else if (mode === "horizontal") {
    if (!icon || !wordmark) {
      throw new Error("Horizontal lockup requires icon and wordmark");
    }

    collectDefs(icon).forEach((d) => defsHost.appendChild(d.cloneNode(true)));
    collectDefs(wordmark).forEach((d) =>
      defsHost.appendChild(d.cloneNode(true)),
    );

    const iconPrep = prepareContentGroup(icon, "icon");
    const wordPrep = prepareContentGroup(wordmark, "wordmark");

    // Scale icon to match wordmark height, then apply user scale factor
    const baseScale =
      iconPrep.bounds.height > 0
        ? wordPrep.bounds.height / iconPrep.bounds.height
        : 1;
    const iconScale = baseScale * iconScaleFactor;
    const scaledIconW = iconPrep.bounds.width * iconScale;
    const scaledIconH = iconPrep.bounds.height * iconScale;

    const rowHeight = Math.max(scaledIconH, wordPrep.bounds.height);
    const iconY = padding + alignOffset(rowHeight, scaledIconH, align);
    const wordY =
      padding + alignOffset(rowHeight, wordPrep.bounds.height, align);

    // Nest scale inside translate so position is the top-left of the scaled graphic
    const iconOuter = doc.createElementNS("http://www.w3.org/2000/svg", "g");
    iconOuter.setAttribute("transform", `translate(${padding}, ${iconY})`);
    iconPrep.group.setAttribute("transform", `scale(${iconScale})`);
    iconOuter.appendChild(iconPrep.group);

    wordPrep.group.setAttribute(
      "transform",
      `translate(${padding + scaledIconW + gap}, ${wordY})`,
    );

    root.appendChild(iconOuter);
    root.appendChild(wordPrep.group);

    contentWidth = scaledIconW + gap + wordPrep.bounds.width;
    contentHeight = rowHeight;
  } else {
    // vertical
    if (!icon || !wordmark) {
      throw new Error("Vertical lockup requires icon and wordmark");
    }

    collectDefs(icon).forEach((d) => defsHost.appendChild(d.cloneNode(true)));
    collectDefs(wordmark).forEach((d) =>
      defsHost.appendChild(d.cloneNode(true)),
    );

    const iconPrep = prepareContentGroup(icon, "icon");
    const wordPrep = prepareContentGroup(wordmark, "wordmark");

    // Match Main logo canvas: 100% = icon height equals wordmark height
    const baseScale =
      iconPrep.bounds.height > 0
        ? wordPrep.bounds.height / iconPrep.bounds.height
        : 1;
    const iconScale = baseScale * iconScaleFactor;
    const scaledIconW = iconPrep.bounds.width * iconScale;
    const scaledIconH = iconPrep.bounds.height * iconScale;

    const totalW = Math.max(scaledIconW, wordPrep.bounds.width);
    const iconX = padding + alignOffset(totalW, scaledIconW, align);
    const wordX = padding + alignOffset(totalW, wordPrep.bounds.width, align);

    const iconOuter = doc.createElementNS("http://www.w3.org/2000/svg", "g");
    iconOuter.setAttribute("transform", `translate(${iconX}, ${padding})`);
    iconPrep.group.setAttribute("transform", `scale(${iconScale})`);
    iconOuter.appendChild(iconPrep.group);

    wordPrep.group.setAttribute(
      "transform",
      `translate(${wordX}, ${padding + scaledIconH + gap})`,
    );

    root.appendChild(iconOuter);
    root.appendChild(wordPrep.group);

    contentWidth = totalW;
    contentHeight = scaledIconH + gap + wordPrep.bounds.height;
  }

  const width = contentWidth + padding * 2;
  const height = contentHeight + padding * 2;

  root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  root.setAttribute("viewBox", `0 0 ${width} ${height}`);
  root.setAttribute("width", String(width));
  root.setAttribute("height", String(height));
  root.setAttribute("fill", "none");
  root.setAttribute("preserveAspectRatio", "xMidYMid meet");

  if (defsHost.childNodes.length === 0) {
    defsHost.remove();
  }

  return serializeSvg(root);
}

function prepareAsset(
  raw: string | null | undefined,
  color: string | null,
): SVGSVGElement | null {
  if (!raw) return null;
  if (!color) return parseSvg(raw);
  // String recolor first so <style>/CDATA paints can't survive parse quirks
  return recolorSvg(parseSvg(recolorSvgMarkup(raw, color)), color);
}

export function buildLockupSvg(options: {
  lockup: LockupType;
  iconRaw: string | null;
  wordmarkRaw: string | null;
  horizontalRaw?: string | null;
  verticalRaw?: string | null;
  submarkRaw?: string | null;
  monogramRaw?: string | null;
  /** When true, compose H/V from icon + wordmark instead of uploaded lockups. */
  composeFromParts?: boolean;
  /**
   * Target mono recolor hex. Pass null to preserve original paints
   * (Original color role / multi-color export).
   */
  color: string | null;
  gapHorizontal: number;
  gapVertical: number;
  padding: number;
  iconScaleHorizontal?: number;
  iconScaleVertical?: number;
  alignHorizontal?: "start" | "center" | "end";
  alignVertical?: "start" | "center" | "end";
}): string {
  const {
    lockup,
    iconRaw,
    wordmarkRaw,
    horizontalRaw = null,
    verticalRaw = null,
    submarkRaw = null,
    monogramRaw = null,
    composeFromParts = false,
    color,
    gapHorizontal,
    gapVertical,
    padding,
    iconScaleHorizontal = 100,
    iconScaleVertical = 100,
    alignHorizontal = "center",
    alignVertical = "center",
  } = options;

  const iconSvg = prepareAsset(iconRaw, color);
  const wordmarkSvg = prepareAsset(wordmarkRaw, color);
  const horizontalSvg = prepareAsset(horizontalRaw, color);
  const verticalSvg = prepareAsset(verticalRaw, color);
  const submarkSvg = prepareAsset(submarkRaw, color);
  const monogramSvg = prepareAsset(monogramRaw, color);

  if (lockup === "icon") {
    if (!iconSvg) throw new Error("Icon lockup requires an icon SVG");
    return composeLockup({
      mode: "single",
      icon: iconSvg,
      padding,
    });
  }

  if (lockup === "wordmark") {
    if (!wordmarkSvg) throw new Error("Wordmark lockup requires a wordmark SVG");
    return composeLockup({
      mode: "single",
      wordmark: wordmarkSvg,
      padding,
    });
  }

  if (lockup === "submark") {
    if (!submarkSvg) throw new Error("Submark lockup requires a submark SVG");
    return composeLockup({
      mode: "single",
      icon: submarkSvg,
      padding,
    });
  }

  if (lockup === "monogram") {
    if (!monogramSvg) throw new Error("Monogram lockup requires a monogram SVG");
    return composeLockup({
      mode: "single",
      icon: monogramSvg,
      padding,
    });
  }

  if (lockup === "horizontal") {
    if (composeFromParts && iconSvg && wordmarkSvg) {
      return composeLockup({
        mode: "horizontal",
        icon: iconSvg,
        wordmark: wordmarkSvg,
        gap: gapHorizontal,
        padding,
        iconScaleFactor: iconScaleHorizontal / 100,
        align: alignHorizontal,
      });
    }
    if (horizontalSvg) {
      return composeLockup({ mode: "single", icon: horizontalSvg, padding });
    }
    throw new Error("Horizontal lockup requires an uploaded SVG");
  }

  // vertical
  if (composeFromParts && iconSvg && wordmarkSvg) {
    return composeLockup({
      mode: "vertical",
      icon: iconSvg,
      wordmark: wordmarkSvg,
      gap: gapVertical,
      padding,
      iconScaleFactor: iconScaleVertical / 100,
      align: alignVertical,
    });
  }
  if (verticalSvg) {
    return composeLockup({ mode: "single", icon: verticalSvg, padding });
  }
  throw new Error("Vertical lockup requires an uploaded SVG");
}
