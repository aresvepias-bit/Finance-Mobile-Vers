import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { categoryErrorResponse, resolveCategory } from "@/lib/categoryResolver";

export async function GET() {
  try {
    const fixedCosts = await prisma.fixedCost.findMany({
      include: {
        category: true,
        subCategory: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const formatted = fixedCosts.map((fc) => ({
      id: fc.id,
      name: fc.name,
      amount: Number(fc.amount),
      categoryId: fc.categoryId,
      subCategoryId: fc.subCategoryId,
      category_id: fc.category.name, // To match the old frontend attribute naming
      sub_category_id: fc.subCategory?.name || "",
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
    const { name, amount, categoryId } = await request.json();

    if (!name || !amount) {
      return NextResponse.json(
        { status: "error", message: "Data template tidak lengkap!" },
        { status: 400 }
      );
    }

    const { rootId, subId } = await resolveCategory(categoryId, "expense");

    const fixedCost = await prisma.fixedCost.create({
      data: {
        name,
        amount: parseFloat(amount),
        categoryId: rootId,
        subCategoryId: subId,
      },
      include: { category: true, subCategory: true },
    });

    return NextResponse.json({
      status: "success",
      message: "Template pengeluaran rutin berhasil disimpan",
      data: {
        id: fixedCost.id,
        name: fixedCost.name,
        amount: Number(fixedCost.amount),
        categoryId: fixedCost.categoryId,
        subCategoryId: fixedCost.subCategoryId,
        category_id: fixedCost.category.name,
        sub_category_id: fixedCost.subCategory?.name || "",
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
        { status: "error", message: "ID Template wajib dicantumkan!" },
        { status: 400 }
      );
    }

    await prisma.fixedCost.delete({
      where: { id },
    });

    return NextResponse.json({
      status: "success",
      message: "Template berhasil dihapus",
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
