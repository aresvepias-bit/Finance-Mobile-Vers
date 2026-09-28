// Export laporan anggaran: Excel (CSV) & cetak / simpan PDF.
// Selalu memakai nominal asli (tidak ikut mode sembunyikan angka).

import {
  BUDGET_STATUS_LABEL,
  computeBudgetUsage,
  formatMonthLabel,
  getBudgetStatus,
} from "./budgets";
import { formatRupiah } from "./format";

type BudgetUsage = ReturnType<typeof computeBudgetUsage>;

interface ReportRow {
  kategori: string;
  rincian: string;
  catatan: string;
  limit: number;
  terpakai: number;
  sisa: number;
  persen: number;
  status: string;
}

function buildRows(usage: BudgetUsage): ReportRow[] {
  const rows: ReportRow[] = [];
  for (const g of usage.groups) {
    for (const line of g.lines) {
      rows.push({
        kategori: g.rootName,
        rincian: line.isRootLine ? "Umum / lainnya" : line.name,
        catatan: line.note || "",
        limit: line.limit,
        terpakai: line.spent,
        sisa: line.limit - line.spent,
        persen: line.limit > 0 ? Math.round((line.spent / line.limit) * 100) : 0,
        status: BUDGET_STATUS_LABEL[getBudgetStatus(line.spent, line.limit)],
      });
    }
  }
  return rows;
}

function csvCell(value: string | number) {
  const str = String(value);
  return /[";\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function fileSafeMonth(month: string) {
  return month.replace(/[^0-9-]/g, "");
}

/** Unduh CSV (pemisah ";" + BOM supaya langsung rapi di Excel berbahasa Indonesia). */
export function downloadBudgetCsv(usage: BudgetUsage, month: string) {
  const lines: (string | number)[][] = [
    ["Laporan Anggaran", formatMonthLabel(month)],
    ["Dibuat", new Date().toLocaleString("id-ID")],
    [],
    ["Kategori", "Rincian", "Catatan", "Limit", "Terpakai", "Sisa", "Persen (%)", "Status"],
    ...buildRows(usage).map((r) => [r.kategori, r.rincian, r.catatan, r.limit, r.terpakai, r.sisa, r.persen, r.status]),
    [],
    ["TOTAL", "", "", usage.totalLimit, usage.totalSpent, usage.totalLimit - usage.totalSpent, usage.usagePct, ""],
  ];

  if (usage.unbudgeted.length > 0) {
    lines.push([], ["Pengeluaran tanpa budget"], ["Kategori", "Terpakai"]);
    for (const u of usage.unbudgeted) lines.push([u.rootName, u.spent]);
  }

  const csv = "﻿" + lines.map((row) => row.map(csvCell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `laporan-anggaran-${fileSafeMonth(month)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string) {
  return str.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

/**
 * Buka laporan siap cetak di tab baru lalu tampilkan dialog print
 * (pilih "Save as PDF" untuk menyimpan PDF). Mengembalikan false bila pop-up diblokir.
 */
export function printBudgetReport(usage: BudgetUsage, month: string) {
  const rows = buildRows(usage);
  const remaining = usage.totalLimit - usage.totalSpent;
  const statusColor: Record<string, string> = { Aman: "#1f6f3a", Waspada: "#b45309", Over: "#be123c" };

  const bodyRows = rows
    .map(
      (r) => `<tr>
        <td><strong>${escapeHtml(r.kategori)}</strong><div class="sub">${escapeHtml(r.rincian)}</div>${
          r.catatan ? `<div class="note">&ldquo;${escapeHtml(r.catatan)}&rdquo;</div>` : ""
        }</td>
        <td class="num">${formatRupiah(r.limit)}</td>
        <td class="num">${formatRupiah(r.terpakai)}</td>
        <td class="num ${r.sisa < 0 ? "neg" : ""}">${formatRupiah(r.sisa)}</td>
        <td class="num">${r.persen}%</td>
        <td><span class="badge" style="color:${statusColor[r.status]};border-color:${statusColor[r.status]}33;background:${statusColor[r.status]}0f">${r.status}</span></td>
      </tr>`
    )
    .join("");

  const unbudgetedHtml =
    usage.unbudgeted.length > 0
      ? `<h2>Pengeluaran tanpa budget</h2>
         <table><thead><tr><th>Kategori</th><th class="num">Terpakai</th></tr></thead><tbody>
         ${usage.unbudgeted.map((u) => `<tr><td>${escapeHtml(u.rootName)}</td><td class="num">${formatRupiah(u.spent)}</td></tr>`).join("")}
         </tbody></table>`
      : "";

  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8">
<title>Laporan Anggaran ${escapeHtml(formatMonthLabel(month))}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1a1b19; margin: 32px; font-size: 12px; }
  h1 { font-size: 22px; margin: 0; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; margin: 28px 0 8px; color: #333430; }
  .meta { color: #86877f; margin-top: 4px; }
  .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 20px; }
  .card { border: 1px solid #dcddd9; border-radius: 10px; padding: 10px 12px; }
  .card .label { font-size: 9px; text-transform: uppercase; letter-spacing: .08em; color: #86877f; font-weight: 700; }
  .card .value { font-size: 16px; font-weight: 800; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .06em; color: #86877f; border-bottom: 1px solid #dcddd9; padding: 8px 6px; }
  td { border-bottom: 1px solid #ecedea; padding: 8px 6px; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .neg { color: #be123c; }
  .sub { color: #5f605a; margin-top: 2px; }
  .note { color: #86877f; font-style: italic; margin-top: 2px; }
  .badge { font-size: 10px; font-weight: 700; border: 1px solid; border-radius: 999px; padding: 2px 8px; }
  tfoot td { font-weight: 800; border-top: 2px solid #1a1b19; border-bottom: none; }
  .footer { margin-top: 28px; color: #86877f; font-size: 10px; }
  @media print { body { margin: 12mm; } .cards { break-inside: avoid; } tr { break-inside: avoid; } }
</style></head><body>
  <h1>Laporan Anggaran</h1>
  <div class="meta">Periode ${escapeHtml(formatMonthLabel(month))} &middot; dibuat ${escapeHtml(new Date().toLocaleString("id-ID"))}</div>
  <div class="cards">
    <div class="card"><div class="label">Total Limit</div><div class="value">${formatRupiah(usage.totalLimit)}</div></div>
    <div class="card"><div class="label">Terpakai</div><div class="value">${formatRupiah(usage.totalSpent)}</div></div>
    <div class="card"><div class="label">Sisa</div><div class="value ${remaining < 0 ? "neg" : ""}">${formatRupiah(remaining)}</div></div>
    <div class="card"><div class="label">Pemakaian</div><div class="value">${usage.usagePct}%</div></div>
  </div>
  <h2>Rincian Anggaran</h2>
  ${
    rows.length === 0
      ? `<p class="meta">Belum ada budget untuk periode ini.</p>`
      : `<table>
    <thead><tr><th>Kategori</th><th class="num">Limit</th><th class="num">Terpakai</th><th class="num">Sisa</th><th class="num">%</th><th>Status</th></tr></thead>
    <tbody>${bodyRows}</tbody>
    <tfoot><tr><td>Total</td><td class="num">${formatRupiah(usage.totalLimit)}</td><td class="num">${formatRupiah(usage.totalSpent)}</td><td class="num ${remaining < 0 ? "neg" : ""}">${formatRupiah(remaining)}</td><td class="num">${usage.usagePct}%</td><td></td></tr></tfoot>
  </table>`
  }
  ${unbudgetedHtml}
  <div class="footer">Smart Wallet &middot; Personal Finance</div>
  <script>window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 250); });</script>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
