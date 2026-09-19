import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRequestById } from "@/lib/services/requests";
import { listAssignees } from "@/lib/services/users";
import { summarizeActivities } from "@/lib/utils/summarize-activities";
import { formatRequestNumber } from "@/lib/format";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { RequestActions } from "@/components/requests/request-actions";
import {
  ActivityTimeline,
  AssigneeSummary,
  RequestMeta,
} from "@/components/requests/activity-timeline";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const request = await getRequestById(id);
  if (!request) return { title: "Request not found" };
  return { title: `${request.displayId} · ${request.title}` };
}

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [request, assignees] = await Promise.all([getRequestById(id), listAssignees()]);

  if (!request) {
    notFound();
  }

  const summary = summarizeActivities(request.activities);
  const names = Object.fromEntries(assignees.map((user) => [user.id, user.name]));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/requests" className="text-sm font-medium text-teal-800 hover:underline">
          Back to requests
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-slate-500">{formatRequestNumber(request.number)}</p>
            <h1 className="text-2xl font-semibold text-slate-900">{request.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <PriorityBadge priority={request.priority} />
            <StatusBadge status={request.status} />
          </div>
        </div>
      </div>

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Request information</h2>
        <RequestMeta
          requester={request.requester.name}
          category={request.category.name}
          createdAt={request.createdAt}
          updatedAt={request.updatedAt}
          priority={request.priority}
        />
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Description</h3>
          <p className="mt-1 text-sm leading-6 text-slate-800">{request.description}</p>
        </div>
        <RequestActions
          requestId={request.id}
          status={request.status}
          assigneeId={request.assignee?.id ?? null}
          assignees={assignees}
        />
      </section>

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Activity</h2>
        <ActivityTimeline activities={request.activities} />
      </section>

      {summary.byAssignee.length > 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
          <AssigneeSummary summaries={summary.byAssignee} names={names} />
        </section>
      ) : null}
    </div>
  );
}
