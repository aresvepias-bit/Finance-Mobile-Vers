import { createElement } from "react";
import {
  ArrowRightLeft,
  Briefcase,
  Car,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  PiggyBank,
  Plane,
  Receipt,
  Shirt,
  ShieldCheck,
  TrendingUp,
  ShoppingBasket,
  Smartphone,
  Tag,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";

// Ikon ditebak dari nama kategori utama, jadi kategori baru otomatis dapat ikon yang pas.
const ICON_RULES: [RegExp, LucideIcon][] = [
  [/transfer/, ArrowRightLeft],
  [/darurat|emergency/, ShieldCheck],
  [/investasi|saham|reksa|obligasi|crypto|kripto/, TrendingUp],
  [/gaji|salary|bonus|freelance|usaha/, Briefcase],
  [/cashback|promo|hadiah|kado|gift/, Gift],
  [/transport|mrt|krl|bensin|ojek|parkir|tol/, Car],
  [/tagihan|ipl|listrik|air|pdam|internet|pulsa|utilitas/, Receipt],
  [/makan|minum|kopi|resto|jajan|kuliner/, Utensils],
  [/kebutuhan|belanja|minimarket|groceries/, ShoppingBasket],
  [/sosial|keluarga|ortu|orang tua|istri|anak|donasi|sedekah/, Users],
  [/kesehatan|obat|medis|dokter/, HeartPulse],
  [/pendidikan|kursus|sekolah|buku/, GraduationCap],
  [/hiburan|game|langganan|streaming/, Gamepad2],
  [/liburan|travel|wisata/, Plane],
  [/tabungan|nabung|dp |uang muka|pensiun/, PiggyBank],
  [/gadget|elektronik|hp|laptop/, Smartphone],
  [/pakaian|fashion|baju/, Shirt],
  [/kendaraan|motor|mobil/, Car],
  [/rumah|peralatan|perabot/, House],
];

// Kelas Tailwind harus ditulis utuh (bukan dirakit) supaya ikut ter-generate.
const PALETTE = [
  { chip: "bg-rose-50 text-rose-600 ring-rose-100", dot: "bg-rose-400" },
  { chip: "bg-amber-50 text-amber-600 ring-amber-100", dot: "bg-amber-400" },
  { chip: "bg-emerald-50 text-emerald-600 ring-emerald-100", dot: "bg-emerald-400" },
  { chip: "bg-sky-50 text-sky-600 ring-sky-100", dot: "bg-sky-400" },
  { chip: "bg-violet-50 text-violet-600 ring-violet-100", dot: "bg-violet-400" },
  { chip: "bg-orange-50 text-orange-600 ring-orange-100", dot: "bg-orange-400" },
  { chip: "bg-teal-50 text-teal-600 ring-teal-100", dot: "bg-teal-400" },
  { chip: "bg-fuchsia-50 text-fuchsia-600 ring-fuchsia-100", dot: "bg-fuchsia-400" },
];

export function getCategoryIcon(name: string): LucideIcon {
  const lower = name.toLowerCase();
  return ICON_RULES.find(([re]) => re.test(lower))?.[1] ?? Tag;
}

export function getCategoryColor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/** Ikon kategori sebagai komponen statis (aman dipakai di dalam render). */
export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  return createElement(getCategoryIcon(name), { className });
}
