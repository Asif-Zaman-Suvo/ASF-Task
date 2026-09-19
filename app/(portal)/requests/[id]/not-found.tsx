import Link from "next/link";

export default function RequestNotFound() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold text-slate-900">Request not found</h1>
      <p className="text-sm text-slate-700">
        This request does not exist or is no longer available.
      </p>
      <Link
        href="/requests"
        className="inline-flex min-h-11 items-center text-sm font-medium text-teal-800 hover:underline"
      >
        Back to requests
      </Link>
    </div>
  );
}
