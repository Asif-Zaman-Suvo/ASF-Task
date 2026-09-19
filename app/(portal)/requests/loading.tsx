import { Skeleton } from "@/components/ui/spinner";

export default function RequestsLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite" aria-label="Loading requests">
      <div>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-full max-w-80" />
      </div>
      <Skeleton className="h-28 w-full" />
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
