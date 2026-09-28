"use client";

import React, { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, ChevronDown, Pencil, Trash2, X } from "lucide-react";
import type { PocketRecord } from "@/lib/pockets";
import { CategoryIcon, getCategoryColor } from "../ui/categoryVisuals";

interface PocketCardProps {
  pocket: PocketRecord;
  formatRp: (n: number) => string;
  onDeposit: (p: PocketRecord) => void;
  onWithdraw: (p: PocketRecord) => void;
  onEdit: (p: PocketRecord) => void;
  onDelete: (p: PocketRecord) => void;
  onDeleteEntry: (entryId: string) => void;
}

const ENTRY_LABEL = { allocate: "Alokasi", deposit: "Isi manual", withdraw: "Dipakai" } as const;

export function PocketCard({ pocket: p, formatRp, onDeposit, onWithdraw, onEdit, onDelete, onDeleteEntry }: PocketCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const color = getCategoryColor(p.name);
  const targetPct = p.targetAmount ? Math.min(100, Math.round((p.balance / p.targetAmount) * 100)) : null;
  const shortfall = p.targetAmount ? Math.max(0, p.targetAmount - p.balance) : 0;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all">
      <div className="flex items-start gap-3">
        <span className={`w-10 h-10 rounded-xl ${color.chip} ring-1 inline-flex items-center justify-center shrink-0`}>
          <CategoryIcon name={p.name} className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-extrabold text-slate-800 text-sm leading-tight truncate">{p.name}</h4>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">{p.percent}%</span>
          </div>
          {p.note && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{p.note}</p>}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button type="button" onClick={() => onEdit(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50" title="Ubah">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => onDelete(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Hapus">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Saldo Pos</p>
        <p className={`text-xl font-black tabular-nums ${p.balance < 0 ? "text-rose-600" : "text-slate-900"}`}>{formatRp(p.balance)}</p>
      </div>

      {targetPct !== null && (
        <div className="mt-3">
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${targetPct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] font-bold mt-1.5 text-slate-500">
            <span>
              {targetPct}% dari target {formatRp(p.targetAmount!)}
            </span>
            <span>{shortfall > 0 ? `Kurang ${formatRp(shortfall)}` : "Target tercapai 🎉"}</span>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onDeposit(p)}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors"
        >
          <ArrowDownToLine className="w-3.5 h-3.5" /> Isi
        </button>
        <button
          type="button"
          onClick={() => onWithdraw(p)}
          disabled={p.balance <= 0}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowUpFromLine className="w-3.5 h-3.5" /> Pakai
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600"
        >
          <span>Riwayat ({p.entries.length})</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHistory ? "rotate-180" : ""}`} />
        </button>
        {showHistory && (
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
            {p.entries.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-1">Belum ada mutasi.</p>
            ) : (
              p.entries.map((e) => (
                <div key={e.id} className="group flex items-center gap-2 text-[11px] py-1">
                  <span className={`font-bold w-16 shrink-0 ${e.amount < 0 ? "text-rose-600" : "text-slate-600"}`}>{ENTRY_LABEL[e.type]}</span>
                  <span className="text-slate-400 flex-1 truncate" title={e.note}>
                    {new Date(`${e.date}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    {e.note && ` · ${e.note}`}
                  </span>
                  <span className={`font-bold tabular-nums ${e.amount < 0 ? "text-rose-600" : "text-slate-800"}`}>
                    {e.amount > 0 ? "+" : "−"}
                    {formatRp(Math.abs(e.amount))}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteEntry(e.id)}
                    className="p-0.5 rounded text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100"
                    title="Hapus mutasi"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
