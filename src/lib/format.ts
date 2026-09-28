const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const MASKED_AMOUNT = "Rp ••••••";

export function formatRupiah(amount: number) {
  return rupiahFormatter.format(amount);
}
