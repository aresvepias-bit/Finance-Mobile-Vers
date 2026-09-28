"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { useAppState, type Toast } from "@/hooks/useAppState";

const DURATION: Record<Toast["type"], number> = { success: 4000, error: 6000, info: 5000 };

const TONE: Record<Toast["type"], { ring: string; iconBg: string; bar: string }> = {
  success: { ring: "ring-emerald-400/30", iconBg: "bg-emerald-500", bar: "bg-emerald-400" },
  error: { ring: "ring-rose-400/30", iconBg: "bg-rose-500", bar: "bg-rose-400" },
  info: { ring: "ring-sky-400/30", iconBg: "bg-sky-500", bar: "bg-sky-400" },
};

function ToastIcon({ type }: { type: Toast["type"] }) {
  if (type === "info") return <Info className="w-4 h-4" />;
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {type === "success" ? (
        <path d="M5 12.5l4.5 4.5L19 7.5" className="animate-check-draw" />
      ) : (
        <path d="M7 7l10 10M17 7L7 17" className="animate-check-draw" />
      )}
    </svg>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(DURATION[toast.type]);
  const startedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tone = TONE[toast.type];

  const close = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 220);
  }, [onDismiss, toast.id]);

  const startTimer = useCallback(() => {
    startedRef.current = Date.now();
    timerRef.current = setTimeout(close, remainingRef.current);
  }, [close]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startTimer]);

  // Jeda hitung mundur saat kursor di atas toast
  const pause = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    remainingRef.current -= Date.now() - startedRef.current;
    setPaused(true);
  };
  const resume = () => {
    setPaused(false);
    startTimer();
  };

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      onMouseEnter={pause}
      onMouseLeave={resume}
      className={`pointer-events-auto relative w-full sm:w-[360px] overflow-hidden rounded-2xl bg-slate-900/95 backdrop-blur-xl text-white shadow-2xl shadow-slate-900/30 ring-1 ${tone.ring} ${
        leaving ? "animate-toast-out" : "animate-toast-in"
      }`}
    >
      <div className="flex items-start gap-3 p-4 pr-10">
        <span className={`w-8 h-8 rounded-full ${tone.iconBg} text-white flex items-center justify-center shrink-0 shadow-lg animate-icon-pop`}>
          <ToastIcon type={toast.type} />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-sm font-extrabold tracking-tight leading-tight">{toast.title}</p>
          <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed break-words">{toast.message}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={close}
        className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Tutup notifikasi"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/5">
        <div
          className={`h-full ${tone.bar} toast-progress`}
          style={{ animationDuration: `${DURATION[toast.type]}ms`, animationPlayState: paused ? "paused" : "running" }}
        />
      </div>
    </div>
  );
}

/** Tumpukan toast: kanan bawah di desktop, atas-tengah di HP. */
export function Toaster() {
  const { toasts, dismissToast } = useAppState();
  return (
    <div className="fixed z-[80] pointer-events-none inset-x-4 top-4 flex flex-col gap-2.5 sm:inset-x-auto sm:top-auto sm:bottom-6 sm:right-6 sm:flex-col-reverse">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
