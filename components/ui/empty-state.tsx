import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <Inbox className="size-8 text-slate-400" aria-hidden />
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="max-w-md text-sm text-slate-700">{description}</p>
    </div>
  );
}
