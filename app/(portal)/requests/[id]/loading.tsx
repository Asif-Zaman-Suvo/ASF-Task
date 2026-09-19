import { Skeleton } from "@/components/ui/spinner";

export default function RequestDetailLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading request">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
