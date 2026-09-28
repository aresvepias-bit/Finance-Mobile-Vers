// Penyusutan aset fisik metode garis lurus:
// nilai turun rata tiap bulan sampai 0 di akhir masa pakai.

/** Jumlah bulan kalender penuh antara dua tanggal (min. 0). */
export function fullMonthsBetween(from: Date, to: Date) {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

export function computeDepreciation(price: number, purchaseDate: string, lifespanMonths: number, today = new Date()) {
  const [y, m, d] = purchaseDate.split("-").map(Number);
  const start = new Date(y, (m || 1) - 1, d || 1);
  const life = Math.max(1, lifespanMonths || 1);

  const elapsed = Math.min(life, fullMonthsBetween(start, today));
  const remainingMonths = life - elapsed;
  const monthly = price / life;
  const accumulated = Math.min(price, monthly * elapsed);
  const bookValue = Math.max(0, price - accumulated);

  return {
    elapsed,
    remainingMonths,
    monthly,
    accumulated,
    bookValue,
    bookPct: price > 0 ? (bookValue / price) * 100 : 0,
    isFullyDepreciated: remainingMonths === 0,
  };
}
