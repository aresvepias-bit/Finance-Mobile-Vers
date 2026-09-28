// Proyeksi 12 bulan dari anggaran.
//
// - Pengeluaran rencana per bulan = total budget bulan itu. Bulan tanpa budget memakai
//   budget terakhir sebelumnya (atau budget pertama bila belum ada sebelumnya).
// - Komitmen yang kategorinya TIDAK tercakup budget (cicilan aktif, langganan) ditambahkan,
//   supaya tidak ada yang terlewat tapi juga tidak dihitung dobel.
// - Bulan yang sudah lewat memakai realisasi (transaksi tercatat).
// - Pemasukan rencana = gaji/bulan + bonus di bulan bonus.

import { SYSTEM_CATEGORY_NAMES, type CategoryRecord } from "./categories";
import { dueDateForPeriod, type InstallmentRecord } from "./installments";
import type { BudgetRecord } from "./budgets";

export interface IncomePlan {
  salary: number;
  bonus: number;
  bonusMonth: number; // 1-12, 0 = tanpa bonus
}

interface TransactionLike {
  type: string;
  date?: string;
  amount: number | string;
  categoryName?: string;
  category?: string;
}

interface SubscriptionLike {
  name: string;
  amount: number | string;
  billing_cycle: string;
  due_date: string;
  status: string;
  categoryId: string;
}

export interface ProjectionMonth {
  month: string; // YYYY-MM
  source: "actual" | "plan";
  budget: number;
  extras: number;
  expense: number;
  income: number;
  savings: number;
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + n, 1));
}

export function computeProjection(args: {
  startMonth: string;
  budgets: BudgetRecord[];
  categories: CategoryRecord[];
  transactions: TransactionLike[];
  installments: InstallmentRecord[];
  subscriptions: SubscriptionLike[];
  incomePlan: IncomePlan;
  today?: Date;
}) {
  const { startMonth, budgets, categories, transactions, installments, subscriptions, incomePlan } = args;
  const currentMonth = monthKey(args.today ?? new Date());
  const catById = new Map(categories.map((c) => [c.id, c]));
  const rootOf = (id: string) => {
    const c = catById.get(id);
    return c?.parentId || c?.id || id;
  };

  const budgetMonths = [...new Set(budgets.map((b) => b.month))].sort();
  const templateMonth = (m: string) => {
    if (budgetMonths.length === 0) return null;
    const before = budgetMonths.filter((bm) => bm <= m);
    return before.length ? before[before.length - 1] : budgetMonths[0];
  };

  // Realisasi per bulan (transfer antar rekening tidak dihitung)
  const actual: Record<string, { income: number; expense: number }> = {};
  for (const t of transactions) {
    const m = t.date?.slice(0, 7);
    if (!m || SYSTEM_CATEGORY_NAMES.includes(t.categoryName || t.category || "")) continue;
    actual[m] ??= { income: 0, expense: 0 };
    if (t.type === "income") actual[m].income += Number(t.amount) || 0;
    else if (t.type === "expense") actual[m].expense += Number(t.amount) || 0;
  }

  const byRoot: Record<string, number> = {};
  const extrasByName: Record<string, { name: string; kind: string; total: number }> = {};
  const months: ProjectionMonth[] = [];

  for (let i = 0; i < 12; i++) {
    const m = addMonths(startMonth, i);
    const tpl = templateMonth(m);
    const lines = tpl ? budgets.filter((b) => b.month === tpl) : [];
    const budget = lines.reduce((s, b) => s + (Number(b.limit) || 0), 0);
    const coveredRoots = new Set(lines.map((b) => rootOf(b.categoryId)));
    for (const b of lines) {
      const r = rootOf(b.categoryId);
      byRoot[r] = (byRoot[r] || 0) + (Number(b.limit) || 0);
    }

    // Komitmen di luar budget
    let extras = 0;
    const addExtra = (name: string, kind: string, amount: number) => {
      extras += amount;
      extrasByName[name + kind] ??= { name, kind, total: 0 };
      extrasByName[name + kind].total += amount;
    };
    for (const inst of installments) {
      if (coveredRoots.has(rootOf(inst.categoryId))) continue;
      const lastPaid = inst.paid_count;
      for (let p = lastPaid + 1; p <= inst.tenor_months; p++) {
        const due = monthKey(dueDateForPeriod(inst.start_date, p));
        if (due === m) addExtra(inst.name, "Cicilan", Number(inst.monthly_amount) || 0);
        if (due > m) break;
      }
    }
    for (const s of subscriptions) {
      if (s.status !== "active" || coveredRoots.has(rootOf(s.categoryId))) continue;
      const amt = Number(s.amount) || 0;
      if (s.billing_cycle === "yearly") {
        if (s.due_date?.slice(5, 7) === m.slice(5, 7)) addExtra(s.name, "Langganan tahunan", amt);
      } else {
        addExtra(s.name, "Langganan", amt);
      }
    }

    const monthNum = Number(m.slice(5, 7));
    const plannedIncome = (incomePlan.salary || 0) + (incomePlan.bonusMonth === monthNum ? incomePlan.bonus || 0 : 0);
    const isPast = m < currentMonth;
    const expense = isPast ? actual[m]?.expense ?? 0 : budget + extras;
    const income = isPast ? actual[m]?.income ?? 0 : plannedIncome;

    months.push({ month: m, source: isPast ? "actual" : "plan", budget, extras, expense, income, savings: income - expense });
  }

  const totalExpense = months.reduce((s, x) => s + x.expense, 0);
  const totalIncome = months.reduce((s, x) => s + x.income, 0);
  const categoriesAnnual = Object.entries(byRoot)
    .map(([rootId, annual]) => ({ rootId, rootName: catById.get(rootId)?.name || "Lainnya", annual, monthly: annual / 12 }))
    .sort((a, b) => b.annual - a.annual);

  return {
    months,
    totalExpense,
    totalIncome,
    totalSavings: totalIncome - totalExpense,
    savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0,
    categoriesAnnual,
    extras: Object.values(extrasByName).sort((a, b) => b.total - a.total),
    hasBudget: budgetMonths.length > 0,
  };
}
