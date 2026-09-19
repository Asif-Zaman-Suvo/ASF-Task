import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-8 sm:py-12">
      <main
        id="main"
        tabIndex={-1}
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-sm outline-none sm:p-6"
      >
        <p className="text-sm font-medium text-teal-800">As-Sunnah Foundation</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-1 mb-6 text-sm text-slate-700">
          Access the service request management portal.
        </p>
        <Suspense fallback={<p className="text-sm text-slate-700">Loading sign-in form…</p>}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
