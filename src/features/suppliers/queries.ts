import { prisma } from "@/lib/db";

export type SupplierWithBalance = {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  /** Total of all bills the shop owes this supplier. */
  billed: number;
  /** Total the shop has paid this supplier. */
  paid: number;
  /** Outstanding balance; > 0 means the shop still owes the supplier. */
  balance: number;
  lastActivity: string | null;
};

const dateLabel = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/**
 * All active suppliers with the outstanding balance the shop owes each, from
 * bills minus payments. Financial data — owner-only.
 */
export async function listSuppliersWithBalances(
  businessId: string,
): Promise<SupplierWithBalance[]> {
  const [suppliers, billAgg, payAgg] = await Promise.all([
    prisma.supplier.findMany({
      where: { businessId, archivedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.supplierBill.groupBy({
      by: ["supplierId"],
      where: { businessId },
      _sum: { amount: true },
      _max: { billedAt: true },
    }),
    prisma.supplierPayment.groupBy({
      by: ["supplierId"],
      where: { businessId },
      _sum: { amount: true },
      _max: { paidAt: true },
    }),
  ]);

  const bills = new Map(billAgg.map((b) => [b.supplierId, b]));
  const pays = new Map(payAgg.map((p) => [p.supplierId, p]));

  return suppliers.map((s) => {
    const b = bills.get(s.id);
    const p = pays.get(s.id);
    const billed = b?._sum.amount ?? 0;
    const paid = p?._sum.amount ?? 0;
    const last = [b?._max.billedAt, p?._max.paidAt]
      .filter(Boolean)
      .map((d) => (d as Date).getTime());
    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      note: s.note,
      billed,
      paid,
      balance: billed - paid,
      lastActivity: last.length ? dateLabel(new Date(Math.max(...last))) : null,
    };
  });
}

/** Grand total of money the shop owes across all suppliers. */
export async function totalPayables(businessId: string): Promise<number> {
  const list = await listSuppliersWithBalances(businessId);
  return list.reduce((sum, s) => sum + Math.max(0, s.balance), 0);
}

export type SupplierLedgerEntry = {
  id: string;
  kind: "bill" | "payment";
  date: string;
  at: number; // epoch ms, for sorting
  label: string;
  /** Positive increases what the shop owes (bill); negative reduces it (payment). */
  amount: number;
};

/** One supplier's recent bills and payments, newest first. */
export async function getSupplierLedger(
  businessId: string,
  supplierId: string,
): Promise<SupplierLedgerEntry[]> {
  const [bills, payments] = await Promise.all([
    prisma.supplierBill.findMany({
      where: { businessId, supplierId },
      orderBy: { billedAt: "desc" },
      take: 50,
      select: { id: true, amount: true, reason: true, billedAt: true },
    }),
    prisma.supplierPayment.findMany({
      where: { businessId, supplierId },
      orderBy: { paidAt: "desc" },
      take: 50,
      select: { id: true, amount: true, method: true, paidAt: true },
    }),
  ]);

  const entries: SupplierLedgerEntry[] = [];
  for (const b of bills) {
    entries.push({
      id: b.id,
      kind: "bill",
      date: dateLabel(b.billedAt),
      at: b.billedAt.getTime(),
      label: b.reason,
      amount: b.amount,
    });
  }
  for (const p of payments) {
    entries.push({
      id: p.id,
      kind: "payment",
      date: dateLabel(p.paidAt),
      at: p.paidAt.getTime(),
      label: "Payment made",
      amount: -p.amount,
    });
  }
  return entries.sort((a, b) => b.at - a.at);
}
