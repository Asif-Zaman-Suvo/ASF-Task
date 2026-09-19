"use client";

import { Button } from "@/components/ui/button";

export default function RequestsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold text-slate-900">Unable to load requests</h1>
      <p className="text-sm text-slate-700">{error.message || "The request list could not be loaded."}</p>
      <Button onClick={reset}>Retry</Button>
    </div>
  );
}
