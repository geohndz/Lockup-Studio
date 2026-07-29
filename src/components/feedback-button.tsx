"use client";

import { Bug } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMinWidth } from "@/hooks/use-min-width";
import { FEEDBACK_FORM_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/project-store";

export function FeedbackButton() {
  const pathname = usePathname();
  const isDesktop = useMinWidth(768);
  const hasAssets = useProjectStore(
    (s) =>
      Boolean(
        s.horizontal ||
          s.vertical ||
          s.icon ||
          s.wordmark ||
          s.submark ||
          s.monogram,
      ),
  );
  // Only clear the Share/Generate bar once the studio is active with assets
  const aboveToolbar =
    pathname === "/studio" && isDesktop === true && hasAssets;

  return (
    <a
      href={FEEDBACK_FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "fixed right-5 z-50 flex h-11 cursor-pointer items-center gap-2 rounded-full bg-[var(--bk-ink)] px-4 text-[13px] font-medium text-white shadow-[var(--bk-shadow-dialog)] transition-[bottom,colors] hover:bg-[var(--bk-ink)]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--bk-ink)]",
        aboveToolbar ? "bottom-[92px]" : "bottom-5",
      )}
    >
      <Bug className="size-4" strokeWidth={2} aria-hidden />
      Feedback
    </a>
  );
}
