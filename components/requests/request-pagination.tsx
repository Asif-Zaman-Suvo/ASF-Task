"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  requestQueryToSearchParams,
  type RequestQuery,
} from "@/lib/validations/request-query";
import type { PaginationMeta } from "@/lib/types/request";
import { cn } from "@/lib/cn";
import { useListTransition } from "@/components/requests/list-transition";

const linkClass =
  "inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 sm:flex-none";

function pageHref(query: RequestQuery, page: number): string {
  const params = requestQueryToSearchParams({ ...query, page });
  return params.toString() ? `/requests?${params}` : "/requests";
}

export function RequestPagination({
  query,
  meta,
}: {
  query: RequestQuery;
  meta: PaginationMeta;
}) {
  const router = useRouter();
  const startTransition = useListTransition();
  const totalPages = Math.max(meta.totalPages, 1);

  function onPageClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    if (startTransition) {
      startTransition(() => {
        router.push(href);
      });
      return;
    }
    router.push(href);
  }

  if (meta.total === 0) return null;

  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  const prevHref = pageHref(query, meta.page - 1);
  const nextHref = pageHref(query, meta.page + 1);
  const hasPrev = meta.page > 1;
  const hasNext = meta.page < totalPages;

  return (
    <nav
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Pagination"
    >
      <p className="text-sm text-slate-700" aria-live="polite">
        Showing {from}–{to} of {meta.total.toLocaleString()} requests
      </p>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        {hasPrev ? (
          <Link href={prevHref} className={linkClass} onClick={(event) => onPageClick(event, prevHref)}>
            <ChevronLeft className="size-4" aria-hidden />
            Previous
          </Link>
        ) : (
          <span className={cn(linkClass, "cursor-not-allowed opacity-60")} aria-disabled="true">
            <ChevronLeft className="size-4" aria-hidden />
            Previous
          </span>
        )}
        <p className="shrink-0 text-sm text-slate-700">
          Page {meta.page} of {totalPages}
        </p>
        {hasNext ? (
          <Link href={nextHref} className={linkClass} onClick={(event) => onPageClick(event, nextHref)}>
            Next
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span className={cn(linkClass, "cursor-not-allowed opacity-60")} aria-disabled="true">
            Next
            <ChevronRight className="size-4" aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}
