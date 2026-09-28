"use client";

import React, { useMemo } from "react";
import { CalendarDays, CopyPlus, FileSpreadsheet, Printer, Wallet } from "lucide-react";
import { computeBudgetUsage, formatMonthLabel, getBudgetStatus, type BudgetStatus } from "@/lib/budgets";

type BudgetUsage = ReturnType<typeof computeBudgetUsage>;

interface BudgetSummaryProps {
  usage: BudgetUsage;
  month: string;
  onMonthChange: (month: string) => void;
  onCopyLastMonth: () => void;
  onExportCsv: () => void;
  onPrint: () => void;
  formatRp: (n: number) => string;
}

/** Sisa hari di bulan terpilih (termasuk hari ini); null bila bulan sudah lewat. */
function getDaysLeft(month: string) {
  const [y, m] = month.split("-").map(Number);
  const now = new Date();
  const daysInMonth = new Date(y, m, 0).getDate();
  const curKey = now.getFullYear() * 12 + now.getMonth();
  const selKey = y * 12 + (m - 1);
  if (selKey < curKey) return null;
  if (selKey > curKey) return daysInMonth;
  return daysInMonth - now.getDate() + 1;
}

const RING_COLOR: Record<BudgetStatus, string> = {
  safe: "#4fbe72",
  warning: "#f59e0b",
  over: "#f43f5e",
};

export function BudgetSummary({
  usage,
  month,
  onMonthChange,
  onCopyLastMonth,
  onExportCsv,
  onPrint,
  formatRp,
}: BudgetSummaryProps) {
  const remaining = usage.totalLimit - usage.totalSpent;
  const status = getBudgetStatus(usage.totalSpent, usage.totalLimit);
  const daysLeft = getDaysLeft(month);
  const perDay = daysLeft && remaining > 0 ? Math.floor(remaining / daysLeft) : 0;

  const statusCounts = useMemo(() => {
    const counts: Record<BudgetStatus, number> = { safe: 0, warning: 0, over: 0 };
    for (const g of usage.groups) counts[getBudgetStatus(g.spent, g.limit)]++;
    return counts;
  }, [usage.groups]);

  // Ring progress
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const ringPct = Math.min(100, usage.usagePct);

  const hasBudget = usage.totalLimit > 0;

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-lg relative overflow-hidden">
      {/* Dekorasi lembut */}
      <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

      {/* Toolbar */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Monitoring Anggaran</p>
          <h3 className="text-lg font-black mt-0.5 capitalize">{formatMonthLabel(month)}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-xl bg-white/10 border border-white/10 px-2.5 py-1.5 cursor-pointer hover:bg-white/15 transition-colors">
            <CalendarDays className="w-3.5 h-3.5 text-slate-300" />
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && onMonthChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer [color-scheme:dark]"
            />
          </label>
          <button
            type="button"
            onClick={onCopyLastMonth}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 border border-white/10 px-2.5 py-1.5 text-[11px] font-bold hover:bg-white/15 transition-colors"
            title="Salin semua limit budget dari bulan lalu"
          >
            <CopyPlus className="w-3.5 h-3.5" /> Salin bulan lalu
          </button>
          <button
            type="button"
            onClick={onExportCsv}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 text-white px-2.5 py-1.5 text-[11px] font-bold hover:bg-emerald-600 transition-colors shadow-sm"
            title="Unduh laporan untuk Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="flex items-center gap-1.5 rounded-xl bg-white text-slate-900 px-2.5 py-1.5 text-[11px] font-bold hover:bg-slate-100 transition-colors shadow-sm"
            title="Cetak atau simpan laporan sebagai PDF"
          >
            <Printer className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="relative mt-5 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-center">
        {/* Ring */}
        <div className="relative w-28 h-28 mx-auto md:mx-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={RING_COLOR[status]}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - ringPct / 100)}
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black tabular-nums leading-none">{usage.usagePct}%</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">terpakai</span>
          </div>
        </div>

        {/* Angka */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total Limit" value={formatRp(usage.totalLimit)} />
          <Stat label="Terpakai" value={formatRp(usage.totalSpent)} />
          <Stat
            label={remaining < 0 ? "Over Budget" : "Sisa"}
            value={formatRp(Math.abs(remaining))}
            tone={remaining < 0 ? "danger" : "default"}
          />
          <Stat
            label="Aman / hari"
            value={daysLeft === null ? "—" : formatRp(perDay)}
            hint={daysLeft === null ? "Periode selesai" : `${daysLeft} hari tersisa`}
            icon
          />
        </div>
      </div>

      {/* Status chips */}
      {hasBudget && (
        <div className="relative mt-5 flex flex-wrap gap-2">
          <Chip color="bg-emerald-400" label="Aman" count={statusCounts.safe} />
          <Chip color="bg-amber-400" label="Waspada" count={statusCounts.warning} />
          <Chip color="bg-rose-400" label="Over" count={statusCounts.over} />
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = "default",
  icon = false,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "danger";
  icon?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3 min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
        {icon && <Wallet className="w-3 h-3" />}
        {label}
      </p>
      <p className={`text-sm sm:text-base font-black mt-1 truncate tabular-nums ${tone === "danger" ? "text-rose-400" : "text-white"}`}>
        {value}
      </p>
      {hint && <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{hint}</p>}
    </div>
  );
}

function Chip({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-white/10 border border-white/10 px-2.5 py-1 text-[10px] font-bold text-slate-200">
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      {label}
      <span className="text-white font-black">{count}</span>
    </span>
  );
}
