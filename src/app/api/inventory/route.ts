import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { categoryErrorResponse, resolveCategory } from "@/lib/categoryResolver";

export async function GET() {
  try {
    const inventory = await prisma.inventory.findMany({
      include: {
        category: true,
      },
      orderBy: {
        purchaseDate: "desc",
      },
    });

    const formatted = inventory.map((i) => ({
      id: i.id,
      item_name: i.itemName,
      category: i.category.name,
      purchase_price: Number(i.purchasePrice),
      purchase_date: i.purchaseDate.toISOString().split("T")[0],
      lifespan_months: i.lifespanMonths,
      condition: i.condition,
      source: i.source,
      ecom_id: i.ecomId || "",
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
    const { itemName, categoryId, purchasePrice, purchaseDate, lifespanMonths, condition, source, ecomId } = body;

    if (!itemName || !purchasePrice || !purchaseDate) {
      return NextResponse.json(
        { status: "error", message: "Data barang inventaris tidak lengkap!" },
        { status: 400 }
      );
    }

    const { leafId } = await resolveCategory(categoryId, "inventory");

    const item = await prisma.inventory.create({
      data: {
        itemName,
        categoryId: leafId,
        purchasePrice: parseFloat(purchasePrice),
        purchaseDate: new Date(purchaseDate),
        lifespanMonths: parseInt(lifespanMonths || 24),
        condition: condition || "Baik",
        source: source || "manual",
        ecomId: ecomId || null,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Barang berhasil ditambahkan ke inventaris",
      data: item,
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
    const { id, itemName, categoryId, purchasePrice, purchaseDate, lifespanMonths, condition } = body;

    if (!id || !itemName || !purchasePrice || !purchaseDate) {
      return NextResponse.json(
        { status: "error", message: "Data lengkap wajib disertakan!" },
        { status: 400 }
      );
    }

    const { leafId } = await resolveCategory(categoryId, "inventory");

    const item = await prisma.inventory.update({
      where: { id },
      data: {
        itemName,
        categoryId: leafId,
        purchasePrice: parseFloat(purchasePrice),
        purchaseDate: new Date(purchaseDate),
        lifespanMonths: parseInt(lifespanMonths || 24),
        condition: condition || "Baik",
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Barang inventaris berhasil diperbarui",
      data: item,
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
        { status: "error", message: "ID Barang wajib dicantumkan!" },
        { status: 400 }
      );
    }

    await prisma.inventory.delete({
      where: { id },
    });

    return NextResponse.json({
      status: "success",
      message: "Barang berhasil dihapus dari inventaris",
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
