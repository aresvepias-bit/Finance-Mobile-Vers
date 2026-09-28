import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { InstallmentRecord } from "@/lib/installments";

export const installmentInclude = {
  category: { include: { parent: true } },
  bank: true,
  payments: { include: { transaction: true }, orderBy: { periodNumber: "desc" } },
} satisfies Prisma.InstallmentInclude;

type InstallmentWithRelations = Prisma.InstallmentGetPayload<{ include: typeof installmentInclude }>;

const ymd = (d: Date) => d.toISOString().split("T")[0];

export function formatInstallment(i: InstallmentWithRelations): InstallmentRecord {
  return {
    id: i.id,
    name: i.name,
    lender: i.lender || "",
    monthly_amount: Number(i.monthlyAmount),
    tenor_months: i.tenorMonths,
    start_date: ymd(i.startDate),
    initial_paid_count: i.initialPaidCount,
    paid_count: i.initialPaidCount + i.payments.length,
    categoryId: i.categoryId,
    category: i.category.parent ? `${i.category.parent.name} › ${i.category.name}` : i.category.name,
    bank_id: i.bankId,
    bank_name: i.bank.name,
    note: i.note || "",
    payments: i.payments.map((p) => ({
      id: p.id,
      period: p.periodNumber,
      date: ymd(p.transaction.date),
      amount: Number(p.transaction.amount),
      transactionId: p.transactionId,
    })),
  };
}

export async function listInstallments() {
  const rows = await prisma.installment.findMany({
    include: installmentInclude,
    orderBy: { startDate: "asc" },
  });
  return rows.map(formatInstallment);
}
