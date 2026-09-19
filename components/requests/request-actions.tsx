"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { STATUSES, type Status } from "@/lib/constants";
import { apiFetch, ApiClientError } from "@/lib/http";
import { statusLabel } from "@/lib/format";
import type { PersonRef } from "@/lib/types/request";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";

export function RequestActions({
  requestId,
  status,
  assigneeId,
  assignees,
}: {
  requestId: string;
  status: Status;
  assigneeId: string | null;
  assignees: PersonRef[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [optimisticAssignee, setOptimisticAssignee] = useOptimistic(assigneeId);
  const [error, setError] = useState<string | null>(null);

  function updateStatus(next: Status) {
    if (next === optimisticStatus || isPending) return;
    setError(null);
    startTransition(async () => {
      setOptimisticStatus(next);
      try {
        await apiFetch(`/api/requests/${requestId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: next }),
        });
        toast.success("Status updated");
        router.refresh();
      } catch (err) {
        const message = err instanceof ApiClientError ? err.message : "Failed to update status";
        setError(message);
        toast.error(message);
      }
    });
  }

  function updateAssignee(next: string | null) {
    if (next === optimisticAssignee || isPending) return;
    setError(null);
    startTransition(async () => {
      setOptimisticAssignee(next);
      try {
        await apiFetch(`/api/requests/${requestId}/assignee`, {
          method: "PATCH",
          body: JSON.stringify({ assigneeId: next }),
        });
        toast.success("Assignee updated");
        router.refresh();
      } catch (err) {
        const message = err instanceof ApiClientError ? err.message : "Failed to update assignee";
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <fieldset className="space-y-3" disabled={isPending} aria-busy={isPending}>
      <legend className="text-sm font-medium text-slate-900">Update request</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          id="request-status"
          label="Status"
          value={optimisticStatus}
          disabled={isPending}
          onChange={(event) => updateStatus(event.target.value as Status)}
        >
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {statusLabel(value)}
            </option>
          ))}
        </Select>
        <Select
          id="request-assignee"
          label="Assignee"
          value={optimisticAssignee ?? ""}
          disabled={isPending}
          onChange={(event) => updateAssignee(event.target.value || null)}
        >
          <option value="">Unassigned</option>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.name}
            </option>
          ))}
        </Select>
      </div>
      {isPending ? (
        <p className="text-sm text-slate-700" aria-live="polite">
          Saving changes…
        </p>
      ) : null}
      {error ? <Alert title={error} /> : null}
    </fieldset>
  );
}
