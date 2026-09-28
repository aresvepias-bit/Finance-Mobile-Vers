import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { categoryErrorResponse, resolveCategory } from "@/lib/categoryResolver";

function errorJson(message: string, status = 400) {
  return NextResponse.json({ status: "error", message }, { status });
}

/** Bayar satu cicilan: buat transaksi pengeluaran + catat periode ke-n. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = String(body.id || "");
    const date = String(body.date || new Date().toISOString().split("T")[0]);

    const inst = id
      ? await prisma.installment.findUnique({
          where: { id },
          include: { _count: { select: { payments: true } } },
        })
      : null;
    if (!inst) return errorJson("Cicilan tidak ditemukan!", 404);

    const paidCount = inst.initialPaidCount + inst._count.payments;
    if (paidCount >= inst.tenorMonths) return errorJson("Cicilan ini sudah lunas!");

    const bankId = String(body.bankId || inst.bankId);
    const bank = await prisma.bank.findUnique({ where: { id: bankId } });
    if (!bank) return errorJson("Rekening pembayaran tidak ditemukan!", 404);

    const amount = body.amount ? Number(body.amount) : Number(inst.monthlyAmount);
    if (!(amount > 0)) return errorJson("Nominal pembayaran tidak valid!");

    const { rootId, subId } = await resolveCategory(inst.categoryId, "expense");
    const period = paidCount + 1;

    const payment = await prisma.$transaction(async (tx) => {
      const trx = await tx.transaction.create({
        data: {
          type: "expense",
          categoryId: rootId,
          subCategoryId: subId,
          amount,
          date: new Date(date),
          description: `Cicilan ${inst.name} ke-${period}/${inst.tenorMonths}`,
          bankId,
        },
      });
      return tx.installmentPayment.create({
        data: { installmentId: inst.id, transactionId: trx.id, periodNumber: period },
      });
    });

    const lunas = period >= inst.tenorMonths;
    return NextResponse.json({
      status: "success",
      message: lunas
        ? `Cicilan ke-${period} tercatat. ${inst.name} LUNAS! 🎉`
        : `Cicilan ke-${period} dari ${inst.tenorMonths} berhasil dicatat`,
      data: payment,
    });
  } catch (error: any) {
    const catErr = categoryErrorResponse(error);
    if (catErr) return catErr;
    return errorJson(error.message || "Internal server error", 500);
  }
}

/** Batalkan pembayaran terakhir (hapus transaksinya; data pembayaran ikut terhapus). */
export async function DELETE(request: Request) {
  try {
    const paymentId = new URL(request.url).searchParams.get("paymentId");
    if (!paymentId) return errorJson("ID pembayaran wajib dicantumkan!");

    const payment = await prisma.installmentPayment.findUnique({ where: { id: paymentId } });
    if (!payment) return errorJson("Pembayaran tidak ditemukan!", 404);

    const latest = await prisma.installmentPayment.findFirst({
      where: { installmentId: payment.installmentId },
      orderBy: { periodNumber: "desc" },
    });
    if (latest?.id !== payment.id) return errorJson("Hanya pembayaran terakhir yang bisa dibatalkan.");

    await prisma.transaction.delete({ where: { id: payment.transactionId } });
    return NextResponse.json({ status: "success", message: "Pembayaran cicilan dibatalkan" });
  } catch (error: any) {
    return errorJson(error.message || "Internal server error", 500);
  }
}
