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
      <ul className="space-y-3 lg:hidden">
        {requests.map((request) => (
          <li key={request.id}>
            <article className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-base font-medium">
                <Link
                  href={`/requests/${request.id}`}
                  className="break-words text-teal-800 hover:underline"
                >
                  {request.displayId}: {request.title}
                </Link>
              </h2>
              <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-600">Requester</dt>
                  <dd className="break-words text-slate-900">{request.requester.name}</dd>
                </div>
                <div>
                  <dt className="text-slate-600">Category</dt>
                  <dd className="break-words text-slate-900">{request.category.name}</dd>
                </div>
                <div>
                  <dt className="text-slate-600">Priority</dt>
                  <dd className="mt-1">
                    <PriorityBadge priority={request.priority} />
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-600">Status</dt>
                  <dd className="mt-1">
                    <StatusBadge status={request.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-600">Assignee</dt>
                  <dd className="break-words text-slate-900">
                    {request.assignee?.name ?? "Unassigned"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-600">Updated</dt>
                  <dd className="text-slate-900">{formatDateTime(request.updatedAt)}</dd>
                </div>
              </dl>
            </article>
          </li>
        ))}
      </ul>

      <div className="hidden lg:block">
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
                <TH scope="row" className="whitespace-nowrap px-3 py-3 font-mono text-xs font-normal normal-case tracking-normal text-slate-800">
                  {request.displayId}
                </TH>
                <TD className="max-w-xs">
                  <Link
                    href={`/requests/${request.id}`}
                    className="font-medium text-teal-800 hover:underline"
                    title={request.title}
                  >
                    <span className="line-clamp-2">{request.title}</span>
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
