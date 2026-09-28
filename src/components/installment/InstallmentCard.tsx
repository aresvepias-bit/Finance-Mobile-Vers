"use client";

import React, { useState } from "react";
import { CalendarClock, CheckCircle2, ChevronDown, Pencil, RotateCcw, Trash2, Wallet } from "lucide-react";
import { computeInstallment, formatShortDate, type InstallmentRecord } from "@/lib/installments";
import { formatDueLabel } from "@/lib/bills";
import { CategoryIcon, getCategoryColor } from "../ui/categoryVisuals";

interface InstallmentCardProps {
  inst: InstallmentRecord;
  formatRp: (n: number) => string;
  onPay: (inst: InstallmentRecord) => void;
  onEdit: (inst: InstallmentRecord) => void;
  onDelete: (inst: InstallmentRecord) => void;
  onUndo: (paymentId: string) => void;
}

export function InstallmentCard({ inst, formatRp, onPay, onEdit, onDelete, onUndo }: InstallmentCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const c = computeInstallment(inst);
  const rootName = inst.category.split(" › ")[0];
  const color = getCategoryColor(rootName);
  const lastPaymentId = inst.payments[0]?.id;

  const dueTone =
    c.overdueCount > 0
      ? "bg-rose-50 text-rose-700 ring-rose-100"
      : c.daysUntilNext !== null && c.daysUntilNext <= 7
      ? "bg-amber-50 text-amber-700 ring-amber-100"
      : "bg-slate-50 text-slate-600 ring-slate-100";

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className={`w-10 h-10 rounded-xl ${color.chip} ring-1 inline-flex items-center justify-center shrink-0`}>
          <CategoryIcon name={rootName} className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-extrabold text-slate-800 text-sm leading-tight truncate">{inst.name}</h4>
            {c.isPaidOff ? (
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md ring-1 bg-emerald-50 text-emerald-700 ring-emerald-100">
                Lunas
              </span>
            ) : c.overdueCount > 0 ? (
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md ring-1 bg-rose-50 text-rose-700 ring-rose-100">
                Telat {c.overdueCount}x
              </span>
            ) : null}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
            {[inst.lender, inst.category, `via ${inst.bank_name}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(inst)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50"
            title="Ubah"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(inst)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            title="Hapus"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sisa hutang */}
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Sisa Hutang</p>
          <p className="text-xl font-black text-slate-900 tabular-nums">{formatRp(c.remainingDebt)}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Cicilan / bln</p>
          <p className="text-sm font-black text-slate-800 tabular-nums">{formatRp(c.monthly)}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-3">
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${c.progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-bold mt-1.5 text-slate-500">
          <span>
            <span className="text-slate-800">{c.paidCount}</span> / {inst.tenor_months} kali dibayar ({c.progressPct}%)
          </span>
          <span>Lunas {formatShortDate(c.endDate)}</span>
        </div>
      </div>

      {/* Jatuh tempo + bayar */}
      {!c.isPaidOff ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className={`flex items-center gap-2 rounded-xl ring-1 px-2.5 py-1.5 ${dueTone}`}>
            <CalendarClock className="w-4 h-4 shrink-0" />
            <div className="leading-tight">
              <p className="text-[10px] font-extrabold">
                Ke-{c.nextPeriod} · {c.nextDueDate && formatShortDate(c.nextDueDate)}
              </p>
              <p className="text-[9px] font-bold opacity-80">
                {c.daysUntilNext !== null && c.daysUntilNext < 0
                  ? `Lewat ${Math.abs(c.daysUntilNext)} hari`
                  : c.daysUntilNext !== null
                  ? formatDueLabel(c.daysUntilNext)
                  : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onPay(inst)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-100 transition-colors"
          >
            <Wallet className="w-3.5 h-3.5" /> Bayar
          </button>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 text-emerald-700 px-3 py-2 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4" /> Selamat, cicilan ini sudah lunas!
        </div>
      )}

      {inst.note && <p className="text-[10px] text-slate-500 italic mt-3">&ldquo;{inst.note}&rdquo;</p>}

      {/* Riwayat pembayaran */}
      <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600"
        >
          <span>
            Riwayat bayar di aplikasi ({inst.payments.length})
            {inst.initial_paid_count > 0 && ` · ${inst.initial_paid_count}x sebelumnya`}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHistory ? "rotate-180" : ""}`} />
        </button>
        {showHistory && (
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
            {inst.payments.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-1">Belum ada pembayaran tercatat.</p>
            ) : (
              inst.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-[11px] py-1">
                  <span className="font-bold text-slate-600">Ke-{p.period}</span>
                  <span className="text-slate-400 flex-1">{formatShortDate(new Date(`${p.date}T00:00:00`))}</span>
                  <span className="font-bold text-slate-700 tabular-nums">{formatRp(p.amount)}</span>
                  {p.id === lastPaymentId && (
                    <button
                      type="button"
                      onClick={() => onUndo(p.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Batalkan pembayaran terakhir"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
