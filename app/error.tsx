"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const USER_MESSAGE = "Something went wrong. Please try again.";

export default function Error({
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
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
      <p className="text-sm text-slate-700">{USER_MESSAGE}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
