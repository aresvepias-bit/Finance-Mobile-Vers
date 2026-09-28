"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Modal } from "./ui/Modal";
import { DatePicker } from "./ui/DatePicker";
import {
  TrendingUp,
  Percent,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Lock,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  Clock,
  Coins,
  ArrowUpRight,
  Sparkles,
  PieChart,
  DollarSign,
  PlusCircle,
  LockKeyhole,
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

export function PortfolioView() {
  const {
    banks,
    deposits,
    cryptos,
    addDeposit,
    updateDepositStatus,
    deleteDeposit,
    addCrypto,
    updateCrypto,
    deleteCrypto,
    showAlert,
    showConfirm,
    formatRp,
  } = useAppState();

  const [activeTab, setActiveTab] = useState<"deposits" | "cryptos">("deposits");
  const [animateCards, setAnimateCards] = useState(false);

  useEffect(() => {
    setAnimateCards(true);
  }, []);

  // Form Deposito states
  const [depoName, setDepoName] = useState("");
  const [depoBankId, setDepoBankId] = useState("");
  const [depoAmount, setDepoAmount] = useState("");
  const [depoRate, setDepoRate] = useState("");
  const [depoTenor, setDepoTenor] = useState("");
  const [depoStartDate, setDepoStartDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Form Kripto states
  const [cryptoName, setCryptoName] = useState("");
  const [cryptoQty, setCryptoQty] = useState("");
  const [cryptoVal, setCryptoVal] = useState("");

  // Edit Kripto modal states
  const [isEditCryptoOpen, setIsEditCryptoOpen] = useState(false);
  const [editCryptoItem, setEditCryptoItem] = useState<any>(null);
  const [editCryptoQty, setEditCryptoQty] = useState("");
  const [editCryptoVal, setEditCryptoVal] = useState("");


  const cleanNumber = (str: string) => {
    const clean = str.replace(/\D/g, "");
    return clean ? parseInt(clean, 10) : 0;
  };

  const handleAmountChange = (val: string, setter: (s: string) => void) => {
    const num = cleanNumber(val);
    setter(num ? new Intl.NumberFormat("id-ID").format(num) : "");
  };

  // Submit Deposito
  const handleDepoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!depoName || !depoBankId || !depoAmount || !depoRate || !depoTenor || !depoStartDate) {
      showAlert("Isi data deposito dengan lengkap!", "error");
      return;
    }

    const start = new Date(depoStartDate + "T00:00:00");
    const tenorMonths = parseInt(depoTenor, 10) || 0;
    const maturity = new Date(start);
    maturity.setMonth(maturity.getMonth() + tenorMonths);

    const payload = {
      name: depoName,
      bankId: depoBankId,
      amount: cleanNumber(depoAmount),
      rate: parseFloat(depoRate),
      tenor: tenorMonths,
      startDate: depoStartDate,
      maturityDate: maturity.toISOString().split("T")[0],
    };

    const res = await addDeposit(payload);
    if (res.status === "success") {
      setDepoName("");
      setDepoAmount("");
      setDepoRate("");
      setDepoTenor("");
      setDepoStartDate(new Date().toISOString().split("T")[0]);
      showAlert("Deposito berhasil ditambahkan!", "success");
    } else {
      showAlert(res.message || "Gagal menyimpan deposito.", "error");
    }
  };

  // Submit Kripto
  const handleCryptoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cryptoName || !cryptoQty || !cryptoVal) {
      showAlert("Isi data kripto dengan lengkap!", "error");
      return;
    }

    const res = await addCrypto(cryptoName.toUpperCase(), parseFloat(cryptoQty), cleanNumber(cryptoVal));
    if (res.status === "success") {
      setCryptoName("");
      setCryptoQty("");
      setCryptoVal("");
      showAlert("Aset kripto berhasil disimpan!", "success");
    } else {
      showAlert(res.message || "Gagal menyimpan kripto.", "error");
    }
  };

  // Deposito status update (withdraw)
  const handleWithdrawClick = async (id: string) => {
    showConfirm(
      "Apakah deposito ini sudah dicairkan / ditarik?",
      async () => {
        const res = await updateDepositStatus(id, "withdrawn");
        if (res.status === "success") {
          showAlert("Status deposito diperbarui menjadi Dicairkan!", "success");
        } else {
          showAlert(res.message || "Gagal memperbarui status.", "error");
        }
      },
      { title: "Pencairan Deposito", type: "info" }
    );
  };

  // Open Edit Crypto modal
  const handleEditCryptoClick = (c: any) => {
    setEditCryptoItem(c);
    setEditCryptoQty(c.quantity.toString());
    setEditCryptoVal(new Intl.NumberFormat("id-ID").format(c.value_idr));
    setIsEditCryptoOpen(true);
  };

  // Submit Edit Crypto
  const handleEditCryptoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editCryptoQty || !editCryptoVal) {
      showAlert("Isi data update dengan lengkap!", "error");
      return;
    }

    const res = await updateCrypto(
      editCryptoItem.id,
      editCryptoItem.name,
      parseFloat(editCryptoQty),
      cleanNumber(editCryptoVal)
    );

    if (res.status === "success") {
      setIsEditCryptoOpen(false);
      setEditCryptoItem(null);
      showAlert("Aset kripto berhasil diperbarui!", "success");
    } else {
      showAlert(res.message || "Gagal memperbarui aset kripto.", "error");
    }
  };

  // Delete mutations
  const handleDeleteDepo = async (id: string) => {
    showConfirm(
      "Hapus catatan deposito ini?",
      async () => {
        await deleteDeposit(id);
        showAlert("Catatan deposito dihapus!", "success");
      },
      { title: "Hapus Deposito", type: "danger" }
    );
  };

  const handleDeleteCrypto = async (id: string) => {
    showConfirm(
      "Hapus catatan kripto ini?",
      async () => {
        await deleteCrypto(id);
        showAlert("Catatan kripto dihapus!", "success");
      },
      { title: "Hapus Kripto", type: "danger" }
    );
  };

  // Helper: Calculate tenor progress percentage
  const getMaturityProgress = (startStr: string, maturityStr: string) => {
    if (!startStr || !maturityStr) return 0;
    const start = new Date(startStr + "T00:00:00").getTime();
    const maturity = new Date(maturityStr + "T00:00:00").getTime();
    const today = new Date().getTime();
    
    if (today >= maturity) return 100;
    if (today <= start) return 0;
    
    const totalDuration = maturity - start;
    const elapsed = today - start;
    return Math.min(Math.max(Math.round((elapsed / totalDuration) * 100), 0), 100);
  };

  // Deposito analytical stats
  const depoStats = useMemo(() => {
    let totalActive = 0;
    let estMonthlyInterest = 0;

    deposits.forEach((d) => {
      if (d.status === "active") {
        const amount = Number(d.amount) || 0;
        const rate = Number(d.rate) || 0; // % per year
        totalActive += amount;
        estMonthlyInterest += (amount * (rate / 100)) / 12;
      }
    });

    return { totalActive, estMonthlyInterest };
  }, [deposits]);

  // Crypto allocation & mapping
  const cryptoListWithShare = useMemo(() => {
    const total = cryptos.reduce((sum, c) => sum + Number(c.value_idr), 0);
    return cryptos
      .map((c) => {
        const val = Number(c.value_idr) || 0;
        const share = total > 0 ? (val / total) * 100 : 0;
        return {
          ...c,
          share: parseFloat(share.toFixed(1)),
        };
      })
      .sort((a, b) => Number(b.value_idr) - Number(a.value_idr));
  }, [cryptos]);

  const cryptoTotal = useMemo(() => {
    return cryptos.reduce((sum, c) => sum + Number(c.value_idr), 0);
  }, [cryptos]);

  // Color helpers for coins
  const getCoinColorClass = (name: string) => {
    const n = name.toUpperCase();
    if (n === "BTC") return "bg-gradient-to-r from-amber-400 to-amber-500 shadow-amber-400/20";
    if (n === "ETH") return "bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-indigo-500/20";
    if (n === "USDT" || n === "USDC") return "bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-emerald-400/20";
    if (n === "SOL") return "bg-gradient-to-r from-purple-500 to-pink-500 shadow-purple-500/20";
    if (n === "BNB") return "bg-gradient-to-r from-yellow-400 to-yellow-500 shadow-yellow-400/20";
    return "bg-gradient-to-r from-cyan-400 to-emerald-500 shadow-cyan-400/20";
  };

  const getCryptoCardStyle = (name: string) => {
    const n = name.toUpperCase();
    if (n === "BTC") return "border-l-2 border-l-amber-400 hover:border-amber-200/80";
    if (n === "ETH") return "border-l-2 border-l-indigo-400 hover:border-indigo-200/80";
    if (n === "USDT" || n === "USDC") return "border-l-2 border-l-emerald-400 hover:border-emerald-200/80";
    if (n === "SOL") return "border-l-2 border-l-purple-400 hover:border-purple-200/80";
    return "border-l-2 border-l-cyan-400 hover:border-cyan-200/80";
  };

  const getCoinWatermarkSymbol = (name: string) => {
    const n = name.toUpperCase();
    if (n === "BTC") return "₿";
    if (n === "ETH") return "Ξ";
    if (n === "USDT") return "₮";
    if (n === "USDC") return "$";
    if (n === "SOL") return "S";
    return n.slice(0, 3);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Forms column */}
      <div className="lg:col-span-1 space-y-6">
        {/* Toggle subtab with slide transition */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="relative flex bg-slate-100 p-1 rounded-xl select-none">
            {/* Sliding background indicator */}
            <div
              className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm transition-all duration-300 ease-out"
              style={{
                left: activeTab === "deposits" ? "4px" : "calc(50% + 2px)",
                width: "calc(50% - 6px)",
              }}
            />
            <button
              onClick={() => setActiveTab("deposits")}
              className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all z-10 flex items-center justify-center gap-1.5 ${
                activeTab === "deposits" ? "text-cyan-700" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <LockKeyhole className="w-3.5 h-3.5" />
              <span>Deposito</span>
            </button>
            <button
              onClick={() => setActiveTab("cryptos")}
              className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all z-10 flex items-center justify-center gap-1.5 ${
                activeTab === "cryptos" ? "text-cyan-700" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Kripto</span>
            </button>
          </div>
        </div>

        {/* Dynamic add form */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          {activeTab === "deposits" ? (
            <form onSubmit={handleDepoSubmit} className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl border border-cyan-100/80 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">
                  Tambah Deposito
                </h3>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nama Deposito
                </label>
                <input
                  type="text"
                  required
                  value={depoName}
                  onChange={(e) => setDepoName(e.target.value)}
                  placeholder="Misal: Deposito Berjangka BCA"
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Akun Sumber Dana
                </label>
                <select
                  required
                  value={depoBankId}
                  onChange={(e) => setDepoBankId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                >
                  <option value="">Pilih Bank...</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nominal Penempatan
                </label>
                <input
                  type="text"
                  required
                  value={depoAmount}
                  onChange={(e) => handleAmountChange(e.target.value, setDepoAmount)}
                  placeholder="Rp 0"
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Bunga (% p.a.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={depoRate}
                    onChange={(e) => setDepoRate(e.target.value)}
                    placeholder="Misal: 5.25"
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Tenor (Bulan)
                  </label>
                  <input
                    type="number"
                    required
                    value={depoTenor}
                    onChange={(e) => setDepoTenor(e.target.value)}
                    placeholder="Misal: 12"
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Tanggal Mulai
                </label>
                <DatePicker
                  value={depoStartDate}
                  onChange={setDepoStartDate}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold text-sm shadow-md shadow-cyan-100 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>Simpan Deposito</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleCryptoSubmit} className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl border border-cyan-100/80 shrink-0">
                  <Coins className="w-4 h-4" />
                </div>
                <h3 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">
                  Tambah Aset Kripto
                </h3>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nama Koin
                </label>
                <input
                  type="text"
                  required
                  value={cryptoName}
                  onChange={(e) => setCryptoName(e.target.value)}
                  placeholder="Misal: BTC, ETH, USDT"
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Jumlah (Quantity)
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  required
                  value={cryptoQty}
                  onChange={(e) => setCryptoQty(e.target.value)}
                  placeholder="Misal: 0.025"
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nilai Rupiah Saat Ini
                </label>
                <input
                  type="text"
                  required
                  value={cryptoVal}
                  onChange={(e) => handleAmountChange(e.target.value, setCryptoVal)}
                  placeholder="Rp 0"
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold text-sm shadow-md shadow-cyan-100 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>Simpan Koin</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Main Grid display column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Total Summary - Frosted Double KPI Grid */}
        {activeTab === "deposits" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Active Depo */}
            <div
              className={`bg-white backdrop-blur-md rounded-3xl p-5 border border-slate-100/80 shadow-sm flex items-center gap-4 hover:border-slate-200 hover:shadow-md transition-all duration-700 ease-out transform ${
                animateCards ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <div className="p-3 bg-cyan-500/10 text-cyan-600 rounded-2xl border border-cyan-500/20 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Deposito Aktif
                </p>
                <h3 className="text-lg font-black text-slate-800 mt-0.5">
                  <AnimatedNumber value={depoStats.totalActive} formatter={formatRp} />
                </h3>
              </div>
            </div>
            {/* Est Monthly passive income */}
            <div
              className={`bg-white backdrop-blur-md rounded-3xl p-5 border border-slate-100/80 shadow-sm flex items-center gap-4 hover:border-slate-200 hover:shadow-md transition-all duration-700 ease-out transform ${
                animateCards ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
              style={{ transitionDelay: "40ms" }}
            >
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl border border-emerald-500/20 shrink-0">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Estimasi Bunga Bulanan
                </p>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  <AnimatedNumber value={depoStats.estMonthlyInterest} formatter={formatRp} />
                </h3>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total crypto investment */}
            <div
              className={`bg-white backdrop-blur-md rounded-3xl p-5 border border-slate-100/80 shadow-sm flex items-center gap-4 hover:border-slate-200 hover:shadow-md transition-all duration-700 ease-out transform ${
                animateCards ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <div className="p-3 bg-cyan-500/10 text-cyan-600 rounded-2xl border border-cyan-500/20 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Investasi Kripto
                </p>
                <h3 className="text-lg font-black text-slate-800 mt-0.5">
                  <AnimatedNumber value={cryptoTotal} formatter={formatRp} />
                </h3>
              </div>
            </div>
            {/* Diversity count */}
            <div
              className={`bg-white backdrop-blur-md rounded-3xl p-5 border border-slate-100/80 shadow-sm flex items-center gap-4 hover:border-slate-200 hover:shadow-md transition-all duration-700 ease-out transform ${
                animateCards ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
              style={{ transitionDelay: "40ms" }}
            >
              <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-2xl border border-indigo-500/20 shrink-0">
                <PieChart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Aset Koin Berbeda
                </p>
                <h3 className="text-lg font-black text-slate-800 mt-0.5">
                  <AnimatedNumber value={cryptos.length} formatter={(val) => `${Math.round(val)} Koin`} />
                </h3>
              </div>
            </div>
          </div>
        )}

        {/* Display Items List */}
        {activeTab === "deposits" ? (
          <div className="space-y-4">
            {deposits.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 font-semibold shadow-sm">
                Belum ada penempatan deposito tercatat.
              </div>
            ) : (
              deposits.map((d, index) => {
                const isActive = d.status === "active";
                const monthlyInterest = (Number(d.amount) * (Number(d.rate) / 100)) / 12;
                const estYield = Number(d.amount) + (monthlyInterest * Number(d.tenor));

                return (
                  <div
                    key={d.id}
                    style={{ transitionDelay: `${index * 45}ms` }}
                    className={`bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group flex flex-col justify-between gap-4 transition-all duration-700 ease-out transform hover:-translate-y-0.5 hover:shadow-md ${
                      !isActive ? "opacity-60 bg-slate-50/50" : ""
                    } ${
                      animateCards ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <h4 className="font-black text-slate-800 text-sm leading-tight">
                            {d.name}
                          </h4>
                          <span
                            className={`text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${
                              isActive
                                ? "bg-cyan-50 text-cyan-700 border-cyan-100"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                          >
                            {isActive ? "Aktif" : "Dicairkan"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold">
                          Dana Asal: <span className="text-slate-600 font-extrabold">{d.bank_name}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {isActive && (
                          <button
                            onClick={() => handleWithdrawClick(d.id)}
                            className="py-1.5 px-3 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded-xl font-bold text-[10px] border border-cyan-150 flex items-center gap-1 transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Cairkan
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteDepo(d.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Yield breakdown grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50">
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Penempatan</p>
                        <p className="text-xs font-extrabold text-slate-700 mt-0.5">
                          <AnimatedNumber value={Number(d.amount)} formatter={formatRp} />
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Bunga Rate</p>
                        <p className="text-xs font-extrabold text-slate-700 mt-0.5">{d.rate}% p.a.</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Bunga Bulanan</p>
                        <p className="text-xs font-extrabold text-slate-900 mt-0.5">
                          <AnimatedNumber value={monthlyInterest} formatter={formatRp} />
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Estimasi Cair</p>
                        <p className="text-xs font-extrabold text-slate-800 mt-0.5">
                          <AnimatedNumber value={estYield} formatter={formatRp} />
                        </p>
                      </div>
                    </div>

                    {/* Progress Timeline */}
                    {isActive && (() => {
                      const progress = getMaturityProgress(d.start_date, d.maturity_date);
                      const isMature = progress >= 100;
                      return (
                        <div className="pt-2">
                          <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 mb-1.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                              <span>Tenor Progress ({d.tenor} Bulan) &bull; Jatuh Tempo: {d.maturity_date}</span>
                            </span>
                            <span className={`font-black ${isMature ? "text-emerald-600 font-black animate-pulse" : "text-slate-500"}`}>
                              {isMature ? "Jatuh Tempo! (100%)" : `${progress}%`}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${
                                isMature
                                  ? "bg-gradient-to-r from-emerald-400 to-teal-500"
                                  : "bg-gradient-to-r from-cyan-400 to-indigo-500"
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {cryptoListWithShare.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 font-semibold shadow-sm">
                Belum ada aset koin kripto tercatat.
              </div>
            ) : (
              cryptoListWithShare.map((c, index) => (
                <div
                  key={c.id}
                  style={{ transitionDelay: `${index * 45}ms` }}
                  className={`bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group flex flex-col justify-between gap-4 transition-all duration-700 ease-out transform hover:-translate-y-0.5 hover:shadow-md ${getCryptoCardStyle(
                    c.name
                  )} ${
                    animateCards ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                  }`}
                >
                  {/* Coin watermark symbol */}
                  <span className="absolute -right-2 -bottom-6 text-7xl font-black text-slate-100/30 font-mono rotate-12 select-none pointer-events-none group-hover:scale-105 group-hover:rotate-[15deg] transition-all duration-500">
                    {getCoinWatermarkSymbol(c.name)}
                  </span>

                  <div className="flex justify-between items-start z-10">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-800 text-sm leading-tight">
                          {c.name}
                        </h4>
                        <span className="text-[8px] uppercase tracking-wider font-extrabold bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded border border-slate-100">
                          koin
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">
                        Jumlah: <span className="font-extrabold text-slate-600">{c.quantity} {c.name}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button
                        onClick={() => handleEditCryptoClick(c)}
                        className="py-1.5 px-3 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded-xl font-bold text-[10px] border border-cyan-150 flex items-center gap-1 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Nilai
                      </button>
                      <button
                        onClick={() => handleDeleteCrypto(c.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Pricing and allocation indicator */}
                  <div className="mt-2 z-10">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Nilai Portofolio</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">
                      <AnimatedNumber value={Number(c.value_idr)} formatter={formatRp} />
                    </p>

                    {/* Progress Share Weight */}
                    <div className="mt-3">
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold mb-1">
                        <span>Alokasi Portofolio</span>
                        <span>
                          <AnimatedNumber value={c.share} formatter={(val) => `${val.toFixed(1)}%`} />
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${getCoinColorClass(
                            c.name
                          )}`}
                          style={{ width: `${c.share}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Edit Crypto Modal */}
      <Modal
        isOpen={isEditCryptoOpen}
        onClose={() => {
          setIsEditCryptoOpen(false);
          setEditCryptoItem(null);
        }}
        title={`Update Nilai ${editCryptoItem?.name}`}
      >
        {editCryptoItem && (
          <form onSubmit={handleEditCryptoSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Jumlah Koin (Qty)
              </label>
              <input
                type="number"
                step="0.00000001"
                required
                value={editCryptoQty}
                onChange={(e) => setEditCryptoQty(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Nilai Rupiah Terkini
              </label>
              <input
                type="text"
                required
                value={editCryptoVal}
                onChange={(e) => handleAmountChange(e.target.value, setEditCryptoVal)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditCryptoOpen(false);
                  setEditCryptoItem(null);
                }}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-cyan-600 text-white font-semibold hover:bg-cyan-700 text-sm transition-all shadow-md shadow-cyan-100"
              >
                Update Aset
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
