"use client";

import { EmptyStateCarousel } from "@/components/studio/empty-state/empty-state-carousel";

export function MobileGate() {
  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-[var(--bk-field)]">
      <header className="flex h-[80px] shrink-0 items-center gap-1.5 border-b border-[var(--bk-hairline)] bg-[var(--bk-card)] px-[var(--bk-pad-card)]">
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
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-5 py-8">
        <EmptyStateCarousel footer="v1 is desktop only — open Lockup Studio on a computer to start packing." />
      </div>
    </div>
  );
}
