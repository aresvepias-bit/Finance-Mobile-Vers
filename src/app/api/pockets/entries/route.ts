import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function errorJson(message: string, status = 400) {
  return NextResponse.json({ status: "error", message }, { status });
}

/** Isi manual (+) atau pakai (−) saldo satu pos. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pocketId = String(body.pocketId || "");
    const type = String(body.type || "");
    const amount = Number(body.amount);
    const date = String(body.date || new Date().toISOString().split("T")[0]);
    const note = String(body.note || "").trim();

    if (type !== "deposit" && type !== "withdraw") return errorJson("Jenis mutasi tidak valid!");
    if (!(amount > 0)) return errorJson("Nominal harus lebih dari 0!");

    const pocket = pocketId
      ? await prisma.pocket.findUnique({ where: { id: pocketId }, include: { entries: { select: { amount: true } } } })
      : null;
    if (!pocket) return errorJson("Pos tidak ditemukan!", 404);

    if (type === "withdraw") {
      const balance = pocket.entries.reduce((s, e) => s + Number(e.amount), 0);
      if (amount > balance) return errorJson(`Saldo pos ${pocket.name} tidak cukup (sisa ${balance.toLocaleString("id-ID")}).`);
    }

    const entry = await prisma.pocketEntry.create({
      data: {
        pocketId,
        type,
        amount: type === "withdraw" ? -amount : amount,
        date: new Date(date),
        note: note || null,
      },
    });
    return NextResponse.json({
      status: "success",
      message: type === "withdraw" ? "Pemakaian dana tercatat" : "Saldo pos bertambah",
      data: entry,
    });
  } catch (error: any) {
    return errorJson(error.message || "Internal server error", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return errorJson("ID mutasi wajib dicantumkan!");
    await prisma.pocketEntry.delete({ where: { id } });
    return NextResponse.json({ status: "success", message: "Mutasi pos dihapus" });
  } catch (error: any) {
    return errorJson(error.message || "Internal server error", 500);
  }
}
