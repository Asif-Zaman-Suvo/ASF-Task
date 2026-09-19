import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Label } from "@/components/ui/label";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  id: string;
};

export function Select({ label, id, className, children, ...props }: SelectProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className={cn(
          "block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm disabled:bg-slate-100 md:text-sm",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
