"use client";

import React, { useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { CategoryManager } from "./config/CategoryManager";
import { CategorySelect } from "./ui/CategorySelect";
import {
  Trash2,
  ShoppingBag,
  User,
  Zap,
} from "lucide-react";

export function ConfigView() {
  const {
    categories,
    fixedCosts,
    ecomPlatforms,
    user,
    addFixedCost,
    deleteFixedCost,
    addEcomPlatform,
    deleteEcomPlatform,
    updateProfile,
    formatRp,
    showAlert,
    showConfirm,
  } = useAppState();

  // Fixed Cost Form states
  const [fcName, setFcName] = useState("");
  const [fcAmount, setFcAmount] = useState("");
  const [fcCategory, setFcCategory] = useState("");

  // Ecom Platform Form states
  const [platName, setPlatName] = useState("");
  const [platStore, setPlatStore] = useState("");

  // Profile Form states
  const [profUsername, setProfUsername] = useState("");
  const [profPin, setProfPin] = useState("");


  const cleanNumber = (str: string) => {
    const clean = str.replace(/\D/g, "");
    return clean ? parseInt(clean, 10) : 0;
  };

  const handleAmountChange = (val: string, setter: (s: string) => void) => {
    const num = cleanNumber(val);
    setter(num ? new Intl.NumberFormat("id-ID").format(num) : "");
  };

  // Submit Fixed Cost Template
  const handleFcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fcName || !fcAmount || !fcCategory) {
      showAlert("Isi data template dengan lengkap!", "error");
      return;
    }

    const cleanAmt = cleanNumber(fcAmount);
    if (cleanAmt <= 0) {
      showAlert("Nominal template harus valid!", "error");
      return;
    }

    const res = await addFixedCost(fcName, cleanAmt, fcCategory);
    if (res.status === "success") {
      setFcName("");
      setFcAmount("");
      setFcCategory("");
      showAlert(`${fcName} · ${formatRp(cleanAmt)} siap dipakai di Catat Cepat.`, "success", "Template tersimpan");
    } else {
      showAlert(res.message || "Gagal menyimpan template.", "error");
    }
  };

  // Submit Ecom Platform
  const handlePlatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!platName) {
      showAlert("Nama Platform wajib diisi!", "error");
      return;
    }

    const res = await addEcomPlatform(platName, platStore || undefined);
    if (res.status === "success") {
      setPlatName("");
      setPlatStore("");
      showAlert(`${platName}${platStore ? ` (${platStore})` : ""} ditambahkan ke daftar platform.`, "success", "Platform ditambahkan");
    } else {
      showAlert(res.message || "Gagal menyimpan platform.", "error");
    }
  };

  // Submit Profile update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profUsername && !profPin) {
      showAlert("Masukkan username baru atau PIN baru!", "error");
      return;
    }

    if (profPin && profPin.length !== 6) {
      showAlert("PIN harus berupa 6 digit angka!", "error");
      return;
    }

    const res = await updateProfile(
      profUsername || undefined,
      profPin || undefined
    );

    if (res.status === "success") {
      setProfUsername("");
      setProfPin("");
      showAlert("Username/PIN baru berlaku mulai login berikutnya.", "success", "Profil diperbarui");
    } else {
      showAlert(res.message || "Gagal memperbarui profil.", "error");
    }
  };

  // Delete methods
  const handleDeleteFixedCost = async (id: string) => {
    showConfirm(
      "Hapus template pengeluaran ini?",
      async () => {
        const res = await deleteFixedCost(id);
        if (res.status !== "success") {
          showAlert(res.message || "Gagal menghapus template.", "error");
        } else {
          showAlert("Template dihapus dari Catat Cepat.", "success", "Template dihapus");
        }
      },
      { title: "Konfirmasi Hapus", type: "danger" }
    );
  };

  const handleDeletePlatform = async (id: string) => {
    showConfirm(
      "Hapus platform e-commerce ini?",
      async () => {
        const res = await deleteEcomPlatform(id);
        if (res.status !== "success") {
          showAlert(res.message || "Gagal menghapus platform.", "error");
        } else {
          showAlert("Platform dihapus dari daftar.", "success", "Platform dihapus");
        }
      },
      { title: "Konfirmasi Hapus", type: "danger" }
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <CategoryManager />

      {/* Templates, Platforms & Profile Settings (Right side column) */}
      <div className="space-y-6">
        {/* Templates Fixed Cost */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-500 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Template Pengeluaran Rutin
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Konfigurasi tombol log cepat di formulir pengeluaran
              </p>
            </div>
          </div>

          <form onSubmit={handleFcSubmit} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nama Template
                </label>
                <input
                  type="text"
                  required
                  value={fcName}
                  onChange={(e) => setFcName(e.target.value)}
                  placeholder="Misal: MRT Pulang"
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nominal
                </label>
                <input
                  type="text"
                  required
                  value={fcAmount}
                  onChange={(e) => handleAmountChange(e.target.value, setFcAmount)}
                  placeholder="Rp 0"
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Kategori
                </label>
                <CategorySelect
                  categories={categories}
                  type="expense"
                  value={fcCategory}
                  onChange={setFcCategory}
                  size="sm"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="py-2 px-6 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-200/50 transition-all"
                >
                  Simpan
                </button>
              </div>
            </div>
          </form>

          {/* Fixed cost list */}
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {fixedCosts.map((fc) => (
              <div
                key={fc.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-700">{fc.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Kategori: {fc.category_label || fc.category_id} &bull; Harga: {formatRp(fc.amount)}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteFixedCost(fc.id)}
                  className="p-1 hover:bg-slate-200 rounded text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Hapus"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* E-Commerce Platform configuration */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 text-orange-500 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Platform E-Commerce
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Atur platform toko & online belanja</p>
            </div>
          </div>

          <form onSubmit={handlePlatSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Platform
                </label>
                <input
                  type="text"
                  required
                  value={platName}
                  onChange={(e) => setPlatName(e.target.value)}
                  placeholder="Shopee, Tokopedia, dll"
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nama Toko <span className="text-slate-300">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={platStore}
                  onChange={(e) => setPlatStore(e.target.value)}
                  placeholder="Misal: TokoSayaID"
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs shadow-md shadow-orange-200/50 transition-all"
            >
              Tambah Platform
            </button>
          </form>

          {/* Platform list */}
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {ecomPlatforms.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-700">{p.platform}</p>
                  {p.store_name && (
                    <p className="text-[9px] text-slate-400 mt-0.5">Toko: {p.store_name}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeletePlatform(p.id)}
                  className="p-1 hover:bg-slate-200 rounded text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Hapus"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Profile update form */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Profil & Keamanan
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Ubah username dan PIN login</p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Username Baru
                </label>
                <input
                  type="text"
                  value={profUsername}
                  onChange={(e) => setProfUsername(e.target.value)}
                  placeholder={user?.username || "admin"}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  PIN Baru (6 Digit)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={profPin}
                  onChange={(e) => setProfPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-md transition-all"
            >
              Simpan Perubahan Profil
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
