"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import type { SessionUser } from "@/lib/auth/types";
import { apiFetch, ApiClientError } from "@/lib/http";
import { Button } from "@/components/ui/button";

export function Header({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function logout() {
    if (isPending) return;
    setIsPending(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Unable to sign out. Try again.";
      toast.error(message);
      setIsPending(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <Link
          href="/requests"
          className="min-w-0 rounded-sm text-teal-800 hover:text-teal-900"
        >
          <span className="block truncate font-semibold">As-Sunnah Foundation</span>
          <span className="block truncate text-xs font-normal text-slate-600">
            Service Requests
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <p className="hidden max-w-[12rem] truncate text-sm text-slate-700 md:block" title={user.name}>
            {user.name}
          </p>
          <Button
            variant="secondary"
            onClick={logout}
            disabled={isPending}
            aria-label="Sign out"
            aria-busy={isPending}
          >
            <LogOut className="size-4 sm:mr-2" aria-hidden />
            <span className="hidden sm:inline">{isPending ? "Signing out…" : "Sign out"}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
