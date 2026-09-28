"use client";

import React, { useState, useMemo } from "react";
import { useAppState } from "@/hooks/useAppState";
import { CategorySelect } from "./ui/CategorySelect";
import { computeDepreciation } from "@/lib/depreciation";
import { Modal } from "./ui/Modal";
import {
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  Activity,
  Heart,
  ChevronRight,
  TrendingDown,
} from "lucide-react";

export function InventoryView() {
  const {
    categories,
    inventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    formatRp,
    showAlert,
    showConfirm,
  } = useAppState();

  // Filter states
  const [filterCategory, setFilterCategory] = useState(""); // "" = semua kategori
  const [filterCondition, setFilterCondition] = useState("all");

  // Form states
  const [itemName, setItemName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [lifespanMonths, setLifespanMonths] = useState("24");
  const [condition, setCondition] = useState("Baik");

  // Edit states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editLifespan, setEditLifespan] = useState("");
  const [editCondition, setEditCondition] = useState("Baik");


  const cleanNumber = (str: string) => {
    const clean = str.replace(/\D/g, "");
    return clean ? parseInt(clean, 10) : 0;
  };

  const handleAmountChange = (val: string, setter: (s: string) => void) => {
    const num = cleanNumber(val);
    setter(num ? new Intl.NumberFormat("id-ID").format(num) : "");
  };

  // Submit asset
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemName || !categoryId || !purchasePrice || !purchaseDate || !lifespanMonths) {
      showAlert("Isi data aset dengan lengkap!", "error");
      return;
    }

    const cleanPrice = cleanNumber(purchasePrice);
    if (cleanPrice <= 0) {
      showAlert("Harga beli harus valid!", "error");
      return;
    }

    const payload = {
      itemName,
      categoryId,
      purchasePrice: cleanPrice,
      purchaseDate,
      lifespanMonths: parseInt(lifespanMonths, 10),
      condition,
      source: "manual",
    };

    const res = await addInventoryItem(payload);
    if (res.status === "success") {
      setItemName("");
      setPurchasePrice("");
      setLifespanMonths("24");
      setCondition("Baik");
      showAlert("Aset berhasil dicatat di inventaris!", "success");
    } else {
      showAlert(res.message || "Gagal menyimpan data.", "error");
    }
  };

  // Filter items
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchCat = !filterCategory || item.categoryId === filterCategory;
      const matchCond = filterCondition === "all" || item.condition === filterCondition;
      return matchCat && matchCond;
    });
  }, [inventory, filterCategory, filterCondition]);

  // Open Edit modal
  const handleEditClick = (item: any) => {
    setEditItem(item);
    setEditItemName(item.item_name);
    setEditCategoryId(item.categoryId);
    setEditPrice(new Intl.NumberFormat("id-ID").format(item.purchase_price));
    setEditDate(item.purchase_date);
    setEditLifespan(item.lifespan_months.toString());
    setEditCondition(item.condition);
    setIsEditOpen(true);
  };

  // Submit Edit changes
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editItemName || !editCategoryId || !editPrice || !editDate || !editLifespan) {
      showAlert("Isi data dengan lengkap!", "error");
      return;
    }

    const payload = {
      id: editItem.id,
      itemName: editItemName,
      categoryId: editCategoryId,
      purchasePrice: cleanNumber(editPrice),
      purchaseDate: editDate,
      lifespanMonths: parseInt(editLifespan, 10),
      condition: editCondition,
    };

    const res = await updateInventoryItem(payload);
    if (res.status === "success") {
      setIsEditOpen(false);
      setEditItem(null);
    } else {
      showAlert(res.message || "Gagal memperbarui data.", "error");
    }
  };

  // Delete item
  const handleDeleteClick = async (id: string) => {
    showConfirm(
      "Hapus barang ini dari inventaris?",
      async () => {
        const res = await deleteInventoryItem(id);
        if (res.status !== "success") {
          showAlert(res.message || "Gagal menghapus data.", "error");
        }
      },
      { title: "Konfirmasi Hapus", type: "danger" }
    );
  };

  // Penyusutan tiap aset (garis lurus) + ringkasan sesuai filter
  const itemsWithDep = useMemo(
    () =>
      filteredInventory.map((item) => ({
        item,
        dep: computeDepreciation(Number(item.purchase_price) || 0, item.purchase_date, Number(item.lifespan_months) || 0),
      })),
    [filteredInventory]
  );

  const depSummary = useMemo(() => {
    let cost = 0;
    let book = 0;
    let monthly = 0;
    for (const { item, dep } of itemsWithDep) {
      cost += Number(item.purchase_price) || 0;
      book += dep.bookValue;
      if (!dep.isFullyDepreciated) monthly += dep.monthly;
    }
    return { cost, book, accumulated: cost - book, monthly, bookPct: cost > 0 ? (book / cost) * 100 : 0 };
  }, [itemsWithDep]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sidebar Filter and Form */}
      <div className="lg:col-span-1 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Filter Aset
          </h3>
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Kategori
            </label>
            <CategorySelect
              categories={categories}
              type="inventory"
              value={filterCategory}
              onChange={setFilterCategory}
              emptyOptionLabel="Semua Kategori"
              size="sm"
            />
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Kondisi Barang
            </label>
            <select
              value={filterCondition}
              onChange={(e) => setFilterCondition(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="all">Semua Kondisi</option>
              <option value="Baik">Baik</option>
              <option value="Cukup">Cukup</option>
              <option value="Rusak">Rusak</option>
            </select>
          </div>
        </div>

        {/* Add asset form */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
            Catat Aset Baru
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Nama Barang
              </label>
              <input
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Misal: iPhone 16 Pro Max, Sofa Ruang Tamu"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Kategori Aset
              </label>
              <CategorySelect
                categories={categories}
                type="inventory"
                value={categoryId}
                onChange={setCategoryId}
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Harga Pembelian
              </label>
              <input
                type="text"
                required
                value={purchasePrice}
                onChange={(e) => handleAmountChange(e.target.value, setPurchasePrice)}
                placeholder="Rp 0"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Date */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Tanggal Beli
                </label>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Lifespan */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Masa Pakai (Bulan)
                </label>
                <input
                  type="number"
                  required
                  value={lifespanMonths}
                  onChange={(e) => setLifespanMonths(e.target.value)}
                  placeholder="24"
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Kondisi Fisik
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="Baik">Baik</option>
                <option value="Cukup">Cukup</option>
                <option value="Rusak">Rusak</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-100"
            >
              Simpan Aset
            </button>
          </form>
        </div>
      </div>

      {/* Main Grid display column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Ringkasan nilai aset setelah penyusutan */}
        <div className="bg-slate-900 text-white rounded-2xl px-5 py-4 shadow-lg relative overflow-hidden opacity-0 animate-fade-in-up">
          <div className="absolute -right-16 -top-24 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Nilai Aset Sekarang</p>
              <p className="text-2xl font-black tabular-nums tracking-tight leading-tight">{formatRp(Math.round(depSummary.book))}</p>
            </div>
            <div className="flex items-center gap-6 text-right">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Harga Beli</p>
                <p className="text-xs font-black tabular-nums mt-0.5">{formatRp(depSummary.cost)}</p>
              </div>
              <div className="w-px h-7 bg-white/10" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Penyusutan</p>
                <p className="text-xs font-black tabular-nums mt-0.5 text-rose-300">−{formatRp(Math.round(depSummary.accumulated))}</p>
              </div>
              <div className="w-px h-7 bg-white/10" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Susut / Bulan</p>
                <p className="text-xs font-black tabular-nums mt-0.5">{formatRp(Math.round(depSummary.monthly))}</p>
              </div>
            </div>
          </div>
          <div className="relative mt-3.5 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full animate-bar-grow" style={{ width: `${depSummary.bookPct}%`, animationDelay: "200ms" }} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 tabular-nums shrink-0">{depSummary.bookPct.toFixed(0)}% nilai tersisa</span>
          </div>
        </div>

        {/* Display Items List */}
        <div className="space-y-4">
          {itemsWithDep.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400 font-semibold shadow-sm">
              Belum ada aset terdaftar.
            </div>
          ) : (
            itemsWithDep.map(({ item, dep }, idx) => {
              const isDepreciated = dep.isFullyDepreciated;

              return (
                <div
                  key={item.id}
                  style={{ animationDelay: `${80 + idx * 60}ms` }}
                  className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group flex flex-col justify-between gap-4 opacity-0 animate-fade-in-up transition-[box-shadow,border-color] duration-300 hover:shadow-md hover:border-slate-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-slate-800 text-sm leading-none">
                          {item.item_name}
                        </h4>
                        <span
                          className={`text-[8px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${
                            item.condition === "Baik"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : item.condition === "Cukup"
                              ? "bg-amber-50 text-amber-600 border-amber-100"
                              : "bg-rose-50 text-rose-600 border-rose-100"
                          }`}
                        >
                          {item.condition}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">
                        {item.category} &bull; Dibeli{" "}
                        {new Date(`${item.purchase_date}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        {" "}&bull; Masa pakai {item.lifespan_months} bln
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-emerald-600"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item.id)}
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-rose-600"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Rincian penyusutan */}
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Harga Beli</p>
                      <p className="text-xs font-black text-slate-700 tabular-nums mt-0.5">{formatRp(Number(item.purchase_price))}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Penyusutan</p>
                      <p className="text-xs font-black text-rose-600 tabular-nums mt-0.5">−{formatRp(Math.round(dep.accumulated))}</p>
                      <p className="text-[9px] text-slate-400 font-semibold">{dep.elapsed} bln × {formatRp(Math.round(dep.monthly))}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Nilai Sekarang</p>
                      <p className={`text-sm font-black tabular-nums mt-0.5 ${isDepreciated ? "text-rose-600" : "text-slate-900"}`}>
                        {formatRp(Math.round(dep.bookValue))}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full animate-bar-grow ${
                          isDepreciated ? "bg-rose-500" : dep.bookPct <= 25 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${dep.bookPct}%`, animationDelay: `${200 + idx * 60}ms` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-500">{dep.bookPct.toFixed(0)}% nilai tersisa</span>
                      <span className={isDepreciated ? "text-rose-500" : "text-slate-500"}>
                        {isDepreciated ? "Nilai buku habis" : `${dep.remainingMonths} bulan lagi · susut ${formatRp(Math.round(dep.monthly))}/bln`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Inventory Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditItem(null);
        }}
        title={`Edit Detail ${editItem?.item_name}`}
      >
        {editItem && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Nama Barang
              </label>
              <input
                type="text"
                required
                value={editItemName}
                onChange={(e) => setEditItemName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Kategori Aset
              </label>
              <CategorySelect
                categories={categories}
                type="inventory"
                value={editCategoryId}
                onChange={setEditCategoryId}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Harga Pembelian
              </label>
              <input
                type="text"
                required
                value={editPrice}
                onChange={(e) => handleAmountChange(e.target.value, setEditPrice)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tanggal Beli
                </label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Masa Pakai (Bulan)
                </label>
                <input
                  type="number"
                  required
                  value={editLifespan}
                  onChange={(e) => setEditLifespan(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Kondisi Fisik
              </label>
              <select
                value={editCondition}
                onChange={(e) => setEditCondition(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="Baik">Baik</option>
                <option value="Cukup">Cukup</option>
                <option value="Rusak">Rusak</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditItem(null);
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
