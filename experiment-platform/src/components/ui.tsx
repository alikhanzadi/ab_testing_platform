"use client";

import { useState, type ReactNode } from "react";

export function Card({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-slate-900">{children}</h2>
      {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300",
    secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-300",
    ghost: "text-slate-600 hover:bg-slate-100 disabled:text-slate-300",
    danger: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "blue" | "green" | "amber" | "red" | "violet" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    violet: "bg-violet-50 text-violet-700",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones}`}>{children}</span>;
}

export function Banner({ tone, title, children }: { tone: "info" | "warning" | "critical" | "success"; title?: string; children: ReactNode }) {
  const styles = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    critical: "border-red-200 bg-red-50 text-red-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  }[tone];
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>
      {title && <p className="mb-0.5 font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}

export function Expandable({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">
        {title}
        <span className={`text-slate-400 transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>
      {open && <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600">{children}</div>}
    </div>
  );
}

export function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="py-1.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{k}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{v}</dd>
    </div>
  );
}

/** Horizontal confidence-interval visualization (SVG). */
export function CiBar({ low, high, estimate, label, formatValue }: { low: number; high: number; estimate: number; label: string; formatValue: (x: number) => string }) {
  const pad = Math.max(Math.abs(low), Math.abs(high), Math.abs(estimate)) * 1.3 || 1;
  const scale = (x: number) => 50 + (x / pad) * 45; // 0 maps to 50%
  const crossesZero = low < 0 && high > 0;
  return (
    <div className="py-2">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span className={crossesZero ? "text-slate-500" : estimate > 0 ? "text-emerald-600" : "text-red-600"}>
          {formatValue(estimate)} [{formatValue(low)}, {formatValue(high)}]
        </span>
      </div>
      <svg viewBox="0 0 100 14" className="h-5 w-full" preserveAspectRatio="none">
        <line x1="0" y1="7" x2="100" y2="7" stroke="#e2e8f0" strokeWidth="1" />
        <line x1="50" y1="1" x2="50" y2="13" stroke="#94a3b8" strokeWidth="0.6" strokeDasharray="2 1.5" />
        <line x1={scale(low)} y1="7" x2={scale(high)} y2="7" stroke={crossesZero ? "#64748b" : estimate > 0 ? "#059669" : "#dc2626"} strokeWidth="3" strokeLinecap="round" />
        <circle cx={scale(estimate)} cy="7" r="3" fill={crossesZero ? "#334155" : estimate > 0 ? "#047857" : "#b91c1c"} />
      </svg>
    </div>
  );
}

export function Spinner() {
  return <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />;
}
