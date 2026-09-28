"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useAppState, useWalletScope } from "@/hooks/useAppState";
import { WalletSwitcher } from "./ui/WalletSwitcher";
import { computeBudgetUsage, formatMonthLabel, getBudgetStatus, BUDGET_STATUS_LABEL } from "@/lib/budgets";
import { daysUntil, formatDueLabel, getNextDueDate } from "@/lib/bills";
import { computeInstallment, summarizeInstallments } from "@/lib/installments";
import { allocatedForMonth, monthSurplus } from "@/lib/pockets";
import { CategoryIcon, getCategoryColor } from "./ui/categoryVisuals";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Percent,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Zap,
  Plus,
  Minus,
  DollarSign,
  CreditCard,
  Coins,
  FileText,
  ShoppingBag,
  Calendar,
} from "lucide-react";

// Lightweight, high-performance, fluid React Count-Up Component
function AnimatedNumber({ value, formatter }: { value: number; formatter: (val: number) => string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const startValueRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const duration = 1000; // 1s animation duration

  useEffect(() => {
    startValueRef.current = displayValue;
    startTimeRef.current = null;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      // Easing: easeOutCubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentVal = startValueRef.current + (value - startValueRef.current) * easeProgress;
      setDisplayValue(currentVal);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  return <>{formatter(displayValue)}</>;
}

export function DashboardView({ onSwitchTab }: { onSwitchTab: (tab: string) => void }) {
  const { categories, budgets, pockets, formatRp, walletFilter } = useAppState();
  // Data mengikuti dompet yang dipilih (Semua / Pribadi / Kontrakan / ...)
  const { banks, transactions, deposits, cryptos, ecommerce, subscriptions, installments } = useWalletScope();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return String(d.getMonth() + 1).padStart(2, "0");
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    return String(new Date().getFullYear());
  });



  const periodString = `${selectedYear}-${selectedMonth}`;

  // Monthly stats memo
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let savingsDiscount = 0;
    const catSpend: Record<string, number> = {};

    transactions.forEach((t) => {
      const tMonth = t.date ? t.date.slice(0, 7) : "";
      if (tMonth !== periodString) return;

      const amt = Number(t.amount) || 0;
      const disc = Number(t.discount) || 0;
      const isTransfer = t.category === "Transfer Masuk" || t.category === "Transfer Keluar" ||
                        t.categoryName === "Transfer Masuk" || t.categoryName === "Transfer Keluar";

      if (t.type === "income") {
        if (!isTransfer) income += amt;
      } else if (t.type === "expense") {
        if (!isTransfer) {
          expense += amt;
          savingsDiscount += disc;
          const cat = t.categoryName || t.category || "Lainnya";
          catSpend[cat] = (catSpend[cat] || 0) + amt;
        }
      }
    });

    const cashflow = income - expense;
    const savingRate = income > 0 ? Math.round((cashflow / income) * 100) : 0;

    return {
      income,
      expense,
      savingsDiscount,
      cashflow,
      savingRate,
      catSpend,
    };
  }, [transactions, periodString]);

  // Bank stats calculations
  const bankStats = useMemo(() => {
    let totalAssets = 0;
    let totalDebt = 0;

    banks.forEach((b) => {
      const bal = Number(b.currentBalance) || 0;
      const isDebt = b.account_type === "paylater" || b.account_type === "credit_card";
      if (isDebt) {
        if (bal < 0) totalDebt += Math.abs(bal);
      } else {
        totalAssets += bal;
      }
    });

    const activeDeposits = deposits
      .filter((d) => d.status === "active")
      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    const activeCryptos = cryptos.reduce((sum, c) => sum + (Number(c.value_idr) || 0), 0);

    // Sisa hutang cicilan (KPR, kendaraan, dll) ikut mengurangi kekayaan bersih
    const inst = summarizeInstallments(installments);
    const cardDebt = totalDebt;
    totalDebt += inst.remainingDebt;

    const netWorth = totalAssets + activeDeposits + activeCryptos - totalDebt;

    return {
      totalAssets: totalAssets + activeDeposits + activeCryptos,
      totalDebt,
      cardDebt,
      installmentDebt: inst.remainingDebt,
      installmentMonthly: inst.monthlyTotal,
      activeDeposits,
      activeCryptos,
      netWorth,
    };
  }, [banks, deposits, cryptos, installments]);

  // Financial health score
  const health = useMemo(() => {
    let score = 50;
    score += Math.min(30, stats.savingRate);

    // Rasio hutang: saldo paylater/CC + cicilan per bulan (bukan sisa KPR total) dibanding pemasukan
    const monthlyDebtLoad = bankStats.cardDebt + bankStats.installmentMonthly;
    const dti = stats.income > 0 ? monthlyDebtLoad / stats.income : (monthlyDebtLoad > 0 ? 1 : 0);
    score -= Math.min(25, Math.round(dti * 50));
    score = Math.max(10, Math.min(100, score));

    let badge = "WARNING";
    let badgeClass = "bg-amber-500/10 text-amber-600 border-amber-500/20";
    let tip = "Waspada! Pengeluaran atau hutang Anda cukup tinggi dibanding pemasukan.";

    if (score >= 80) {
      badge = "EXCELLENT";
      badgeClass = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      tip = "Kondisi keuangan sangat sehat! Pertahankan rasio menabung Anda.";
    } else if (score >= 60) {
      badge = "GOOD";
      badgeClass = "bg-blue-500/10 text-blue-600 border-blue-500/20";
      tip = "Keuangan stabil. Coba kurangi cicilan/paylater untuk skor lebih tinggi.";
    }

    return { score, badge, badgeClass, tip, dti: Math.round(dti * 100) };
  }, [stats.savingRate, stats.income, bankStats.cardDebt, bankStats.installmentMonthly]);

  // Forecast cashflow
  const forecast = useMemo(() => {
    const today = new Date();
    const isCurrentMonth = today.getFullYear().toString() === selectedYear &&
      String(today.getMonth() + 1).padStart(2, "0") === selectedMonth;

    if (!isCurrentMonth) {
      return { val: stats.cashflow, pct: 0, desc: "Berdasarkan data bulan terpilih." };
    }

    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const currentDay = today.getDate();
    const avgDailyExpense = currentDay > 0 ? stats.expense / currentDay : 0;
    const projectedExpense = avgDailyExpense * daysInMonth;
    const projectedCashflow = stats.income - projectedExpense;

    const diffPct = stats.income > 0 ? Math.round((projectedCashflow / stats.income) * 100) : 0;

    return {
      val: projectedCashflow,
      pct: diffPct,
      desc: stats.cashflow < 0
        ? "Waspada! Jika tren belanja berlanjut, pengeluaran Anda akan melebihi pemasukan bulan ini."
        : "Tren pengeluaran stabil. Diproyeksikan neraca kas Anda akan positif hingga akhir bulan.",
    };
  }, [stats.cashflow, stats.income, stats.expense, selectedMonth, selectedYear]);

  // Budgets calculations (logika sama dengan halaman Budget, termasuk budget subkategori)
  const budgetUsage = useMemo(
    () => computeBudgetUsage(budgets, transactions, categories, periodString),
    [budgets, transactions, categories, periodString]
  );
  const budgetStats = {
    totalAllocated: budgetUsage.totalLimit,
    totalSpentInBudgets: budgetUsage.totalSpent,
    usagePct: budgetUsage.usagePct,
  };
  const hasBudget = budgetStats.totalAllocated > 0;

  // Kategori paling kritis (persentase terpakai tertinggi)
  const criticalBudgets = useMemo(() => {
    const pct = (spent: number, limit: number) => (limit > 0 ? spent / limit : 0);
    return [...budgetUsage.groups].sort((a, b) => pct(b.spent, b.limit) - pct(a.spent, a.limit)).slice(0, 4);
  }, [budgetUsage.groups]);

  // Sisa hari di periode terpilih (null bila bulan sudah lewat)
  const daysLeftInPeriod = useMemo(() => {
    const now = new Date();
    const y = parseInt(selectedYear, 10);
    const m = parseInt(selectedMonth, 10);
    const daysInMonth = new Date(y, m, 0).getDate();
    const curKey = now.getFullYear() * 12 + now.getMonth();
    const selKey = y * 12 + (m - 1);
    if (selKey < curKey) return null;
    if (selKey > curKey) return daysInMonth;
    return daysInMonth - now.getDate() + 1;
  }, [selectedMonth, selectedYear]);

  // Top spending categories list (sorted)
  const topCategories = useMemo(() => {
    return Object.keys(stats.catSpend)
      .map((name) => ({ name, amount: stats.catSpend[name] }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  }, [stats.catSpend]);

  // Tagihan aktif, diurutkan dari jatuh tempo terdekat
  const upcomingBills = useMemo(() => {
    const subs = subscriptions
      .filter((s) => s.status === "active" && s.due_date)
      .map((s) => {
        const next = getNextDueDate(s.due_date, s.billing_cycle);
        return {
          id: s.id as string,
          name: s.name as string,
          amount: Number(s.amount),
          billing_cycle: s.billing_cycle as string,
          kind: s.billing_cycle === "yearly" ? "Tahunan" : "Bulanan",
          next,
          daysLeft: next ? daysUntil(next) : 9999,
        };
      });
    const inst = installments
      .map((i) => ({ i, c: computeInstallment(i) }))
      .filter(({ c }) => !c.isPaidOff && c.nextDueDate)
      .map(({ i, c }) => ({
        id: i.id,
        name: i.name,
        amount: c.monthly,
        billing_cycle: "monthly",
        kind: `Cicilan ke-${c.nextPeriod}/${i.tenor_months}`,
        next: c.nextDueDate,
        daysLeft: c.daysUntilNext ?? 9999,
      }));
    return [...subs, ...inst].sort((a, b) => a.daysLeft - b.daysLeft);
  }, [subscriptions, installments]);

  const monthlyBillsTotal = useMemo(
    () =>
      upcomingBills.reduce(
        (sum, s) => sum + (s.billing_cycle === "yearly" ? Number(s.amount) / 12 : Number(s.amount)),
        0
      ),
    [upcomingBills]
  );

  // Insight otomatis untuk Smart Financial Advisor (maks. 3)
  const insights = useMemo(() => {
    const list: { tone: "danger" | "warning" | "info" | "success"; text: string }[] = [];

    const over = budgetUsage.groups.filter((g) => getBudgetStatus(g.spent, g.limit) === "over");
    const warn = budgetUsage.groups.filter((g) => getBudgetStatus(g.spent, g.limit) === "warning");
    if (over.length > 0) {
      const g = over[0];
      list.push({
        tone: "danger",
        text: `${g.rootName} melewati budget ${formatRp(g.spent - g.limit)}${over.length > 1 ? ` (+${over.length - 1} kategori lain over)` : ""}.`,
      });
    }
    if (warn.length > 0) {
      const g = warn[0];
      list.push({
        tone: "warning",
        text: `${g.rootName} sudah terpakai ${Math.round((g.spent / g.limit) * 100)}%, sisa ${formatRp(g.limit - g.spent)}.`,
      });
    }

    const dueSoon = upcomingBills.filter((b) => b.daysLeft <= 7);
    if (dueSoon.length > 0) {
      const b = dueSoon[0];
      list.push({
        tone: b.daysLeft < 0 ? "danger" : "warning",
        text:
          b.daysLeft < 0
            ? `Tagihan ${b.name} (${formatRp(Number(b.amount))}) sudah lewat jatuh tempo ${Math.abs(b.daysLeft)} hari!`
            : `Tagihan ${b.name} (${formatRp(Number(b.amount))}) jatuh tempo ${formatDueLabel(b.daysLeft).toLowerCase()}.`,
      });
    }

    const unbudgetedTotal = budgetUsage.unbudgeted.reduce((s, u) => s + u.spent, 0);
    if (unbudgetedTotal > 0) {
      list.push({
        tone: "info",
        text: `${formatRp(unbudgetedTotal)} pengeluaran belum punya budget (${budgetUsage.unbudgeted
          .slice(0, 2)
          .map((u) => u.rootName)
          .join(", ")}).`,
      });
    }

    // Sisa gaji yang belum dibagi ke pos alokasi
    if (pockets.length > 0) {
      const unallocated = monthSurplus(transactions, periodString).surplus - allocatedForMonth(pockets, periodString);
      if (unallocated > 0) {
        list.push({ tone: "info", text: `${formatRp(unallocated)} sisa bulan ini belum dialokasikan ke pos. Buka menu Pos Alokasi.` });
      }
    }

    if (stats.income === 0) {
      list.push({ tone: "info", text: "Belum ada pemasukan tercatat periode ini. Catat pemasukan untuk menghitung rasio menabung." });
    } else if (stats.cashflow < 0) {
      list.push({ tone: "danger", text: `Pengeluaran melebihi pemasukan sebesar ${formatRp(Math.abs(stats.cashflow))}.` });
    } else if (stats.savingRate >= 20) {
      list.push({ tone: "success", text: `Rasio menabung ${stats.savingRate}% (${formatRp(stats.cashflow)}), di atas target ideal 20%.` });
    } else {
      list.push({
        tone: "warning",
        text: `Rasio menabung ${stats.savingRate}%. Hemat ${formatRp(stats.income * 0.2 - stats.cashflow)} lagi untuk capai 20%.`,
      });
    }

    return list.slice(0, 3);
  }, [budgetUsage, upcomingBills, pockets, transactions, periodString, stats.income, stats.cashflow, stats.savingRate, formatRp]);

  // Recent transactions list
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  // E-commerce monthly total
  const ecomMonthlyTotal = useMemo(() => {
    return ecommerce
      .filter((e) => e.date && e.date.slice(0, 7) === periodString)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [ecommerce, periodString]);

  // Dynamic layout helper properties
  const sisaBudget = budgetStats.totalAllocated > 0
    ? (budgetStats.totalAllocated - budgetStats.totalSpentInBudgets)
    : stats.cashflow;

  const sisaBudgetText = !hasBudget ? "Belum ada budget · cashflow" : sisaBudget < 0 ? "Over budget!" : "Sisa anggaran";

  const budgetUsagePercentage = budgetStats.usagePct;

  // React entrance and gauge fill animation controls
  const [animateCards, setAnimateCards] = useState(false);
  const [renderedSavingRate, setRenderedSavingRate] = useState(0);
  const [renderedHealthScore, setRenderedHealthScore] = useState(0);
  const [renderedBudgetPct, setRenderedBudgetPct] = useState(0);

  useEffect(() => {
    setAnimateCards(true);
    
    // Animate circular gauges and progress bars slightly after mount for fluid presentation
    const srTimer = setTimeout(() => setRenderedSavingRate(stats.savingRate), 150);
    const hsTimer = setTimeout(() => setRenderedHealthScore(health.score), 250);
    const bgTimer = setTimeout(() => setRenderedBudgetPct(budgetUsagePercentage), 350);

    return () => {
      clearTimeout(srTimer);
      clearTimeout(hsTimer);
      clearTimeout(bgTimer);
    };
  }, [stats.savingRate, health.score, budgetUsagePercentage]);

  return (
    <div className="space-y-6 relative">
      <WalletSwitcher />
      {/* Premium Ambient Background Mesh Blobs */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 -left-20 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header (Premium Card Backdrop with soft light gradient) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white backdrop-blur-md p-6 rounded-3xl border border-slate-100/80 shadow-sm animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            Dashboard
            {walletFilter !== "all" && (
              <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-900 text-white">Dompet {walletFilter}</span>
            )}
          </h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1">
            Ringkasan keuangan Anda bulan{" "}
            <span className="text-emerald-600 font-extrabold">
              {new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleString("id-ID", {
                month: "long",
                year: "numeric",
              })}
            </span>
          </p>
        </div>

        {/* Right side: Period selector and NET CASH FLOW */}
        <div className="flex flex-wrap items-center gap-6">
          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Pilih Periode
            </span>
            <div className="flex gap-1.5">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-xl border border-slate-200/80 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white/90 backdrop-blur-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 cursor-pointer shadow-sm transition-all"
              >
                <option value="01">Jan</option>
                <option value="02">Feb</option>
                <option value="03">Mar</option>
                <option value="04">Apr</option>
                <option value="05">Mei</option>
                <option value="06">Jun</option>
                <option value="07">Jul</option>
                <option value="08">Ags</option>
                <option value="09">Sep</option>
                <option value="10">Okt</option>
                <option value="11">Nov</option>
                <option value="12">Des</option>
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="rounded-xl border border-slate-200/80 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white/90 backdrop-blur-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 cursor-pointer shadow-sm transition-all"
              >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
          </div>

          {/* Net Cash Flow summary label */}
          <div className="text-right">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">
              Net Cash Flow
            </p>
            <p className={`text-lg font-black tracking-tight ${stats.cashflow >= 0 ? "text-slate-900" : "text-rose-600"}`}>
              {stats.cashflow >= 0 ? "+" : ""}
              <AnimatedNumber value={stats.cashflow} formatter={formatRp} />
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Row (7 Cards Layout - Premium Gradients & Sleek Glass Effects) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Total Saldo (Sleek Dark Card with subtle glowing gradient border) */}
        <div
          style={{ transitionDelay: "0ms" }}
          className={`bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-2xl p-4 flex flex-col justify-between border border-slate-800 shadow-md min-h-[110px] relative overflow-hidden group transition-all duration-700 ease-out transform hover:-translate-y-0.5 hover:shadow-lg hover:border-slate-700 ${
            animateCards ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div className="absolute right-0 top-0 w-20 h-20 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none transition-transform duration-300 group-hover:scale-125" />
          <div className="flex justify-between items-center">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Saldo</span>
            <div className="p-1 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-base font-black tracking-tight leading-tight truncate text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-200">
              <AnimatedNumber value={bankStats.totalAssets} formatter={formatRp} />
            </h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{banks.length} Akun</p>
          </div>
        </div>

        {/* 2. Pemasukan (Mint Green left indicator glass card) */}
        <div
          style={{ transitionDelay: "40ms" }}
          className={`bg-white backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between border border-slate-100/80 border-l-2 border-l-emerald-400 hover:border-slate-200/85 hover:bg-white transition-all duration-700 ease-out transform shadow-sm hover:shadow-md hover:-translate-y-0.5 min-h-[110px] relative overflow-hidden group ${
            animateCards ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Pemasukan</span>
            <div className="p-1 bg-emerald-500/10 rounded-lg text-emerald-600 border border-emerald-500/20">
              <Plus className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-base font-black tracking-tight leading-tight text-slate-900 truncate">
              <AnimatedNumber value={stats.income} formatter={formatRp} />
            </h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Gaji & Lainnya</p>
          </div>
        </div>

        {/* 3. Pengeluaran (Rose Red left indicator glass card) */}
        <div
          style={{ transitionDelay: "80ms" }}
          className={`bg-white backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between border border-slate-100/80 border-l-2 border-l-rose-400 hover:border-slate-200/85 hover:bg-white transition-all duration-700 ease-out transform shadow-sm hover:shadow-md hover:-translate-y-0.5 min-h-[110px] relative overflow-hidden group ${
            animateCards ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Pengeluaran</span>
            <div className="p-1 bg-rose-500/10 rounded-lg text-rose-600 border border-rose-500/20">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-base font-black tracking-tight leading-tight text-rose-600 truncate">
              <AnimatedNumber value={stats.expense} formatter={formatRp} />
            </h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Bulan Ini</p>
          </div>
        </div>

        {/* 4. Sisa Budget (Ocean Blue left indicator glass card) */}
        <div
          style={{ transitionDelay: "120ms" }}
          className={`bg-white backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between border border-slate-100/80 border-l-2 ${sisaBudget >= 0 ? "border-l-cyan-400" : "border-l-rose-400"} hover:border-slate-200/85 hover:bg-white transition-all duration-700 ease-out transform shadow-sm hover:shadow-md hover:-translate-y-0.5 min-h-[110px] relative overflow-hidden group ${
            animateCards ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Sisa Budget</span>
            <div className={`p-1 ${sisaBudget >= 0 ? "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"} rounded-lg border`}>
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className={`text-base font-black tracking-tight leading-tight truncate ${sisaBudget >= 0 ? "text-slate-900" : "text-rose-600"}`}>
              {sisaBudget >= 0 ? "+" : ""}
              <AnimatedNumber value={sisaBudget} formatter={formatRp} />
            </h3>
            <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${sisaBudget >= 0 ? "text-slate-400" : "text-rose-500"}`}>
              {sisaBudgetText}
            </p>
          </div>
        </div>

        {/* 5. Total Hemat (Teal left indicator glass card) */}
        <div
          style={{ transitionDelay: "160ms" }}
          className={`bg-white backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between border border-slate-100/80 border-l-2 border-l-teal-400 hover:border-slate-200/85 hover:bg-white transition-all duration-700 ease-out transform shadow-sm hover:shadow-md hover:-translate-y-0.5 min-h-[110px] relative overflow-hidden group ${
            animateCards ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Hemat</span>
            <div className="p-1 bg-teal-500/10 rounded-lg text-teal-600 border border-teal-500/20">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-base font-black tracking-tight leading-tight text-slate-900 truncate">
              <AnimatedNumber value={stats.savingsDiscount} formatter={formatRp} />
            </h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Diskon Belanja</p>
          </div>
        </div>

        {/* 6. Total Hutang (Amber left indicator glass card) */}
        <div
          style={{ transitionDelay: "200ms" }}
          className={`bg-white backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between border border-slate-100/80 border-l-2 border-l-amber-400 hover:border-slate-200/85 hover:bg-white transition-all duration-700 ease-out transform shadow-sm hover:shadow-md hover:-translate-y-0.5 min-h-[110px] relative overflow-hidden group ${
            animateCards ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Hutang</span>
            <div className="p-1 bg-amber-500/10 rounded-lg text-amber-600 border border-amber-500/20">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-base font-black tracking-tight leading-tight text-amber-600 truncate">
              <AnimatedNumber value={bankStats.totalDebt} formatter={formatRp} />
            </h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Paylater, CC & Cicilan</p>
          </div>
        </div>

        {/* 7. Saving Rate Card (Emerald-Teal deep modern progress card) */}
        <div
          style={{ transitionDelay: "240ms" }}
          className={`bg-white backdrop-blur-md rounded-2xl p-4 flex items-center justify-between border border-slate-100/80 border-l-2 border-l-emerald-400 hover:border-slate-200/85 hover:bg-white transition-all duration-700 ease-out transform shadow-sm hover:shadow-md hover:-translate-y-0.5 min-h-[110px] relative overflow-hidden group ${
            animateCards ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div className="relative w-12 h-12 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="3.5"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="url(#savingRateGradDashboard)"
                strokeWidth="3.5"
                className="transition-all duration-1000 ease-out"
                strokeDasharray={`${Math.max(0, Math.min(100, renderedSavingRate))}, 100`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="savingRateGradDashboard" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4fbe72" />
                  <stop offset="100%" stopColor="#248a46" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] font-black text-slate-700">
                <AnimatedNumber value={stats.savingRate} formatter={(val) => `${Math.round(val)}%`} />
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Saving Rate</span>
            <h3 className="text-base font-black text-slate-800 leading-none mt-1">
              <AnimatedNumber value={stats.savingRate} formatter={(val) => `${Math.round(val)}%`} />
            </h3>
            <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider mt-1 leading-normal">% tersisa</p>
          </div>
        </div>
      </div>

      {/* Financial Health, Forecast & Top Categories Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Health (Sleek Clean Card with emerald top stripe) */}
        <div
          style={{ transitionDelay: "280ms" }}
          className={`bg-white backdrop-blur-md rounded-2xl p-6 border border-slate-100/80 border-t-2 border-t-emerald-400 shadow-sm flex flex-col justify-between min-h-[220px] transition-all duration-700 ease-out transform hover:shadow-md hover:border-slate-200/85 hover:-translate-y-0.5 ${
            animateCards ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Financial Health
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border ${health.badgeClass}`}>
                {health.badge}
              </span>
            </div>

            <div className="flex items-center gap-6 mt-3">
              {/* Score circle */}
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="url(#healthGradDashboard)"
                    strokeWidth="3.5"
                    className="transition-all duration-1000 ease-out"
                    strokeDasharray={`${renderedHealthScore}, 100`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="healthGradDashboard" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4fbe72" />
                      <stop offset="100%" stopColor="#248a46" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-black text-slate-800 leading-none">
                    <AnimatedNumber value={health.score} formatter={(val) => `${Math.round(val)}`} />
                  </span>
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Score</span>
                </div>
              </div>

              {/* Tips & Details */}
              <div className="space-y-3 flex-1">
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  {health.tip}
                </p>

                {/* Sub KPI Small Cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50/50 px-2 py-1.5 rounded-xl border border-slate-100/50">
                    <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">Debt Ratio</p>
                    <p className="text-[10px] font-black text-slate-700 mt-0.5">{health.dti}%</p>
                  </div>
                  <div className="bg-slate-50/50 px-2 py-1.5 rounded-xl border border-slate-100/50">
                    <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">Savings</p>
                    <p className={`text-[10px] font-black mt-0.5 ${stats.savingRate >= 20 ? "text-slate-900" : "text-rose-500"}`}>
                      {stats.savingRate >= 20 ? "Ideal" : "Low"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ramalan Arus Kas / Forecast (Premium Obsidian card) */}
        <div
          style={{ transitionDelay: "320ms" }}
          className={`bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-2xl p-6 border border-slate-800 shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[220px] transition-all duration-700 ease-out transform hover:shadow-xl hover:border-slate-700 hover:-translate-y-0.5 ${
            animateCards ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Zap className="w-20 h-20 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Ramalan Arus Kas
            </h3>
            <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              Monthly Cashflow Forecast
            </p>
            <div className="flex items-center gap-2.5 mt-4">
              <h2 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-200">
                <AnimatedNumber value={forecast.val} formatter={formatRp} />
              </h2>
              <span className={`text-[8px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-widest`}>
                {forecast.val >= 0 ? "Surplus" : "Defisit"}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-semibold mt-3">
              {forecast.desc}
            </p>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.max(10, Math.min(100, renderedSavingRate))}%` }}
            />
          </div>
        </div>

        {/* Alokasi Terbesar (Sleek Clean Card with cyan top stripe) */}
        <div
          style={{ transitionDelay: "360ms" }}
          className={`bg-white backdrop-blur-md rounded-2xl p-6 border border-slate-100/80 border-t-2 border-t-cyan-400 shadow-sm flex flex-col justify-between min-h-[220px] transition-all duration-700 ease-out transform hover:shadow-md hover:border-slate-200/85 hover:-translate-y-0.5 ${
            animateCards ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100/50">
              Alokasi Terbesar
            </h3>

            <div className="space-y-4">
              {topCategories.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6 italic">
                  Belum ada data pengeluaran dicatat.
                </p>
              ) : (
                topCategories.map((cat, i) => {
                  const colors = [
                    "bg-gradient-to-r from-emerald-500 to-emerald-400",
                    "bg-gradient-to-r from-cyan-500 to-cyan-400",
                    "bg-gradient-to-r from-sky-500 to-sky-400"
                  ];
                  const pct = stats.expense > 0 ? Math.round((cat.amount / stats.expense) * 100) : 0;
                  return (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span className="truncate max-w-[150px]">{cat.name}</span>
                        <span>
                          {formatRp(cat.amount)} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors[i] || "bg-slate-400"} rounded-full transition-all duration-1000 ease-out`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Penggunaan Budget: total + kategori paling kritis */}
      <div
        style={{ transitionDelay: "400ms" }}
        className={`bg-white rounded-2xl p-5 border border-slate-100/80 shadow-sm transition-all duration-700 ease-out transform hover:border-slate-200/80 hover:shadow-md ${
          animateCards ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <div className="flex justify-between items-start gap-3">
          <div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Penggunaan Budget</span>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 capitalize">{formatMonthLabel(periodString)}</p>
          </div>
          <button
            onClick={() => onSwitchTab("budget")}
            className="text-[10px] text-emerald-600 font-extrabold hover:underline cursor-pointer shrink-0"
          >
            {hasBudget ? "Lihat semua →" : "Atur budget →"}
          </button>
        </div>

        {!hasBudget ? (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
            <div>
              <p className="text-xs font-bold text-slate-700">Belum ada budget untuk bulan ini</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Pasang limit per kategori supaya pengeluaran bisa dipantau di sini.
              </p>
            </div>
            <button
              onClick={() => onSwitchTab("budget")}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold shadow-sm shrink-0"
            >
              Atur Budget
            </button>
          </div>
        ) : (
          <>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-lg font-black text-slate-900 tabular-nums">
                <AnimatedNumber value={budgetStats.totalSpentInBudgets} formatter={formatRp} />
                <span className="text-xs font-bold text-slate-400"> / {formatRp(budgetStats.totalAllocated)}</span>
              </p>
              <span className={`text-sm font-black ${budgetUsagePercentage >= 90 ? "text-rose-500" : "text-slate-900"}`}>
                <AnimatedNumber value={budgetUsagePercentage} formatter={(val) => `${Math.round(val)}%`} />
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                  budgetUsagePercentage >= 90 ? "bg-rose-500" : budgetUsagePercentage >= 75 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, renderedBudgetPct)}%` }}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {criticalBudgets.map((g) => {
                const pct = g.limit > 0 ? (g.spent / g.limit) * 100 : 0;
                const status = getBudgetStatus(g.spent, g.limit);
                const color = getCategoryColor(g.rootName);
                const bar = status === "over" ? "bg-rose-500" : status === "warning" ? "bg-amber-500" : "bg-emerald-500";
                const badge =
                  status === "over"
                    ? "text-rose-600 bg-rose-50"
                    : status === "warning"
                    ? "text-amber-700 bg-amber-50"
                    : "text-emerald-700 bg-emerald-50";
                return (
                  <div key={g.rootId} className="flex items-center gap-2.5">
                    <span className={`w-7 h-7 rounded-lg ${color.chip} ring-1 inline-flex items-center justify-center shrink-0`}>
                      <CategoryIcon name={g.rootName} className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700 truncate">{g.rootName}</span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${badge}`}>
                          {Math.round(pct)}% · {BUDGET_STATUS_LABEL[status]}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div className={`h-full ${bar} rounded-full`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Smart Financial Advisor: beberapa insight otomatis dari data */}
      <div
        style={{ transitionDelay: "440ms" }}
        className={`bg-emerald-50/40 border border-emerald-100/60 rounded-2xl p-5 shadow-sm flex items-start gap-4 transition-all duration-700 ease-out transform hover:shadow-md ${
          animateCards ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-600/10 shrink-0">
          <Zap className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Smart Financial Advisor</h4>
            <span className="text-[8px] bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {insights.length} insight
            </span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {insights.map((ins, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-700 font-semibold leading-relaxed">
                <span
                  className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                    ins.tone === "danger"
                      ? "bg-rose-500"
                      : ins.tone === "warning"
                      ? "bg-amber-500"
                      : ins.tone === "success"
                      ? "bg-emerald-500"
                      : "bg-sky-500"
                  }`}
                />
                <span>{ins.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom KPI & Tracking Section (Without Transaksi Terakhir, Perfectly Balanced) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Asset & Portfolio Summary */}
        <div className="space-y-4">
          {/* Kekayaan Bersih */}
          <div
            style={{ transitionDelay: "480ms" }}
            className={`bg-white backdrop-blur-md rounded-2xl p-5 border border-slate-100/80 shadow-sm flex flex-col justify-between min-h-[125px] relative overflow-hidden group transition-all duration-700 ease-out transform hover:shadow-md hover:border-slate-200/80 hover:-translate-y-0.5 ${
              animateCards ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-emerald-50/50 to-transparent rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Kekayaan Bersih
              </span>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-2">
                <AnimatedNumber value={bankStats.netWorth} formatter={formatRp} />
              </h3>
              <p className="text-[10px] text-slate-400 mt-2.5 leading-relaxed font-semibold">
                Formulasi: Saldo + Deposito ({formatRp(bankStats.activeDeposits)}) + Kripto ({formatRp(bankStats.activeCryptos)}) &minus; Paylater/CC ({formatRp(bankStats.cardDebt)}) &minus; Sisa Cicilan ({formatRp(bankStats.installmentDebt)})
              </p>
            </div>
          </div>

          {/* Deposito & Kripto in a 2-column grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Deposito */}
            <div
              onClick={() => onSwitchTab("portfolio")}
              style={{ transitionDelay: "520ms" }}
              className={`bg-white backdrop-blur-md rounded-2xl p-4 border border-slate-100/80 shadow-sm flex items-center justify-between hover:border-emerald-200/80 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-700 ease-out transform cursor-pointer group ${
                animateCards ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">
                    Deposito
                  </span>
                  <span className="text-xs font-black text-slate-700 mt-0.5 block">
                    <AnimatedNumber value={bankStats.activeDeposits} formatter={formatRp} />
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
            </div>

            {/* Kripto */}
            <div
              onClick={() => onSwitchTab("portfolio")}
              style={{ transitionDelay: "560ms" }}
              className={`bg-white backdrop-blur-md rounded-2xl p-4 border border-slate-100/80 shadow-sm flex items-center justify-between hover:border-amber-200/80 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-700 ease-out transform cursor-pointer group ${
                animateCards ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">
                    Kripto
                  </span>
                  <span className="text-xs font-black text-slate-700 mt-0.5 block">
                    <AnimatedNumber value={bankStats.activeCryptos} formatter={formatRp} />
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
            </div>
          </div>
        </div>

        {/* Right Column: E-commerce, Budget & Subscriptions */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* E-Commerce */}
            <div
              onClick={() => onSwitchTab("ecommerce")}
              style={{ transitionDelay: "600ms" }}
              className={`bg-white backdrop-blur-md rounded-2xl p-4 border border-slate-100/80 shadow-sm flex items-center justify-between hover:border-orange-200/80 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-700 ease-out transform cursor-pointer group ${
                animateCards ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 text-orange-600 rounded-xl">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">
                    E-Commerce
                  </span>
                  <span className="text-xs font-black text-slate-700 mt-0.5 block">
                    <AnimatedNumber value={ecomMonthlyTotal} formatter={formatRp} />
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-colors" />
            </div>

            {/* Anggaran Harian: sisa budget dibagi sisa hari */}
            <div
              onClick={() => onSwitchTab("budget")}
              style={{ transitionDelay: "640ms" }}
              className={`bg-white rounded-2xl p-4 border border-slate-100/80 shadow-sm flex items-center justify-between cursor-pointer group min-h-[76px] transition-all duration-700 ease-out transform hover:shadow-md hover:border-emerald-200/80 hover:-translate-y-0.5 ${
                animateCards ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Anggaran Harian</span>
                  {!hasBudget ? (
                    <span className="text-xs font-black text-emerald-600 mt-0.5 block">Atur budget</span>
                  ) : daysLeftInPeriod === null ? (
                    <span className="text-xs font-black text-slate-700 mt-0.5 block">Periode selesai</span>
                  ) : (
                    <>
                      <span className="text-xs font-black text-slate-700 mt-0.5 block truncate">
                        {formatRp(Math.max(0, Math.floor(sisaBudget / daysLeftInPeriod)))}
                        <span className="text-[9px] font-bold text-slate-400"> /hari</span>
                      </span>
                      <span className="text-[9px] text-slate-400 font-semibold">{daysLeftInPeriod} hari tersisa</span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors shrink-0" />
            </div>
          </div>

          {/* Tagihan: jatuh tempo berikutnya + hitung mundur */}
          <div
            style={{ transitionDelay: "680ms" }}
            className={`bg-white rounded-2xl p-5 border border-slate-100/80 shadow-sm flex flex-col min-h-[125px] transition-all duration-700 ease-out transform hover:shadow-md hover:border-slate-200/80 ${
              animateCards ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            <div className="flex justify-between items-center border-b border-slate-100/70 pb-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-500" /> Tagihan Rutin
              </span>
              <div className="flex items-center gap-3">
                {upcomingBills.length > 0 && (
                  <span className="text-[9px] font-bold text-slate-500">
                    ±{formatRp(Math.round(monthlyBillsTotal))}/bln
                  </span>
                )}
                <button
                  onClick={() => onSwitchTab("subscription")}
                  className="text-[9px] text-emerald-600 font-extrabold hover:underline cursor-pointer"
                >
                  Detail &rarr;
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center mt-2.5">
              {upcomingBills.length === 0 ? (
                <p className="text-center text-xs text-slate-400 font-semibold py-2">Tidak ada tagihan aktif.</p>
              ) : (
                <div className="space-y-2.5">
                  {upcomingBills.slice(0, 3).map((bill) => {
                    const urgent = bill.daysLeft <= 3;
                    const soon = bill.daysLeft <= 7;
                    return (
                      <div key={bill.id} className="flex justify-between items-center gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center shrink-0 leading-none ${
                              urgent ? "bg-rose-50 text-rose-600" : soon ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-600"
                            }`}
                          >
                            <span className="text-[11px] font-black">{bill.next?.getDate()}</span>
                            <span className="text-[7px] font-bold uppercase">
                              {bill.next?.toLocaleString("id-ID", { month: "short" })}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-700 truncate">{bill.name}</p>
                            <p
                              className={`text-[9px] font-bold ${
                                urgent ? "text-rose-500" : soon ? "text-amber-600" : "text-slate-400"
                              }`}
                            >
                              {bill.daysLeft < 0 ? `Lewat ${Math.abs(bill.daysLeft)} hari` : formatDueLabel(bill.daysLeft)} · {bill.kind}
                            </p>
                          </div>
                        </div>
                        <span className="font-black text-slate-800 shrink-0 tabular-nums">{formatRp(Number(bill.amount))}</span>
                      </div>
                    );
                  })}
                  {upcomingBills.length > 3 && (
                    <p className="text-[9px] text-slate-400 font-semibold text-right">
                      +{upcomingBills.length - 3} tagihan lainnya
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
