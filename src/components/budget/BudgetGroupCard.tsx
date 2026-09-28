"use client";

import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { BUDGET_STATUS_LABEL, getBudgetStatus, type BudgetGroup, type BudgetLine, type BudgetStatus } from "@/lib/budgets";
import { CategoryIcon, getCategoryColor } from "../ui/categoryVisuals";

export const STATUS_STYLE: Record<BudgetStatus, { badge: string; bar: string; text: string }> = {
  safe: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-100", bar: "bg-emerald-500", text: "text-slate-900" },
  warning: { badge: "bg-amber-50 text-amber-700 ring-amber-100", bar: "bg-amber-500", text: "text-amber-700" },
  over: { badge: "bg-rose-50 text-rose-700 ring-rose-100", bar: "bg-rose-500", text: "text-rose-600" },
};

interface BudgetGroupCardProps {
  group: BudgetGroup;
  formatRp: (n: number) => string;
  onEdit: (line: BudgetLine) => void;
  onDelete: (id: string) => void;
}

export function BudgetGroupCard({ group: g, formatRp, onEdit, onDelete }: BudgetGroupCardProps) {
  const pctRaw = g.limit > 0 ? (g.spent / g.limit) * 100 : 0;
  const remaining = g.limit - g.spent;
  const status = getBudgetStatus(g.spent, g.limit);
  const style = STATUS_STYLE[status];
  const color = getCategoryColor(g.rootName);
  const hasBreakdown = g.lines.length > 1 || !g.lines[0].isRootLine;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className={`w-10 h-10 rounded-xl ${color.chip} ring-1 inline-flex items-center justify-center shrink-0`}>
          <CategoryIcon name={g.rootName} className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-extrabold text-slate-800 text-sm leading-tight truncate">{g.rootName}</h4>
            <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md ring-1 ${style.badge}`}>
              {BUDGET_STATUS_LABEL[status]}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
            Limit {formatRp(g.limit)}
            {hasBreakdown && ` · ${g.lines.length} rincian`}
          </p>
        </div>
        <span className={`text-lg font-black tabular-nums leading-none ${style.text}`}>{Math.round(pctRaw)}%</span>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${style.bar} rounded-full transition-all duration-700`}
            style={{ width: `${Math.min(100, pctRaw)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-bold mt-1.5">
          <span className="text-slate-500">
            <span className="text-slate-800">{formatRp(g.spent)}</span> terpakai
          </span>
          <span className={remaining < 0 ? "text-rose-600" : "text-slate-500"}>
            {remaining < 0 ? `Over ${formatRp(Math.abs(remaining))}` : `Sisa ${formatRp(remaining)}`}
          </span>
        </div>
      </div>

      {/* Rincian per subkategori + catatan */}
      <div className={`mt-3 space-y-1 ${hasBreakdown ? "pt-3 border-t border-dashed border-slate-200" : ""}`}>
        {g.lines.map((line) => {
          const linePct = line.limit > 0 ? (line.spent / line.limit) * 100 : 0;
          const lineStyle = STATUS_STYLE[getBudgetStatus(line.spent, line.limit)];
          return (
            <div key={line.id} className="group flex items-start gap-2 rounded-xl px-2 py-1.5 -mx-2 hover:bg-slate-50 transition-colors">
              <div className="flex-1 min-w-0">
                {hasBreakdown && (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-700 truncate">
                        {line.isRootLine ? "Umum / lainnya" : line.name}
                      </span>
                      <span className="text-[10px] font-bold shrink-0 tabular-nums text-slate-500">
                        <span className={line.spent > line.limit ? "text-rose-600" : "text-slate-800"}>{formatRp(line.spent)}</span>
                        {" / "}
                        {formatRp(line.limit)}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                      <div className={`h-full ${lineStyle.bar}`} style={{ width: `${Math.min(100, linePct)}%` }} />
                    </div>
                  </>
                )}
                {line.note ? (
                  <p className="text-[10px] text-slate-500 italic mt-1 truncate" title={line.note}>
                    &ldquo;{line.note}&rdquo;
                  </p>
                ) : (
                  !hasBreakdown && <p className="text-[10px] text-slate-300 italic">Tanpa catatan</p>
                )}
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                <button
                  type="button"
                  onClick={() => onEdit(line)}
                  className="p-1 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50"
                  title="Ubah limit / catatan"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(line.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  title="Hapus"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
