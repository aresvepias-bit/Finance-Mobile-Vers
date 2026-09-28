import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { categoryErrorResponse, resolveCategory } from "@/lib/categoryResolver";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // YYYY-MM

    if (!month) {
      return NextResponse.json(
        { status: "error", message: "Parameter bulan (month) wajib diisi!" },
        { status: 400 }
      );
    }

    const budgets = await prisma.budget.findMany({
      where: { month },
      include: {
        category: true,
      },
    });

    const formatted = budgets.map((b) => ({
      id: b.id,
      month: b.month,
      categoryId: b.categoryId,
      category: b.category.name, // Return name directly to match old code
      limit: Number(b.limit),
      note: b.note || "",
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
    const { month, categoryId, limit, note } = await request.json();

    if (!month || !limit) {
      return NextResponse.json(
        { status: "error", message: "Data budget tidak lengkap!" },
        { status: 400 }
      );
    }

    const limitVal = parseFloat(limit);

    // Budget bisa di kategori utama atau subkategori
    const { leafId } = await resolveCategory(categoryId, "expense");
    const category = await prisma.category.findUniqueOrThrow({ where: { id: leafId } });
    const noteVal = typeof note === "string" && note.trim() ? note.trim() : null;

    // Upsert budget using @@unique([month, categoryId])
    const budget = await prisma.budget.upsert({
      where: {
        month_categoryId: {
          month,
          categoryId: category.id,
        },
      },
      update: {
        limit: limitVal,
        note: noteVal,
      },
      create: {
        month,
        categoryId: category.id,
        limit: limitVal,
        note: noteVal,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Budget berhasil disimpan",
      data: {
        id: budget.id,
        month: budget.month,
        categoryId: budget.categoryId,
        category: category.name,
        limit: Number(budget.limit),
        note: budget.note || "",
      },
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
        { status: "error", message: "ID Budget wajib dicantumkan!" },
        { status: 400 }
      );
    }

    await prisma.budget.delete({
      where: { id },
    });

    return NextResponse.json({
      status: "success",
      message: "Budget berhasil dihapus",
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
