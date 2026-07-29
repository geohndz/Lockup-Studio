import { fetchColorName } from "@/lib/color-api";
import { isNearBlackOrWhite, normalizeHex } from "@/lib/color";
import { extractBrandHexes } from "@/lib/svg";
import { useProjectStore } from "@/store/project-store";

/**
 * Seed primary/secondary/tertiary from SVG paints, then resolve API names.
 * Chromatic logos drop leftover default B/W swatches.
 * Black-only logos seed both black and white.
 */
export function seedPaletteFromSvgRaw(raw: string): void {
  const extracted = extractBrandHexes(raw, 3);
  if (extracted.length === 0) return;

  const chromatic = extracted.filter((h) => !isNearBlackOrWhite(h));
  const hexes =
    chromatic.length > 0
      ? chromatic
      : [normalizeHex("#000000"), normalizeHex("#FFFFFF")];

  const { seedColorsFromHexes } = useProjectStore.getState();
  const updatedIds = seedColorsFromHexes(hexes, {
    replaceMonoDefaults: chromatic.length > 0,
  });
  void resolveColorNames(updatedIds);
}

/** Fetch and apply The Color API names for the given palette color ids. */
export async function resolveColorNames(ids: string[]): Promise<void> {
  const { colors, updateColor } = useProjectStore.getState();
  await Promise.all(
    ids.map(async (id) => {
      const color = colors.find((c) => c.id === id);
      if (!color) return;
      const name = await fetchColorName(color.hex);
      if (!name) return;
      const current = useProjectStore.getState().colors.find((c) => c.id === id);
      if (
        !current ||
        current.hex.toUpperCase() !== color.hex.toUpperCase()
      ) {
        return;
      }
      updateColor(id, { name });
    }),
  );
}

/** Debounced rename helper for hex edits in the palette UI. */
export function scheduleColorRename(
  id: string,
  hex: string,
  timers: Map<string, ReturnType<typeof setTimeout>>,
  delayMs = 300,
): void {
  const existing = timers.get(id);
  if (existing) clearTimeout(existing);
  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id);
      void (async () => {
        const name = await fetchColorName(hex);
        if (!name) return;
        const current = useProjectStore.getState().colors.find((c) => c.id === id);
        if (!current || current.hex.toUpperCase() !== hex.toUpperCase()) return;
        useProjectStore.getState().updateColor(id, { name });
      })();
    }, delayMs),
  );
}
