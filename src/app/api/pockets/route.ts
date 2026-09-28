import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listPockets } from "@/lib/pocketServer";

function errorJson(message: string, status = 400) {
  return NextResponse.json({ status: "error", message }, { status });
}

async function parsePocket(body: Record<string, unknown>, excludeId?: string) {
  const name = String(body.name || "").trim();
  const percent = Number(body.percent || 0);
  const target = body.targetAmount ? Number(body.targetAmount) : null;
  const note = String(body.note || "").trim();

  if (!name) return "Nama pos wajib diisi!";
  if (!(percent >= 0 && percent <= 100)) return "Persentase harus 0–100!";
  if (target !== null && !(target > 0)) return "Target harus lebih dari 0!";

  const others = await prisma.pocket.aggregate({
    _sum: { percent: true },
    where: excludeId ? { id: { not: excludeId } } : undefined,
  });
  const totalPct = Number(others._sum.percent || 0) + percent;
  if (totalPct > 100.001) return `Total persentase semua pos jadi ${totalPct}%. Maksimal 100%.`;

  return { name, percent, targetAmount: target, note: note || null };
}

export async function GET() {
  try {
    return NextResponse.json({ status: "success", data: await listPockets() });
  } catch (error: any) {
    return errorJson(error.message || "Internal server error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const data = await parsePocket(await request.json());
    if (typeof data === "string") return errorJson(data);
    const count = await prisma.pocket.count();
    const pocket = await prisma.pocket.create({ data: { ...data, sortOrder: count } });
    return NextResponse.json({ status: "success", message: "Pos berhasil ditambahkan", data: pocket });
  } catch (error: any) {
    return errorJson(error.message || "Internal server error", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = String(body.id || "");
    if (!id || !(await prisma.pocket.findUnique({ where: { id } }))) return errorJson("Pos tidak ditemukan!", 404);
    const data = await parsePocket(body, id);
    if (typeof data === "string") return errorJson(data);
    const pocket = await prisma.pocket.update({ where: { id }, data });
    return NextResponse.json({ status: "success", message: "Pos berhasil diperbarui", data: pocket });
  } catch (error: any) {
    return errorJson(error.message || "Internal server error", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return errorJson("ID pos wajib dicantumkan!");
    await prisma.pocket.delete({ where: { id } });
    return NextResponse.json({ status: "success", message: "Pos berhasil dihapus" });
  } catch (error: any) {
    return errorJson(error.message || "Internal server error", 500);
  }
}
