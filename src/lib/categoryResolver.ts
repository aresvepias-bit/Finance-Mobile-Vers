import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isSystemCategory } from "@/lib/categories";

export class CategoryError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/**
 * Validasi categoryId dari form dan pecah menjadi kategori utama + subkategori.
 * - `root`: kategori utama (untuk kolom categoryId di transaksi / fixed cost)
 * - `subId`: subkategori bila yang dipilih adalah subkategori
 * - `leafId`: kategori yang benar-benar dipilih user
 */
export async function resolveCategory(
  categoryId: string | null | undefined,
  type: string,
  { rootOnly = false } = {}
) {
  if (!categoryId) throw new CategoryError("Kategori wajib dipilih!");

  const leaf = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!leaf) throw new CategoryError("Kategori tidak ditemukan. Muat ulang halaman.", 404);
  if (leaf.type !== type) throw new CategoryError("Kategori tidak sesuai dengan jenis data.");
  if (isSystemCategory(leaf)) throw new CategoryError("Kategori sistem tidak bisa dipilih manual.");
  if (rootOnly && leaf.parentId) throw new CategoryError("Pilih kategori utama, bukan subkategori.");

  const rootId = leaf.parentId ?? leaf.id;
  return { leafId: leaf.id, rootId, subId: leaf.parentId ? leaf.id : null };
}

/** Ambil kategori sistem (misal Transfer Masuk/Keluar), buat bila belum ada. */
export async function getSystemCategory(name: string, type: string) {
  const existing = await prisma.category.findFirst({ where: { name, type, parentId: null } });
  return existing ?? prisma.category.create({ data: { name, type } });
}

/** Semua kategori + jumlah data yang memakainya (untuk halaman konfigurasi). */
export async function listCategoriesWithUsage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          transactions: true,
          subTransactions: true,
          fixedCosts: true,
          subFixedCosts: true,
          inventories: true,
          subscriptions: true,
          budgets: true,
          ecommerceTxns: true,
        },
      },
    },
  });

  return categories.map(({ _count, ...c }) => ({
    ...c,
    system: isSystemCategory(c),
    usageCount: Object.values(_count).reduce((sum, n) => sum + n, 0),
  }));
}

/** Jumlah data (tanpa hitung ganda) yang memakai salah satu kategori di `ids`. */
export async function countCategoryUsage(ids: string[]) {
  const inIds = { in: ids };
  const counts = await Promise.all([
    prisma.transaction.count({ where: { OR: [{ categoryId: inIds }, { subCategoryId: inIds }] } }),
    prisma.fixedCost.count({ where: { OR: [{ categoryId: inIds }, { subCategoryId: inIds }] } }),
    prisma.inventory.count({ where: { categoryId: inIds } }),
    prisma.subscription.count({ where: { categoryId: inIds } }),
    prisma.budget.count({ where: { categoryId: inIds } }),
    prisma.ecommerceTransaction.count({ where: { categoryId: inIds } }),
  ]);
  return counts.reduce((sum, n) => sum + n, 0);
}

export function categoryErrorResponse(error: unknown) {
  if (error instanceof CategoryError) {
    return NextResponse.json({ status: "error", message: error.message }, { status: error.status });
  }
  return null;
}
