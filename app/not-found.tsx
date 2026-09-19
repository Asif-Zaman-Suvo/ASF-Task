import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
      <p className="text-sm text-slate-700">The page you requested does not exist.</p>
      <Link
        href="/requests"
        className="inline-flex min-h-11 items-center text-sm font-medium text-teal-800 hover:underline"
      >
        Back to requests
      </Link>
    </div>
  );
}
