"use client";

import { useEffect } from "react";
import { ErrorRecovery } from "@/components/error-recovery";
import "./globals.css";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full overflow-hidden font-sans text-foreground antialiased">
        <ErrorRecovery onRefresh={() => window.location.assign("/studio")} />
      </body>
    </html>
  );
}
