// Perhitungan cicilan: sisa hutang = cicilan/bulan × sisa kali bayar.
// Jadwal: cicilan ke-n jatuh tempo (n-1) bulan setelah tanggal cicilan pertama.

export interface InstallmentPaymentRecord {
  id: string;
  period: number;
  date: string; // YYYY-MM-DD
  amount: number;
  transactionId: string;
}

export interface InstallmentRecord {
  id: string;
  name: string;
  lender: string;
  monthly_amount: number;
  tenor_months: number;
  start_date: string; // YYYY-MM-DD, jatuh tempo cicilan pertama
  initial_paid_count: number;
  paid_count: number; // initial + pembayaran tercatat
  categoryId: string;
  category: string;
  bank_id: string;
  bank_name: string;
  note: string;
  payments: InstallmentPaymentRecord[];
}

function parseDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Jatuh tempo cicilan ke-`period` (1-based), tanggal dibatasi akhir bulan. */
export function dueDateForPeriod(startDate: string, period: number) {
  const start = parseDate(startDate);
  const monthIndex = start.getMonth() + (period - 1);
  const lastDay = new Date(start.getFullYear(), monthIndex + 1, 0).getDate();
  return new Date(start.getFullYear(), monthIndex, Math.min(start.getDate(), lastDay));
}

export function computeInstallment(inst: InstallmentRecord, today = new Date()) {
  const base = startOfDay(today);
  const tenor = inst.tenor_months;
  const monthly = Number(inst.monthly_amount) || 0;
  const paidCount = Math.min(tenor, inst.paid_count);
  const remainingCount = Math.max(0, tenor - paidCount);
  const isPaidOff = remainingCount === 0;

  // Berapa cicilan yang seharusnya sudah jatuh tempo sampai hari ini
  let dueByToday = 0;
  for (let n = 1; n <= tenor; n++) {
    if (dueDateForPeriod(inst.start_date, n) <= base) dueByToday = n;
    else break;
  }

  const nextPeriod = isPaidOff ? null : paidCount + 1;
  const nextDueDate = nextPeriod ? dueDateForPeriod(inst.start_date, nextPeriod) : null;
  const daysUntilNext = nextDueDate
    ? Math.round((nextDueDate.getTime() - base.getTime()) / (24 * 60 * 60 * 1000))
    : null;

  return {
    monthly,
    paidCount,
    remainingCount,
    isPaidOff,
    totalObligation: monthly * tenor,
    paidAmount: monthly * paidCount,
    remainingDebt: monthly * remainingCount,
    progressPct: tenor > 0 ? Math.round((paidCount / tenor) * 100) : 0,
    nextPeriod,
    nextDueDate,
    daysUntilNext,
    overdueCount: Math.max(0, dueByToday - paidCount),
    endDate: dueDateForPeriod(inst.start_date, tenor),
  };
}

/** Ringkasan semua cicilan aktif (untuk Dashboard & header halaman Cicilan). */
export function summarizeInstallments(list: InstallmentRecord[], today = new Date()) {
  let remainingDebt = 0;
  let monthlyTotal = 0;
  let activeCount = 0;
  let overdueCount = 0;
  for (const inst of list) {
    const c = computeInstallment(inst, today);
    if (c.isPaidOff) continue;
    activeCount++;
    remainingDebt += c.remainingDebt;
    monthlyTotal += c.monthly;
    overdueCount += c.overdueCount;
  }
  return { remainingDebt, monthlyTotal, activeCount, overdueCount };
}

export function formatShortDate(d: Date) {
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
