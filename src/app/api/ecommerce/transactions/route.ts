import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { categoryErrorResponse, resolveCategory } from "@/lib/categoryResolver";

export async function GET() {
  try {
    const ecommerceTxns = await prisma.ecommerceTransaction.findMany({
      include: {
        platform: true,
        category: true,
        bank: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    const formatted = ecommerceTxns.map((et) => ({
      id: et.id,
      date: et.date.toISOString().split("T")[0],
      platform_id: et.platformId,
      platform: et.platform.platform, // platform name
      item_name: et.itemName,
      category: et.category.name,
      amount: Number(et.amount),
      bank_id: et.bankId,
      bank_name: et.bank.name,
      tenor: et.tenor,
      txn_id: et.txnId || "",
    }));

    return NextResponse.json({ status: "success", data: formatted });
  } catch (error: any) {
    const catErr = categoryErrorResponse(error);
    if (catErr) return catErr;
    return NextResponse.json(
      { status: "error", message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, platformId, itemName, categoryId, amount, bankId, tenor } = body;

    if (!date || !platformId || !itemName || !amount || !bankId) {
      return NextResponse.json(
        { status: "error", message: "Data belanja e-commerce tidak lengkap!" },
        { status: 400 }
      );
    }

    const txDate = new Date(date);
    const amountVal = parseFloat(amount);
    const tenorVal = parseInt(tenor || 1);

    // Get Platform Name
    const platform = await prisma.ecommercePlatform.findUnique({
      where: { id: platformId },
    });
    if (!platform) {
      return NextResponse.json(
        { status: "error", message: "Platform tidak ditemukan!" },
        { status: 404 }
      );
    }

    const { leafId, rootId, subId } = await resolveCategory(categoryId, "expense");

    // Resolve Bank
    const bank = await prisma.bank.findUnique({
      where: { id: bankId },
    });
    if (!bank) {
      return NextResponse.json(
        { status: "error", message: "Akun bank tidak ditemukan!" },
        { status: 404 }
      );
    }

    // Create both records atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create General Transaction (Expense)
      const description = `[${platform.platform}] ${itemName}`;
      const generalTx = await tx.transaction.create({
        data: {
          type: "expense",
          categoryId: rootId,
          subCategoryId: subId,
          amount: amountVal,
          date: txDate,
          description: description,
          bankId: bankId,
        },
      });

      // 2. Create Ecommerce Transaction pointing to the general transaction
      const ecommerceTx = await tx.ecommerceTransaction.create({
        data: {
          date: txDate,
          platformId,
          itemName,
          categoryId: leafId,
          amount: amountVal,
          bankId,
          tenor: tenorVal,
          txnId: generalTx.id,
        },
      });

      return ecommerceTx;
    });

    return NextResponse.json({
      status: "success",
      message: "Belanja E-Commerce berhasil dicatat",
      data: result,
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
        { status: "error", message: "ID Transaksi E-Commerce wajib dicantumkan!" },
        { status: 400 }
      );
    }

    // We fetch to find the linked general transaction ID
    const ecomTx = await prisma.ecommerceTransaction.findUnique({
      where: { id },
    });

    if (!ecomTx) {
      return NextResponse.json(
        { status: "error", message: "Transaksi E-Commerce tidak ditemukan" },
        { status: 404 }
      );
    }

    // We delete the general transaction. Since the relation in schema has onDelete: Cascade,
    // deleting the general transaction (if linked) or the ecommerce transaction will clean up both.
    // To be perfectly safe, let's delete the general transaction directly if it exists, which deletes the ecommerce transaction,
    // or delete the ecommerce transaction directly.
    if (ecomTx.txnId) {
      await prisma.transaction.delete({
        where: { id: ecomTx.txnId },
      });
    } else {
      await prisma.ecommerceTransaction.delete({
        where: { id },
      });
    }

    return NextResponse.json({
      status: "success",
      message: "Transaksi E-Commerce dan pengeluaran terkait berhasil dihapus",
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
