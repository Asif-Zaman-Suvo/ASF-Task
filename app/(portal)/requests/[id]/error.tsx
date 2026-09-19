"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function RequestDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold text-slate-900">Unable to load this request</h1>
      <p className="text-sm text-slate-700">Something went wrong. Please try again.</p>
      <Button onClick={reset}>Retry</Button>
    </div>
  );
}
