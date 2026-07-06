"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "Dashboard", icon: "◫" },
  { href: "/new-experiment", label: "New Experiment", icon: "＋" },
  { href: "/analyze", label: "Analyze Results", icon: "∿" },
  { href: "/reports", label: "Reports", icon: "▤" },
  { href: "/guide", label: "Experimentation Guide", icon: "◉" },
  { href: "/templates", label: "Templates", icon: "⧉" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen">
      <aside className="no-print fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-5">
          <Link href="/" className="block">
            <span className="text-[15px] font-semibold tracking-tight text-slate-900">Experiment Studio</span>
            <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-wider text-blue-600">AI-Guided Experimentation</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="w-4 text-center text-xs opacity-70">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="text-[11px] leading-relaxed text-slate-400">Browser-based MVP. All data stays local to this device.</p>
        </div>
      </aside>
      <main className="ml-60 min-h-screen flex-1 px-8 py-8 print:ml-0">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
