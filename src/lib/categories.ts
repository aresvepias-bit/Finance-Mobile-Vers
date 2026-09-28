// Helper struktur kategori (dipakai di server & client).
// Kategori maksimal 2 level: kategori utama -> subkategori.

export type CategoryType = "income" | "expense" | "inventory";

export interface CategoryRecord {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
}

export interface CategoryNode extends CategoryRecord {
  children: CategoryRecord[];
}

export const CATEGORY_TYPES: { value: CategoryType; label: string }[] = [
  { value: "expense", label: "Pengeluaran" },
  { value: "income", label: "Pemasukan" },
  { value: "inventory", label: "Inventory Aset" },
];

// Kategori sistem dipakai otomatis oleh fitur transfer antar rekening.
// Tidak boleh dipilih manual, diubah, atau dihapus.
export const TRANSFER_OUT = "Transfer Keluar";
export const TRANSFER_IN = "Transfer Masuk";
export const SYSTEM_CATEGORY_NAMES = [TRANSFER_OUT, TRANSFER_IN];

export function isSystemCategory(cat: Pick<CategoryRecord, "name" | "parentId">) {
  return !cat.parentId && SYSTEM_CATEGORY_NAMES.includes(cat.name);
}

const byName = (a: CategoryRecord, b: CategoryRecord) => a.name.localeCompare(b.name, "id");

/** Susun kategori satu tipe menjadi tree (utama + subkategori), urut abjad. */
export function buildCategoryTree(
  categories: CategoryRecord[],
  type: string,
  { includeSystem = false } = {}
): CategoryNode[] {
  const ofType = categories.filter((c) => c.type === type);
  return ofType
    .filter((c) => !c.parentId && (includeSystem || !isSystemCategory(c)))
    .sort(byName)
    .map((p) => ({
      ...p,
      children: ofType.filter((c) => c.parentId === p.id).sort(byName),
    }));
}

/** Label lengkap "Utama › Sub" untuk tampilan. */
export function getCategoryLabel(categories: CategoryRecord[], id: string | null | undefined) {
  if (!id) return "";
  const cat = categories.find((c) => c.id === id);
  if (!cat) return "";
  const parent = cat.parentId ? categories.find((c) => c.id === cat.parentId) : null;
  return parent ? `${parent.name} › ${cat.name}` : cat.name;
}

/** ID kategori utama dari sebuah kategori (dirinya sendiri bila sudah utama). */
export function getRootCategoryId(categories: CategoryRecord[], id: string | null | undefined) {
  if (!id) return "";
  const cat = categories.find((c) => c.id === id);
  return cat?.parentId || cat?.id || "";
}
