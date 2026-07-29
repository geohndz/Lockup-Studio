"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, Sparkles } from "lucide-react";
import { loadExampleBrand } from "@/lib/example-brand";
import { cn } from "@/lib/utils";

type DemoSlide = {
  id: string;
  title: string;
  caption: string;
  src: string;
};

const SLIDES: DemoSlide[] = [
  {
    id: "adjust",
    title: "Adjust lockups",
    caption: "Tune icon size, gap, and alignment in Build mode.",
    src: "/compositions/adjust.html",
  },
  {
    id: "colors",
    title: "Add colors",
    caption: "Pick a swatch, confirm, and grow your brand palette.",
    src: "/compositions/colors.html",
  },
  {
    id: "context",
    title: "See it in context",
    caption: "Preview lockups where they’ll live — nav, cards, and devices.",
    src: "/compositions/context.html",
  },
  {
    id: "export",
    title: "Export the package",
    caption: "Generate a client-ready ZIP of SVG and PNG lockups.",
    src: "/compositions/export.html",
  },
];

const LOOPS_BEFORE_ADVANCE = 2;

type HyperframesPlayerEl = HTMLElement & {
  play: () => void;
  pause: () => void;
  seek: (timeInSeconds: number) => void;
  duration: number;
  currentTime: number;
};

export function EmptyStateCarousel({
  footer = "Upload SVG assets in the sidebar — or Build from icon and wordmark — to start packing.",
}: {
  footer?: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerOpacity, setPlayerOpacity] = useState(1);
  const [progress, setProgress] = useState(0);
  const [exampleLoading, setExampleLoading] = useState(false);
  const [exampleError, setExampleError] = useState<string | null>(null);
  const playerHostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HyperframesPlayerEl | null>(null);
  const loopCountRef = useRef(0);
  const pausedRef = useRef(paused);
  const slide = SLIDES[index];

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let cancelled = false;
    void import("@hyperframes/player").then(() => {
      if (!cancelled) setPlayerReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleTryExample() {
    if (exampleLoading) return;
    setExampleError(null);
    setExampleLoading(true);
    try {
      await loadExampleBrand();
    } catch {
      setExampleError("Couldn’t load the example. Try again.");
    } finally {
      setExampleLoading(false);
    }
  }

  useEffect(() => {
    loopCountRef.current = 0;
    setProgress(0);
  }, [index]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    if (paused) player.pause();
    else player.play();
  }, [paused]);

  useEffect(() => {
    if (!playerReady) return;
    const host = playerHostRef.current;
    if (!host) return;

    let cancelled = false;
    setPlayerOpacity(0);
    setProgress(0);
    loopCountRef.current = 0;

    const updateProgress = (currentTime: number, duration: number) => {
      if (duration <= 0) return;
      const loopProgress = Math.min(1, Math.max(0, currentTime / duration));
      const overall =
        (loopCountRef.current + loopProgress) / LOOPS_BEFORE_ADVANCE;
      setProgress(Math.min(1, Math.max(0, overall)));
    };

    const onTimeUpdate = (event: Event) => {
      const player = playerRef.current;
      if (!player) return;
      const detail = (event as CustomEvent<{ currentTime?: number }>).detail;
      const currentTime = detail?.currentTime ?? player.currentTime;
      updateProgress(currentTime, player.duration);
    };

    const onEnded = () => {
      const player = playerRef.current;
      if (!player || pausedRef.current) return;

      loopCountRef.current += 1;
      if (loopCountRef.current >= LOOPS_BEFORE_ADVANCE) {
        loopCountRef.current = 0;
        setProgress(1);
        setIndex((i) => (i + 1) % SLIDES.length);
        return;
      }

      setProgress(loopCountRef.current / LOOPS_BEFORE_ADVANCE);
      player.seek(0);
      player.play();
    };

    const loadTimer = window.setTimeout(() => {
      if (cancelled) return;
      host.replaceChildren();
      const player = document.createElement(
        "hyperframes-player",
      ) as HyperframesPlayerEl;
      player.setAttribute("src", slide.src);
      player.setAttribute("width", "1200");
      player.setAttribute("height", "720");
      player.setAttribute("autoplay", "");
      player.setAttribute("muted", "");
      // Intentionally no `loop` — we restart manually so `ended` fires.
      player.style.width = "100%";
      player.style.height = "100%";
      player.style.display = "block";
      player.addEventListener("timeupdate", onTimeUpdate);
      player.addEventListener("ended", onEnded);
      playerRef.current = player;
      host.appendChild(player);
      if (pausedRef.current) player.pause();
      setPlayerOpacity(1);
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimer);
      const current = playerRef.current;
      if (current) {
        current.removeEventListener("timeupdate", onTimeUpdate);
        current.removeEventListener("ended", onEnded);
      }
      playerRef.current = null;
    };
  }, [slide.src, playerReady]);

  return (
    <div className="mx-auto flex w-full max-w-[850px] flex-col gap-4">
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => void handleTryExample()}
          disabled={exampleLoading}
          className="flex h-11 cursor-pointer items-center gap-2 rounded-full bg-[var(--bk-ink)] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--bk-ink)]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--bk-ink)] disabled:cursor-wait disabled:opacity-70"
        >
          <Sparkles className="size-4" strokeWidth={2} aria-hidden />
          {exampleLoading ? "Loading example…" : "See an example"}
        </button>
        {exampleError ? (
          <p className="m-0 text-center text-[13px] text-destructive" role="alert">
            {exampleError}
          </p>
        ) : null}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <p className="m-0 text-[22px] font-semibold tracking-[-0.02em] text-[var(--bk-ink)]">
            {slide.title}
          </p>
          <p className="mt-1.5 mb-0 text-[14px] leading-relaxed text-[var(--bk-ink-3)]">
            {slide.caption}
          </p>
        </motion.div>
      </AnimatePresence>

      <motion.div
        className="mx-auto aspect-[1200/720] w-[80%] overflow-hidden rounded-[var(--bk-radius-card)] bg-transparent"
        animate={{ opacity: playerOpacity }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div ref={playerHostRef} className="size-full" aria-hidden />
      </motion.div>

      <div className="flex items-center justify-center gap-2.5">
        <div
          className="flex h-9 items-center gap-2 rounded-full bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
          role="tablist"
          aria-label="Demo progress"
        >
          {SLIDES.map((item, i) => {
            const active = i === index;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={item.title}
                onClick={() => setIndex(i)}
                className={cn(
                  "cursor-pointer rounded-full transition-all duration-300",
                  active
                    ? "relative h-2 w-8 overflow-hidden bg-black/10"
                    : "size-2 bg-black/25 hover:bg-black/40",
                )}
              >
                {active ? (
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-black/40"
                    style={{ width: `${progress * 100}%` }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white text-black/45 shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-colors hover:text-black/70"
          aria-label={paused ? "Play demos" : "Pause demos"}
        >
          {paused ? (
            <Play className="size-3.5 fill-current" strokeWidth={0} />
          ) : (
            <Pause className="size-3.5 fill-current" strokeWidth={0} />
          )}
        </button>
      </div>

      <p className="m-0 pb-1 text-center text-[13px] leading-relaxed text-[var(--bk-ink-3)]">
        {footer}
      </p>
    </div>
  );
}
