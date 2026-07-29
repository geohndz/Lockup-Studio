"use client";

import { useEffect } from "react";
import { ErrorRecovery } from "@/components/error-recovery";

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorRecovery onRefresh={() => window.location.assign("/studio")} />
  );
}
