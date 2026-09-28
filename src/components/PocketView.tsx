"use client";

import React, { useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Modal } from "./ui/Modal";
import { DatePicker } from "./ui/DatePicker";
import { PocketCard } from "./pocket/PocketCard";
import { getCategoryColor } from "./ui/categoryVisuals";
import { formatMonthLabel } from "@/lib/budgets";
import { allocatedForMonth, monthSurplus, suggestAllocation, type PocketRecord } from "@/lib/pockets";
import { AlertTriangle, CalendarDays, Plus, Split, X } from "lucide-react";

const today = () => new Date().toISOString().split("T")[0];
const currentMonth = () => today().slice(0, 7);
const emptyForm = { id: "", name: "", percent: "", targetAmount: "", note: "" };

export function PocketView() {
  const {
    pockets,
    transactions,
    banks,
    savePocket,
    deletePocket,
    addPocketEntry,
    deletePocketEntry,
    allocatePockets,
    showAlert,
    showConfirm,
    formatRp,
  } = useAppState();

  const [month, setMonth] = useState(currentMonth);
  const [form, setForm] = useState(emptyForm);
  const [allocOpen, setAllocOpen] = useState(false);
  const [allocAmounts, setAllocAmounts] = useState<Record<string, string>>({});
  const [entryTarget, setEntryTarget] = useState<{ pocket: PocketRecord; type: "deposit" | "withdraw" } | null>(null);
  const [entryAmount, setEntryAmount] = useState("");
  const [entryDate, setEntryDate] = useState(today());
  const [entryNote, setEntryNote] = useState("");

  const cleanNumber = (str: string) => {
    const clean = str.replace(/\D/g, "");
    return clean ? parseInt(clean, 10) : 0;
  };
  const fmtInput = (n: number) => (n ? new Intl.NumberFormat("id-ID").format(n) : "");

  const { income, expense, surplus } = useMemo(() => monthSurplus(transactions, month), [transactions, month]);
  const allocated = useMemo(() => allocatedForMonth(pockets, month), [pockets, month]);
  const unallocated = Math.max(0, surplus - allocated);
  const totalPercent = pockets.reduce((s, p) => s + p.percent, 0);
  const totalPocketBalance = pockets.reduce((s, p) => s + p.balance, 0);

  // Uang yang benar-benar ada di rekening (tanpa paylater / kartu kredit)
  const cashAssets = useMemo(
    () =>
      banks
        .filter((b) => b.account_type !== "paylater" && b.account_type !== "credit_card")
        .reduce((s, b) => s + (Number(b.currentBalance) || 0), 0),
    [banks]
  );
  const freeMoney = cashAssets - totalPocketBalance;

  // ----- Form pos -----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await savePocket({
      id: form.id || undefined,
      name: form.name,
      percent: Number(form.percent.replace(",", ".")) || 0,
      targetAmount: cleanNumber(form.targetAmount) || null,
      note: form.note,
    });
    if (res.status === "success") {
      showAlert(form.id ? "Pos berhasil diperbarui!" : "Pos berhasil ditambahkan!", "success");
      setForm(emptyForm);
    } else {
      showAlert(res.message || "Gagal menyimpan pos.", "error");
    }
  };

  const handleEdit = (p: PocketRecord) => {
    setForm({
      id: p.id,
      name: p.name,
      percent: String(p.percent),
      targetAmount: p.targetAmount ? fmtInput(p.targetAmount) : "",
      note: p.note,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (p: PocketRecord) => {
    showConfirm(
      `Hapus pos "${p.name}" beserta riwayatnya? Uang di rekening tidak berubah (pos hanya penanda).`,
      async () => {
        const res = await deletePocket(p.id);
        showAlert(res.status === "success" ? "Pos dihapus." : res.message || "Gagal menghapus.", res.status === "success" ? "success" : "error");
      },
      { title: "Hapus Pos", type: "danger" }
    );
  };

  // ----- Alokasi sisa bulan -----
  const openAllocate = () => {
    const suggestion = suggestAllocation(pockets, unallocated);
    setAllocAmounts(Object.fromEntries(pockets.map((p) => [p.id, fmtInput(suggestion[p.id])])));
    setAllocOpen(true);
  };
  const allocTotal = pockets.reduce((s, p) => s + cleanNumber(allocAmounts[p.id] || ""), 0);

  const submitAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (allocTotal > unallocated) {
      showAlert(`Total alokasi melebihi sisa yang belum dialokasikan (${formatRp(unallocated)}).`, "error");
      return;
    }
    const res = await allocatePockets({
      month,
      allocations: pockets.map((p) => ({ pocketId: p.id, amount: cleanNumber(allocAmounts[p.id] || "") })),
    });
    if (res.status === "success") {
      setAllocOpen(false);
      showAlert(res.message || "Alokasi tersimpan!", "success");
    } else {
      showAlert(res.message || "Gagal menyimpan alokasi.", "error");
    }
  };

  // ----- Isi / pakai -----
  const openEntry = (pocket: PocketRecord, type: "deposit" | "withdraw") => {
    setEntryTarget({ pocket, type });
    setEntryAmount("");
    setEntryDate(today());
    setEntryNote("");
  };
  const submitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryTarget) return;
    const res = await addPocketEntry({
      pocketId: entryTarget.pocket.id,
      type: entryTarget.type,
      amount: cleanNumber(entryAmount),
      date: entryDate,
      note: entryNote,
    });
    if (res.status === "success") {
      setEntryTarget(null);
      showAlert(res.message || "Tersimpan!", "success");
    } else {
      showAlert(res.message || "Gagal menyimpan.", "error");
    }
  };
  const handleDeleteEntry = (id: string) => {
    showConfirm("Hapus mutasi ini? Saldo pos akan disesuaikan.", async () => {
      const res = await deletePocketEntry(id);
      if (res.status !== "success") showAlert(res.message || "Gagal menghapus.", "error");
    });
  };

  const inputCls = "w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white";
  const labelCls = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";
  // Sisa % yang masih bisa dipakai (saat ubah pos, % pos itu sendiri dikembalikan)
  const editingPercent = form.id ? pockets.find((p) => p.id === form.id)?.percent ?? 0 : 0;
  const remainingPercent = Math.max(0, 100 - totalPercent + editingPercent);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form pos */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm lg:sticky lg:top-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Split className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{form.id ? "Ubah Pos" : "Tambah Pos"}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Amplop pembagian sisa gaji</p>
              </div>
            </div>
            {form.id && (
              <button type="button" onClick={() => setForm(emptyForm)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100" title="Batal ubah">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className={labelCls}>Nama Pos</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dana Darurat" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>% dari Sisa</label>
                <input
                  inputMode="decimal"
                  value={form.percent}
                  onChange={(e) => setForm({ ...form, percent: e.target.value.replace(/[^\d.,]/g, "").slice(0, 5) })}
                  placeholder={`maks ${remainingPercent}`}
                  className={`${inputCls} font-bold`}
                />
              </div>
              <div>
                <label className={labelCls}>Target <span className="normal-case font-semibold text-slate-300">(opsional)</span></label>
                <input
                  inputMode="numeric"
                  value={form.targetAmount}
                  onChange={(e) => setForm({ ...form, targetAmount: fmtInput(cleanNumber(e.target.value)) })}
                  placeholder="Rp 0"
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Catatan <span className="normal-case font-semibold text-slate-300">(opsional)</span></label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={120} placeholder="Target 6× pengeluaran bulanan" className={inputCls} />
            </div>
            <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-100 flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" /> {form.id ? "Simpan Perubahan" : "Tambah Pos"}
            </button>
          </form>

          {/* Pembagian % */}
          {pockets.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>Pembagian</span>
                <span className={totalPercent === 100 ? "text-emerald-600" : "text-amber-600"}>{totalPercent}% dari 100%</span>
              </div>
              <div className="mt-2 flex h-2.5 rounded-full overflow-hidden bg-slate-100">
                {pockets.map((p) => (
                  <div key={p.id} className={getCategoryColor(p.name).dot} style={{ width: `${p.percent}%` }} title={`${p.name} ${p.percent}%`} />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {pockets.map((p) => (
                  <span key={p.id} className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                    <span className={`w-1.5 h-1.5 rounded-full ${getCategoryColor(p.name).dot}`} />
                    {p.name} {p.percent}%
                  </span>
                ))}
              </div>
              {totalPercent < 100 && (
                <p className="text-[10px] text-amber-600 font-semibold mt-2">
                  {100 - totalPercent}% sisa belum punya pos, jadi tidak ikut dibagi otomatis.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ringkasan + daftar pos */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-lg relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sisa Gaji Belum Dialokasikan</p>
              <p className="text-3xl font-black mt-1 tabular-nums">{formatRp(unallocated)}</p>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5 capitalize">{formatMonthLabel(month)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 rounded-xl bg-white/10 border border-white/10 px-2.5 py-1.5 cursor-pointer hover:bg-white/15">
                <CalendarDays className="w-3.5 h-3.5 text-slate-300" />
                <input
                  type="month"
                  value={month}
                  onChange={(e) => e.target.value && setMonth(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer [color-scheme:dark]"
                />
              </label>
              <button
                type="button"
                onClick={openAllocate}
                disabled={pockets.length === 0 || unallocated <= 0}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 text-white px-3 py-2 text-xs font-bold hover:bg-emerald-600 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                title={pockets.length === 0 ? "Tambah pos dulu" : unallocated <= 0 ? "Tidak ada sisa untuk dialokasikan" : "Bagi sisa ke pos"}
              >
                <Split className="w-3.5 h-3.5" /> Alokasikan Sisa
              </button>
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ["Pemasukan", formatRp(income)],
              ["Pengeluaran", formatRp(expense)],
              ["Sisa Bulan Ini", formatRp(surplus)],
              ["Sudah Dialokasikan", formatRp(allocated)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white/[0.06] border border-white/10 p-3 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                <p className={`text-sm font-black mt-1 truncate tabular-nums ${label === "Sisa Bulan Ini" && surplus < 0 ? "text-rose-400" : ""}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cek kewajaran: total pos vs uang di rekening */}
        {pockets.length > 0 && (
          <div
            className={`rounded-2xl border p-4 flex items-start gap-3 ${
              freeMoney < 0 ? "bg-rose-50/60 border-rose-100" : "bg-white border-slate-100 shadow-sm"
            }`}
          >
            {freeMoney < 0 && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Total Saldo Pos</p>
                <p className="font-black text-slate-900 tabular-nums mt-0.5">{formatRp(totalPocketBalance)}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Uang di Rekening</p>
                <p className="font-black text-slate-900 tabular-nums mt-0.5">{formatRp(cashAssets)}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{freeMoney < 0 ? "Pos Melebihi Rekening" : "Uang Bebas (tanpa pos)"}</p>
                <p className={`font-black tabular-nums mt-0.5 ${freeMoney < 0 ? "text-rose-600" : "text-slate-900"}`}>{formatRp(Math.abs(freeMoney))}</p>
              </div>
            </div>
          </div>
        )}

        {pockets.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Split className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700 mt-3">Belum ada pos alokasi</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Contoh: Dana Darurat 30%, Investasi 40%, Liburan 10%, Dana Bebas 20%. Total persentase maksimal 100%.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {pockets.map((p) => (
              <PocketCard
                key={p.id}
                pocket={p}
                formatRp={formatRp}
                onDeposit={(x) => openEntry(x, "deposit")}
                onWithdraw={(x) => openEntry(x, "withdraw")}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDeleteEntry={handleDeleteEntry}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal alokasi sisa */}
      <Modal isOpen={allocOpen} onClose={() => setAllocOpen(false)} title={`Alokasikan Sisa ${formatMonthLabel(month)}`}>
        <form onSubmit={submitAllocate} className="space-y-4">
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800 font-semibold">
            Sisa yang bisa dialokasikan: <span className="font-black">{formatRp(unallocated)}</span>. Nominal di bawah dihitung
            dari % tiap pos dan bisa diubah.
          </div>
          <div className="space-y-2">
            {pockets.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${getCategoryColor(p.name).dot}`} />
                <span className="flex-1 min-w-0 text-sm font-bold text-slate-700 truncate">
                  {p.name} <span className="text-[10px] font-semibold text-slate-400">{p.percent}%</span>
                </span>
                <input
                  inputMode="numeric"
                  value={allocAmounts[p.id] || ""}
                  onChange={(e) => setAllocAmounts({ ...allocAmounts, [p.id]: fmtInput(cleanNumber(e.target.value)) })}
                  placeholder="0"
                  className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-right focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs font-bold border-t border-slate-100 pt-3">
            <span className="text-slate-500">Total dialokasikan</span>
            <span className={allocTotal > unallocated ? "text-rose-600" : "text-slate-900"}>
              {formatRp(allocTotal)} <span className="text-slate-400 font-semibold">· sisa {formatRp(Math.max(0, unallocated - allocTotal))}</span>
            </span>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setAllocOpen(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm">
              Batal
            </button>
            <button type="submit" disabled={allocTotal <= 0} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 text-sm shadow-md shadow-emerald-100 disabled:opacity-50">
              Simpan Alokasi
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal isi / pakai */}
      <Modal
        isOpen={!!entryTarget}
        onClose={() => setEntryTarget(null)}
        title={entryTarget ? `${entryTarget.type === "deposit" ? "Isi" : "Pakai"} ${entryTarget.pocket.name}` : ""}
      >
        {entryTarget && (
          <form onSubmit={submitEntry} className="space-y-4">
            <p className="text-xs text-slate-500 font-semibold">
              Saldo pos saat ini: <span className="font-black text-slate-800">{formatRp(entryTarget.pocket.balance)}</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nominal</label>
                <input
                  required
                  inputMode="numeric"
                  autoFocus
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(fmtInput(cleanNumber(e.target.value)))}
                  placeholder="Rp 0"
                  className={`${inputCls} font-bold`}
                />
              </div>
              <div>
                <label className={labelCls}>Tanggal</label>
                <DatePicker value={entryDate} onChange={setEntryDate} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Keterangan <span className="normal-case font-semibold text-slate-300">(opsional)</span></label>
              <input
                value={entryNote}
                onChange={(e) => setEntryNote(e.target.value)}
                maxLength={120}
                placeholder={entryTarget.type === "withdraw" ? "Servis motor mendadak" : "Bonus / THR"}
                className={inputCls}
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setEntryTarget(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm">
                Batal
              </button>
              <button type="submit" className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 text-sm shadow-md shadow-emerald-100">
                Simpan
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
