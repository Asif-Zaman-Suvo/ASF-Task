import {
  AlertTriangle,
  ArrowUp,
  Ban,
  CheckCircle2,
  CircleDot,
  Equal,
  LoaderCircle,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { priorityLabel, statusLabel } from "@/lib/format";

const statusStyles: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-800 ring-slate-300",
  IN_PROGRESS: "bg-sky-50 text-sky-900 ring-sky-300",
  RESOLVED: "bg-emerald-50 text-emerald-900 ring-emerald-300",
  CLOSED: "bg-zinc-100 text-zinc-700 ring-zinc-300",
};

const priorityStyles: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700 ring-slate-300",
  MEDIUM: "bg-amber-50 text-amber-900 ring-amber-300",
  HIGH: "bg-orange-50 text-orange-900 ring-orange-300",
  URGENT: "bg-red-50 text-red-900 ring-red-300",
};

function StatusIcon({ status }: { status: string }) {
  const className = "size-3.5 shrink-0";
  switch (status) {
    case "PENDING":
      return <CircleDot className={className} aria-hidden />;
    case "IN_PROGRESS":
      return <LoaderCircle className={className} aria-hidden />;
    case "RESOLVED":
      return <CheckCircle2 className={className} aria-hidden />;
    case "CLOSED":
      return <Ban className={className} aria-hidden />;
    default:
      return null;
  }
}

function PriorityIcon({ priority }: { priority: string }) {
  const className = "size-3.5 shrink-0";
  switch (priority) {
    case "LOW":
      return <Minus className={className} aria-hidden />;
    case "MEDIUM":
      return <Equal className={className} aria-hidden />;
    case "HIGH":
      return <ArrowUp className={className} aria-hidden />;
    case "URGENT":
      return <AlertTriangle className={className} aria-hidden />;
    default:
      return null;
  }
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        statusStyles[status] ?? statusStyles.PENDING,
      )}
    >
      <StatusIcon status={status} />
      {statusLabel(status)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        priorityStyles[priority] ?? priorityStyles.LOW,
      )}
    >
      <PriorityIcon priority={priority} />
      {priorityLabel(priority)}
    </span>
  );
}
