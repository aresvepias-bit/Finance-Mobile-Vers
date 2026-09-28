import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function errorJson(message: string, status = 400) {
  return NextResponse.json({ status: "error", message }, { status });
}

/** Alokasikan sisa bulan ke beberapa pos sekaligus. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const month = String(body.month || "");
    const date = String(body.date || new Date().toISOString().split("T")[0]);
    const allocations: { pocketId: string; amount: number }[] = Array.isArray(body.allocations) ? body.allocations : [];

    if (!/^\d{4}-\d{2}$/.test(month)) return errorJson("Bulan alokasi tidak valid!");
    const items = allocations
      .map((a) => ({ pocketId: String(a.pocketId), amount: Number(a.amount) }))
      .filter((a) => a.amount > 0);
    if (items.length === 0) return errorJson("Isi minimal satu nominal alokasi!");

    const found = await prisma.pocket.count({ where: { id: { in: items.map((a) => a.pocketId) } } });
    if (found !== new Set(items.map((a) => a.pocketId)).size) return errorJson("Ada pos yang tidak ditemukan!", 404);

    await prisma.pocketEntry.createMany({
      data: items.map((a) => ({
        pocketId: a.pocketId,
        type: "allocate",
        amount: a.amount,
        month,
        date: new Date(date),
        note: `Alokasi sisa ${month}`,
      })),
    });

    const total = items.reduce((s, a) => s + a.amount, 0);
    return NextResponse.json({
      status: "success",
      message: `Rp ${total.toLocaleString("id-ID")} dialokasikan ke ${items.length} pos`,
    });
  } catch (error: any) {
    return errorJson(error.message || "Internal server error", 500);
  }
}
