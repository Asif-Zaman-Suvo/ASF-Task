import type { Metadata } from "next";
import { parseRequestQuery } from "@/lib/validations/request-query";
import { listCategories, listRequests } from "@/lib/services/requests";
import { listAssignees } from "@/lib/services/users";
import { RequestFilters } from "@/components/requests/request-filters";
import { RequestTable } from "@/components/requests/request-table";
import { RequestPagination } from "@/components/requests/request-pagination";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Requests",
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query = parseRequestQuery(raw);

  const [result, categories, assignees] = await Promise.all([
    listRequests(query),
    listCategories(),
    listAssignees(),
  ]);

  const hasFilters = Boolean(
    query.search || query.status || query.priority || query.categoryId || query.assigneeId,
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Service requests</h1>
        <p className="text-sm text-slate-600">
          Search, filter, and manage internal service requests.
        </p>
      </div>

      <RequestFilters query={query} categories={categories} assignees={assignees}>
        <div className="space-y-4">
          <RequestTable requests={result.data} hasFilters={hasFilters} />
          <RequestPagination query={query} meta={result.meta} />
        </div>
      </RequestFilters>
    </div>
  );
}
