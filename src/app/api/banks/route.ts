import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // 1. Fetch all banks
    const banks = await prisma.bank.findMany({
      orderBy: {
        name: "asc",
      },
    });

    // 2. Fetch sum of transaction amounts grouped by bank and type
    const aggregates = await prisma.transaction.groupBy({
      by: ["bankId", "type"],
      _sum: {
        amount: true,
      },
    });

    // 3. Map aggregates for quick lookup: bankId -> { income: sum, expense: sum }
    const balanceModifiers: Record<string, { income: number; expense: number }> = {};
    for (const agg of aggregates) {
      if (!balanceModifiers[agg.bankId]) {
        balanceModifiers[agg.bankId] = { income: 0, expense: 0 };
      }
      const sum = Number(agg._sum.amount) || 0;
      if (agg.type === "income") {
        balanceModifiers[agg.bankId].income = sum;
      } else if (agg.type === "expense") {
        balanceModifiers[agg.bankId].expense = sum;
      }
    }

    // 4. Calculate live balance for each bank
    const banksWithBalance = banks.map((bank) => {
      const initial = Number(bank.initialBalance) || 0;
      const modifiers = balanceModifiers[bank.id] || { income: 0, expense: 0 };
      const currentBalance = initial + modifiers.income - modifiers.expense;
      
      return {
        ...bank,
        initialBalance: initial, // Convert Decimal to number
        currentBalance,
      };
    });

    return NextResponse.json({ status: "success", data: banksWithBalance });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, accountNumber, initialBalance, accountType, walletName } = await request.json();

    if (!name || !accountType) {
      return NextResponse.json(
        { status: "error", message: "Nama dan Tipe Akun wajib diisi!" },
        { status: 400 }
      );
    }

    const bank = await prisma.bank.create({
      data: {
        name,
        accountNumber: accountNumber || "-",
        initialBalance: initialBalance || 0,
        accountType,
        walletName: String(walletName || "").trim() || "Pribadi",
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Akun bank berhasil ditambahkan",
      data: bank,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/** Ubah nama, nomor, atau dompet rekening (saldo awal tidak diubah demi konsistensi saldo). */
export async function PUT(request: Request) {
  try {
    const { id, name, accountNumber, walletName } = await request.json();
    const existing = id ? await prisma.bank.findUnique({ where: { id } }) : null;
    if (!existing) {
      return NextResponse.json({ status: "error", message: "Rekening tidak ditemukan!" }, { status: 404 });
    }
    const cleanName = String(name ?? existing.name).trim();
    if (!cleanName) {
      return NextResponse.json({ status: "error", message: "Nama rekening wajib diisi!" }, { status: 400 });
    }
    const bank = await prisma.bank.update({
      where: { id },
      data: {
        name: cleanName,
        accountNumber: String(accountNumber ?? existing.accountNumber).trim() || "-",
        walletName: String(walletName ?? existing.walletName).trim() || "Pribadi",
      },
    });
    return NextResponse.json({ status: "success", message: "Rekening berhasil diperbarui", data: bank });
  } catch (error: any) {
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
        { status: "error", message: "ID Akun wajib dicantumkan!" },
        { status: 400 }
      );
    }

    await prisma.bank.delete({
      where: { id },
    });

    return NextResponse.json({
      status: "success",
      message: "Akun bank berhasil dihapus",
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
