"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import type { SessionUser } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";

export function Header({ user }: { user: SessionUser }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
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
          <Button variant="secondary" onClick={logout} aria-label="Sign out">
            <LogOut className="size-4 sm:mr-2" aria-hidden />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
