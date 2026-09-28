// Jatuh tempo berikutnya untuk tagihan berulang (langganan, cicilan).
// Tanggal jatuh tempo yang tersimpan dipakai sebagai patokan tanggal/bulan tagihan,
// lalu dicari tanggal terdekat mulai hari ini.

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Tanggal `day` di bulan tsb, dibatasi hari terakhir (misal tgl 31 -> 30/28). */
function clampDay(year: number, month: number, day: number) {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last));
}

export function getNextDueDate(dueDate: string, cycle: string, today = new Date()) {
  const [y, m, d] = dueDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  const base = startOfDay(today);

  if (cycle === "yearly") {
    let next = clampDay(base.getFullYear(), m - 1, d);
    if (next < base) next = clampDay(base.getFullYear() + 1, m - 1, d);
    return next;
  }

  // Bulanan (default)
  let next = clampDay(base.getFullYear(), base.getMonth(), d);
  if (next < base) next = clampDay(base.getFullYear(), base.getMonth() + 1, d);
  return next;
}

export function daysUntil(date: Date, today = new Date()) {
  return Math.round((startOfDay(date).getTime() - startOfDay(today).getTime()) / DAY_MS);
}

export function formatDueLabel(days: number) {
  if (days <= 0) return "Hari ini";
  if (days === 1) return "Besok";
  return `${days} hari lagi`;
}
