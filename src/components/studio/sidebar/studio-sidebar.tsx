"use client";

import { useEffect, useRef, useState } from "react";
import { SvgDropzone } from "@/components/studio/sidebar/svg-dropzone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/project-store";
import { ASSET_MODE_LABELS, type AssetMode } from "@/types/project";

function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 px-[var(--bk-pad-card)] py-5">
      {title ? <h2 className="bk-card-title m-0">{title}</h2> : null}
      {children}
    </section>
  );
}

function AssetModeToggle({
  value,
  onChange,
}: {
  value: AssetMode;
  onChange: (mode: AssetMode) => void;
}) {
  const modes: AssetMode[] = ["upload", "build"];
  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-[var(--bk-radius-pill)] bg-[var(--bk-tile)] p-2"
      role="group"
      aria-label="Asset mode"
    >
      {modes.map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            aria-pressed={active}
            className={cn(
              "cursor-pointer rounded-[var(--bk-radius-pill)] px-2 py-2.5 text-[13.5px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--bk-ink)]",
              active
                ? "bg-[var(--bk-ink)] text-white"
                : "bg-transparent text-[var(--bk-ink-2)]",
            )}
          >
            {ASSET_MODE_LABELS[mode]}
          </button>
        );
      })}
    </div>
  );
}

export function StudioSidebar() {
  const brandName = useProjectStore((s) => s.brandName);
  const setBrandName = useProjectStore((s) => s.setBrandName);
  const horizontal = useProjectStore((s) => s.horizontal);
  const vertical = useProjectStore((s) => s.vertical);
  const icon = useProjectStore((s) => s.icon);
  const wordmark = useProjectStore((s) => s.wordmark);
  const submark = useProjectStore((s) => s.submark);
  const monogram = useProjectStore((s) => s.monogram);
  const assetMode = useProjectStore((s) => s.assetMode);
  const setAssetMode = useProjectStore((s) => s.setAssetMode);
  const setHorizontal = useProjectStore((s) => s.setHorizontal);
  const setVertical = useProjectStore((s) => s.setVertical);
  const setIcon = useProjectStore((s) => s.setIcon);
  const setWordmark = useProjectStore((s) => s.setWordmark);
  const setSubmark = useProjectStore((s) => s.setSubmark);
  const setMonogram = useProjectStore((s) => s.setMonogram);

  const isBuild = assetMode === "build";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showBottomFade, setShowBottomFade] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const sync = () => {
      setShowBottomFade(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
    };

    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);

    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [isBuild, horizontal, vertical, icon, wordmark, submark, monogram]);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-[var(--bk-hairline)] bg-[var(--bk-card)] text-[var(--bk-ink)]">
      <div className="flex h-[80px] shrink-0 items-center gap-1.5 border-b border-[var(--bk-hairline)] px-[var(--bk-pad-card)]">
        <img
          src="/logo-light.svg"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 self-center"
          aria-hidden
        />
        <div className="flex min-w-0 flex-col justify-center leading-none">
          <span className="block text-lg font-semibold leading-none tracking-tight text-[var(--bk-ink)]">
            Lockup Studio
          </span>
          <a
            href="https://geovanyhernandez.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 block text-[12px] font-medium leading-none text-[var(--bk-ink-3)] transition-colors hover:text-[var(--bk-ink)] hover:underline hover:underline-offset-2"
          >
            By Geo Hernandez
          </a>
        </div>
      </div>

      <div className="shrink-0 space-y-4 border-b border-[var(--bk-hairline)] bg-[var(--bk-card)] px-[var(--bk-pad-card)] py-5">
        <div className="space-y-2.5">
          <Label htmlFor="brand-name">Brand name</Label>
          <Input
            id="brand-name"
            placeholder="Your Awesome Company"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            autoComplete="off"
            className="placeholder:text-sm"
          />
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <Section>
            <div className="space-y-4">
              <AssetModeToggle value={assetMode} onChange={setAssetMode} />
              <div className="flex flex-col gap-6">
                <p className="m-0 text-center text-[13px] leading-relaxed text-[var(--bk-ink-3)]">
                  {isBuild
                    ? "Compose Horizontal & Vertical from Icon + Wordmark. Uploaded H/V stay saved if you switch back."
                    : "Use finished Horizontal & Vertical files as-is. Icon + Wordmark stay available for Build."}
                </p>

                {!isBuild && icon && wordmark && !horizontal && !vertical ? (
                  <p className="m-0 rounded-[var(--bk-radius-tile)] bg-sky-50 px-3.5 py-3 text-center text-[13px] leading-relaxed text-sky-950/70">
                    You have Icon + Wordmark.{" "}
                    <button
                      type="button"
                      className="cursor-pointer font-semibold text-sky-950 underline underline-offset-2"
                      onClick={() => setAssetMode("build")}
                    >
                      Switch to Build
                    </button>{" "}
                    to compose lockups, or upload H/V files below.
                  </p>
                ) : null}

                {isBuild && (horizontal || vertical) && !(icon && wordmark) ? (
                  <p className="m-0 rounded-[var(--bk-radius-tile)] bg-sky-50 px-3.5 py-3 text-center text-[13px] leading-relaxed text-sky-950/70">
                    Uploaded Horizontal/Vertical are saved.{" "}
                    <button
                      type="button"
                      className="cursor-pointer font-semibold text-sky-950 underline underline-offset-2"
                      onClick={() => setAssetMode("upload")}
                    >
                      Switch to Upload
                    </button>{" "}
                    to use them, or add Icon + Wordmark here.
                  </p>
                ) : null}

                {isBuild && (horizontal || vertical) && icon && wordmark ? (
                  <p className="m-0 rounded-[var(--bk-radius-tile)] bg-sky-50 px-3.5 py-3 text-center text-[13px] leading-relaxed text-sky-950/70">
                    Build is composing from Icon + Wordmark. Your uploaded H/V
                    files are still saved —{" "}
                    <button
                      type="button"
                      className="cursor-pointer font-semibold text-sky-950 underline underline-offset-2"
                      onClick={() => setAssetMode("upload")}
                    >
                      switch to Upload
                    </button>{" "}
                    to use them instead.
                  </p>
                ) : null}
              </div>

              <div className="!mt-8 space-y-4">
                {isBuild ? (
                  <>
                    <SvgDropzone
                      label="Icon"
                      description="Required — used in composed lockups"
                      fileName={icon?.fileName}
                      previewSvg={icon?.raw}
                      onUpload={(raw, fileName) => setIcon({ raw, fileName })}
                      onClear={() => setIcon(null)}
                    />
                    <SvgDropzone
                      label="Wordmark"
                      description="Required — used in composed lockups"
                      fileName={wordmark?.fileName}
                      previewSvg={wordmark?.raw}
                      onUpload={(raw, fileName) =>
                        setWordmark({ raw, fileName })
                      }
                      onClear={() => setWordmark(null)}
                    />
                    <div className="rounded-[var(--bk-radius-tile)] bg-[var(--bk-tile)] px-4 py-4">
                      <p className="m-0 text-sm font-semibold text-[var(--bk-ink)]">
                        Horizontal & Vertical
                      </p>
                      <p className="bk-support mt-1.5 mb-0">
                        Built live from Icon + Wordmark. No separate upload in
                        this mode.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <SvgDropzone
                      label="Vertical"
                      description="Full vertical lockup SVG"
                      fileName={vertical?.fileName}
                      previewSvg={vertical?.raw}
                      onUpload={(raw, fileName) =>
                        setVertical({ raw, fileName })
                      }
                      onClear={() => setVertical(null)}
                    />
                    <SvgDropzone
                      label="Horizontal"
                      description="Full horizontal lockup SVG"
                      fileName={horizontal?.fileName}
                      previewSvg={horizontal?.raw}
                      onUpload={(raw, fileName) =>
                        setHorizontal({ raw, fileName })
                      }
                      onClear={() => setHorizontal(null)}
                    />
                    <SvgDropzone
                      label="Icon"
                      description="Standalone icon mark"
                      fileName={icon?.fileName}
                      previewSvg={icon?.raw}
                      onUpload={(raw, fileName) => setIcon({ raw, fileName })}
                      onClear={() => setIcon(null)}
                    />
                    <SvgDropzone
                      label="Wordmark"
                      description="Standalone wordmark"
                      fileName={wordmark?.fileName}
                      previewSvg={wordmark?.raw}
                      onUpload={(raw, fileName) =>
                        setWordmark({ raw, fileName })
                      }
                      onClear={() => setWordmark(null)}
                    />
                  </>
                )}
              </div>
            </div>
          </Section>

          <div className="h-px bg-[var(--bk-hairline)]" />

          <Section>
            <div className="space-y-4">
              <SvgDropzone
                label="Submark"
                description="Optional alternate mark"
                fileName={submark?.fileName}
                previewSvg={submark?.raw}
                onUpload={(raw, fileName) => setSubmark({ raw, fileName })}
                onClear={() => setSubmark(null)}
              />
              <SvgDropzone
                label="Monogram"
                description="Optional letterform mark"
                fileName={monogram?.fileName}
                previewSvg={monogram?.raw}
                onUpload={(raw, fileName) => setMonogram({ raw, fileName })}
                onClear={() => setMonogram(null)}
              />
            </div>
          </Section>
        </div>

        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--bk-card)] to-transparent transition-opacity duration-200",
            showBottomFade ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
    </aside>
  );
}
