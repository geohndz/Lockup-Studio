import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import {
  formatContrast,
  formatCmyk,
  formatRgb,
  isLightHex,
  normalizeHex,
  passesContrastCheck,
} from "@/lib/color";
import { svgToPngBlob } from "@/lib/export/svg-to-png";
import { lockupHasSource, type LockupAssets } from "@/lib/lockups";
import { buildLockupSvg, prepareSvgForExport } from "@/lib/svg";
import type {
  BrandColor,
  ExportSettings,
  LockupConfig,
  LockupType,
  SpacingConfig,
} from "@/types/project";
import {
  COLOR_ROLE_LABELS,
  COLOR_ROLES,
  colorsWithMonoVariations,
  LOCKUP_LABELS,
  LOCKUP_ORDER,
  ORIGINAL_COLOR,
  resolveExportColors,
  type ColorRole,
} from "@/types/project";

/** Mirror Lockup Studio tokens in PDF units. */
const tokens = {
  field: "#EEEEEE",
  card: "#FFFFFF",
  tile: "#F3F3F3",
  dark: "#141414",
  hairline: "#E0E0E0",
  ink: "#0A0A0A",
  ink2: "#5F5F5F",
  ink3: "#6B6B6B",
  passBg: "#E4F6EA",
  passInk: "#1B7A3D",
  failBg: "#FCE8E8",
  failInk: "#C23131",
};

const MARK_PRIORITY: LockupType[] = [
  "icon",
  "monogram",
  "submark",
  "horizontal",
  "wordmark",
  "vertical",
];

const styles = StyleSheet.create({
  page: {
    backgroundColor: tokens.field,
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    color: tokens.ink,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: tokens.hairline,
  },
  headerWordmark: {
    height: 22,
    maxWidth: 180,
    objectFit: "contain",
  },
  headerBrandFallback: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: tokens.ink,
    letterSpacing: -0.3,
  },
  headerMeta: {
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 11,
    color: tokens.ink2,
    marginBottom: 2,
  },
  headerPage: {
    fontSize: 9,
    color: tokens.ink3,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    letterSpacing: -0.3,
    color: tokens.ink,
    marginBottom: 4,
  },
  sectionSupport: {
    fontSize: 10,
    color: tokens.ink3,
    lineHeight: 1.45,
    marginBottom: 14,
    maxWidth: "88%",
  },
  card: {
    backgroundColor: tokens.card,
    borderRadius: 16,
    overflow: "hidden",
  },
  tile: {
    backgroundColor: tokens.tile,
    borderRadius: 12,
  },
  logoGrid: {
    gap: 10,
  },
  logoRow: {
    flexDirection: "row",
    gap: 10,
  },
  logoLabel: {
    width: 70,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: tokens.ink2,
    paddingTop: 28,
  },
  logoCell: {
    flex: 1,
    height: 78,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  logoImage: {
    maxWidth: "85%",
    maxHeight: "70%",
    objectFit: "contain",
  },
  colorHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 70,
    marginBottom: 10,
    paddingVertical: 4,
    gap: 10,
  },
  colorHeaderCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 14,
  },
  colorDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    flexShrink: 0,
  },
  colorHeaderLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: tokens.ink2,
    flexShrink: 1,
  },
  footnote: {
    marginTop: 12,
    fontSize: 8,
    color: tokens.ink3,
  },
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 22,
  },
  swatchCard: {
    width: "18.4%",
    backgroundColor: tokens.card,
    borderRadius: 16,
    padding: 8,
  },
  swatchChip: {
    height: 64,
    borderRadius: 12,
    marginBottom: 8,
  },
  swatchMeta: {
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  swatchName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: tokens.ink,
    marginBottom: 3,
  },
  swatchValue: {
    fontSize: 7.5,
    color: tokens.ink3,
    marginBottom: 1.5,
  },
  swatchRole: {
    fontSize: 7.5,
    color: tokens.ink3,
    marginTop: 2,
  },
  comboGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  comboCard: {
    width: "31.5%",
    backgroundColor: tokens.card,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 2,
  },
  comboStage: {
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    position: "relative",
  },
  comboMark: {
    maxWidth: "50%",
    maxHeight: "55%",
    objectFit: "contain",
  },
  comboCaption: {
    borderTopWidth: 1,
    borderTopColor: tokens.hairline,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  comboTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: tokens.ink,
  },
  comboTitleMuted: {
    fontFamily: "Helvetica",
    color: tokens.ink3,
  },
  comboScores: {
    marginTop: 4,
    gap: 2,
  },
  comboScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  comboMeta: {
    fontSize: 7.5,
    color: tokens.ink3,
  },
  scoreBadge: {
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  scoreBadgeText: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
  },
  cornerBadge: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  cornerBadgeText: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
  },
});

export interface BrandsheetInput {
  brandName: string;
  assets: LockupAssets;
  lockups: LockupConfig;
  spacing: SpacingConfig;
  colors: BrandColor[];
  exportSettings: ExportSettings;
  onProgress?: (message: string) => void;
}

type ColorPass = { color: BrandColor; recolor: string | null };

type PreparedAssets = {
  headerWordmarkSrc: string | null;
  logoCells: Record<string, string | null>;
  markByFg: Record<string, string | null>;
};

function plateForLogo(logoHex: string | null): string {
  if (!logoHex) return tokens.tile;
  return isLightHex(logoHex) ? tokens.dark : tokens.tile;
}

function availableLockups(
  lockups: LockupConfig,
  assets: LockupAssets,
): LockupType[] {
  return LOCKUP_ORDER.filter(
    (lockup) => lockups[lockup] && lockupHasSource(lockup, assets),
  );
}

function pickMarkLockup(assets: LockupAssets): LockupType | null {
  return MARK_PRIORITY.find((type) => lockupHasSource(type, assets)) ?? null;
}

function mainPalette(colors: BrandColor[]): BrandColor[] {
  return colors.filter((c) => c.role !== "black" && c.role !== "white");
}

function cellKey(lockup: LockupType, colorId: string): string {
  return `${lockup}::${colorId}`;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

function buildSvg(
  input: BrandsheetInput,
  lockup: LockupType,
  color: string | null,
): string {
  const { assets, spacing } = input;
  return prepareSvgForExport(
    buildLockupSvg({
      lockup,
      iconRaw: assets.iconRaw,
      wordmarkRaw: assets.wordmarkRaw,
      horizontalRaw: assets.horizontalRaw,
      verticalRaw: assets.verticalRaw,
      submarkRaw: assets.submarkRaw,
      monogramRaw: assets.monogramRaw,
      composeFromParts: assets.composeFromParts,
      color,
      gapHorizontal: spacing.horizontal,
      gapVertical: spacing.vertical,
      padding: spacing.padding,
      iconScaleHorizontal: spacing.iconScaleHorizontal,
      iconScaleVertical: spacing.iconScaleVertical,
      alignHorizontal: spacing.alignHorizontal,
      alignVertical: spacing.alignVertical,
    }),
  );
}

async function renderLogoSrc(
  input: BrandsheetInput,
  lockup: LockupType,
  recolor: string | null,
  widthPx: number,
): Promise<string | null> {
  try {
    const svg = buildSvg(input, lockup, recolor);
    const blob = await svgToPngBlob(
      svg,
      widthPx,
      true,
      plateForLogo(recolor),
    );
    return blobToDataUrl(blob);
  } catch {
    return null;
  }
}

async function prepareAssets(
  input: BrandsheetInput,
  lockups: LockupType[],
  colorPasses: ColorPass[],
  palette: BrandColor[],
): Promise<PreparedAssets> {
  const logoCells: Record<string, string | null> = {};
  const markByFg: Record<string, string | null> = {};

  const headerLockup: LockupType | null = lockupHasSource(
    "wordmark",
    input.assets,
  )
    ? "wordmark"
    : lockupHasSource("horizontal", input.assets)
      ? "horizontal"
      : null;

  const headerWordmarkSrc = headerLockup
    ? await renderLogoSrc(input, headerLockup, "#0A0A0A", 480)
    : null;

  const cols = Math.min(colorPasses.length, 5);
  for (const lockup of lockups) {
    for (let c = 0; c < cols; c++) {
      const pass = colorPasses[c]!;
      logoCells[cellKey(lockup, pass.color.id)] = await renderLogoSrc(
        input,
        lockup,
        pass.recolor,
        280,
      );
    }
  }

  const markLockup = pickMarkLockup(input.assets);
  if (markLockup) {
    for (const color of palette) {
      const hex = normalizeHex(color.hex);
      markByFg[hex] = await renderLogoSrc(input, markLockup, hex, 200);
    }
  }

  return {
    headerWordmarkSrc,
    logoCells,
    markByFg,
  };
}

function roleLabelFor(color: BrandColor): string {
  if (color.role === "black" || color.role === "white") return "Mono";
  const role = (COLOR_ROLES.includes(color.role) ? color.role : "none") as ColorRole;
  return COLOR_ROLE_LABELS[role];
}

function PageHeader({
  brandName,
  title,
  wordmarkSrc,
}: {
  brandName: string;
  title: string;
  wordmarkSrc: string | null;
}) {
  return (
    <View style={styles.header} fixed>
      {wordmarkSrc ? (
        // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image
        <Image src={wordmarkSrc} style={styles.headerWordmark} />
      ) : (
        <Text style={styles.headerBrandFallback}>{brandName}</Text>
      )}
      <View style={styles.headerMeta}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text
          style={styles.headerPage}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
        />
      </View>
    </View>
  );
}

function LogosPage({
  brand,
  wordmarkSrc,
  lockups,
  colorPasses,
  logoCells,
}: {
  brand: string;
  wordmarkSrc: string | null;
  lockups: LockupType[];
  colorPasses: ColorPass[];
  logoCells: Record<string, string | null>;
}) {
  const cols = Math.min(colorPasses.length, 5);
  const shown = colorPasses.slice(0, cols);

  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader
        brandName={brand}
        title="Logo variations"
        wordmarkSrc={wordmarkSrc}
      />
      <Text style={styles.sectionTitle}>Logo variations</Text>
      <Text style={styles.sectionSupport} hyphenationCallback={(word) => [word]}>
        Selected lockups across your export colors. Light marks sit on a dark
        plate; dark marks on a light tile.
      </Text>

      {lockups.length === 0 || shown.length === 0 ? (
        <Text style={styles.footnote}>No lockups available for this export.</Text>
      ) : (
        <View style={styles.logoGrid}>
          <View style={styles.colorHeaderRow}>
            {shown.map((pass) => {
              const hex = pass.recolor
                ? normalizeHex(pass.recolor)
                : "#888888";
              const light = isLightHex(hex);
              return (
              <View key={pass.color.id} style={styles.colorHeaderCell}>
                <View
                  style={[
                    styles.colorDot,
                    {
                      backgroundColor: hex,
                      borderWidth: light ? 0.75 : 0,
                      borderColor: tokens.hairline,
                    },
                  ]}
                />
                <Text style={styles.colorHeaderLabel}>
                  {pass.color.name.slice(0, 14)}
                </Text>
              </View>
              );
            })}
          </View>

          {lockups.map((lockup) => (
            <View key={lockup} style={styles.logoRow} wrap={false}>
              <Text style={styles.logoLabel}>{LOCKUP_LABELS[lockup]}</Text>
              {shown.map((pass) => {
                const src = logoCells[cellKey(lockup, pass.color.id)];
                return (
                  <View
                    key={pass.color.id}
                    style={[
                      styles.logoCell,
                      { backgroundColor: plateForLogo(pass.recolor) },
                    ]}
                  >
                    {src ? (
                      // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image
                      <Image src={src} style={styles.logoImage} />
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}

      {colorPasses.length > cols ? (
        <Text style={styles.footnote}>
          Showing {cols} of {colorPasses.length} colors — full set is in the ZIP.
        </Text>
      ) : null}
    </Page>
  );
}

function ColorsPage({
  brand,
  wordmarkSrc,
  swatches,
  pairs,
  markByFg,
}: {
  brand: string;
  wordmarkSrc: string | null;
  swatches: BrandColor[];
  pairs: { fg: BrandColor; bg: BrandColor }[];
  markByFg: Record<string, string | null>;
}) {
  return (
    <Page size="LETTER" style={styles.page} wrap>
      <PageHeader
        brandName={brand}
        title="Colors & combinations"
        wordmarkSrc={wordmarkSrc}
      />
      <Text style={styles.sectionTitle}>Colors</Text>
      <Text style={styles.sectionSupport} hyphenationCallback={(word) => [word]}>
        Main palette plus black and white. Values shown as hex, RGB, and CMYK.
      </Text>

      {swatches.length === 0 ? (
        <Text style={styles.footnote}>No palette colors yet.</Text>
      ) : (
        <View style={styles.swatchRow}>
          {swatches.map((color) => {
            const hex = normalizeHex(color.hex);
            return (
              <View key={color.id} style={styles.swatchCard} wrap={false}>
                <View
                  style={[
                    styles.swatchChip,
                    {
                      backgroundColor: hex,
                      borderWidth: isLightHex(hex) ? 1 : 0,
                      borderColor: tokens.hairline,
                    },
                  ]}
                />
                <View style={styles.swatchMeta}>
                  <Text style={styles.swatchName}>{color.name}</Text>
                  <Text style={styles.swatchValue}>{hex}</Text>
                  <Text style={styles.swatchValue}>{formatRgb(hex)}</Text>
                  <Text style={styles.swatchValue}>{formatCmyk(hex)}</Text>
                  <Text style={styles.swatchRole}>{roleLabelFor(color)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Text style={styles.sectionTitle}>Color combinations</Text>
      <Text style={styles.sectionSupport} hyphenationCallback={(word) => [word]}>
        Every main-color pair with WCAG 2 AA and APCA scores - including fails.
      </Text>

      {pairs.length === 0 ? (
        <Text style={styles.footnote}>No color combinations to show.</Text>
      ) : (
        <View style={styles.comboGrid}>
          {pairs.map(({ fg, bg }) => {
            const fgHex = normalizeHex(fg.hex);
            const bgHex = normalizeHex(bg.hex);
            const mark = markByFg[fgHex] ?? null;
            const wcag = formatContrast(fgHex, bgHex, "wcag2");
            const apca = formatContrast(fgHex, bgHex, "apca");
            const wcagPass = passesContrastCheck(fgHex, bgHex, "wcag2");
            const apcaPass = passesContrastCheck(fgHex, bgHex, "apca");
            const eitherPass = wcagPass || apcaPass;
            return (
              <View
                key={`${fg.id}-${bg.id}`}
                style={styles.comboCard}
                wrap={false}
              >
                <View style={[styles.comboStage, { backgroundColor: bgHex }]}>
                  {mark ? (
                    // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image
                    <Image src={mark} style={styles.comboMark} />
                  ) : (
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: fgHex,
                        opacity: 0.35,
                      }}
                    />
                  )}
                  <View
                    style={[
                      styles.cornerBadge,
                      {
                        backgroundColor: eitherPass
                          ? tokens.passBg
                          : tokens.failBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cornerBadgeText,
                        {
                          color: eitherPass ? tokens.passInk : tokens.failInk,
                        },
                      ]}
                    >
                      {eitherPass ? "OK" : "X"}
                    </Text>
                  </View>
                </View>
                <View style={styles.comboCaption}>
                  <Text style={styles.comboTitle}>
                    {fg.name}
                    <Text style={styles.comboTitleMuted}> on {bg.name}</Text>
                  </Text>
                  <View style={styles.comboScores}>
                    <View style={styles.comboScoreRow}>
                      <Text style={styles.comboMeta}>WCAG 2  {wcag}</Text>
                      <View
                        style={[
                          styles.scoreBadge,
                          {
                            backgroundColor: wcagPass
                              ? tokens.passBg
                              : tokens.failBg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.scoreBadgeText,
                            {
                              color: wcagPass
                                ? tokens.passInk
                                : tokens.failInk,
                            },
                          ]}
                        >
                          {wcagPass ? "AA" : "fail"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.comboScoreRow}>
                      <Text style={styles.comboMeta}>APCA  {apca}</Text>
                      <View
                        style={[
                          styles.scoreBadge,
                          {
                            backgroundColor: apcaPass
                              ? tokens.passBg
                              : tokens.failBg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.scoreBadgeText,
                            {
                              color: apcaPass
                                ? tokens.passInk
                                : tokens.failInk,
                            },
                          ]}
                        >
                          {apcaPass ? "pass" : "fail"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Page>
  );
}

function BrandSheetDocument({
  brand,
  wordmarkSrc,
  lockups,
  colorPasses,
  logoCells,
  swatches,
  pairs,
  markByFg,
}: {
  brand: string;
  wordmarkSrc: string | null;
  lockups: LockupType[];
  colorPasses: ColorPass[];
  logoCells: Record<string, string | null>;
  swatches: BrandColor[];
  pairs: { fg: BrandColor; bg: BrandColor }[];
  markByFg: Record<string, string | null>;
}) {
  return (
    <Document
      title={`${brand} Brand Sheet`}
      author="Lockup Studio"
      subject="Brand sheet"
      creator="Lockup Studio"
    >
      <LogosPage
        brand={brand}
        wordmarkSrc={wordmarkSrc}
        lockups={lockups}
        colorPasses={colorPasses}
        logoCells={logoCells}
      />
      <ColorsPage
        brand={brand}
        wordmarkSrc={wordmarkSrc}
        swatches={swatches}
        pairs={pairs}
        markByFg={markByFg}
      />
    </Document>
  );
}

/** Build a Brand Sheet PDF as a Blob via React-pdf. */
export async function generateBrandsheetPdf(
  input: BrandsheetInput,
): Promise<Blob> {
  const brand = input.brandName.trim() || "Brand";
  const lockups = availableLockups(input.lockups, input.assets);
  const variationColors = resolveExportColors(
    input.colors,
    input.exportSettings,
  );
  const colorPasses: ColorPass[] = [
    ...variationColors.map((color) => ({
      color,
      recolor: color.hex as string | null,
    })),
  ];
  if (input.exportSettings.includeOriginal) {
    colorPasses.unshift({ color: ORIGINAL_COLOR, recolor: null });
  }

  const palette = mainPalette(input.colors);
  const swatches = colorsWithMonoVariations(input.colors);
  const pairs: { fg: BrandColor; bg: BrandColor }[] = [];
  for (const bgColor of palette) {
    for (const fgColor of palette) {
      if (normalizeHex(fgColor.hex) === normalizeHex(bgColor.hex)) continue;
      pairs.push({ fg: fgColor, bg: bgColor });
    }
  }

  input.onProgress?.("Brand sheet · preparing assets");
  const prepared = await prepareAssets(input, lockups, colorPasses, palette);

  input.onProgress?.("Brand sheet · rendering PDF");
  const blob = await pdf(
    <BrandSheetDocument
      brand={brand}
      wordmarkSrc={prepared.headerWordmarkSrc}
      lockups={lockups}
      colorPasses={colorPasses}
      logoCells={prepared.logoCells}
      swatches={swatches}
      pairs={pairs}
      markByFg={prepared.markByFg}
    />,
  ).toBlob();

  return blob;
}
