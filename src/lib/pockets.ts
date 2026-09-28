// Pos alokasi (amplop virtual). Uang tetap di rekening; pos hanya pembagian.
import { SYSTEM_CATEGORY_NAMES } from "./categories";

export interface PocketEntryRecord {
  id: string;
  type: "allocate" | "deposit" | "withdraw";
  amount: number; // bertanda
  month: string | null;
  date: string;
  note: string;
}

export interface PocketRecord {
  id: string;
  name: string;
  percent: number;
  targetAmount: number | null;
  note: string;
  balance: number;
  entries: PocketEntryRecord[]; // terbaru dulu
}

interface TransactionLike {
  type: string;
  date?: string;
  amount: number | string;
  categoryName?: string;
  category?: string;
}

/** Sisa bulan = pemasukan − pengeluaran (transfer antar rekening tidak dihitung). */
export function monthSurplus(transactions: TransactionLike[], month: string) {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.date?.slice(0, 7) !== month) continue;
    const cat = t.categoryName || t.category || "";
    if (SYSTEM_CATEGORY_NAMES.includes(cat)) continue;
    const amt = Number(t.amount) || 0;
    if (t.type === "income") income += amt;
    else if (t.type === "expense") expense += amt;
  }
  return { income, expense, surplus: income - expense };
}

/** Total yang sudah dialokasikan dari sisa bulan tertentu. */
export function allocatedForMonth(pockets: PocketRecord[], month: string) {
  let total = 0;
  for (const p of pockets) {
    for (const e of p.entries) if (e.type === "allocate" && e.month === month) total += e.amount;
  }
  return total;
}

/** Usulan pembagian `amount` sesuai % tiap pos (dibulatkan ke bawah per ribuan). */
export function suggestAllocation(pockets: PocketRecord[], amount: number) {
  const result: Record<string, number> = {};
  for (const p of pockets) {
    result[p.id] = amount > 0 ? Math.floor((amount * p.percent) / 100 / 1000) * 1000 : 0;
  }
  return result;
}
