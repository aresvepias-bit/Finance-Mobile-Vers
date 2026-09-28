import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CATEGORY_TYPES, isSystemCategory } from "@/lib/categories";
import { countCategoryUsage, listCategoriesWithUsage } from "@/lib/categoryResolver";

const VALID_TYPES = CATEGORY_TYPES.map((t) => t.value as string);

function errorJson(message: string, status = 400) {
  return NextResponse.json({ status: "error", message }, { status });
}

async function isDuplicateName(name: string, type: string, parentId: string | null, excludeId?: string) {
  const dup = await prisma.category.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      type,
      parentId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  return !!dup;
}

export async function GET() {
  try {
    const categories = await listCategoriesWithUsage();
    return NextResponse.json({ status: "success", data: categories });
  } catch (error: any) {
    return errorJson(error.message || "Internal server error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const type = String(body.type || "");
    const parentId: string | null = body.parentId || null;

    if (!name || !type) return errorJson("Nama dan Tipe Kategori wajib diisi!");
    if (!VALID_TYPES.includes(type)) return errorJson("Tipe kategori tidak valid!");

    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) return errorJson("Kategori utama tidak ditemukan!", 404);
      if (parent.type !== type) return errorJson("Tipe subkategori harus sama dengan kategori utamanya!");
      if (parent.parentId) return errorJson("Subkategori tidak bisa punya subkategori lagi (maksimal 2 level).");
      if (isSystemCategory(parent)) return errorJson("Kategori sistem tidak bisa diberi subkategori.");
    }

    if (await isDuplicateName(name, type, parentId)) {
      return errorJson(`Kategori "${name}" sudah ada di level yang sama!`, 409);
    }

    const category = await prisma.category.create({
      data: { name, type, parentId },
    });

    return NextResponse.json({
      status: "success",
      message: "Kategori berhasil ditambahkan",
      data: category,
    });
  } catch (error: any) {
    return errorJson(error.message || "Internal server error", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = String(body.id || "");
    const name = String(body.name || "").trim();

    if (!id || !name) return errorJson("ID dan nama kategori wajib diisi!");

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) return errorJson("Kategori tidak ditemukan!", 404);
    if (isSystemCategory(category)) return errorJson("Kategori sistem tidak bisa diubah.");

    if (await isDuplicateName(name, category.type, category.parentId, id)) {
      return errorJson(`Kategori "${name}" sudah ada di level yang sama!`, 409);
    }

    const updated = await prisma.category.update({ where: { id }, data: { name } });

    return NextResponse.json({
      status: "success",
      message: "Kategori berhasil diubah",
      data: updated,
    });
  } catch (error: any) {
    return errorJson(error.message || "Internal server error", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return errorJson("ID Kategori wajib dicantumkan!");

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) return errorJson("Kategori tidak ditemukan!", 404);
    if (isSystemCategory(category)) return errorJson("Kategori sistem tidak bisa dihapus.");

    // Kategori (atau subkategorinya) yang masih dipakai data tidak boleh dihapus,
    // supaya riwayat transaksi tidak kehilangan kategorinya.
    const children = await prisma.category.findMany({ where: { parentId: id }, select: { id: true } });
    const usage = await countCategoryUsage([id, ...children.map((c) => c.id)]);

    if (usage > 0) {
      return errorJson(
        `Kategori masih dipakai oleh ${usage} data (transaksi, budget, langganan, dll). ` +
          `Ubah kategori data tersebut dulu, atau ganti nama kategori ini.`,
        409
      );
    }

    // Subkategori ikut terhapus lewat onDelete: Cascade
    await prisma.category.delete({ where: { id } });

    return NextResponse.json({
      status: "success",
      message: "Kategori berhasil dihapus",
    });
  } catch (error: any) {
    return errorJson(error.message || "Internal server error", 500);
  }
}
