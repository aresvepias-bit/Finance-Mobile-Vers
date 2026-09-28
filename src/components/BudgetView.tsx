"use client";

import React, { useState, useMemo } from "react";
import { useAppState } from "@/hooks/useAppState";
import { CategorySelect } from "./ui/CategorySelect";
import { CategoryIcon, getCategoryColor } from "./ui/categoryVisuals";
import { BudgetSummary } from "./budget/BudgetSummary";
import { BudgetGroupCard } from "./budget/BudgetGroupCard";
import { BudgetProjection } from "./budget/BudgetProjection";
import { computeBudgetUsage, type BudgetLine } from "@/lib/budgets";
import { downloadBudgetCsv, printBudgetReport } from "@/lib/budgetReport";
import { AlertCircle, PiggyBank, Plus, Target } from "lucide-react";

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

type SortMode = "name" | "usage";

export function BudgetView() {
  const {
    categories,
    transactions,
    budgets,
    saveBudget,
    deleteBudget,
    copyBudgets,
    showConfirm,
    showAlert,
    formatRp,
  } = useAppState();

  const [budgetMonth, setBudgetMonth] = useState(currentMonth);
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [sortMode, setSortMode] = useState<SortMode>("usage");
  const [view, setView] = useState<"monthly" | "yearly">("monthly");

  // Form states
  const [budgetCategory, setBudgetCategory] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetNote, setBudgetNote] = useState("");

  const cleanNumber = (str: string) => {
    const clean = str.replace(/\D/g, "");
    return clean ? parseInt(clean, 10) : 0;
  };

  const handleAmountChange = (val: string, setter: (s: string) => void) => {
    const num = cleanNumber(val);
    setter(num ? new Intl.NumberFormat("id-ID").format(num) : "");
  };

  // Realisasi budget bulan terpilih, dikelompokkan per kategori utama
  const usage = useMemo(
    () => computeBudgetUsage(budgets, transactions, categories, filterMonth),
    [budgets, transactions, categories, filterMonth]
  );

  const sortedGroups = useMemo(() => {
    const list = [...usage.groups];
    if (sortMode === "usage") {
      const pct = (spent: number, limit: number) => (limit > 0 ? spent / limit : 0);
      list.sort((a, b) => pct(b.spent, b.limit) - pct(a.spent, a.limit));
    }
    return list;
  }, [usage.groups, sortMode]);

  const unbudgetedTotal = usage.unbudgeted.reduce((s, u) => s + u.spent, 0);

  // Isi form dari budget yang sudah ada (untuk ubah limit / catatan)
  const handleEditLine = (line: BudgetLine) => {
    setBudgetMonth(line.month);
    setBudgetCategory(line.categoryId);
    setBudgetAmount(new Intl.NumberFormat("id-ID").format(line.limit));
    setBudgetNote(line.note || "");
  };

  // Pasang budget untuk kategori yang belum punya budget
  const handleQuickBudget = (rootId: string) => {
    setBudgetMonth(filterMonth);
    setBudgetCategory(rootId);
    setBudgetAmount("");
    setBudgetNote("");
  };

  // Submit budget
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!budgetMonth || !budgetCategory || !budgetAmount) {
      showAlert("Pilih bulan, kategori, dan isi nominal budget!", "error");
      return;
    }

    const cleanAmt = cleanNumber(budgetAmount);
    if (cleanAmt <= 0) {
      showAlert("Nominal budget harus valid!", "error");
      return;
    }

    const res = await saveBudget(budgetMonth, budgetCategory, cleanAmt, budgetNote);
    if (res.status === "success") {
      setBudgetAmount("");
      setBudgetNote("");
      showAlert("Budget berhasil disimpan!", "success");
    } else {
      showAlert(res.message || "Gagal menyimpan budget.", "error");
    }
  };

  // Delete budget
  const handleDeleteClick = (id: string) => {
    showConfirm(
      "Hapus limit budget ini?",
      async () => {
        const res = await deleteBudget(id);
        if (res.status === "success") {
          showAlert("Limit budget berhasil dihapus!", "success");
        } else {
          showAlert(res.message || "Gagal menghapus budget.", "error");
        }
      },
      { title: "Hapus Budget", type: "danger" }
    );
  };

  // Copy budgets from last month
  const handleCopyLastMonthBudget = () => {
    const [year, month] = filterMonth.split("-").map(Number);
    const prev = new Date(year, month - 2, 1);
    const prevMonthString = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

    showConfirm(
      `Salin semua limit budget dari bulan lalu (${prevMonthString}) ke bulan saat ini (${filterMonth})?\n\nCatatan: Ini akan menimpa limit budget kategori yang sama di bulan ini.`,
      async () => {
        const res = await copyBudgets(prevMonthString, filterMonth);
        if (res.status === "success") {
          showAlert("Berhasil menduplikasi budget dari bulan lalu!", "success");
        } else {
          showAlert(res.message || "Gagal menyalin budget.", "error");
        }
      },
      { title: "Salin Budget", type: "warning" }
    );
  };

  const handleExportCsv = () => {
    downloadBudgetCsv(usage, filterMonth);
    showAlert("Laporan Excel (CSV) berhasil diunduh!", "success");
  };

  const handlePrint = () => {
    if (!printBudgetReport(usage, filterMonth)) {
      showAlert("Pop-up diblokir browser. Izinkan pop-up untuk mencetak laporan.", "error");
    }
  };

  const viewTabs = (
    <div className="flex bg-white border border-slate-100 shadow-sm p-1 rounded-xl w-fit">
      {(
        [
          ["monthly", "Bulanan"],
          ["yearly", "Proyeksi Tahunan"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => setView(id)}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
            view === id ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  if (view === "yearly") {
    return (
      <div className="space-y-5">
        {viewTabs}
        <BudgetProjection />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {viewTabs}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form Column */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm lg:sticky lg:top-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Set Anggaran</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Batas belanja per kategori tiap bulan</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Month */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Bulan
              </label>
              <input
                type="month"
                required
                value={budgetMonth}
                onChange={(e) => setBudgetMonth(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Kategori Pengeluaran
              </label>
              <CategorySelect
                categories={categories}
                type="expense"
                value={budgetCategory}
                onChange={setBudgetCategory}
                placeholder="Pilih kategori / subkategori"
              />
              <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                Pilih kategori utama untuk budget umum, atau subkategori (misal KPR Rumah) untuk rincian.
              </p>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Limit Anggaran
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={budgetAmount}
                onChange={(e) => handleAmountChange(e.target.value, setBudgetAmount)}
                placeholder="Rp 0"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Catatan <span className="normal-case font-semibold text-slate-300">(opsional)</span>
              </label>
              <input
                type="text"
                value={budgetNote}
                onChange={(e) => setBudgetNote(e.target.value)}
                maxLength={120}
                placeholder="Misal: KPR BTN, tenor s/d 2040"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-100 transition-transform hover:scale-[1.01] flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Simpan Limit Budget
            </button>
          </form>
        </div>
      </div>

      {/* Display Column */}
      <div className="lg:col-span-2 space-y-6">
        <BudgetSummary
          usage={usage}
          month={filterMonth}
          onMonthChange={setFilterMonth}
          onCopyLastMonth={handleCopyLastMonthBudget}
          onExportCsv={handleExportCsv}
          onPrint={handlePrint}
          formatRp={formatRp}
        />

        {usage.groups.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <PiggyBank className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700 mt-3">Belum ada budget untuk bulan ini</p>
            <p className="text-xs text-slate-400 mt-1">
              Isi form di kiri, atau klik <span className="font-bold">Salin bulan lalu</span> untuk memakai budget sebelumnya.
            </p>
          </div>
        ) : (
          <>
            {/* Sort control */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {usage.groups.length} kategori dianggarkan
              </p>
              <div className="flex bg-slate-100 p-0.5 rounded-lg">
                {(
                  [
                    ["usage", "% Terpakai"],
                    ["name", "Nama"],
                  ] as [SortMode, string][]
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSortMode(mode)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                      sortMode === mode ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {sortedGroups.map((g) => (
                <BudgetGroupCard
                  key={g.rootId}
                  group={g}
                  formatRp={formatRp}
                  onEdit={handleEditLine}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          </>
        )}

        {/* Pengeluaran tanpa budget */}
        {usage.unbudgeted.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Pengeluaran Tanpa Budget</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Belum ada limit, klik untuk memasang budget</p>
                </div>
              </div>
              <span className="text-sm font-black text-slate-900 tabular-nums">{formatRp(unbudgetedTotal)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {usage.unbudgeted.map((u) => {
                const color = getCategoryColor(u.rootName);
                return (
                  <button
                    key={u.rootId}
                    type="button"
                    onClick={() => handleQuickBudget(u.rootId)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white pl-1.5 pr-3 py-1.5 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
                    title={`Pasang budget untuk ${u.rootName}`}
                  >
                    <span className={`w-6 h-6 rounded-md ${color.chip} ring-1 inline-flex items-center justify-center`}>
                      <CategoryIcon name={u.rootName} className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-bold text-slate-700">{u.rootName}</span>
                    <span className="text-[10px] font-bold text-slate-500 tabular-nums">{formatRp(u.spent)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
