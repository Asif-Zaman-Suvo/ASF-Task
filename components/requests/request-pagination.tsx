"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  requestQueryToSearchParams,
  type RequestQuery,
} from "@/lib/validations/request-query";
import type { PaginationMeta } from "@/lib/types/request";
import { Button } from "@/components/ui/button";

export function RequestPagination({
  query,
  meta,
}: {
  query: RequestQuery;
  meta: PaginationMeta;
}) {
  const router = useRouter();
  const totalPages = Math.max(meta.totalPages, 1);

  function go(page: number) {
    const params = requestQueryToSearchParams({ ...query, page });
    router.replace(params.toString() ? `/requests?${params}` : "/requests");
  }

  if (meta.total === 0) return null;

  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  return (
    <nav
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Pagination"
    >
      <p className="text-sm text-slate-700" aria-live="polite">
        Showing {from}–{to} of {meta.total.toLocaleString()} requests
      </p>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Button
          variant="secondary"
          className="flex-1 sm:flex-none"
          onClick={() => go(meta.page - 1)}
          disabled={meta.page <= 1}
        >
          <ChevronLeft className="size-4" aria-hidden />
          Previous
        </Button>
        <p className="shrink-0 text-sm text-slate-700">
          Page {meta.page} of {totalPages}
        </p>
        <Button
          variant="secondary"
          className="flex-1 sm:flex-none"
          onClick={() => go(meta.page + 1)}
          disabled={meta.page >= totalPages}
        >
          Next
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
