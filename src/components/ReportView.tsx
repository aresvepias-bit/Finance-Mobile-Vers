"use client";

import React, { useState, useMemo } from "react";
import { useAppState, useWalletScope } from "@/hooks/useAppState";
import { WalletSwitcher } from "./ui/WalletSwitcher";
import {
  TrendingUp,
  TrendingDown,
  Percent,
  ChevronDown,
  ChevronUp,
  Calendar,
  FileText,
  Printer,
  Search,
  Wallet,
  ArrowRight,
} from "lucide-react";

export function ReportView() {
  const { formatRp } = useAppState();
  const { transactions, banks, walletFilter } = useWalletScope();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return String(d.getMonth() + 1).padStart(2, "0");
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    return String(new Date().getFullYear());
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);


  const periodString = `${selectedYear}-${selectedMonth}`;

  // Filter transactions by period
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const tMonth = t.date ? t.date.slice(0, 7) : "";
      if (tMonth !== periodString) return false;

      // Filter out transfer categories to not skew income/expense summaries
      const isTransfer = t.category === "Transfer Masuk" || t.category === "Transfer Keluar" ||
                        t.categoryName === "Transfer Masuk" || t.categoryName === "Transfer Keluar";
      if (isTransfer) return false;

      if (searchTerm) {
        const desc = (t.description || "").toLowerCase();
        const cat = (t.categoryName || t.category || "").toLowerCase();
        const sub = (t.subCategoryName || "").toLowerCase();
        const search = searchTerm.toLowerCase();
        return desc.includes(search) || cat.includes(search) || sub.includes(search);
      }

      return true;
    });
  }, [transactions, periodString, searchTerm]);

  // Aggregate Category Data
  const reportData = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    const incomeGroups: Record<string, { name: string; amount: number; txs: any[] }> = {};
    const expenseGroups: Record<string, { name: string; amount: number; txs: any[] }> = {};

    filteredTransactions.forEach((t) => {
      const amt = Number(t.amount) || 0;
      const catName = t.categoryName || t.category || "Lainnya";

      if (t.type === "income") {
        totalIncome += amt;
        if (!incomeGroups[catName]) {
          incomeGroups[catName] = { name: catName, amount: 0, txs: [] };
        }
        incomeGroups[catName].amount += amt;
        incomeGroups[catName].txs.push(t);
      } else if (t.type === "expense") {
        totalExpense += amt;
        if (!expenseGroups[catName]) {
          expenseGroups[catName] = { name: catName, amount: 0, txs: [] };
        }
        expenseGroups[catName].amount += amt;
        expenseGroups[catName].txs.push(t);
      }
    });

    // Map and sort income groups
    const sortedIncome = Object.values(incomeGroups)
      .map((g) => {
        const pct = totalIncome > 0 ? (g.amount / totalIncome) * 100 : 0;
        return { ...g, pct };
      })
      .sort((a, b) => b.amount - a.amount);

    // Map and sort expense groups
    const sortedExpense = Object.values(expenseGroups)
      .map((g) => {
        const pct = totalExpense > 0 ? (g.amount / totalExpense) * 0.75 : 0; // scaled visual share
        const pctReal = totalExpense > 0 ? (g.amount / totalExpense) * 100 : 0;
        return { ...g, pct, pctReal };
      })
      .sort((a, b) => b.amount - a.amount);

    const netCashFlow = totalIncome - totalExpense;
    const savingRate = totalIncome > 0 ? Math.round((netCashFlow / totalIncome) * 100) : 0;

    return {
      totalIncome,
      totalExpense,
      netCashFlow,
      savingRate,
      incomeCategories: sortedIncome,
      expenseCategories: sortedExpense,
    };
  }, [filteredTransactions]);

  const toggleCategoryExpand = (catName: string) => {
    if (expandedCategory === catName) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(catName);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:p-0">
      <WalletSwitcher className="print:hidden" />
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm print:shadow-none print:border-none print:bg-transparent">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            Laporan Keuangan per Kategori
            {walletFilter !== "all" && (
              <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-900 text-white">Dompet {walletFilter}</span>
            )}
          </h1>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-1">
            Analisis Outlook Keuangan Periode:{" "}
            <span className="text-emerald-600 font-black">
              {new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleString("id-ID", {
                month: "long",
                year: "numeric",
              })}
            </span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2 print:hidden">
          {/* Period Selection */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 bg-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm"
          >
            <option value="01">Januari</option>
            <option value="02">Februari</option>
            <option value="03">Maret</option>
            <option value="04">April</option>
            <option value="05">Mei</option>
            <option value="06">Juni</option>
            <option value="07">Juli</option>
            <option value="08">Agustus</option>
            <option value="09">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Desember</option>
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 bg-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm"
          >
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Cetak Laporan
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-4">
        {/* Income Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Total Pemasukan
            </span>
            <h3 className="text-xl font-black text-slate-900">{formatRp(reportData.totalIncome)}</h3>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-rose-200 transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Total Pengeluaran
            </span>
            <h3 className="text-xl font-black text-rose-600">{formatRp(reportData.totalExpense)}</h3>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Net Flow Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Selisih Kas / Savings
            </span>
            <h3 className={`text-xl font-black ${reportData.netCashFlow >= 0 ? "text-slate-900" : "text-rose-600"}`}>
              {reportData.netCashFlow >= 0 ? "+" : ""}
              {formatRp(reportData.netCashFlow)}
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Savings Rate Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-teal-200 transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Saving Rate Bulanan
            </span>
            <h3 className="text-xl font-black text-slate-900">{reportData.savingRate}%</h3>
          </div>
          <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
            <Percent className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Category Breakdowns Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
        {/* Pemasukan per Kategori */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Breakdown Kategori Pemasukan
            </h3>
          </div>

          <div className="space-y-4">
            {reportData.incomeCategories.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">
                Tidak ada data pemasukan tercatat pada periode ini.
              </p>
            ) : (
              reportData.incomeCategories.map((cat) => {
                const isExpanded = expandedCategory === `inc-${cat.name}`;
                return (
                  <div key={cat.name} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm hover:border-slate-200 transition-colors">
                    {/* Header */}
                    <div
                      onClick={() => toggleCategoryExpand(`inc-${cat.name}`)}
                      className="flex justify-between items-center p-4 bg-slate-50/50 cursor-pointer select-none"
                    >
                      <div className="flex-1 space-y-1.5 pr-4">
                        <div className="flex justify-between text-xs font-extrabold text-slate-700">
                          <span>{cat.name}</span>
                          <span>{formatRp(cat.amount)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${cat.pct}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 w-8 text-right">
                            {cat.pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-slate-400 shrink-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    {/* Drill-down Transactions Accordion */}
                    {isExpanded && (
                      <div className="bg-white border-t border-slate-100 p-3 space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar animate-scale-in">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pb-1">
                          Riwayat Transaksi: {cat.name}
                        </p>
                        {cat.txs.map((tx) => (
                          <div key={tx.id} className="flex justify-between items-center text-xs p-2 hover:bg-slate-50 rounded-lg border border-slate-50 transition-colors">
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-700">{tx.description || "Tanpa Keterangan"}</p>
                              <p className="text-[9px] text-slate-400">{tx.date}</p>
                            </div>
                            <span className="font-extrabold text-slate-900">+{formatRp(tx.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pengeluaran per Kategori */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <TrendingDown className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Breakdown Kategori Pengeluaran
            </h3>
          </div>

          <div className="space-y-4">
            {reportData.expenseCategories.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">
                Tidak ada data pengeluaran tercatat pada periode ini.
              </p>
            ) : (
              reportData.expenseCategories.map((cat) => {
                const isExpanded = expandedCategory === `exp-${cat.name}`;
                return (
                  <div key={cat.name} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm hover:border-slate-200 transition-colors">
                    {/* Header */}
                    <div
                      onClick={() => toggleCategoryExpand(`exp-${cat.name}`)}
                      className="flex justify-between items-center p-4 bg-slate-50/50 cursor-pointer select-none"
                    >
                      <div className="flex-1 space-y-1.5 pr-4">
                        <div className="flex justify-between text-xs font-extrabold text-slate-700">
                          <span>{cat.name}</span>
                          <span>{formatRp(cat.amount)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-rose-500 rounded-full"
                              style={{ width: `${cat.pctReal}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 w-8 text-right">
                            {cat.pctReal.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-slate-400 shrink-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    {/* Drill-down Transactions Accordion */}
                    {isExpanded && (
                      <div className="bg-white border-t border-slate-100 p-3 space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar animate-scale-in">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pb-1">
                          Riwayat Transaksi: {cat.name}
                        </p>
                        {cat.txs.map((tx) => (
                          <div key={tx.id} className="flex justify-between items-center text-xs p-2 hover:bg-slate-50 rounded-lg border border-slate-50 transition-colors">
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-700">{tx.description || "Tanpa Keterangan"}</p>
                              <div className="flex gap-1.5 items-center mt-0.5">
                                <span className="text-[9px] text-slate-400">{tx.date}</span>
                                {tx.discount > 0 && (
                                  <span className="text-[8px] bg-emerald-50 text-emerald-600 px-1 rounded font-bold">
                                    Hemat {formatRp(tx.discount)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="font-extrabold text-rose-600">-{formatRp(tx.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Detail Search Panel */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Pencarian Rincian Transaksi
            </h3>
            <p className="text-slate-400 text-[10px] font-semibold mt-0.5">
              Cari rincian deskripsi atau kategori transaksi pada periode ini
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari transaksi..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Detailed transaction grid log */}
        <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm max-h-[300px] overflow-y-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Deskripsi</th>
                <th className="px-4 py-3 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-semibold italic">
                    Tidak ada rincian transaksi cocok.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-semibold">{tx.date}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border ${
                        tx.type === "income"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : "bg-rose-50 text-rose-600 border-rose-100"
                      }`}>
                        {tx.categoryName || tx.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {tx.description || "-"}
                      {tx.discount > 0 && (
                        <span className="ml-1 text-[8px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold">
                          Hemat {formatRp(tx.discount)}
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-extrabold whitespace-nowrap ${
                      tx.type === "income" ? "text-slate-900" : "text-rose-600"
                    }`}>
                      {tx.type === "income" ? "+" : "-"}
                      {formatRp(tx.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
