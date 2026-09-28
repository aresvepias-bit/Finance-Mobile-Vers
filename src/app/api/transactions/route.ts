import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TRANSFER_IN, TRANSFER_OUT, isSystemCategory } from "@/lib/categories";
import { categoryErrorResponse, getSystemCategory, resolveCategory } from "@/lib/categoryResolver";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // YYYY-MM
    const limitParam = searchParams.get("limit");

    let whereClause: any = {};

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [yearStr, monthStr] = month.split("-");
      const year = parseInt(yearStr);
      const mVal = parseInt(monthStr);

      const startDate = new Date(year, mVal - 1, 1);
      const endDate = new Date(year, mVal, 0, 23, 59, 59, 999);

      whereClause.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const take = limitParam ? parseInt(limitParam) : undefined;

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        category: true,
        subCategory: true,
        bank: true,
      },
      orderBy: [
        { date: "desc" },
        { createdAt: "desc" },
      ],
      take,
    });

    // Format output
    const formatted = transactions.map((t) => ({
      id: t.id,
      type: t.type,
      categoryId: t.categoryId,
      categoryName: t.category.name,
      subCategoryId: t.subCategoryId,
      subCategoryName: t.subCategory?.name || null,
      amount: Number(t.amount),
      date: t.date.toISOString().split("T")[0],
      description: t.description || "",
      bankId: t.bankId,
      bankName: t.bank.name,
      discount: Number(t.discount),
    }));

    return NextResponse.json({ status: "success", data: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, amount, date, description, bankId, categoryId, discount, transferToBankId } = body;

    if (!type || !amount || !date || !bankId) {
      return NextResponse.json(
        { status: "error", message: "Data transaksi tidak lengkap!" },
        { status: 400 }
      );
    }

    const txDate = new Date(date);
    const amountVal = parseFloat(amount);
    const discountVal = parseFloat(discount || 0);

    // 1. Handle Account Transfer
    if (type === "transfer") {
      if (!transferToBankId) {
        return NextResponse.json(
          { status: "error", message: "Akun tujuan transfer wajib ditentukan!" },
          { status: 400 }
        );
      }

      // Check source and dest banks exist
      const sourceBank = await prisma.bank.findUnique({ where: { id: bankId } });
      const destBank = await prisma.bank.findUnique({ where: { id: transferToBankId } });

      if (!sourceBank || !destBank) {
        return NextResponse.json(
          { status: "error", message: "Akun bank asal atau tujuan tidak ditemukan!" },
          { status: 404 }
        );
      }

      const catTransferOut = await getSystemCategory(TRANSFER_OUT, "expense");
      const catTransferIn = await getSystemCategory(TRANSFER_IN, "income");

      const desc = description || `Transfer dari ${sourceBank.name} ke ${destBank.name}`;

      // Create linked transactions atomically
      const result = await prisma.$transaction(async (tx) => {
        const outTx = await tx.transaction.create({
          data: {
            type: "expense",
            categoryId: catTransferOut.id,
            amount: amountVal,
            date: txDate,
            description: desc,
            bankId: bankId,
          },
        });

        const inTx = await tx.transaction.create({
          data: {
            type: "income",
            categoryId: catTransferIn.id,
            amount: amountVal,
            date: txDate,
            description: desc,
            bankId: transferToBankId,
          },
        });

        return { outTx, inTx };
      });

      return NextResponse.json({
        status: "success",
        message: "Transfer berhasil dicatat",
        data: result,
      });
    }

    // 2. Handle Regular Income / Expense Transaction
    const { rootId, subId } = await resolveCategory(categoryId, type);

    const transaction = await prisma.transaction.create({
      data: {
        type,
        categoryId: rootId,
        subCategoryId: subId,
        amount: amountVal,
        date: txDate,
        description: description || "",
        bankId,
        discount: discountVal,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Transaksi berhasil dicatat",
      data: transaction,
    });
  } catch (error: any) {
    const catErr = categoryErrorResponse(error);
    if (catErr) return catErr;
    return NextResponse.json(
      { status: "error", message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, type, amount, date, description, bankId, categoryId, discount } = body;

    if (!id || !type || !amount || !date || !bankId) {
      return NextResponse.json(
        { status: "error", message: "Data edit tidak lengkap!" },
        { status: 400 }
      );
    }

    const txDate = new Date(date);
    const amountVal = parseFloat(amount);
    const discountVal = parseFloat(discount || 0);

    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!existing) {
      return NextResponse.json(
        { status: "error", message: "Transaksi tidak ditemukan!" },
        { status: 404 }
      );
    }

    // Transaksi transfer tetap memakai kategori sistemnya
    const { rootId, subId } = isSystemCategory(existing.category)
      ? { rootId: existing.categoryId, subId: null }
      : await resolveCategory(categoryId, type);

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        type,
        categoryId: rootId,
        subCategoryId: subId,
        amount: amountVal,
        date: txDate,
        description: description || "",
        bankId,
        discount: discountVal,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Transaksi berhasil diperbarui",
      data: updated,
    });
  } catch (error: any) {
    const catErr = categoryErrorResponse(error);
    if (catErr) return catErr;
    return NextResponse.json(
      { status: "error", message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { status: "error", message: "ID Transaksi wajib dicantumkan!" },
        { status: 400 }
      );
    }

    await prisma.transaction.delete({
      where: { id },
    });

    return NextResponse.json({
      status: "success",
      message: "Transaksi berhasil dihapus",
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
