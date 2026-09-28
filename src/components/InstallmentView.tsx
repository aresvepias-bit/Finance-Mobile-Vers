"use client";

import React, { useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { CategorySelect } from "./ui/CategorySelect";
import { DatePicker } from "./ui/DatePicker";
import { Modal } from "./ui/Modal";
import { InstallmentCard } from "./installment/InstallmentCard";
import {
  computeInstallment,
  dueDateForPeriod,
  formatShortDate,
  summarizeInstallments,
  type InstallmentRecord,
} from "@/lib/installments";
import { Landmark, Plus, X } from "lucide-react";

const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  id: "",
  name: "",
  lender: "",
  monthlyAmount: "",
  tenorMonths: "",
  startDate: today(),
  initialPaidCount: "0",
  categoryId: "",
  bankId: "",
  note: "",
};

export function InstallmentView() {
  const {
    installments,
    categories,
    banks,
    saveInstallment,
    deleteInstallment,
    payInstallment,
    undoInstallmentPayment,
    showAlert,
    showConfirm,
    formatRp,
  } = useAppState();

  const [form, setForm] = useState(emptyForm);
  const [payTarget, setPayTarget] = useState<InstallmentRecord | null>(null);
  const [payDate, setPayDate] = useState(today());
  const [payBankId, setPayBankId] = useState("");
  const [payAmount, setPayAmount] = useState("");

  const setField = (key: keyof typeof emptyForm, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const cleanNumber = (str: string) => {
    const clean = str.replace(/\D/g, "");
    return clean ? parseInt(clean, 10) : 0;
  };
  const formatInput = (val: string) => {
    const num = cleanNumber(val);
    return num ? new Intl.NumberFormat("id-ID").format(num) : "";
  };

  const summary = useMemo(() => summarizeInstallments(installments), [installments]);

  // Aktif dulu (jatuh tempo terdekat), yang lunas di bawah
  const sorted = useMemo(() => {
    return [...installments]
      .map((inst) => ({ inst, c: computeInstallment(inst) }))
      .sort((a, b) => {
        if (a.c.isPaidOff !== b.c.isPaidOff) return a.c.isPaidOff ? 1 : -1;
        return (a.c.nextDueDate?.getTime() ?? 0) - (b.c.nextDueDate?.getTime() ?? 0);
      })
      .map((x) => x.inst);
  }, [installments]);

  // Pratinjau hitungan dari isian form
  const preview = useMemo(() => {
    const monthly = cleanNumber(form.monthlyAmount);
    const tenor = parseInt(form.tenorMonths, 10) || 0;
    const paid = Math.min(tenor, parseInt(form.initialPaidCount, 10) || 0);
    if (!monthly || !tenor || !form.startDate) return null;
    return {
      remaining: monthly * (tenor - paid),
      total: monthly * tenor,
      end: dueDateForPeriod(form.startDate, tenor),
    };
  }, [form.monthlyAmount, form.tenorMonths, form.initialPaidCount, form.startDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await saveInstallment({
      id: form.id || undefined,
      name: form.name,
      lender: form.lender,
      monthlyAmount: cleanNumber(form.monthlyAmount),
      tenorMonths: parseInt(form.tenorMonths, 10),
      startDate: form.startDate,
      initialPaidCount: parseInt(form.initialPaidCount, 10) || 0,
      categoryId: form.categoryId,
      bankId: form.bankId,
      note: form.note,
    });
    if (res.status === "success") {
      showAlert(form.id ? "Cicilan berhasil diperbarui!" : "Cicilan berhasil ditambahkan!", "success");
      setForm({ ...emptyForm, startDate: today() });
    } else {
      showAlert(res.message || "Gagal menyimpan cicilan.", "error");
    }
  };

  const handleEdit = (inst: InstallmentRecord) => {
    setForm({
      id: inst.id,
      name: inst.name,
      lender: inst.lender,
      monthlyAmount: new Intl.NumberFormat("id-ID").format(inst.monthly_amount),
      tenorMonths: String(inst.tenor_months),
      startDate: inst.start_date,
      initialPaidCount: String(inst.initial_paid_count),
      categoryId: inst.categoryId,
      bankId: inst.bank_id,
      note: inst.note,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (inst: InstallmentRecord) => {
    showConfirm(
      `Hapus cicilan "${inst.name}"? Transaksi pembayaran yang sudah tercatat tetap disimpan di riwayat transaksi.`,
      async () => {
        const res = await deleteInstallment(inst.id);
        showAlert(res.status === "success" ? "Cicilan dihapus." : res.message || "Gagal menghapus.", res.status === "success" ? "success" : "error");
      },
      { title: "Hapus Cicilan", type: "danger" }
    );
  };

  const openPay = (inst: InstallmentRecord) => {
    setPayTarget(inst);
    setPayDate(today());
    setPayBankId(inst.bank_id);
    setPayAmount(new Intl.NumberFormat("id-ID").format(inst.monthly_amount));
  };

  const submitPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget) return;
    const res = await payInstallment({
      id: payTarget.id,
      date: payDate,
      bankId: payBankId,
      amount: cleanNumber(payAmount),
    });
    if (res.status === "success") {
      setPayTarget(null);
      showAlert(res.message || "Pembayaran tercatat!", "success");
    } else {
      showAlert(res.message || "Gagal mencatat pembayaran.", "error");
    }
  };

  const handleUndo = (paymentId: string) => {
    showConfirm(
      "Batalkan pembayaran terakhir? Transaksi pengeluarannya ikut dihapus.",
      async () => {
        const res = await undoInstallmentPayment(paymentId);
        showAlert(res.status === "success" ? "Pembayaran dibatalkan." : res.message || "Gagal membatalkan.", res.status === "success" ? "success" : "error");
      },
      { title: "Batalkan Pembayaran", type: "warning" }
    );
  };

  const payCalc = payTarget ? computeInstallment(payTarget) : null;
  const inputCls =
    "w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white";
  const labelCls = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm lg:sticky lg:top-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  {form.id ? "Ubah Cicilan" : "Tambah Cicilan"}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">KPR, kendaraan, pinjaman, dll</p>
              </div>
            </div>
            {form.id && (
              <button
                type="button"
                onClick={() => setForm({ ...emptyForm, startDate: today() })}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                title="Batal ubah"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className={labelCls}>Nama</label>
                <input required value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="KPR Rumah" className={inputCls} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={labelCls}>Pemberi Pinjaman</label>
                <input value={form.lender} onChange={(e) => setField("lender", e.target.value)} placeholder="BTN" className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Cicilan / Bulan</label>
                <input
                  required
                  inputMode="numeric"
                  value={form.monthlyAmount}
                  onChange={(e) => setField("monthlyAmount", formatInput(e.target.value))}
                  placeholder="Rp 0"
                  className={`${inputCls} font-bold`}
                />
              </div>
              <div>
                <label className={labelCls}>Tenor (bulan)</label>
                <input
                  required
                  inputMode="numeric"
                  value={form.tenorMonths}
                  onChange={(e) => setField("tenorMonths", e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder="180"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Cicilan Pertama</label>
                <DatePicker value={form.startDate} onChange={(v) => setField("startDate", v)} />
              </div>
              <div>
                <label className={labelCls}>Sudah Dibayar</label>
                <input
                  inputMode="numeric"
                  value={form.initialPaidCount}
                  onChange={(e) => setField("initialPaidCount", e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder="0"
                  className={inputCls}
                  title="Jumlah cicilan yang sudah dibayar sebelum dicatat di aplikasi"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 -mt-2 leading-relaxed">
              <span className="font-bold">Sudah dibayar</span> = berapa kali cicilan dibayar sebelum mulai dicatat di aplikasi.
            </p>

            <div>
              <label className={labelCls}>Kategori Pengeluaran</label>
              <CategorySelect
                categories={categories}
                type="expense"
                value={form.categoryId}
                onChange={(v) => setField("categoryId", v)}
                placeholder="Misal: Cicilan & Hutang › KPR"
              />
            </div>

            <div>
              <label className={labelCls}>Rekening Pembayaran</label>
              <select required value={form.bankId} onChange={(e) => setField("bankId", e.target.value)} className={inputCls}>
                <option value="">Pilih rekening...</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>
                Catatan <span className="normal-case font-semibold text-slate-300">(opsional)</span>
              </label>
              <input value={form.note} onChange={(e) => setField("note", e.target.value)} maxLength={120} placeholder="Bunga fix 5 thn pertama" className={inputCls} />
            </div>

            {preview && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-[11px] font-semibold text-slate-600 space-y-0.5">
                <p className="flex justify-between"><span>Total kewajiban</span><span className="font-black text-slate-800">{formatRp(preview.total)}</span></p>
                <p className="flex justify-between"><span>Sisa hutang</span><span className="font-black text-slate-800">{formatRp(preview.remaining)}</span></p>
                <p className="flex justify-between"><span>Perkiraan lunas</span><span className="font-black text-slate-800">{formatShortDate(preview.end)}</span></p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-100 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> {form.id ? "Simpan Perubahan" : "Tambah Cicilan"}
            </button>
          </form>
        </div>
      </div>

      {/* Ringkasan + daftar */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-lg relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
          <p className="relative text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Sisa Hutang Cicilan</p>
          <p className="relative text-3xl font-black mt-1 tabular-nums">{formatRp(summary.remainingDebt)}</p>
          <div className="relative mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Cicilan / bln</p>
              <p className="text-sm sm:text-base font-black mt-1 truncate tabular-nums">{formatRp(summary.monthlyTotal)}</p>
            </div>
            <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Aktif</p>
              <p className="text-sm sm:text-base font-black mt-1">{summary.activeCount} cicilan</p>
            </div>
            <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Telat Bayar</p>
              <p className={`text-sm sm:text-base font-black mt-1 ${summary.overdueCount > 0 ? "text-rose-400" : ""}`}>
                {summary.overdueCount}x
              </p>
            </div>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Landmark className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700 mt-3">Belum ada cicilan</p>
            <p className="text-xs text-slate-400 mt-1">Tambahkan KPR, cicilan kendaraan, atau pinjaman lewat form di kiri.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {sorted.map((inst) => (
              <InstallmentCard
                key={inst.id}
                inst={inst}
                formatRp={formatRp}
                onPay={openPay}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onUndo={handleUndo}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal bayar */}
      <Modal isOpen={!!payTarget} onClose={() => setPayTarget(null)} title={`Bayar ${payTarget?.name ?? ""}`}>
        {payTarget && payCalc && (
          <form onSubmit={submitPay} className="space-y-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800 font-semibold">
              Cicilan ke-{payCalc.nextPeriod} dari {payTarget.tenor_months}
              {payCalc.nextDueDate && ` · jatuh tempo ${formatShortDate(payCalc.nextDueDate)}`}. Pembayaran ini otomatis
              dicatat sebagai transaksi pengeluaran.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tanggal Bayar</label>
                <DatePicker value={payDate} onChange={setPayDate} />
              </div>
              <div>
                <label className={labelCls}>Nominal</label>
                <input
                  required
                  inputMode="numeric"
                  value={payAmount}
                  onChange={(e) => setPayAmount(formatInput(e.target.value))}
                  className={`${inputCls} font-bold`}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Dari Rekening</label>
              <select value={payBankId} onChange={(e) => setPayBankId(e.target.value)} className={inputCls}>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setPayTarget(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm">
                Batal
              </button>
              <button type="submit" className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 text-sm shadow-md shadow-emerald-100">
                Catat Pembayaran
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
