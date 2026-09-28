"use client";

import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, CornerDownRight, Layers, Search, X } from "lucide-react";
import { buildCategoryTree, type CategoryRecord } from "@/lib/categories";
import { CategoryIcon, getCategoryColor } from "./categoryVisuals";

interface CategorySelectProps {
  categories: CategoryRecord[];
  /** Tipe kategori yang ditampilkan: "expense" | "income" | "inventory" */
  type: string;
  /** ID kategori terpilih ("" = belum dipilih) */
  value: string;
  onChange: (id: string) => void;
  /** "any" = utama & sub bisa dipilih, "root" = hanya kategori utama (misal untuk budget) */
  mode?: "any" | "root";
  placeholder?: string;
  /** Tampilkan opsi kosong di paling atas, misal "Semua Kategori" untuk filter */
  emptyOptionLabel?: string;
  size?: "sm" | "md";
  className?: string;
}

interface Option {
  id: string;
  name: string;
  depth: 0 | 1;
  rootName: string;
  childCount: number;
}

const POPOVER_MAX_HEIGHT = 340;

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "ig"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-amber-100 text-amber-800 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

function CategoryChip({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const color = getCategoryColor(name);
  const box = size === "sm" ? "w-6 h-6 rounded-md" : "w-7 h-7 rounded-lg";
  const icon = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <span className={`${box} ${color.chip} ring-1 inline-flex items-center justify-center shrink-0`}>
      <CategoryIcon name={name} className={icon} />
    </span>
  );
}

export function CategorySelect({
  categories,
  type,
  value,
  onChange,
  mode = "any",
  placeholder = "Pilih Kategori",
  emptyOptionLabel,
  size = "md",
  className = "",
}: CategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const tree = useMemo(() => buildCategoryTree(categories, type), [categories, type]);

  const selected = useMemo(() => categories.find((c) => c.id === value) || null, [categories, value]);
  const selectedRoot = selected?.parentId ? categories.find((c) => c.id === selected.parentId) : null;

  // Daftar opsi yang tampil (sudah difilter pencarian), urut: utama lalu subkategorinya
  const options = useMemo<Option[]>(() => {
    const q = search.trim().toLowerCase();
    const list: Option[] = [];
    if (emptyOptionLabel && !q) {
      list.push({ id: "", name: emptyOptionLabel, depth: 0, rootName: "", childCount: 0 });
    }
    for (const root of tree) {
      const rootMatch = !q || root.name.toLowerCase().includes(q);
      const children =
        mode === "root" ? [] : root.children.filter((c) => rootMatch || c.name.toLowerCase().includes(q));
      if (!rootMatch && children.length === 0) continue;
      list.push({ id: root.id, name: root.name, depth: 0, rootName: root.name, childCount: root.children.length });
      for (const ch of children) {
        list.push({ id: ch.id, name: ch.name, depth: 1, rootName: root.name, childCount: 0 });
      }
    }
    return list;
  }, [tree, search, mode, emptyOptionLabel]);

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < POPOVER_MAX_HEIGHT && rect.top > spaceBelow;
    setPos(
      openUp
        ? { left: rect.left, width: rect.width, bottom: window.innerHeight - rect.top + 6 }
        : { left: rect.left, width: rect.width, top: rect.bottom + 6 }
    );
  }, []);

  const open = () => {
    // Sorot item yang sedang terpilih (daftar belum difilter saat dibuka)
    const idx = options.findIndex((o) => o.id === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    updatePosition();
    setIsOpen(true);
  };

  const handleSearchChange = (text: string) => {
    setSearch(text);
    setActiveIndex(0);
  };

  const close = useCallback((focusTrigger = false) => {
    setIsOpen(false);
    setSearch("");
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  // Posisi popover ikut saat halaman / modal di-scroll atau layar di-resize
  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  // Tutup saat klik di luar trigger & popover
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, close]);

  // Saat dibuka: fokus ke kolom pencarian
  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
  }, [isOpen]);

  // Pastikan item yang disorot selalu terlihat
  useEffect(() => {
    if (!isOpen) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  const choose = (opt: Option) => {
    onChange(opt.id);
    close(true);
  };

  const handleOptionClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const opt = options[Number(e.currentTarget.dataset.index)];
    if (opt) choose(opt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (options[activeIndex]) choose(options[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") {
      close();
    }
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      open();
    }
  };

  const triggerSize = size === "sm" ? "p-2 text-xs min-h-[38px]" : "p-2.5 text-sm min-h-[46px]";
  const query = search.trim();

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleTriggerKeyDown}
        className={`group w-full rounded-xl border bg-white text-left flex items-center gap-2.5 outline-none cursor-pointer transition-all shadow-sm ${triggerSize} ${
          isOpen
            ? "border-emerald-400 ring-4 ring-emerald-500/10"
            : "border-slate-200 hover:border-slate-300 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-500/10"
        }`}
      >
        {selected ? (
          <>
            <CategoryChip name={selectedRoot?.name || selected.name} size={size === "sm" ? "sm" : "md"} />
            <span className="flex-1 min-w-0 flex flex-col leading-tight">
              <span className="font-bold text-slate-800 truncate">{selected.name}</span>
              {selectedRoot && (
                <span className="text-[10px] font-semibold text-slate-400 truncate">{selectedRoot.name}</span>
              )}
            </span>
          </>
        ) : (
          <>
            <span
              className={`${size === "sm" ? "w-6 h-6 rounded-md" : "w-7 h-7 rounded-lg"} bg-slate-50 text-slate-400 ring-1 ring-slate-100 inline-flex items-center justify-center shrink-0`}
            >
              <Layers className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
            </span>
            <span className={`flex-1 truncate ${emptyOptionLabel ? "font-bold text-slate-700" : "text-slate-400"}`}>
              {emptyOptionLabel || placeholder}
            </span>
          </>
        )}
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
          }`}
        />
      </button>

      {isOpen &&
        pos &&
        createPortal(
          <div
            ref={popoverRef}
            onKeyDown={handleKeyDown}
            style={
              {
                position: "fixed",
                left: pos.left,
                top: pos.top,
                bottom: pos.bottom,
                width: Math.max(pos.width, 260),
                "--popover-shift": pos.bottom !== undefined ? "6px" : "-6px",
              } as React.CSSProperties
            }
            className="z-[70] bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-2xl shadow-slate-900/10 overflow-hidden animate-popover-in"
          >
            {/* Search */}
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Cari kategori..."
                  aria-controls={listboxId}
                  aria-activedescendant={options[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
                  className="w-full rounded-xl bg-slate-50 border border-transparent pl-8 pr-8 py-2 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      handleSearchChange("");
                      searchRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    aria-label="Hapus pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Options */}
            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              className="max-h-64 overflow-y-auto p-1.5 custom-scrollbar"
            >
              {options.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <Search className="w-5 h-5 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">
                    {query ? `Tidak ada kategori "${query}"` : "Belum ada kategori"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Tambahkan lewat menu Konfigurasi.</p>
                </div>
              ) : (
                options.map((opt, idx) => {
                  const isSelected = opt.id === value;
                  const isActive = idx === activeIndex;
                  const isRoot = opt.depth === 0;
                  const isGroupStart = isRoot && idx > 0 && opt.id !== "";

                  return (
                    <div
                      key={opt.id || "__empty"}
                      id={`${listboxId}-${idx}`}
                      data-index={idx}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleOptionClick}
                      className={`flex items-center gap-2.5 rounded-xl cursor-pointer select-none transition-colors ${
                        isGroupStart ? "mt-1" : ""
                      } ${isRoot ? "px-2 py-1.5" : "pl-5 pr-2 py-1.5"} ${
                        isActive ? "bg-slate-100/80" : ""
                      } ${isSelected ? "bg-emerald-50/80" : ""}`}
                    >
                      {isRoot ? (
                        opt.id === "" ? (
                          <span className="w-7 h-7 rounded-lg bg-slate-50 text-slate-400 ring-1 ring-slate-100 inline-flex items-center justify-center shrink-0">
                            <Layers className="w-4 h-4" />
                          </span>
                        ) : (
                          <CategoryChip name={opt.name} />
                        )
                      ) : (
                        <CornerDownRight className="w-3.5 h-3.5 text-slate-300 shrink-0 ml-1" />
                      )}

                      <span className="flex-1 min-w-0">
                        <span
                          className={`block truncate text-xs ${
                            isSelected
                              ? "font-extrabold text-emerald-700"
                              : isRoot
                              ? "font-bold text-slate-800"
                              : "font-semibold text-slate-600"
                          }`}
                        >
                          <Highlight text={opt.name} query={query} />
                        </span>
                        {isRoot && opt.childCount > 0 && mode === "any" && (
                          <span className="block text-[10px] text-slate-400 font-medium">
                            Umum &middot; {opt.childCount} subkategori
                          </span>
                        )}
                      </span>

                      {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer hint */}
            <div className="hidden sm:flex items-center justify-between gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50/60 text-[10px] text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded border border-slate-200 bg-white font-sans">↑</kbd>
                <kbd className="px-1 rounded border border-slate-200 bg-white font-sans">↓</kbd>
                pilih
                <kbd className="ml-1.5 px-1 rounded border border-slate-200 bg-white font-sans">Enter</kbd>
                simpan
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded border border-slate-200 bg-white font-sans">Esc</kbd>
                tutup
              </span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
