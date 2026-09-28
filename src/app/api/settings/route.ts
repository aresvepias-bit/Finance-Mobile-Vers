import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Hanya key yang dikenal yang boleh disimpan
const ALLOWED_KEYS = ["incomePlan"] as const;

function errorJson(message: string, status = 400) {
  return NextResponse.json({ status: "error", message }, { status });
}

function validateIncomePlan(value: unknown) {
  const v = (value || {}) as Record<string, unknown>;
  const salary = Number(v.salary || 0);
  const bonus = Number(v.bonus || 0);
  const bonusMonth = Number(v.bonusMonth || 0);
  if (!(salary >= 0) || !(bonus >= 0)) return "Nominal pemasukan tidak valid!";
  if (!Number.isInteger(bonusMonth) || bonusMonth < 0 || bonusMonth > 12) return "Bulan bonus tidak valid!";
  return { salary, bonus, bonusMonth };
}

export async function GET() {
  try {
    const rows = await prisma.appSetting.findMany();
    return NextResponse.json({ status: "success", data: Object.fromEntries(rows.map((r) => [r.key, r.value])) });
  } catch (error: any) {
    return errorJson(error.message || "Internal server error", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const { key, value } = await request.json();
    if (!ALLOWED_KEYS.includes(key)) return errorJson("Pengaturan tidak dikenal!");

    const clean = validateIncomePlan(value);
    if (typeof clean === "string") return errorJson(clean);

    const saved = await prisma.appSetting.upsert({
      where: { key },
      update: { value: clean as Prisma.InputJsonValue },
      create: { key, value: clean as Prisma.InputJsonValue },
    });
    return NextResponse.json({ status: "success", message: "Pengaturan tersimpan", data: saved.value });
  } catch (error: any) {
    return errorJson(error.message || "Internal server error", 500);
  }
}
