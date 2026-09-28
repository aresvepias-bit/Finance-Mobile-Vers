"use client";

import React, { useId, useRef } from "react";
import { Edit2, Nfc, Trash2 } from "lucide-react";

// Palet kartu: warna matte/metalik yang kalem, dipilih konsisten dari nama rekening
const CARD_THEMES = [
  { name: "onyx", bg: "linear-gradient(135deg, #2b2c29 0%, #1b1c1a 55%, #121311 100%)", dark: true },
  { name: "sage", bg: "linear-gradient(135deg, #3d5c49 0%, #2a4234 55%, #1c2e24 100%)", dark: true },
  { name: "champagne", bg: "linear-gradient(135deg, #efe4cf 0%, #dcc9a4 55%, #c4ad80 100%)", dark: false },
  { name: "slate", bg: "linear-gradient(135deg, #4a5058 0%, #353a40 55%, #24282c 100%)", dark: true },
  { name: "pearl", bg: "linear-gradient(135deg, #fbfbf9 0%, #eceee9 55%, #dcded8 100%)", dark: false },
  { name: "burgundy", bg: "linear-gradient(135deg, #5a2e36 0%, #3f1f26 55%, #2a1419 100%)", dark: true },
];

function pickTheme(name: string, type: string) {
  // Kartu kredit / paylater selalu onyx supaya langsung terbaca sebagai hutang
  if (type === "credit_card" || type === "paylater") return CARD_THEMES[0];
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return CARD_THEMES[hash % CARD_THEMES.length];
}

function Chip() {
  const gradId = useId();
  return (
    <svg viewBox="0 0 48 36" className="w-10 h-[30px] drop-shadow-sm" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f3e2a9" />
          <stop offset="50%" stopColor="#d4b56a" />
          <stop offset="100%" stopColor="#b8964d" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="47" height="35" rx="6" fill={`url(#${gradId})`} stroke="#a7873f" strokeOpacity="0.5" />
      <path
        d="M16 0.5v11M32 0.5v11M16 24.5v11M32 24.5v11M0.5 12h15.5a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H0.5M47.5 12H32a4 4 0 0 0-4 4v4a4 4 0 0 0 4 4h15.5"
        fill="none"
        stroke="#8f7236"
        strokeOpacity="0.55"
        strokeWidth="1"
      />
    </svg>
  );
}

interface AccountCardProps {
  bank: { id: string; name: string; account_number?: string; account_type: string; currentBalance: number };
  typeLabel: string;
  share: number; // % dari aset likuid
  delayMs: number;
  renderAmount: (value: number) => React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}

export function AccountCard({ bank, typeLabel, share, delayMs, renderAmount, onEdit, onDelete }: AccountCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const theme = pickTheme(bank.name, bank.account_type);
  const balance = Number(bank.currentBalance) || 0;
  const isDebt = bank.account_type === "credit_card" || bank.account_type === "paylater";
  const number = bank.account_number && bank.account_number !== "-" ? String(bank.account_number) : "";
  const initials = bank.name
    .split(/\s+|\//)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const text = theme.dark ? "text-white" : "text-slate-900";
  const muted = theme.dark ? "text-white/55" : "text-slate-900/50";

  // Tilt 3D halus mengikuti kursor (langsung ke style, tanpa re-render)
  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) translateY(-4px)`;
    el.style.setProperty("--glare-x", `${(x + 0.5) * 100}%`);
    el.style.setProperty("--glare-y", `${(y + 0.5) * 100}%`);
  };
  const handleLeave = () => {
    const el = cardRef.current;
    if (el) el.style.transform = "";
  };

  return (
    <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: `${delayMs}ms` }}>
      <div
        ref={cardRef}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className="group relative aspect-[1.586/1] rounded-[20px] overflow-hidden p-5 flex flex-col justify-between select-none transition-transform duration-300 ease-out will-change-transform shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] hover:shadow-[0_28px_50px_-20px_rgba(0,0,0,0.5)]"
        style={{ background: theme.bg }}
      >
        {/* Tekstur halus: garis guilloche tipis */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.07]" viewBox="0 0 320 200" preserveAspectRatio="none" aria-hidden>
          {Array.from({ length: 9 }).map((_, i) => (
            <path
              key={i}
              d={`M-20 ${150 - i * 12} C 80 ${90 - i * 12}, 180 ${210 - i * 12}, 340 ${120 - i * 12}`}
              fill="none"
              stroke={theme.dark ? "#fff" : "#000"}
              strokeWidth="0.8"
            />
          ))}
        </svg>

        {/* Kilau mengikuti kursor */}
        <div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(circle at var(--glare-x, 50%) var(--glare-y, 50%), rgba(255,255,255,0.22), transparent 45%)",
          }}
        />
        {/* Sapuan cahaya saat hover */}
        <div className="absolute -inset-y-10 -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none -translate-x-full group-hover:translate-x-[420%] transition-transform duration-[1100ms] ease-out" />

        {/* Atas: nama & monogram */}
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-[15px] font-extrabold tracking-tight truncate ${text}`}>{bank.name}</p>
            <p className={`text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5 ${muted}`}>{typeLabel}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={onEdit}
                className={`p-1.5 rounded-lg backdrop-blur-sm ${theme.dark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-black/5 hover:bg-black/10 text-slate-800"}`}
                title="Edit"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={onDelete}
                className={`p-1.5 rounded-lg backdrop-blur-sm ${theme.dark ? "bg-white/10 hover:bg-rose-500/40 text-white" : "bg-black/5 hover:bg-rose-500/20 text-slate-800"}`}
                title="Hapus"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <span
              className={`h-8 min-w-8 px-2 rounded-full flex items-center justify-center text-[11px] font-black tracking-wider ${
                theme.dark ? "bg-white/10 text-white ring-1 ring-white/15" : "bg-black/5 text-slate-800 ring-1 ring-black/10"
              }`}
            >
              {initials || "•"}
            </span>
          </div>
        </div>

        {/* Tengah: chip, contactless, nomor */}
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <Chip />
            <Nfc className={`w-5 h-5 ${muted}`} />
          </div>
          <p className={`mt-2.5 font-mono text-[13px] tracking-[0.22em] ${theme.dark ? "text-white/80" : "text-slate-900/70"}`}>
            •••• •••• •••• {number ? number.slice(-4).padStart(4, "•") : "••••"}
          </p>
        </div>

        {/* Bawah: saldo & porsi */}
        <div className="relative flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-[9px] font-bold uppercase tracking-[0.2em] ${muted}`}>{isDebt ? "Tagihan" : "Saldo"}</p>
            <p className={`text-xl font-black tabular-nums tracking-tight truncate ${balance < 0 && !isDebt ? "text-rose-300" : text}`}>
              {balance < 0 ? "-" : ""}
              {renderAmount(Math.abs(balance))}
            </p>
          </div>
          {!isDebt && (
            <div className="text-right shrink-0">
              <p className={`text-[9px] font-bold uppercase tracking-[0.2em] ${muted}`}>Porsi</p>
              <p className={`text-xs font-black tabular-nums ${text}`}>{share.toFixed(0)}%</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
