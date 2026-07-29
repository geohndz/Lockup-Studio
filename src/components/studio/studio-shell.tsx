"use client";

import { StudioCanvas } from "@/components/studio/canvas/studio-canvas";
import { MobileGate } from "@/components/studio/mobile-gate";
import { StudioSidebar } from "@/components/studio/sidebar/studio-sidebar";
import { StudioToolbar } from "@/components/studio/toolbar/studio-toolbar";
import { useMinWidth } from "@/hooks/use-min-width";

export function StudioShell() {
  const isDesktop = useMinWidth(768);

  if (isDesktop === null) {
    return (
      <div
        className="h-dvh max-h-dvh bg-[var(--bk-field)]"
        aria-hidden
      />
    );
  }

  if (!isDesktop) {
    return <MobileGate />;
  }

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-[var(--bk-field)]">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="h-full min-h-0 w-[300px] shrink-0 overflow-hidden bg-[var(--bk-card)]">
          <StudioSidebar />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-hidden">
            <StudioCanvas />
          </div>
          <StudioToolbar />
        </div>
      </div>
    </div>
  );
}
