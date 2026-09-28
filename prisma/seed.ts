import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding started...");

  // 1. Clear existing data
  await prisma.user.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.ecommerceTransaction.deleteMany();
  await prisma.ecommercePlatform.deleteMany();
  await prisma.crypto.deleteMany();
  await prisma.deposit.deleteMany();
  await prisma.fixedCost.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.bank.deleteMany();
  await prisma.category.deleteMany();

  // 2. Create Default Admin User
  const admin = await prisma.user.create({
    data: {
      username: "admin",
      pin: "123456", // Default PIN
      role: "superadmin",
    },
  });
  console.log("Created admin user:", admin.username);

  // 3. Create Default Cash Account
  const wallet = await prisma.bank.create({
    data: {
      name: "Dompet / Cash",
      accountNumber: "-",
      initialBalance: 0,
      accountType: "cash",
    },
  });
  console.log("Created default cash account:", wallet.name);

  // 4. Create Ecommerce Platforms
  const platforms = [
    { platform: "Shopee", storeName: "" },
    { platform: "Tokopedia", storeName: "" },
    { platform: "TikTok Shop", storeName: "" },
    { platform: "Blibli", storeName: "" },
    { platform: "Lazada", storeName: "" },
  ];
  for (const plat of platforms) {
    await prisma.ecommercePlatform.create({ data: plat });
  }
  console.log("Created ecommerce platforms.");

  // 5. Seed Master Categories
  const categorySeeds = [
    // PEMASUKAN
    { id: "cat_inc_1", name: "Gaji", type: "income", parentId: null },
    { id: "cat_inc_cb", name: "Cashback / Promo", type: "income", parentId: null },

    // PENGELUARAN — Transportasi
    { id: "cat_exp_1", name: "Transportasi", type: "expense", parentId: null },
    { id: "cat_exp_1_sub_1", name: "MRT", type: "expense", parentId: "cat_exp_1" },

    // PENGELUARAN — Tagihan & Utilitas
    { id: "cat_exp_tagihan", name: "Tagihan & IPL", type: "expense", parentId: null },
    { id: "cat_exp_listrik", name: "Listrik", type: "expense", parentId: "cat_exp_tagihan" },
    { id: "cat_exp_air", name: "Air / PDAM", type: "expense", parentId: "cat_exp_tagihan" },
    { id: "cat_exp_inet", name: "Internet & TV", type: "expense", parentId: "cat_exp_tagihan" },

    // PENGELUARAN — Makan & Minum
    { id: "cat_exp_makan", name: "Makan & Minum", type: "expense", parentId: null },
    { id: "cat_exp_makan_harian", name: "Makan Harian", type: "expense", parentId: "cat_exp_makan" },
    { id: "cat_exp_jajan", name: "Jajan & Kopi", type: "expense", parentId: "cat_exp_makan" },
    { id: "cat_exp_resto", name: "Makan Luar / Resto", type: "expense", parentId: "cat_exp_makan" },

    // PENGELUARAN — Kebutuhan Harian
    { id: "cat_exp_belanja", name: "Kebutuhan Harian", type: "expense", parentId: null },
    { id: "cat_exp_minimarket", name: "Minimarket (Sabun, Tisu)", type: "expense", parentId: "cat_exp_belanja" },
    { id: "cat_exp_medis", name: "Obat & Kesehatan", type: "expense", parentId: "cat_exp_belanja" },

    // PENGELUARAN — Sosial & Keluarga
    { id: "cat_exp_sosial", name: "Sosial & Keluarga", type: "expense", parentId: null },
    { id: "cat_exp_istri", name: "Kas Istri", type: "expense", parentId: "cat_exp_sosial" },
    { id: "cat_exp_ortu", name: "Orang Tua", type: "expense", parentId: "cat_exp_sosial" },
    { id: "cat_exp_hadiah", name: "Hadiah & Kado", type: "expense", parentId: "cat_exp_sosial" },
    { id: "cat_exp_sedekah", name: "Donasi & Sedekah", type: "expense", parentId: "cat_exp_sosial" },

    // INVENTORY ASET
    { id: "cat_inv_gadget", name: "Gadget / Elektronik", type: "inventory", parentId: null },
    { id: "cat_inv_fashion", name: "Pakaian / Fashion", type: "inventory", parentId: null },
    { id: "cat_inv_vehicle", name: "Kendaraan", type: "inventory", parentId: null },
    { id: "cat_inv_home", name: "Peralatan Rumah", type: "inventory", parentId: null },
  ];

  // We seed parents first, then children
  const parents = categorySeeds.filter(c => c.parentId === null);
  const children = categorySeeds.filter(c => c.parentId !== null);

  for (const cat of parents) {
    await prisma.category.create({
      data: {
        id: cat.id,
        name: cat.name,
        type: cat.type,
      },
    });
  }

  for (const cat of children) {
    await prisma.category.create({
      data: {
        id: cat.id,
        name: cat.name,
        type: cat.type,
        parentId: cat.parentId,
      },
    });
  }

  console.log("Seeded categories successfully.");
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
