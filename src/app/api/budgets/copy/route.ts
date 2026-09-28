import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { sourceMonth, targetMonth } = await request.json();

    if (!sourceMonth || !targetMonth) {
      return NextResponse.json(
        { status: "error", message: "Bulan asal (sourceMonth) dan bulan tujuan (targetMonth) wajib diisi!" },
        { status: 400 }
      );
    }

    // 1. Get all budgets for the source month
    const sourceBudgets = await prisma.budget.findMany({
      where: { month: sourceMonth },
    });

    if (sourceBudgets.length === 0) {
      return NextResponse.json(
        { status: "error", message: `Tidak ada data budget pada bulan ${sourceMonth} untuk disalin.` },
        { status: 404 }
      );
    }

    // 2. Duplicate / Upsert into the target month
    const operations = sourceBudgets.map((b) => {
      const limitVal = Number(b.limit);
      return prisma.budget.upsert({
        where: {
          month_categoryId: {
            month: targetMonth,
            categoryId: b.categoryId,
          },
        },
        update: {
          limit: limitVal,
          note: b.note,
        },
        create: {
          month: targetMonth,
          categoryId: b.categoryId,
          limit: limitVal,
          note: b.note,
        },
      });
    });

    // Run transaction
    await prisma.$transaction(operations);

    // Fetch updated budgets in target month to return
    const updatedBudgets = await prisma.budget.findMany({
      where: { month: targetMonth },
      include: { category: true },
    });

    const formatted = updatedBudgets.map((b) => ({
      id: b.id,
      month: b.month,
      categoryId: b.categoryId,
      category: b.category.name,
      limit: Number(b.limit),
      note: b.note || "",
    }));

    return NextResponse.json({
      status: "success",
      message: `Berhasil menduplikasi ${sourceBudgets.length} limit budget ke ${targetMonth}`,
      data: formatted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
