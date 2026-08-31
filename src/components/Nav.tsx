"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";

type NavProps = {
  displayName: string;
  role: "MANAGER" | "STREAMER";
};

export function Nav({ displayName, role }: NavProps) {
  const pathname = usePathname();

  return (
    <header className="bg-canvas/80 backdrop-blur border-b border-hairline sticky top-0 z-20">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/reminder-logo.png"
            alt=""
            width={28}
            height={28}
            className="rounded-sm"
          />
          <span className="font-display text-lg font-bold tracking-tight">
            리마인더
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:inline-flex items-center rounded-lg bg-magenta px-2.5 py-1 text-xs font-semibold text-ink">
            {role === "MANAGER" ? "매니저" : "스트리머"}
          </span>
          <span className="hidden sm:inline text-sm text-muted">
            {displayName}님
          </span>
          <Link
            href="/settings"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/settings"
                ? "bg-surface-indigo text-ink"
                : "text-muted hover:text-ink hover:bg-surface-indigo/60"
            }`}
          >
            설정
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg bg-surface-indigo px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-indigo-hover cursor-pointer"
          >
            로그아웃
          </button>
        </nav>
      </div>
    </header>
  );
}
