import { formatDateTime, formatDuration, priorityLabel, statusLabel } from "@/lib/format";
import type { ActivityItem } from "@/lib/types/request";
import type { AssigneeActivitySummary } from "@/lib/utils/summarize-activities";

function activityText(activity: ActivityItem): string {
  switch (activity.type) {
    case "CREATED":
      return "created this request";
    case "STATUS_CHANGED":
      return `changed status from ${statusLabel(activity.fromValue ?? "")} to ${statusLabel(activity.toValue ?? "")}`;
    case "ASSIGNEE_CHANGED":
      return activity.toValue
        ? "changed the assignee"
        : "unassigned this request";
    default:
      return "updated this request";
  }
}

export function ActivityTimeline({ activities }: { activities: ActivityItem[] }) {
  if (activities.length === 0) {
    return <p className="text-sm text-slate-600">No activity recorded yet.</p>;
  }

  return (
    <ol className="space-y-4 border-l border-slate-200 pl-4">
      {activities.map((activity) => (
        <li key={activity.id} className="relative">
          <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-teal-700" aria-hidden />
          <p className="text-sm text-slate-900">
            <span className="font-medium">{activity.actor.name}</span> {activityText(activity)}
          </p>
          <p className="text-xs text-slate-500">{formatDateTime(activity.createdAt)}</p>
        </li>
      ))}
    </ol>
  );
}

export function AssigneeSummary({
  summaries,
  names,
}: {
  summaries: AssigneeActivitySummary[];
  names: Record<string, string>;
}) {
  if (summaries.length === 0) return null;

  return (
    <section aria-labelledby="assignee-summary-heading" className="space-y-3">
      <h2 id="assignee-summary-heading" className="text-lg font-semibold text-slate-900">
        Workload from history
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {summaries.map((summary) => (
          <li key={summary.assigneeId} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-900">
              {names[summary.assigneeId] ?? summary.assigneeId}
            </p>
            <p className="text-slate-600">
              Assigned {summary.totalAssigned} · Resolved {summary.totalResolved}
            </p>
            <p className="text-slate-600">
              Avg resolution:{" "}
              {summary.averageResolutionTimeMs == null
                ? "n/a"
                : formatDuration(summary.averageResolutionTimeMs)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RequestMeta({
  requester,
  category,
  createdAt,
  updatedAt,
  priority,
}: {
  requester: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  priority: string;
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Requester</dt>
        <dd className="text-sm text-slate-900">{requester}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Category</dt>
        <dd className="text-sm text-slate-900">{category}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Priority</dt>
        <dd className="text-sm text-slate-900">{priorityLabel(priority)}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Created</dt>
        <dd className="text-sm text-slate-900">{formatDateTime(createdAt)}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Last updated</dt>
        <dd className="text-sm text-slate-900">{formatDateTime(updatedAt)}</dd>
      </div>
    </dl>
  );
}
