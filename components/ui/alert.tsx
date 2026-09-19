import { cn } from "@/lib/cn";

export function Alert({
  title,
  children,
  variant = "error",
}: {
  title: string;
  children?: React.ReactNode;
  variant?: "error" | "info";
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        variant === "error"
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-sky-200 bg-sky-50 text-sky-900",
      )}
    >
      <p className="font-medium">{title}</p>
      {children ? <div className="mt-1">{children}</div> : null}
    </div>
  );
}
