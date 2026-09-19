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
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/requests" className="min-w-0 font-semibold text-teal-800">
          <span className="block truncate">As-Sunnah Foundation</span>
          <span className="block text-xs font-normal text-slate-500">Service Requests</span>
        </Link>
        <div className="flex items-center gap-3">
          <p className="hidden text-sm text-slate-600 sm:block">{user.name}</p>
          <Button variant="secondary" onClick={logout} aria-label="Sign out">
            <LogOut className="mr-2 size-4" aria-hidden />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
