import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import type { RequestListItem } from "@/lib/types/request";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";

export function RequestTable({
  requests,
  hasFilters,
}: {
  requests: RequestListItem[];
  hasFilters: boolean;
}) {
  if (requests.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white">
        <EmptyState
          title={hasFilters ? "No matching requests" : "No service requests"}
          description={
            hasFilters
              ? "Try clearing search or filters to see more results."
              : "There are no service requests in the system yet."
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden space-y-3">
        {requests.map((request) => (
          <article key={request.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <Link href={`/requests/${request.id}`} className="font-medium text-teal-800 hover:underline">
              {request.displayId}: {request.title}
            </Link>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-slate-500">Requester</dt>
                <dd>{request.requester.name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Category</dt>
                <dd>{request.category.name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Priority</dt>
                <dd className="mt-1">
                  <PriorityBadge priority={request.priority} />
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={request.status} />
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Assignee</dt>
                <dd>{request.assignee?.name ?? "Unassigned"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Updated</dt>
                <dd>{formatDateTime(request.updatedAt)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <div className="hidden md:block">
        <Table>
          <caption className="sr-only">Service requests</caption>
          <THead>
            <tr>
              <TH>ID</TH>
              <TH>Subject</TH>
              <TH>Requester</TH>
              <TH>Category</TH>
              <TH>Priority</TH>
              <TH>Status</TH>
              <TH>Assignee</TH>
              <TH>Last updated</TH>
            </tr>
          </THead>
          <TBody>
            {requests.map((request) => (
              <tr key={request.id} className="hover:bg-slate-50">
                <TD className="font-mono text-xs">{request.displayId}</TD>
                <TD className="max-w-xs truncate">
                  <Link href={`/requests/${request.id}`} className="font-medium text-teal-800 hover:underline">
                    {request.title}
                  </Link>
                </TD>
                <TD>{request.requester.name}</TD>
                <TD>{request.category.name}</TD>
                <TD>
                  <PriorityBadge priority={request.priority} />
                </TD>
                <TD>
                  <StatusBadge status={request.status} />
                </TD>
                <TD>{request.assignee?.name ?? "Unassigned"}</TD>
                <TD>{formatDateTime(request.updatedAt)}</TD>
              </tr>
            ))}
          </TBody>
        </Table>
      </div>
    </>
  );
}
