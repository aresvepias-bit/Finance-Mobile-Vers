"use client";

import React, { useState, useMemo } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Modal } from "./ui/Modal";
import { DatePicker } from "./ui/DatePicker";
import { CategorySelect } from "./ui/CategorySelect";
import {
  Plus,
  Trash2,
  Edit2,
  ArrowRightLeft,
  Calendar,
  AlertCircle,
  FileText,
  Percent,
} from "lucide-react";

export function TransactionForm() {
  const {
    banks,
    categories,
    transactions,
    fixedCosts,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    showConfirm,
    showAlert,
    formatRp,
  } = useAppState();

  const [activeSubTab, setActiveSubTab] = useState<"expense" | "income" | "transfer">("expense");

  // Filter bulan untuk riwayat transaksi
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // States form regular
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [bankId, setBankId] = useState("");
  const [categorySelect, setCategorySelect] = useState("");
  const [discount, setDiscount] = useState("");
  const [transferToBankId, setTransferToBankId] = useState("");

  // States fast log templates
  const [quickQty, setQuickQty] = useState<Record<string, number>>({});
  const [quickBankId, setQuickBankId] = useState("");
  const [quickDate, setQuickDate] = useState(() => new Date().toISOString().split("T")[0]);

  // States edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBankId, setEditBankId] = useState("");
  const [editCategorySelect, setEditCategorySelect] = useState("");
  const [editDiscount, setEditDiscount] = useState("");


  // Helper parsing numeric input
  const cleanNumber = (str: string) => {
    const clean = str.replace(/\D/g, "");
    return clean ? parseInt(clean, 10) : 0;
  };

  const handleAmountChange = (val: string, setter: (s: string) => void) => {
    const num = cleanNumber(val);
    setter(num ? new Intl.NumberFormat("id-ID").format(num) : "");
  };

  // Ganti tab: kategori pengeluaran & pemasukan berbeda, jadi pilihan di-reset
  const switchSubTab = (tab: "expense" | "income" | "transfer") => {
    setActiveSubTab(tab);
    setCategorySelect("");
  };

  // Filter & group transactions by date for selected month
  const filteredTransactionsGrouped = useMemo(() => {
    const list = transactions.filter((t) => t.date && t.date.slice(0, 7) === filterMonth);

    // Group by date
    const grouped: Record<string, { items: any[]; total: number }> = {};
    list.forEach((t) => {
      const dateStr = t.date;
      if (!grouped[dateStr]) {
        grouped[dateStr] = { items: [], total: 0 };
      }
      grouped[dateStr].items.push(t);
      if (t.type === "expense" && t.categoryName !== "Transfer Keluar") {
        grouped[dateStr].total += Number(t.amount) || 0;
      }
    });

    // Sort dates desc
    return Object.keys(grouped)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map((dateStr) => ({
        date: dateStr,
        items: grouped[dateStr].items,
        total: grouped[dateStr].total,
      }));
  }, [transactions, filterMonth]);

  // Submit regular transaction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanAmt = cleanNumber(amount);
    if (cleanAmt <= 0) {
      showAlert("Masukkan nominal transaksi!", "error");
      return;
    }

    if (!bankId) {
      showAlert("Pilih akun bank!", "error");
      return;
    }

    let payload: any = {
      type: activeSubTab,
      amount: cleanAmt,
      date,
      description,
      bankId,
    };

    if (activeSubTab === "transfer") {
      if (!transferToBankId) {
        showAlert("Pilih akun tujuan!", "error");
        return;
      }
      if (bankId === transferToBankId) {
        showAlert("Akun asal dan tujuan tidak boleh sama!", "error");
        return;
      }
      payload.transferToBankId = transferToBankId;
    } else {
      if (!categorySelect) {
        showAlert("Pilih kategori!", "error");
        return;
      }
      payload.categoryId = categorySelect;
      payload.discount = cleanNumber(discount);
    }

    const res = await addTransaction(payload);
    if (res.status === "success") {
      setAmount("");
      setDescription("");
      setDiscount("");
      showAlert("Transaksi berhasil dicatat!", "success");
    } else {
      showAlert(res.message || "Gagal mencatat transaksi.", "error");
    }
  };

  // Handle template counter changes
  const updateQuickQty = (id: string, delta: number) => {
    setQuickQty((prev) => {
      const cur = prev[id] || 0;
      const next = cur + delta;
      return { ...prev, [id]: next < 0 ? 0 : next };
    });
  };

  // Submit template fast logging
  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quickBankId) {
      showAlert("Pilih akun bank!", "error");
      return;
    }

    const itemsToLog = Object.keys(quickQty)
      .filter((id) => quickQty[id] > 0)
      .map((id) => {
        const fc = fixedCosts.find((item) => item.id === id);
        return { fc, qty: quickQty[id] };
      });

    if (itemsToLog.length === 0) {
      showAlert("Pilih minimal satu template dengan menekan tombol (+)!", "error");
      return;
    }

    for (const item of itemsToLog) {
      if (!item.fc) continue;
      const totalAmount = item.fc.amount * item.qty;
      const suffix = item.qty > 1 ? ` (x${item.qty})` : "";

      await addTransaction({
        type: "expense",
        amount: totalAmount,
        date: quickDate,
        description: item.fc.name + suffix,
        bankId: quickBankId,
        categoryId: item.fc.subCategoryId || item.fc.categoryId,
      });
    }

    // Reset Counters
    setQuickQty({});
    showAlert("Semua transaksi cepat berhasil dicatat!", "success");
  };

  // Open Edit modal
  const handleEditClick = (tx: any) => {
    setEditTx(tx);
    setEditAmount(new Intl.NumberFormat("id-ID").format(tx.amount));
    setEditDate(tx.date);
    setEditDescription(tx.description);
    setEditBankId(tx.bankId);
    setEditDiscount(tx.discount ? new Intl.NumberFormat("id-ID").format(tx.discount) : "");

    setEditCategorySelect(tx.subCategoryId || tx.categoryId || "");

    setIsEditOpen(true);
  };

  // Submit Edit transaction
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanAmt = cleanNumber(editAmount);
    if (cleanAmt <= 0) {
      showAlert("Masukkan nominal transaksi!", "error");
      return;
    }

    let payload: any = {
      id: editTx.id,
      type: editTx.type,
      amount: cleanAmt,
      date: editDate,
      description: editDescription,
      bankId: editBankId,
    };

    payload.categoryId = editCategorySelect;
    payload.discount = cleanNumber(editDiscount);

    const res = await updateTransaction(payload);
    if (res.status === "success") {
      setIsEditOpen(false);
      setEditTx(null);
      showAlert("Transaksi berhasil diubah!", "success");
    } else {
      showAlert(res.message || "Gagal mengubah transaksi.", "error");
    }
  };

  // Delete transaction
  const handleDeleteClick = (id: string) => {
    showConfirm(
      "Hapus data transaksi ini?",
      async () => {
        const res = await deleteTransaction(id);
        if (res.status === "success") {
          showAlert("Transaksi berhasil dihapus!", "success");
        } else {
          showAlert(res.message || "Gagal menghapus transaksi.", "error");
        }
      },
      { title: "Hapus Transaksi", type: "danger" }
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Forms column */}
      <div className="lg:col-span-1 space-y-6">
        {/* Transaction logger form */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-5">
            <button
              onClick={() => switchSubTab("expense")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeSubTab === "expense"
                  ? "bg-white text-rose-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Pengeluaran
            </button>
            <button
              onClick={() => switchSubTab("income")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeSubTab === "income"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Pemasukan
            </button>
            <button
              onClick={() => switchSubTab("transfer")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                activeSubTab === "transfer"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Nominal
              </label>
              <input
                type="text"
                required
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value, setAmount)}
                placeholder="Rp 0"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Date */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Tanggal
                </label>
                <DatePicker
                  value={date}
                  onChange={setDate}
                />
              </div>

              {/* Discount (only for expense) */}
              {activeSubTab === "expense" ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Hemat / Diskon
                  </label>
                  <input
                    type="text"
                    value={discount}
                    onChange={(e) => handleAmountChange(e.target.value, setDiscount)}
                    placeholder="Rp 0"
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all"
                  />
                </div>
              ) : (
                <div />
              )}
            </div>

            {/* Category (regular transactions) */}
            {activeSubTab !== "transfer" && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Kategori
                </label>
                <CategorySelect
                  categories={categories}
                  type={activeSubTab}
                  value={categorySelect}
                  onChange={setCategorySelect}
                />
              </div>
            )}

            {/* Bank Accounts */}
            <div className="grid grid-cols-2 gap-3">
              {/* Account / Source Account */}
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  {activeSubTab === "transfer" ? "Dari Rekening" : "Akun Bank"}
                </label>
                <select
                  required
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                >
                  <option value="">Pilih...</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Account (transfer) */}
              {activeSubTab === "transfer" ? (
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Ke Rekening
                  </label>
                  <select
                    required
                    value={transferToBankId}
                    onChange={(e) => setTransferToBankId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                  >
                    <option value="">Pilih...</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div />
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Keterangan
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Makan siang, bensin, dll"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all"
              />
            </div>

            <button
              type="submit"
              className={`w-full py-3 text-white rounded-xl font-bold text-sm shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99] ${
                activeSubTab === "expense"
                  ? "bg-rose-500 shadow-rose-200/50 hover:bg-rose-600"
                  : activeSubTab === "income"
                  ? "bg-emerald-500 shadow-emerald-200/50 hover:bg-emerald-600"
                  : "bg-emerald-600 shadow-emerald-200/50 hover:bg-emerald-700"
              }`}
            >
              Simpan Transaksi
            </button>
          </form>
        </div>

        {/* Fast Log templates */}
        {fixedCosts.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
              Catat Cepat
            </h3>
            <form onSubmit={handleQuickSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Akun Bank
                  </label>
                  <select
                    required
                    value={quickBankId}
                    onChange={(e) => setQuickBankId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                  >
                    <option value="">Pilih...</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Tanggal
                  </label>
                  <DatePicker
                    value={quickDate}
                    onChange={setQuickDate}
                  />
                </div>
              </div>

              {/* Template Items List */}
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {fixedCosts.map((fc) => (
                  <div
                    key={fc.id}
                    className="flex items-center justify-between p-2.5 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-700">{fc.name}</p>
                      <p className="text-[10px] text-rose-500 font-semibold mt-0.5">
                        {formatRp(fc.amount)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-0.5 border border-slate-200 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQuickQty(fc.id, -1)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-white text-slate-600 hover:text-rose-600 font-bold transition-all shadow-sm"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-slate-800">
                        {quickQty[fc.id] || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuickQty(fc.id, 1)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-white text-slate-600 hover:text-emerald-600 font-bold transition-all shadow-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-200/50 transition-all"
              >
                Catat Transaksi Cepat
              </button>
            </form>
          </div>
        )}
      </div>

      {/* History column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Transactions log list */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Riwayat Transaksi
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Daftar transaksi yang tercatat</p>
            </div>
            {/* Filter Month */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Bulan:
              </span>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1">
            {filteredTransactionsGrouped.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-semibold">
                  Belum ada transaksi dicatat untuk bulan ini.
                </p>
              </div>
            ) : (
              filteredTransactionsGrouped.map((group) => {
                const dateObj = new Date(group.date + "T00:00:00");
                const dayLabel = dateObj.toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });
                return (
                  <div key={group.date} className="space-y-2">
                    {/* Group Header */}
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {dayLabel}
                      </span>
                      <span className="text-xs font-black text-rose-500">
                        {group.total > 0 ? `-${formatRp(group.total)}` : "Rp 0"}
                      </span>
                    </div>

                    {/* Group Items */}
                    <div className="space-y-2">
                      {group.items.map((tx) => {
                        const isInc = tx.type === "income";
                        const isTransfer =
                          tx.categoryName === "Transfer Masuk" ||
                          tx.categoryName === "Transfer Keluar";
                        const amtColor = isTransfer
                          ? "text-slate-600"
                          : isInc
                          ? "text-slate-900"
                          : "text-rose-600";
                        const sign = isTransfer ? "" : isInc ? "+" : "-";

                        return (
                          <div
                            key={tx.id}
                            className="flex justify-between items-center p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors group relative"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2 rounded-lg ${
                                  isTransfer
                                    ? "bg-slate-100 text-slate-600"
                                    : isInc
                                    ? "bg-emerald-100 text-emerald-600"
                                    : "bg-rose-100 text-rose-600"
                                }`}
                              >
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800 flex flex-wrap items-center gap-1.5">
                                  {tx.categoryName}
                                  {tx.subCategoryName && (
                                    <span className="text-[9px] text-slate-400 font-semibold">
                                      &bull; {tx.subCategoryName}
                                    </span>
                                  )}
                                  <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                    {tx.bankName}
                                  </span>
                                  {tx.discount > 0 && (
                                    <span className="text-[8px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100 font-bold flex items-center gap-0.5">
                                      <Percent className="w-2.5 h-2.5" /> Hemat {formatRp(tx.discount)}
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[200px] sm:max-w-xs">
                                  {tx.description || "-"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className={`text-xs font-black ${amtColor}`}>
                                {sign}
                                {formatRp(tx.amount)}
                              </span>

                              {/* Edit/Delete Actions */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEditClick(tx)}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-emerald-600"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(tx.id)}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditTx(null);
        }}
        title="Edit Transaksi"
      >
        {editTx && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Nominal
              </label>
              <input
                type="text"
                required
                value={editAmount}
                onChange={(e) => handleAmountChange(e.target.value, setEditAmount)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tanggal
                </label>
                <DatePicker
                  value={editDate}
                  onChange={setEditDate}
                />
              </div>

              {/* Discount */}
              {editTx.type === "expense" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Hemat / Diskon
                  </label>
                  <input
                    type="text"
                    value={editDiscount}
                    onChange={(e) => handleAmountChange(e.target.value, setEditDiscount)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              ) : (
                <div />
              )}
            </div>

            {/* Category (only editable for non-transfers) */}
            {editTx.categoryName !== "Transfer Masuk" &&
              editTx.categoryName !== "Transfer Keluar" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Kategori
                  </label>
                  <CategorySelect
                    categories={categories}
                    type={editTx.type}
                    value={editCategorySelect}
                    onChange={setEditCategorySelect}
                  />
                </div>
              )}

            {/* Bank Account */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Akun Bank
              </label>
              <select
                required
                value={editBankId}
                onChange={(e) => setEditBankId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Keterangan
              </label>
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditTx(null);
                }}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 text-sm transition-all shadow-md shadow-emerald-100"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
