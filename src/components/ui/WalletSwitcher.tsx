"use client";

import React from "react";
import { WalletCards } from "lucide-react";
import { useAppState } from "@/hooks/useAppState";

/** Pilih dompet (Semua / Pribadi / Kontrakan / ...). Tidak tampil bila hanya ada satu dompet. */
export function WalletSwitcher({ className = "" }: { className?: string }) {
  const { wallets, walletFilter, setWalletFilter } = useAppState();
  if (wallets.length < 2) return null;

  return (
    <div className={`flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-sm w-fit max-w-full overflow-x-auto ${className}`}>
      <WalletCards className="w-3.5 h-3.5 text-slate-400 mx-1.5 shrink-0" />
      {["all", ...wallets].map((w) => {
        const active = walletFilter === w;
        return (
          <button
            key={w}
            type="button"
            onClick={() => setWalletFilter(w)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 ${
              active ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            {w === "all" ? "Semua" : w}
          </button>
        );
      })}
    </div>
  );
}
