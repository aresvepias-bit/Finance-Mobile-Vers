import { prisma } from "@/lib/db";
import type { PocketRecord } from "@/lib/pockets";

export async function listPockets(): Promise<PocketRecord[]> {
  const rows = await prisma.pocket.findMany({
    include: { entries: { orderBy: [{ date: "desc" }, { createdAt: "desc" }] } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    percent: Number(p.percent),
    targetAmount: p.targetAmount === null ? null : Number(p.targetAmount),
    note: p.note || "",
    balance: p.entries.reduce((sum, e) => sum + Number(e.amount), 0),
    entries: p.entries.map((e) => ({
      id: e.id,
      type: e.type as PocketRecord["entries"][number]["type"],
      amount: Number(e.amount),
      month: e.month,
      date: e.date.toISOString().split("T")[0],
      note: e.note || "",
    })),
  }));
}
