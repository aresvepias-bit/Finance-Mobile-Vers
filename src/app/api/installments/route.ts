import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { categoryErrorResponse, resolveCategory } from "@/lib/categoryResolver";
import { listInstallments } from "@/lib/installmentServer";

function errorJson(message: string, status = 400) {
  return NextResponse.json({ status: "error", message }, { status });
}

/** Validasi & normalisasi input form cicilan. Mengembalikan string error bila tidak valid. */
async function parseInstallmentInput(body: Record<string, unknown>) {
  const name = String(body.name || "").trim();
  const lender = String(body.lender || "").trim();
  const note = String(body.note || "").trim();
  const monthlyAmount = Number(body.monthlyAmount);
  const tenorMonths = Number(body.tenorMonths);
  const initialPaidCount = Number(body.initialPaidCount || 0);
  const startDate = String(body.startDate || "");
  const bankId = String(body.bankId || "");

  if (!name) return "Nama cicilan wajib diisi!";
  if (!(monthlyAmount > 0)) return "Nominal cicilan per bulan harus lebih dari 0!";
  if (!Number.isInteger(tenorMonths) || tenorMonths < 1 || tenorMonths > 600) return "Tenor harus 1–600 bulan!";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return "Tanggal cicilan pertama wajib diisi!";
  if (!Number.isInteger(initialPaidCount) || initialPaidCount < 0 || initialPaidCount > tenorMonths) {
    return "Jumlah cicilan yang sudah dibayar tidak valid!";
  }
  const bank = bankId ? await prisma.bank.findUnique({ where: { id: bankId } }) : null;
  if (!bank) return "Rekening pembayaran wajib dipilih!";

  const { leafId } = await resolveCategory(body.categoryId as string, "expense");

  return {
    name,
    lender: lender || null,
    note: note || null,
    monthlyAmount,
    tenorMonths,
    initialPaidCount,
    startDate: new Date(startDate),
    bankId,
    categoryId: leafId,
  };
}

export async function GET() {
  try {
    return NextResponse.json({ status: "success", data: await listInstallments() });
  } catch (error: any) {
    return errorJson(error.message || "Internal server error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const data = await parseInstallmentInput(await request.json());
    if (typeof data === "string") return errorJson(data);

    const created = await prisma.installment.create({ data });
    return NextResponse.json({ status: "success", message: "Cicilan berhasil ditambahkan", data: created });
  } catch (error: any) {
    const catErr = categoryErrorResponse(error);
    if (catErr) return catErr;
    return errorJson(error.message || "Internal server error", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = String(body.id || "");
    const existing = id
      ? await prisma.installment.findUnique({ where: { id }, include: { _count: { select: { payments: true } } } })
      : null;
    if (!existing) return errorJson("Cicilan tidak ditemukan!", 404);

    const data = await parseInstallmentInput(body);
    if (typeof data === "string") return errorJson(data);
    if (data.initialPaidCount + existing._count.payments > data.tenorMonths) {
      return errorJson("Jumlah cicilan terbayar melebihi tenor!");
    }

    const updated = await prisma.installment.update({ where: { id }, data });
    return NextResponse.json({ status: "success", message: "Cicilan berhasil diperbarui", data: updated });
  } catch (error: any) {
    const catErr = categoryErrorResponse(error);
    if (catErr) return catErr;
    return errorJson(error.message || "Internal server error", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return errorJson("ID cicilan wajib dicantumkan!");

    // Transaksi pembayaran tetap disimpan sebagai riwayat pengeluaran
    await prisma.installment.delete({ where: { id } });
    return NextResponse.json({ status: "success", message: "Cicilan berhasil dihapus" });
  } catch (error: any) {
    return errorJson(error.message || "Internal server error", 500);
  }
}
