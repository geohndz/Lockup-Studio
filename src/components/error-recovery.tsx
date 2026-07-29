"use client";

import { Button } from "@/components/ui/button";

export function ErrorRecovery({
  onRefresh,
}: {
  onRefresh: () => void;
}) {
  return (
    <div className="flex h-dvh max-h-dvh flex-col items-center justify-center gap-5 bg-[var(--bk-field)] px-6 text-center">
      <img
        src="/logo-light.svg"
        alt=""
        width={48}
        height={48}
        className="h-12 w-12"
        aria-hidden
      />
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--bk-ink)]">
          Something broke — refresh
        </h1>
        <p className="max-w-sm text-[15px] leading-relaxed text-[var(--bk-ink-3)]">
          Lockup Studio hit an unexpected error. Your session may be gone — refresh
          to start again.
        </p>
      </div>
      <Button type="button" size="lg" onClick={onRefresh}>
        Refresh
      </Button>
    </div>
  );
}
