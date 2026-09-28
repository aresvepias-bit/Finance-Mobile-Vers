"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Modal } from "./ui/Modal";
import { AccountCard } from "./bank/AccountCard";
import {
  CreditCard,
  Smartphone,
  Building2,
  Coins,
  Wallet,
  ShoppingBag,
  PlusCircle,
} from "lucide-react";

// Lightweight, fluid React Count-Up Component
function AnimatedNumber({ value, formatter }: { value: number; formatter: (val: number) => string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const startValueRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const duration = 1000; // 1s animation duration

  useEffect(() => {
    startValueRef.current = displayValue;
    startTimeRef.current = null;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      // Easing: easeOutCubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentVal = startValueRef.current + (value - startValueRef.current) * easeProgress;
      setDisplayValue(currentVal);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  return <>{formatter(displayValue)}</>;
}

// E-wallet and E-money presets mapping
const EWALLET_BRANDS = ["GoPay", "OVO", "DANA", "ShopeePay", "LinkAja"];
const EMONEY_BRANDS = ["Flazz BCA", "E-Money Mandiri", "Brizzi BRI", "TapCash BNI", "KMT KRL"];

const SHARE_COLORS = ["bg-emerald-400", "bg-emerald-300", "bg-emerald-200", "bg-slate-300", "bg-slate-400", "bg-slate-500"];

export function BanksView() {
  const { banks, addBank, updateBank, deleteBank, formatRp, showAlert, showConfirm, wallets } = useAppState();

  const [activeFilter, setActiveFilter] = useState("all");

  // Form states
  const [bankType, setBankType] = useState("bank");
  const [bankName, setBankName] = useState("");
  const [ewalletBrand, setEwalletBrand] = useState("");
  const [emoneyBrand, setEmoneyBrand] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [walletName, setWalletName] = useState("Pribadi");

  // Edit states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editBankItem, setEditBankItem] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editNo, setEditNo] = useState("");
  const [editWallet, setEditWallet] = useState("Pribadi");


  const cleanNumber = (str: string) => {
    const clean = str.replace(/\D/g, "");
    return clean ? parseInt(clean, 10) : 0;
  };

  const handleAmountChange = (val: string, setter: (s: string) => void) => {
    if (!val) {
      setter("");
      return;
    }
    const num = cleanNumber(val);
    if (num === 0) {
      setter("0");
    } else {
      setter(new Intl.NumberFormat("id-ID").format(num));
    }
  };

  // Filter bank list
  const filteredBanks = useMemo(() => {
    if (activeFilter === "all") return banks;
    return banks.filter((b) => b.account_type === activeFilter);
  }, [banks, activeFilter]);

  // Asset and debt calculations
  const stats = useMemo(() => {
    let assets = 0;
    let debt = 0;

    banks.forEach((b) => {
      const bal = Number(b.currentBalance) || 0;
      const isDebt = b.account_type === "paylater" || b.account_type === "credit_card";
      if (isDebt) {
        if (bal < 0) debt += Math.abs(bal);
      } else {
        if (bal > 0) assets += bal;
      }
    });

    return { assets, debt };
  }, [banks]);

  // Handle new account submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalName = bankName;
    if (bankType === "ewallet") {
      if (!ewalletBrand) {
        showAlert("Pilih brand E-Wallet!", "error");
        return;
      }
      finalName = ewalletBrand;
    } else if (bankType === "emoney") {
      if (!emoneyBrand) {
        showAlert("Pilih tipe E-Money!", "error");
        return;
      }
      finalName = emoneyBrand;
    }

    if (!finalName) {
      showAlert("Nama akun bank wajib diisi!", "error");
      return;
    }

    const cleanBal = cleanNumber(initialBalance);
    const numNo = accountNumber || "-";

    const res = await addBank(finalName, numNo, cleanBal, bankType, walletName.trim() || "Pribadi");
    if (res.status === "success") {
      showAlert(`${finalName} masuk dompet ${walletName.trim() || "Pribadi"} dengan saldo awal ${formatRp(cleanBal)}.`, "success", "Rekening ditambahkan");
      // Reset form
      setBankName("");
      setAccountNumber("");
      setInitialBalance("");
      setEwalletBrand("");
      setEmoneyBrand("");
    } else {
      showAlert(res.message || "Gagal membuat akun.", "error");
    }
  };

  // Open Edit modal
  const handleEditClick = (b: any) => {
    setEditBankItem(b);
    setEditName(b.name);
    setEditNo(b.account_number === "-" ? "" : b.account_number);
    setEditWallet(b.wallet_name || "Pribadi");
    setIsEditOpen(true);
  };

  // Submit Edit changes
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName) {
      showAlert("Nama akun wajib diisi!", "error");
      return;
    }
    const res = await updateBank({
      id: editBankItem.id,
      name: editName,
      accountNumber: editNo,
      walletName: editWallet.trim() || "Pribadi",
    });
    if (res.status === "success") {
      showAlert(`${editName} tersimpan di dompet ${editWallet.trim() || "Pribadi"}.`, "success", "Rekening diperbarui");
      setIsEditOpen(false);
      setEditBankItem(null);
    } else {
      showAlert(res.message || "Gagal memperbarui rekening.", "error");
    }
  };

  // Delete account
  const handleDeleteClick = async (id: string) => {
    showConfirm(
      "Hapus akun bank ini? Seluruh transaksi terkait akan ikut terhapus!",
      async () => {
        const res = await deleteBank(id);
        if (res.status !== "success") {
          showAlert(res.message || "Gagal menghapus akun.", "error");
        }
      },
      { title: "Konfirmasi Hapus", type: "danger" }
    );
  };

  // Urutan & label tipe akun untuk daftar yang dikelompokkan
  const ACCOUNT_TYPES: { id: string; label: string; icon: typeof Wallet }[] = [
    { id: "bank", label: "Bank", icon: Building2 },
    { id: "ewallet", label: "E-Wallet", icon: Smartphone },
    { id: "emoney", label: "E-Money", icon: Coins },
    { id: "cash", label: "Tunai", icon: Wallet },
    { id: "credit_card", label: "Kartu Kredit", icon: CreditCard },
    { id: "paylater", label: "Paylater", icon: ShoppingBag },
  ];

  // Porsi tiap rekening terhadap aset likuid (untuk bar komposisi)
  const assetShares = banks
    .filter((b) => b.account_type !== "credit_card" && b.account_type !== "paylater" && Number(b.currentBalance) > 0)
    .map((b) => ({
      id: b.id,
      name: b.name,
      pct: stats.assets > 0 ? (Number(b.currentBalance) / stats.assets) * 100 : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  const groupedBanks = ACCOUNT_TYPES.map((t) => {
    const items = filteredBanks.filter((b) => (b.account_type || "bank") === t.id);
    const subtotal = items.reduce((sum, b) => sum + (Number(b.currentBalance) || 0), 0);
    return { ...t, items, subtotal };
  }).filter((g) => g.items.length > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sidebar Filter and Form */}
      <div className="lg:col-span-1 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Tipe Rekening</h3>
          <div className="flex flex-wrap gap-1.5">
            {[{ id: "all", label: "Semua" }, ...ACCOUNT_TYPES].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                  activeFilter === f.id
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Add bank form */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-xl shrink-0">
              <PlusCircle className="w-4 h-4" />
            </div>
            <h3 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">
              Tambah Akun Rekening
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Tipe Akun
              </label>
              <select
                value={bankType}
                onChange={(e) => setBankType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              >
                <option value="bank">Bank / Rekening</option>
                <option value="ewallet">E-Wallet</option>
                <option value="emoney">E-Money</option>
                <option value="credit_card">Kartu Kredit</option>
                <option value="paylater">Paylater (Cicilan)</option>
                <option value="cash">Uang Tunai (Cash)</option>
              </select>
            </div>

            {/* Name input conditional */}
            {bankType === "ewallet" ? (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Brand E-Wallet
                </label>
                <select
                  required
                  value={ewalletBrand}
                  onChange={(e) => setEwalletBrand(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                >
                  <option value="">Pilih Brand...</option>
                  {EWALLET_BRANDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            ) : bankType === "emoney" ? (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Jenis E-Money
                </label>
                <select
                  required
                  value={emoneyBrand}
                  onChange={(e) => setEmoneyBrand(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                >
                  <option value="">Pilih Jenis...</option>
                  {EMONEY_BRANDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nama Akun / Nama Bank
                </label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder={
                    bankType === "paylater"
                      ? "Misal: Shopee Paylater"
                      : bankType === "credit_card"
                      ? "Misal: CC BCA Batman"
                      : bankType === "cash"
                      ? "Misal: Dompet Utama"
                      : "Misal: BCA, Bank Mandiri"
                  }
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            )}

            {/* Account Number (skip for Cash) */}
            {bankType !== "cash" && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  {bankType === "ewallet" ? "Nomor HP E-Wallet" : "Nomor Rekening / Kartu"}
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Misal: 08123456... atau 123456..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            )}

            {/* Dompet */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Dompet / Buku
              </label>
              <input
                list="wallet-options"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="Pribadi, Kontrakan, Usaha..."
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
              <datalist id="wallet-options">
                {wallets.map((w) => (
                  <option key={w} value={w} />
                ))}
              </datalist>
              <p className="text-[10px] text-slate-400 mt-1.5">Pisahkan keuangan kontrakan/usaha dari pribadi. Ketik nama baru untuk membuat dompet.</p>
            </div>

            {/* Initial Balance */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Saldo Awal
              </label>
              <input
                type="text"
                required
                value={initialBalance}
                onChange={(e) => handleAmountChange(e.target.value, setInitialBalance)}
                placeholder="Rp 0"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-100 transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Simpan Rekening</span>
            </button>
          </form>
        </div>
      </div>

      {/* Main */}
      <div className="lg:col-span-2 space-y-6">
        {/* Ringkasan ringkas */}
        <div className="bg-slate-900 text-white rounded-2xl px-5 py-4 shadow-lg relative overflow-hidden opacity-0 animate-fade-in-up">
          <div className="absolute -right-16 -top-24 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Saldo Bersih</p>
              <p className="text-2xl font-black tabular-nums tracking-tight leading-tight">
                <AnimatedNumber value={stats.assets - stats.debt} formatter={formatRp} />
              </p>
            </div>
            <div className="flex items-center gap-6 text-right">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Aset Likuid</p>
                <p className="text-xs font-black tabular-nums mt-0.5">
                  <AnimatedNumber value={stats.assets} formatter={formatRp} />
                </p>
              </div>
              <div className="w-px h-7 bg-white/10" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Hutang Kartu</p>
                <p className={`text-xs font-black tabular-nums mt-0.5 ${stats.debt > 0 ? "text-rose-400" : ""}`}>
                  <AnimatedNumber value={stats.debt} formatter={formatRp} />
                </p>
              </div>
              <div className="w-px h-7 bg-white/10" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Akun</p>
                <p className="text-xs font-black tabular-nums mt-0.5">{banks.length}</p>
              </div>
            </div>
          </div>

          {assetShares.length > 0 && (
            <div className="relative mt-3.5 flex items-center gap-4">
              <div className="flex-1 flex h-1.5 rounded-full overflow-hidden bg-white/10 gap-px">
                {assetShares.map((a, idx) => (
                  <div
                    key={a.id}
                    className={`${SHARE_COLORS[idx % SHARE_COLORS.length]} animate-bar-grow`}
                    style={{ width: `${a.pct}%`, animationDelay: `${200 + idx * 80}ms` }}
                    title={`${a.name} ${a.pct.toFixed(1)}%`}
                  />
                ))}
              </div>
              <div className="hidden sm:flex items-center gap-3 shrink-0">
                {assetShares.slice(0, 3).map((a, idx) => (
                  <span key={a.id} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-300">
                    <span className={`w-1.5 h-1.5 rounded-full ${SHARE_COLORS[idx % SHARE_COLORS.length]}`} />
                    <span className="max-w-[110px] truncate">{a.name}</span>
                    <span className="text-slate-500 tabular-nums">{a.pct.toFixed(0)}%</span>
                  </span>
                ))}
                {assetShares.length > 3 && (
                  <span className="text-[10px] font-semibold text-slate-500">+{assetShares.length - 3}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rekening per tipe */}
        {groupedBanks.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-400 font-semibold">
            Belum ada rekening dengan tipe ini.
          </div>
        ) : (
          groupedBanks.map((g, gi) => (
            <section key={g.id}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <g.icon className="w-3.5 h-3.5" /> {g.label}
                  <span className="text-slate-300">· {g.items.length}</span>
                </h4>
                <span className="text-[11px] font-bold text-slate-500 tabular-nums">{formatRp(g.subtotal)}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {g.items.map((b, idx) => {
                  const balance = Number(b.currentBalance) || 0;
                  const isDebtType = b.account_type === "credit_card" || b.account_type === "paylater";
                  const share = !isDebtType && stats.assets > 0 && balance > 0 ? (balance / stats.assets) * 100 : 0;
                  return (
                    <AccountCard
                      key={b.id}
                      bank={b}
                      typeLabel={b.wallet_name && b.wallet_name !== "Pribadi" ? `${g.label} · ${b.wallet_name}` : g.label}
                      share={share}
                      delayMs={120 + (gi * 3 + idx) * 80}
                      renderAmount={(v) => <AnimatedNumber value={v} formatter={formatRp} />}
                      onEdit={() => handleEditClick(b)}
                      onDelete={() => handleDeleteClick(b.id)}
                    />
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditBankItem(null);
        }}
        title={`Edit ${editBankItem?.name ?? "Rekening"}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Rekening</label>
            <input
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nomor Rekening</label>
              <input
                value={editNo}
                onChange={(e) => setEditNo(e.target.value)}
                placeholder="-"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Dompet / Buku</label>
              <input
                list="wallet-options-edit"
                value={editWallet}
                onChange={(e) => setEditWallet(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <datalist id="wallet-options-edit">
                {wallets.map((w) => (
                  <option key={w} value={w} />
                ))}
              </datalist>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Saldo awal tidak bisa diubah di sini. Untuk menyesuaikan saldo, catat transaksi pemasukan/pengeluaran supaya riwayatnya tetap akurat.
          </p>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsEditOpen(false);
                setEditBankItem(null);
              }}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm"
            >
              Batal
            </button>
            <button type="submit" className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 text-sm shadow-md shadow-emerald-100">
              Simpan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
