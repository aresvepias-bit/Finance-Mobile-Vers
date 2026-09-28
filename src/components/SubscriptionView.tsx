"use client";

import React, { useState, useMemo } from "react";
import { useAppState } from "@/hooks/useAppState";
import { CategorySelect } from "./ui/CategorySelect";
import { DatePicker } from "./ui/DatePicker";
import { getCategoryColor } from "./ui/categoryVisuals";
import { daysUntil, formatDueLabel, getNextDueDate } from "@/lib/bills";
import { BellRing, CalendarClock, ChevronDown, Plus, Repeat, Trash2 } from "lucide-react";

const todayStr = () => new Date().toISOString().split("T")[0];

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function SubscriptionView() {
  const {
    banks,
    categories,
    subscriptions,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    formatRp,
    showAlert,
    showConfirm,
  } = useAppState();

  // Form states
  const [subName, setSubName] = useState("");
  const [subEmail, setSubEmail] = useState("");
  const [subAmount, setSubAmount] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [dueDate, setDueDate] = useState(todayStr);
  const [categorySelect, setCategorySelect] = useState("");
  const [bankId, setBankId] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const cleanNumber = (str: string) => {
    const clean = str.replace(/\D/g, "");
    return clean ? parseInt(clean, 10) : 0;
  };

  const handleAmountChange = (val: string, setter: (s: string) => void) => {
    const num = cleanNumber(val);
    setter(num ? new Intl.NumberFormat("id-ID").format(num) : "");
  };

  // Submit subscription
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subName || !subAmount || !billingCycle || !dueDate || !categorySelect || !bankId) {
      showAlert("Isi data tagihan langganan dengan lengkap!", "error");
      return;
    }

    const cleanAmt = cleanNumber(subAmount);
    if (cleanAmt <= 0) {
      showAlert("Nominal tagihan harus valid!", "error");
      return;
    }

    const res = await addSubscription({
      name: subName,
      email: subEmail,
      amount: cleanAmt,
      billingCycle,
      dueDate,
      categoryId: categorySelect,
      bankId,
    });
    if (res.status === "success") {
      showAlert(
        `${subName} · ${formatRp(cleanAmt)}/${billingCycle === "yearly" ? "tahun" : "bulan"} masuk ke pengingat tagihan.`,
        "success",
        "Langganan tercatat"
      );
      setSubName("");
      setSubEmail("");
      setSubAmount("");
      setDueDate(todayStr());
    } else {
      showAlert(res.message || "Gagal menyimpan data.", "error");
    }
  };

  // Toggle active/inactive status
  const handleToggleStatus = async (sub: any) => {
    const nextStatus = sub.status === "active" ? "inactive" : "active";
    const res = await updateSubscription({
      id: sub.id,
      name: sub.name,
      email: sub.email,
      amount: sub.amount,
      billingCycle: sub.billing_cycle,
      dueDate: sub.due_date,
      categoryId: sub.categoryId,
      bankId: sub.bank_id,
      status: nextStatus,
    });
    if (res.status !== "success") {
      showAlert(res.message || "Gagal memperbarui status.", "error");
    } else {
      showAlert(
        nextStatus === "active" ? `${sub.name} kembali masuk pengingat tagihan.` : `${sub.name} tidak lagi diingatkan.`,
        "info",
        nextStatus === "active" ? "Langganan diaktifkan" : "Langganan dinonaktifkan"
      );
    }
  };

  // Delete subscription
  const handleDeleteClick = (sub: any) => {
    showConfirm(
      `Hapus langganan "${sub.name}"?`,
      async () => {
        const res = await deleteSubscription(sub.id);
        if (res.status !== "success") {
          showAlert(res.message || "Gagal menghapus data.", "error");
        } else {
          showAlert(`${sub.name} dihapus dari daftar langganan.`, "success", "Langganan dihapus");
        }
      },
      { title: "Konfirmasi Hapus", type: "danger" }
    );
  };

  // Jatuh tempo berikutnya untuk tiap langganan, urut dari yang terdekat
  const withDue = useMemo(
    () =>
      subscriptions
        .map((s) => {
          const next = s.due_date ? getNextDueDate(s.due_date, s.billing_cycle) : null;
          return { ...s, next, daysLeft: next ? daysUntil(next) : 9999 };
        })
        .sort((a, b) => a.daysLeft - b.daysLeft),
    [subscriptions]
  );
  const active = withDue.filter((s) => s.status === "active");
  const inactive = withDue.filter((s) => s.status !== "active");

  const summary = useMemo(() => {
    let monthly = 0;
    let yearly = 0;
    for (const s of active) {
      const amt = Number(s.amount) || 0;
      if (s.billing_cycle === "yearly") yearly += amt;
      else monthly += amt;
    }
    return { perMonth: monthly + yearly / 12, perYear: monthly * 12 + yearly };
  }, [active]);
  const nextBill = active[0];

  const labelCls = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";
  const inputCls = "w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white";

  const renderCard = (s: (typeof withDue)[number], idx: number) => {
    const isActive = s.status === "active";
    const color = getCategoryColor(s.name);
    const urgent = isActive && s.daysLeft <= 3;
    const soon = isActive && s.daysLeft <= 7;
    const dateTone = !isActive
      ? "bg-slate-100 text-slate-400"
      : urgent
      ? "bg-rose-50 text-rose-600 ring-1 ring-rose-100"
      : soon
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
      : "bg-slate-50 text-slate-700 ring-1 ring-slate-100";

    return (
      <div
        key={s.id}
        style={{ animationDelay: `${80 + idx * 60}ms` }}
        className={`group bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm opacity-0 animate-fade-in-up transition-[box-shadow,border-color,transform] duration-300 hover:shadow-md hover:border-slate-200 hover:-translate-y-0.5 ${
          !isActive ? "bg-slate-50/60" : ""
        }`}
      >
        <div className="flex items-center gap-4">
          {/* Tanggal jatuh tempo berikutnya */}
          <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 leading-none ${dateTone}`}>
            <span className="text-lg font-black">{s.next?.getDate() ?? "–"}</span>
            <span className="text-[9px] font-bold uppercase mt-0.5">
              {s.next?.toLocaleString("id-ID", { month: "short" }) ?? ""}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`w-6 h-6 rounded-lg ${color.chip} ring-1 flex items-center justify-center text-[9px] font-black shrink-0`}>
                {initialsOf(s.name)}
              </span>
              <h4 className={`font-extrabold text-sm truncate ${isActive ? "text-slate-800" : "text-slate-500"}`}>{s.name}</h4>
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                <Repeat className="w-2.5 h-2.5" />
                {s.billing_cycle === "yearly" ? "Tahunan" : "Bulanan"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">
              {s.category} · via {s.bank_name}
              {s.email && <span className="font-mono"> · {s.email}</span>}
            </p>
            {isActive && (
              <p className={`text-[10px] font-bold mt-1 ${urgent ? "text-rose-600" : soon ? "text-amber-600" : "text-slate-500"}`}>
                <CalendarClock className="w-3 h-3 inline -mt-0.5 mr-1" />
                {formatDueLabel(s.daysLeft)}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`text-base font-black tabular-nums ${isActive ? "text-slate-900" : "text-slate-400"}`}>
              {formatRp(Number(s.amount))}
            </span>
            <div className="flex items-center gap-1.5">
              {/* Switch aktif / nonaktif */}
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => handleToggleStatus(s)}
                title={isActive ? "Nonaktifkan pengingat" : "Aktifkan pengingat"}
                className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${isActive ? "bg-emerald-500" : "bg-slate-300"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${
                    isActive ? "translate-x-4" : ""
                  }`}
                />
              </button>
              <button
                onClick={() => handleDeleteClick(s)}
                className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Hapus langganan"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form Column */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm lg:sticky lg:top-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Tambah Langganan</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Pengingat tagihan rutin</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 mb-4 leading-relaxed">
            Untuk internet, streaming, asuransi, dll. Cicilan ber-tenor (KPR, kendaraan, pinjaman) catat di menu{" "}
            <span className="font-bold text-slate-700">Cicilan &amp; Hutang</span> supaya sisa hutangnya terhitung.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className={labelCls}>Nama Layanan</label>
              <input required value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="Netflix, Spotify, Indihome" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nominal</label>
                <input
                  required
                  inputMode="numeric"
                  value={subAmount}
                  onChange={(e) => handleAmountChange(e.target.value, setSubAmount)}
                  placeholder="Rp 0"
                  className={`${inputCls} font-bold`}
                />
              </div>
              <div>
                <label className={labelCls}>Siklus</label>
                <div className="flex bg-slate-100 p-1 rounded-xl h-[46px]">
                  {[
                    ["monthly", "Bulanan"],
                    ["yearly", "Tahunan"],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setBillingCycle(val)}
                      className={`flex-1 rounded-lg text-xs font-bold transition-all ${
                        billingCycle === val ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>Jatuh Tempo</label>
              <DatePicker value={dueDate} onChange={setDueDate} />
            </div>

            <div>
              <label className={labelCls}>Kategori Pengeluaran</label>
              <CategorySelect categories={categories} type="expense" value={categorySelect} onChange={setCategorySelect} />
            </div>

            <div>
              <label className={labelCls}>Sumber Dana</label>
              <select required value={bankId} onChange={(e) => setBankId(e.target.value)} className={inputCls}>
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
                Email Terdaftar <span className="normal-case font-semibold text-slate-300">(opsional)</span>
              </label>
              <input type="email" value={subEmail} onChange={(e) => setSubEmail(e.target.value)} placeholder="user@mail.com" className={inputCls} />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-100 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Catat Langganan
            </button>
          </form>
        </div>
      </div>

      {/* Display Column */}
      <div className="lg:col-span-2 space-y-5">
        {/* Ringkasan */}
        <div className="bg-slate-900 text-white rounded-2xl px-5 py-4 shadow-lg relative overflow-hidden opacity-0 animate-fade-in-up">
          <div className="absolute -right-16 -top-24 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Tagihan Langganan / Bulan</p>
              <p className="text-2xl font-black tabular-nums tracking-tight leading-tight">{formatRp(Math.round(summary.perMonth))}</p>
            </div>
            <div className="flex items-center gap-6 text-right">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Per Tahun</p>
                <p className="text-xs font-black tabular-nums mt-0.5">{formatRp(summary.perYear)}</p>
              </div>
              <div className="w-px h-7 bg-white/10" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Aktif</p>
                <p className="text-xs font-black mt-0.5">{active.length} layanan</p>
              </div>
            </div>
          </div>
          {nextBill && (
            <div className="relative mt-3.5 flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2 text-xs">
              <CalendarClock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300">Terdekat:</span>
              <span className="font-bold truncate">{nextBill.name}</span>
              <span className="text-slate-400 tabular-nums">{formatRp(Number(nextBill.amount))}</span>
              <span
                className={`ml-auto shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  nextBill.daysLeft <= 3 ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/15 text-emerald-300"
                }`}
              >
                {formatDueLabel(nextBill.daysLeft)}
              </span>
            </div>
          )}
        </div>

        {/* Daftar aktif */}
        {active.length === 0 && inactive.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <BellRing className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700 mt-3">Belum ada langganan</p>
            <p className="text-xs text-slate-400 mt-1">Catat Netflix, internet, atau asuransi supaya tidak lupa bayar.</p>
          </div>
        ) : (
          <div className="space-y-3">{active.map((s, i) => renderCard(s, i))}</div>
        )}

        {/* Nonaktif (bisa dilipat) */}
        {inactive.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowInactive((v) => !v)}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 px-1"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showInactive ? "rotate-180" : ""}`} />
              Nonaktif ({inactive.length})
            </button>
            {showInactive && <div className="space-y-3 mt-3">{inactive.map((s, i) => renderCard(s, i))}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
