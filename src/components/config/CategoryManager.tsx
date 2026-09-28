"use client";

import React, { useMemo, useRef, useState } from "react";
import { Check, CornerDownRight, Layers, Lock, Pencil, Plus, Trash2, X } from "lucide-react";
import { useAppState } from "@/hooks/useAppState";
import { buildCategoryTree, CATEGORY_TYPES, type CategoryType } from "@/lib/categories";
import { CategorySelect } from "../ui/CategorySelect";
import { CategoryIcon, getCategoryColor } from "../ui/categoryVisuals";

const TAB_STYLE: Record<CategoryType, { active: string; dot: string; border: string }> = {
  expense: { active: "text-rose-600", dot: "bg-rose-500", border: "border-l-rose-300" },
  income: { active: "text-emerald-600", dot: "bg-emerald-500", border: "border-l-emerald-300" },
  inventory: { active: "text-teal-600", dot: "bg-teal-500", border: "border-l-teal-300" },
};

interface CategoryItem {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  usageCount?: number;
  system?: boolean;
}

export function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory, showAlert, showConfirm } = useAppState();

  const [activeType, setActiveType] = useState<CategoryType>("expense");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const tree = useMemo(
    () => buildCategoryTree(categories, activeType, { includeSystem: true }),
    [categories, activeType]
  );

  const countByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of categories as CategoryItem[]) {
      if (!c.system) counts[c.type] = (counts[c.type] || 0) + 1;
    }
    return counts;
  }, [categories]);

  const switchType = (type: CategoryType) => {
    setActiveType(type);
    setParentId("");
    setEditingId(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      showAlert("Nama kategori wajib diisi!", "error");
      return;
    }
    const res = await addCategory(trimmed, activeType, parentId || undefined);
    if (res.status === "success") {
      setName("");
      const parentName = parentId ? (categories as CategoryItem[]).find((c) => c.id === parentId)?.name : "";
      showAlert(
        parentName ? `"${trimmed}" ditambahkan di bawah ${parentName}.` : `"${trimmed}" siap dipakai di transaksi & budget.`,
        "success",
        parentName ? "Subkategori ditambahkan" : "Kategori ditambahkan"
      );
    } else {
      showAlert(res.message || "Gagal menyimpan kategori.", "error");
    }
  };

  const startAddSub = (rootId: string) => {
    setParentId(rootId);
    nameInputRef.current?.focus();
  };

  const startEdit = (cat: CategoryItem) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const trimmed = editName.trim();
    const original = (categories as CategoryItem[]).find((c) => c.id === editingId);
    if (!trimmed || trimmed === original?.name) {
      setEditingId(null);
      return;
    }
    const res = await updateCategory(editingId, trimmed);
    if (res.status === "success") {
      setEditingId(null);
      showAlert(`"${original?.name}" sekarang bernama "${trimmed}".`, "success", "Nama kategori diubah");
    } else {
      showAlert(res.message || "Gagal mengubah kategori.", "error");
    }
  };

  const handleDelete = (cat: CategoryItem, childCount: number) => {
    const message =
      childCount > 0
        ? `Hapus "${cat.name}" beserta ${childCount} subkategorinya?`
        : `Hapus kategori "${cat.name}"?`;
    showConfirm(
      message,
      async () => {
        const res = await deleteCategory(cat.id);
        if (res.status === "success") {
          if (parentId === cat.id) setParentId("");
          showAlert(`"${cat.name}" sudah dihapus.`, "success", "Kategori dihapus");
        } else {
          showAlert(res.message || "Gagal menghapus kategori.", "error");
        }
      },
      { title: "Hapus Kategori", type: "danger" }
    );
  };

  const renderRow = (cat: CategoryItem, opts: { isChild: boolean; childCount?: number; totalUsage: number }) => {
    const isEditing = editingId === cat.id;
    const locked = cat.system;
    const inUse = opts.totalUsage > 0;
    const color = getCategoryColor(cat.name);

    return (
      <div
        key={cat.id}
        className={`flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group ${
          opts.isChild ? `ml-6 border-l-2 ${TAB_STYLE[activeType].border}` : ""
        }`}
      >
        {opts.isChild ? (
          <CornerDownRight className="w-3.5 h-3.5 text-slate-300 shrink-0 ml-1" />
        ) : (
          <span className={`w-7 h-7 rounded-lg ${color.chip} ring-1 inline-flex items-center justify-center shrink-0`}>
            <CategoryIcon name={cat.name} className="w-4 h-4" />
          </span>
        )}

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveEdit();
                } else if (e.key === "Escape") {
                  setEditingId(null);
                }
              }}
              className="w-full rounded-lg border border-emerald-300 px-2 py-1 text-xs font-bold text-slate-800 outline-none ring-4 ring-emerald-500/10"
            />
          ) : (
            <>
              <p className={`text-xs truncate ${opts.isChild ? "font-semibold text-slate-600" : "font-bold text-slate-800"}`}>
                {cat.name}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                {locked
                  ? "Kategori sistem (otomatis untuk transfer)"
                  : [
                      !opts.isChild && opts.childCount ? `${opts.childCount} subkategori` : null,
                      inUse ? `dipakai ${cat.usageCount ?? 0} data` : "belum dipakai",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
              </p>
            </>
          )}
        </div>

        {locked ? (
          <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0 mr-1" />
        ) : isEditing ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={saveEdit}
              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
              title="Simpan"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              title="Batal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            {!opts.isChild && (
              <button
                type="button"
                onClick={() => startAddSub(cat.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                title="Tambah subkategori"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => startEdit(cat)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50"
              title="Ganti nama"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={inUse}
              onClick={() => handleDelete(cat, opts.childCount || 0)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 disabled:cursor-not-allowed"
              title={inUse ? "Masih dipakai data, tidak bisa dihapus" : "Hapus"}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col h-[650px]">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Manajemen Kategori</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Kategori utama & subkategori untuk semua fitur</p>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex bg-slate-100/80 p-1 rounded-xl mb-4">
        {CATEGORY_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => switchType(t.value)}
            className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeType === t.value ? `bg-white shadow-sm ${TAB_STYLE[t.value].active}` : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${TAB_STYLE[t.value].dot}`} />
            {t.label}
            <span className="text-[9px] font-extrabold text-slate-400">{countByType[t.value] || 0}</span>
          </button>
        ))}
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-slate-50/60 p-3 rounded-xl border border-slate-100 space-y-2.5 mb-4">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Nama Kategori
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={parentId ? "Misal: Bensin" : "Misal: Transportasi"}
              className="w-full rounded-xl border border-slate-200 p-2 text-xs min-h-[38px] focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 outline-none bg-white"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Subkategori dari
            </label>
            <CategorySelect
              categories={categories}
              type={activeType}
              mode="root"
              value={parentId}
              onChange={setParentId}
              emptyOptionLabel="Kategori Utama"
              size="sm"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-100 transition-all flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          {parentId ? "Tambah Subkategori" : "Tambah Kategori Utama"}
        </button>
      </form>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        {tree.length === 0 ? (
          <p className="text-[11px] text-slate-400 text-center py-8 italic">Belum ada kategori</p>
        ) : (
          tree.map((root) => {
            const children = root.children as CategoryItem[];
            const totalUsage =
              ((root as CategoryItem).usageCount || 0) + children.reduce((s, c) => s + (c.usageCount || 0), 0);
            return (
              <div key={root.id} className="space-y-1.5">
                {renderRow(root as CategoryItem, { isChild: false, childCount: children.length, totalUsage })}
                {children.map((ch) => renderRow(ch, { isChild: true, totalUsage: ch.usageCount || 0 }))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
