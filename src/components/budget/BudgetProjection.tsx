"use client";

import React, { useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { computeProjection, type IncomePlan } from "@/lib/projection";
import { formatMonthLabel } from "@/lib/budgets";
import { CategoryIcon, getCategoryColor } from "../ui/categoryVisuals";
import { CalendarDays, ChevronDown, Save, TrendingUp } from "lucide-react";

// Palet grafik (lolos validasi CVD): amber = pengeluaran, hijau = pemasukan
const EXPENSE_COLOR = "#d4883a";
const INCOME_COLOR = "#248a46";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function compactRp(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}Rp ${(abs / 1e9).toFixed(1).replace(".", ",")} M`;
  if (abs >= 1e6) return `${sign}Rp ${(abs / 1e6).toFixed(1).replace(".", ",")} jt`;
  if (abs >= 1e3) return `${sign}Rp ${Math.round(abs / 1e3)} rb`;
  return `${sign}Rp ${abs}`;
}

export function BudgetProjection() {
  const {
    budgets,
    categories,
    transactions,
    installments,
    subscriptions,
    settings,
    saveSetting,
    showAlert,
    formatRp,
    hideNumbers,
  } = useAppState();

  const firstBudgetMonth = useMemo(() => [...budgets.map((b) => b.month)].sort()[0], [budgets]);
  const [startMonth, setStartMonth] = useState<string>(() => firstBudgetMonth || new Date().toISOString().slice(0, 7));

  const savedPlan: IncomePlan = settings.incomePlan ?? { salary: 0, bonus: 0, bonusMonth: 0 };
  const [salary, setSalary] = useState(savedPlan.salary ? new Intl.NumberFormat("id-ID").format(savedPlan.salary) : "");
  const [bonus, setBonus] = useState(savedPlan.bonus ? new Intl.NumberFormat("id-ID").format(savedPlan.bonus) : "");
  const [bonusMonth, setBonusMonth] = useState(String(savedPlan.bonusMonth || 0));
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const cleanNumber = (str: string) => {
    const clean = str.replace(/\D/g, "");
    return clean ? parseInt(clean, 10) : 0;
  };
  const fmtInput = (v: string) => {
    const n = cleanNumber(v);
    return n ? new Intl.NumberFormat("id-ID").format(n) : "";
  };

  // Proyeksi memakai isian form (langsung terlihat sebelum disimpan)
  const plan: IncomePlan = { salary: cleanNumber(salary), bonus: cleanNumber(bonus), bonusMonth: Number(bonusMonth) };
  const projection = useMemo(
    () => computeProjection({ startMonth, budgets, categories, transactions, installments, subscriptions, incomePlan: plan }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startMonth, budgets, categories, transactions, installments, subscriptions, plan.salary, plan.bonus, plan.bonusMonth]
  );

  const isDirty =
    plan.salary !== (savedPlan.salary || 0) || plan.bonus !== (savedPlan.bonus || 0) || plan.bonusMonth !== (savedPlan.bonusMonth || 0);

  const handleSavePlan = async () => {
    const res = await saveSetting("incomePlan", plan);
    if (res.status === "success") {
      showAlert(`Gaji ${formatRp(plan.salary)}/bulan dipakai untuk proyeksi tahunan.`, "success", "Rencana pemasukan tersimpan");
    } else {
      showAlert(res.message || "Gagal menyimpan rencana pemasukan.", "error");
    }
  };

  const maxVal = Math.max(1, ...projection.months.map((m) => Math.max(m.expense, m.income)));
  const niceMax = (() => {
    const pow = Math.pow(10, Math.floor(Math.log10(maxVal)));
    return Math.ceil(maxVal / pow) * pow;
  })();
  const ticks = [niceMax, niceMax / 2, 0];
  const endMonth = projection.months[projection.months.length - 1]?.month;
  const axisLabel = (n: number) => (hideNumbers ? "•••" : compactRp(n));

  const inputCls = "w-full rounded-xl border border-slate-200 p-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none bg-white";
  const labelCls = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Rencana pemasukan */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm lg:sticky lg:top-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Rencana Pemasukan</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Dipakai untuk bulan yang belum berjalan</p>
            </div>
          </div>

          <div>
            <label className={labelCls}>Gaji Bersih / Bulan</label>
            <input inputMode="numeric" value={salary} onChange={(e) => setSalary(fmtInput(e.target.value))} placeholder="Rp 0" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Bonus / THR</label>
              <input inputMode="numeric" value={bonus} onChange={(e) => setBonus(fmtInput(e.target.value))} placeholder="Rp 0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Bulan Cair</label>
              <select value={bonusMonth} onChange={(e) => setBonusMonth(e.target.value)} className={inputCls}>
                <option value="0">Tidak ada</option>
                {MONTH_NAMES.map((n, i) => (
                  <option key={n} value={i + 1}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSavePlan}
            disabled={!isDirty}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-100 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:shadow-none"
          >
            <Save className="w-4 h-4" /> {isDirty ? "Simpan Rencana" : "Tersimpan"}
          </button>

          <div className="pt-3 border-t border-slate-100">
            <label className={labelCls}>Mulai Proyeksi</label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 cursor-pointer">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              <input
                type="month"
                value={startMonth}
                onChange={(e) => e.target.value && setStartMonth(e.target.value)}
                className="flex-1 text-sm font-bold outline-none bg-transparent cursor-pointer"
              />
            </label>
            <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
              Bulan tanpa budget memakai budget terakhir yang ada. Bulan yang sudah lewat memakai realisasi.
            </p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-5">
        {/* Ringkasan setahun */}
        <div className="bg-slate-900 text-white rounded-2xl px-5 py-4 shadow-lg relative overflow-hidden opacity-0 animate-fade-in-up">
          <div className="absolute -right-16 -top-24 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <p className="relative text-[9px] font-bold uppercase tracking-widest text-slate-400">
            Proyeksi {formatMonthLabel(startMonth)} – {endMonth && formatMonthLabel(endMonth)}
          </p>
          <div className="relative mt-2 grid grid-cols-3 gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Pengeluaran</p>
              <p className="text-lg sm:text-xl font-black tabular-nums tracking-tight">{formatRp(Math.round(projection.totalExpense))}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Pemasukan</p>
              <p className="text-lg sm:text-xl font-black tabular-nums tracking-tight">{formatRp(Math.round(projection.totalIncome))}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Tabungan</p>
              <p className={`text-lg sm:text-xl font-black tabular-nums tracking-tight ${projection.totalSavings < 0 ? "text-rose-400" : "text-emerald-300"}`}>
                {formatRp(Math.round(projection.totalSavings))}
              </p>
              {projection.totalIncome > 0 && <p className="text-[10px] font-bold text-slate-400">{projection.savingsRate}% dari pemasukan</p>}
            </div>
          </div>
          {plan.salary === 0 && (
            <p className="relative mt-3 text-[11px] text-amber-300 font-semibold">Isi gaji bersih di kiri untuk melihat perkiraan tabungan.</p>
          )}
        </div>

        {!projection.hasBudget ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500 font-semibold">
            Belum ada budget. Atur budget bulanan dulu di tab <span className="font-bold">Bulanan</span>.
          </div>
        ) : (
          <>
            {/* Grafik 12 bulan */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm opacity-0 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Pengeluaran vs Pemasukan per Bulan</h4>
                <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: EXPENSE_COLOR }} /> Pengeluaran
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm opacity-40" style={{ background: EXPENSE_COLOR }} /> Realisasi
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 rounded-full" style={{ background: INCOME_COLOR }} /> Pemasukan
                  </span>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                {/* Sumbu Y */}
                <div className="flex flex-col justify-between h-48 text-[9px] font-semibold text-slate-400 text-right w-12 shrink-0 -mt-1.5 pb-5">
                  {ticks.map((t) => (
                    <span key={t}>{axisLabel(t)}</span>
                  ))}
                </div>

                <div className="relative flex-1">
                  {/* Grid */}
                  <div className="absolute inset-x-0 top-0 h-48 flex flex-col justify-between pointer-events-none">
                    {ticks.map((t) => (
                      <div key={t} className={`border-t ${t === 0 ? "border-slate-300" : "border-dashed border-slate-100"}`} />
                    ))}
                  </div>

                  {/* Kolom bulan */}
                  <div className="relative grid grid-cols-12 gap-1 sm:gap-2 h-48">
                    {projection.months.map((m, i) => {
                      const eh = (m.expense / niceMax) * 100;
                      const ih = (m.income / niceMax) * 100;
                      const isHover = hoverIdx === i;
                      return (
                        <div
                          key={m.month}
                          className="relative h-full flex items-end justify-center cursor-default"
                          onMouseEnter={() => setHoverIdx(i)}
                          onMouseLeave={() => setHoverIdx(null)}
                        >
                          <div className={`absolute inset-0 rounded-lg transition-colors ${isHover ? "bg-slate-50" : ""}`} />
                          {/* Bar pengeluaran */}
                          <div
                            className="relative w-3/5 max-w-[28px] rounded-t-[4px] origin-bottom animate-bar-grow-y"
                            style={{
                              height: `${eh}%`,
                              background: EXPENSE_COLOR,
                              opacity: m.source === "actual" ? 0.4 : 1,
                              animationDelay: `${150 + i * 50}ms`,
                            }}
                          />
                          {/* Tanda pemasukan */}
                          {m.income > 0 && (
                            <div
                              className="absolute left-1 right-1 h-[2px] rounded-full"
                              style={{ bottom: `${ih}%`, background: INCOME_COLOR }}
                            />
                          )}

                          {/* Tooltip */}
                          {isHover && (
                            <div
                              className={`absolute bottom-full mb-2 z-10 w-48 rounded-xl bg-slate-900 text-white p-3 shadow-xl text-[11px] pointer-events-none ${
                                i > 8 ? "right-0" : i < 3 ? "left-0" : "left-1/2 -translate-x-1/2"
                              }`}
                            >
                              <p className="font-extrabold capitalize">{formatMonthLabel(m.month)}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                {m.source === "actual" ? "Realisasi" : "Rencana"}
                              </p>
                              <div className="mt-2 space-y-1 tabular-nums">
                                <p className="flex justify-between gap-2"><span className="text-slate-400">Pengeluaran</span><span className="font-bold">{formatRp(Math.round(m.expense))}</span></p>
                                {m.source === "plan" && m.extras > 0 && (
                                  <p className="flex justify-between gap-2 text-[10px]"><span className="text-slate-500">di luar budget</span><span>{formatRp(Math.round(m.extras))}</span></p>
                                )}
                                <p className="flex justify-between gap-2"><span className="text-slate-400">Pemasukan</span><span className="font-bold">{formatRp(Math.round(m.income))}</span></p>
                                <p className="flex justify-between gap-2 border-t border-white/10 pt-1"><span className="text-slate-400">Tabungan</span><span className={`font-black ${m.savings < 0 ? "text-rose-300" : "text-emerald-300"}`}>{formatRp(Math.round(m.savings))}</span></p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Label bulan */}
                  <div className="grid grid-cols-12 gap-1 sm:gap-2 mt-1.5">
                    {projection.months.map((m) => (
                      <span key={m.month} className="text-center text-[9px] font-bold text-slate-400">
                        {MONTH_NAMES[Number(m.month.slice(5, 7)) - 1]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tabel bulanan (aksesibel) */}
              <button
                type="button"
                onClick={() => setShowTable((v) => !v)}
                className="mt-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTable ? "rotate-180" : ""}`} />
                Tabel bulanan
              </button>
              {showTable && (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-xs tabular-nums">
                    <thead>
                      <tr className="text-[9px] uppercase tracking-wider text-slate-400 text-right">
                        <th className="text-left py-2 font-bold">Bulan</th>
                        <th className="py-2 font-bold">Pengeluaran</th>
                        <th className="py-2 font-bold">Pemasukan</th>
                        <th className="py-2 font-bold">Tabungan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projection.months.map((m) => (
                        <tr key={m.month} className="border-t border-slate-100 text-right">
                          <td className="text-left py-2 font-bold text-slate-700 capitalize">
                            {formatMonthLabel(m.month)}
                            {m.source === "actual" && <span className="ml-1.5 text-[9px] font-bold text-slate-400 uppercase">realisasi</span>}
                          </td>
                          <td className="py-2 text-slate-700">{formatRp(Math.round(m.expense))}</td>
                          <td className="py-2 text-slate-700">{formatRp(Math.round(m.income))}</td>
                          <td className={`py-2 font-bold ${m.savings < 0 ? "text-rose-600" : "text-slate-900"}`}>{formatRp(Math.round(m.savings))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Per kategori */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm opacity-0 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Anggaran Setahun per Kategori</h4>
              <div className="mt-3 divide-y divide-slate-100">
                {projection.categoriesAnnual.map((c) => {
                  const share = projection.totalExpense > 0 ? (c.annual / projection.categoriesAnnual.reduce((s, x) => s + x.annual, 0)) * 100 : 0;
                  const color = getCategoryColor(c.rootName);
                  return (
                    <div key={c.rootId} className="flex items-center gap-3 py-2.5">
                      <span className={`w-8 h-8 rounded-lg ${color.chip} ring-1 flex items-center justify-center shrink-0`}>
                        <CategoryIcon name={c.rootName} className="w-4 h-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-700 truncate">{c.rootName}</span>
                          <span className="text-sm font-black text-slate-900 tabular-nums">{formatRp(Math.round(c.annual))}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full animate-bar-grow" style={{ width: `${share}%`, background: EXPENSE_COLOR }} />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400 tabular-nums w-40 text-right">
                            {formatRp(Math.round(c.monthly))}/bln · {share.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {projection.extras.length > 0 && (
                <div className="mt-4 pt-3 border-t border-dashed border-slate-200">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Komitmen di luar budget (ikut dihitung)</p>
                  <div className="mt-2 space-y-1.5">
                    {projection.extras.map((x) => (
                      <div key={x.name + x.kind} className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">
                          {x.name} <span className="text-[10px] text-slate-400">· {x.kind}</span>
                        </span>
                        <span className="font-bold text-slate-800 tabular-nums">{formatRp(Math.round(x.total))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
