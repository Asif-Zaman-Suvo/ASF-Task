"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-full flex-col items-center justify-center gap-4 bg-slate-50 p-6">
        <h1 className="text-xl font-semibold text-slate-900">Application error</h1>
        <p className="max-w-md text-center text-sm text-slate-600">
          {error.message || "Something went wrong."}
        </p>
        <Button onClick={reset}>Try again</Button>
      </body>
    </html>
  );
}
