// Perhitungan realisasi budget per bulan (dipakai halaman Budget & Dashboard).
//
// Budget bisa dipasang di kategori utama atau subkategori. Pengeluaran dibagi
// tanpa hitung ganda:
// - budget subkategori  -> transaksi dengan subkategori tsb
// - budget kategori utama -> sisa transaksi di kategori itu yang subkategorinya
//   tidak punya budget sendiri ("Umum / lainnya")

import { isSystemCategory, type CategoryRecord } from "./categories";

export interface BudgetRecord {
  id: string;
  month: string;
  categoryId: string;
  limit: number;
  note?: string | null;
}

interface TransactionLike {
  type: string;
  date?: string;
  amount: number | string;
  categoryId?: string | null;
  subCategoryId?: string | null;
}

export interface BudgetLine extends BudgetRecord {
  name: string;
  isRootLine: boolean;
  spent: number;
}

export interface BudgetGroup {
  rootId: string;
  rootName: string;
  lines: BudgetLine[];
  limit: number;
  spent: number;
}

export function computeBudgetUsage(
  budgets: BudgetRecord[],
  transactions: TransactionLike[],
  categories: CategoryRecord[],
  month: string
) {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const monthBudgets = budgets.filter((b) => b.month === month && catById.has(b.categoryId));
  const subBudgetIds = new Set(monthBudgets.filter((b) => catById.get(b.categoryId)?.parentId).map((b) => b.categoryId));

  const spentBySub: Record<string, number> = {};
  const spentByRootUnbudgeted: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type !== "expense" || !t.categoryId || t.date?.slice(0, 7) !== month) continue;
    const amt = Number(t.amount) || 0;
    if (t.subCategoryId) spentBySub[t.subCategoryId] = (spentBySub[t.subCategoryId] || 0) + amt;
    if (!t.subCategoryId || !subBudgetIds.has(t.subCategoryId)) {
      spentByRootUnbudgeted[t.categoryId] = (spentByRootUnbudgeted[t.categoryId] || 0) + amt;
    }
  }

  const groups = new Map<string, BudgetGroup>();
  for (const b of monthBudgets) {
    const cat = catById.get(b.categoryId)!;
    const root = cat.parentId ? catById.get(cat.parentId) : cat;
    if (!root) continue;

    const isRootLine = !cat.parentId;
    const line: BudgetLine = {
      ...b,
      limit: Number(b.limit) || 0,
      name: cat.name,
      isRootLine,
      spent: isRootLine ? spentByRootUnbudgeted[root.id] || 0 : spentBySub[cat.id] || 0,
    };

    const group = groups.get(root.id) ?? { rootId: root.id, rootName: root.name, lines: [], limit: 0, spent: 0 };
    group.lines.push(line);
    group.limit += line.limit;
    group.spent += line.spent;
    groups.set(root.id, group);
  }

  // Pengeluaran yang tidak tercakup budget mana pun (per kategori utama)
  const rootLineIds = new Set(
    monthBudgets.filter((b) => !catById.get(b.categoryId)?.parentId).map((b) => b.categoryId)
  );
  const unbudgetedByRoot: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type !== "expense" || !t.categoryId || t.date?.slice(0, 7) !== month) continue;
    const root = catById.get(t.categoryId);
    if (!root || isSystemCategory(root)) continue;
    const coveredBySub = !!t.subCategoryId && subBudgetIds.has(t.subCategoryId);
    if (coveredBySub || rootLineIds.has(t.categoryId)) continue;
    unbudgetedByRoot[t.categoryId] = (unbudgetedByRoot[t.categoryId] || 0) + (Number(t.amount) || 0);
  }
  const unbudgeted = Object.entries(unbudgetedByRoot)
    .map(([rootId, spent]) => ({ rootId, rootName: catById.get(rootId)!.name, spent }))
    .sort((a, b) => b.spent - a.spent);

  const sortedGroups = [...groups.values()].sort((a, b) => a.rootName.localeCompare(b.rootName, "id"));
  for (const g of sortedGroups) {
    // Baris kategori utama ("Umum") di atas, lalu subkategori urut abjad
    g.lines.sort((a, b) => Number(b.isRootLine) - Number(a.isRootLine) || a.name.localeCompare(b.name, "id"));
  }

  const totalLimit = sortedGroups.reduce((s, g) => s + g.limit, 0);
  const totalSpent = sortedGroups.reduce((s, g) => s + g.spent, 0);

  return {
    groups: sortedGroups,
    unbudgeted,
    totalLimit,
    totalSpent,
    usagePct: totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0,
  };
}

export type BudgetStatus = "safe" | "warning" | "over";

/** Status budget: over (>100%), waspada (>=75%), aman */
export function getBudgetStatus(spent: number, limit: number): BudgetStatus {
  if (limit <= 0) return spent > 0 ? "over" : "safe";
  const pct = (spent / limit) * 100;
  if (pct > 100) return "over";
  if (pct >= 75) return "warning";
  return "safe";
}

export const BUDGET_STATUS_LABEL: Record<BudgetStatus, string> = {
  safe: "Aman",
  warning: "Waspada",
  over: "Over",
};

/** "2026-09" -> "September 2026" */
export function formatMonthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleString("id-ID", { month: "long", year: "numeric" });
}
