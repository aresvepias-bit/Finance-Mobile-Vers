import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listCategoriesWithUsage } from "@/lib/categoryResolver";
import { listInstallments } from "@/lib/installmentServer";
import { listPockets } from "@/lib/pocketServer";

// Label kategori lengkap "Utama › Sub"
const catLabel = (c: { name: string; parent?: { name: string } | null }) =>
  c.parent ? `${c.parent.name} › ${c.name}` : c.name;
const withParent = { include: { parent: true } } as const;

export async function GET() {
  try {
    // 1. Fetch categories
    const categories = await listCategoriesWithUsage();

    // 2. Fetch banks and calculate live balances
    const banks = await prisma.bank.findMany({
      orderBy: { name: "asc" },
    });
    const aggregates = await prisma.transaction.groupBy({
      by: ["bankId", "type"],
      _sum: { amount: true },
    });
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
    const banksWithBalance = banks.map((bank) => {
      const initial = Number(bank.initialBalance) || 0;
      const modifiers = balanceModifiers[bank.id] || { income: 0, expense: 0 };
      const currentBalance = initial + modifiers.income - modifiers.expense;
      return {
        id: bank.id,
        name: bank.name,
        account_number: bank.accountNumber,
        initial_balance: initial,
        account_type: bank.accountType,
        wallet_name: bank.walletName,
        currentBalance,
      };
    });

    // 3. Fetch all transactions (format to match old app)
    const transactions = await prisma.transaction.findMany({
      include: { category: true, subCategory: true, bank: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    const formattedTransactions = transactions.map((t) => ({
      id: t.id,
      type: t.type,
      category: t.category.name, // nama kategori utama (dipakai laporan & budget)
      categoryId: t.categoryId,
      categoryName: t.category.name,
      subCategoryId: t.subCategoryId,
      subCategoryName: t.subCategory?.name || null,
      amount: Number(t.amount),
      date: t.date.toISOString().split("T")[0],
      description: t.description || "",
      bank: t.bankId, // references bank.id
      bankId: t.bankId,
      bankName: t.bank.name,
      discount: Number(t.discount),
    }));

    // 4. Fetch fixed costs
    const fixedCosts = await prisma.fixedCost.findMany({
      include: { category: true, subCategory: true },
      orderBy: { name: "asc" },
    });
    const formattedFixedCosts = fixedCosts.map((fc) => ({
      id: fc.id,
      name: fc.name,
      amount: Number(fc.amount),
      categoryId: fc.categoryId,
      subCategoryId: fc.subCategoryId,
      category_id: fc.category.name,
      sub_category_id: fc.subCategory?.name || "",
      category_label: fc.subCategory ? `${fc.category.name} › ${fc.subCategory.name}` : fc.category.name,
    }));

    // 5. Fetch deposits
    const deposits = await prisma.deposit.findMany({
      include: { bank: true },
      orderBy: { startDate: "desc" },
    });
    const formattedDeposits = deposits.map((d) => ({
      id: d.id,
      name: d.name,
      bank_id: d.bankId,
      bank_name: d.bank.name,
      amount: Number(d.amount),
      rate: Number(d.rate),
      tenor: d.tenor,
      start_date: d.startDate.toISOString().split("T")[0],
      maturity_date: d.maturityDate.toISOString().split("T")[0],
      status: d.status,
    }));

    // 6. Fetch cryptos
    const cryptos = await prisma.crypto.findMany({
      orderBy: { name: "asc" },
    });
    const formattedCryptos = cryptos.map((c) => ({
      id: c.id,
      name: c.name,
      quantity: Number(c.quantity),
      value_idr: Number(c.valueIdr),
    }));

    // 7. Fetch ecommerce platforms
    const platforms = await prisma.ecommercePlatform.findMany({
      orderBy: { platform: "asc" },
    });
    const formattedPlatforms = platforms.map((p) => ({
      id: p.id,
      platform: p.platform,
      store_name: p.storeName || "",
    }));

    // 8. Fetch ecommerce transactions
    const ecommerceTxns = await prisma.ecommerceTransaction.findMany({
      include: { platform: true, category: withParent, bank: true },
      orderBy: { date: "desc" },
    });
    const formattedEcommerce = ecommerceTxns.map((et) => ({
      id: et.id,
      date: et.date.toISOString().split("T")[0],
      platform_id: et.platformId,
      platform: et.platform.platform,
      item_name: et.itemName,
      categoryId: et.categoryId,
      category: catLabel(et.category),
      amount: Number(et.amount),
      bank_id: et.bankId,
      bank_name: et.bank.name,
      tenor: et.tenor,
      txn_id: et.txnId || "",
    }));

    // 9. Fetch inventory
    const inventory = await prisma.inventory.findMany({
      include: { category: withParent },
      orderBy: { purchaseDate: "desc" },
    });
    const formattedInventory = inventory.map((i) => ({
      id: i.id,
      item_name: i.itemName,
      categoryId: i.categoryId,
      category: catLabel(i.category),
      purchase_price: Number(i.purchasePrice),
      purchase_date: i.purchaseDate.toISOString().split("T")[0],
      lifespan_months: i.lifespanMonths,
      condition: i.condition,
      source: i.source,
      ecom_id: i.ecomId || "",
    }));

    // 10. Fetch subscriptions
    const subscriptions = await prisma.subscription.findMany({
      include: { category: withParent, bank: true },
      orderBy: { dueDate: "asc" },
    });
    const formattedSubscriptions = subscriptions.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email || "",
      amount: Number(s.amount),
      billing_cycle: s.billingCycle,
      due_date: s.dueDate.toISOString().split("T")[0],
      categoryId: s.categoryId,
      category: catLabel(s.category),
      bank_id: s.bankId,
      bank_name: s.bank.name,
      status: s.status,
    }));

    // 11. Fetch budgets
    const budgets = await prisma.budget.findMany({
      include: { category: true },
    });
    const formattedBudgets = budgets.map((b) => ({
      id: b.id,
      month: b.month,
      categoryId: b.categoryId,
      category: b.category.name,
      limit: Number(b.limit),
      note: b.note || "",
    }));

    return NextResponse.json({
      status: "success",
      data: {
        categories,
        banks: banksWithBalance,
        transactions: formattedTransactions,
        fixedCosts: formattedFixedCosts,
        deposits: formattedDeposits,
        cryptos: formattedCryptos,
        ecomPlatforms: formattedPlatforms,
        ecommerce: formattedEcommerce,
        inventory: formattedInventory,
        subscriptions: formattedSubscriptions,
        budgets: formattedBudgets,
        installments: await listInstallments(),
        pockets: await listPockets(),
        settings: Object.fromEntries((await prisma.appSetting.findMany()).map((r) => [r.key, r.value])),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
