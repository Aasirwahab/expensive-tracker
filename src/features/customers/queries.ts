import { prisma } from "@/lib/db";

export type CustomerWithBalance = {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  /** Credit extended at sale time = sum(total - amountPaid) over completed sales. */
  creditBilled: number;
  /** Manual charges added to the tab (repairs, old balances, off-catalogue). */
  charged: number;
  /** Total repayments the customer has made. */
  repaid: number;
  /** Outstanding balance; > 0 means the customer owes the shop. */
  balance: number;
  lastActivity: string | null;
};

const dateLabel = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/**
 * All active customers with their outstanding credit balance, computed from
 * completed sales and repayments. This is financial data — owner-only.
 */
export async function listCustomersWithBalances(
  businessId: string,
): Promise<CustomerWithBalance[]> {
  const [customers, saleAgg, payAgg, chargeAgg] = await Promise.all([
    prisma.customer.findMany({
      where: { businessId, archivedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.sale.groupBy({
      by: ["customerId"],
      where: { businessId, status: "COMPLETED", customerId: { not: null } },
      _sum: { total: true, amountPaid: true },
      _max: { soldAt: true },
    }),
    prisma.customerPayment.groupBy({
      by: ["customerId"],
      where: { businessId },
      _sum: { amount: true },
      _max: { paidAt: true },
    }),
    prisma.customerCharge.groupBy({
      by: ["customerId"],
      where: { businessId },
      _sum: { amount: true },
      _max: { chargedAt: true },
    }),
  ]);

  const sales = new Map(saleAgg.map((s) => [s.customerId, s]));
  const pays = new Map(payAgg.map((p) => [p.customerId, p]));
  const charges = new Map(chargeAgg.map((c) => [c.customerId, c]));

  return customers.map((c) => {
    const s = sales.get(c.id);
    const p = pays.get(c.id);
    const ch = charges.get(c.id);
    const creditBilled = (s?._sum.total ?? 0) - (s?._sum.amountPaid ?? 0);
    const charged = ch?._sum.amount ?? 0;
    const repaid = p?._sum.amount ?? 0;
    const last = [s?._max.soldAt, p?._max.paidAt, ch?._max.chargedAt]
      .filter(Boolean)
      .map((d) => (d as Date).getTime());
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      note: c.note,
      creditBilled,
      charged,
      repaid,
      balance: creditBilled + charged - repaid,
      lastActivity: last.length ? dateLabel(new Date(Math.max(...last))) : null,
    };
  });
}

/** Grand total of money owed to the shop across all customers. */
export async function totalReceivables(businessId: string): Promise<number> {
  const list = await listCustomersWithBalances(businessId);
  return list.reduce((sum, c) => sum + Math.max(0, c.balance), 0);
}

export type LedgerEntry = {
  id: string;
  kind: "credit" | "payment";
  date: string;
  at: number; // epoch ms, for sorting
  label: string;
  /** Positive increases what they owe (credit sale); negative reduces it (payment). */
  amount: number;
};

/** A single customer's recent credit sales and repayments, newest first. */
export async function getCustomerLedger(
  businessId: string,
  customerId: string,
): Promise<LedgerEntry[]> {
  const [sales, payments, charges] = await Promise.all([
    prisma.sale.findMany({
      where: { businessId, customerId, status: "COMPLETED" },
      orderBy: { soldAt: "desc" },
      take: 50,
      select: { id: true, saleNumber: true, total: true, amountPaid: true, soldAt: true },
    }),
    prisma.customerPayment.findMany({
      where: { businessId, customerId },
      orderBy: { paidAt: "desc" },
      take: 50,
      select: { id: true, amount: true, method: true, paidAt: true },
    }),
    prisma.customerCharge.findMany({
      where: { businessId, customerId },
      orderBy: { chargedAt: "desc" },
      take: 50,
      select: { id: true, amount: true, reason: true, chargedAt: true },
    }),
  ]);

  const entries: LedgerEntry[] = [];
  for (const s of sales) {
    const owed = s.total - s.amountPaid;
    if (owed === 0) continue; // fully paid at the counter — not on the tab
    entries.push({
      id: s.id,
      kind: "credit",
      date: dateLabel(s.soldAt),
      at: s.soldAt.getTime(),
      label: `Sale #${s.saleNumber}`,
      amount: owed,
    });
  }
  for (const ch of charges) {
    entries.push({
      id: ch.id,
      kind: "credit",
      date: dateLabel(ch.chargedAt),
      at: ch.chargedAt.getTime(),
      label: ch.reason,
      amount: ch.amount,
    });
  }
  for (const p of payments) {
    entries.push({
      id: p.id,
      kind: "payment",
      date: dateLabel(p.paidAt),
      at: p.paidAt.getTime(),
      label: "Payment received",
      amount: -p.amount,
    });
  }
  return entries.sort((a, b) => b.at - a.at);
}

/** Net outstanding balance per customer (customerId -> balance), computed from
 * credit sales + manual charges − payments. Shared by the picker and could back
 * any other balance lookup. */
export async function getCustomerBalanceMap(
  businessId: string,
): Promise<Map<string, number>> {
  const [saleAgg, payAgg, chargeAgg] = await Promise.all([
    prisma.sale.groupBy({
      by: ["customerId"],
      where: { businessId, status: "COMPLETED", customerId: { not: null } },
      _sum: { total: true, amountPaid: true },
    }),
    prisma.customerPayment.groupBy({
      by: ["customerId"],
      where: { businessId },
      _sum: { amount: true },
    }),
    prisma.customerCharge.groupBy({
      by: ["customerId"],
      where: { businessId },
      _sum: { amount: true },
    }),
  ]);

  const map = new Map<string, number>();
  for (const s of saleAgg) {
    if (!s.customerId) continue;
    map.set(
      s.customerId,
      (map.get(s.customerId) ?? 0) + (s._sum.total ?? 0) - (s._sum.amountPaid ?? 0),
    );
  }
  for (const ch of chargeAgg) {
    map.set(ch.customerId, (map.get(ch.customerId) ?? 0) + (ch._sum.amount ?? 0));
  }
  for (const p of payAgg) {
    map.set(p.customerId, (map.get(p.customerId) ?? 0) - (p._sum.amount ?? 0));
  }
  return map;
}

export type PickerCustomer = {
  id: string;
  name: string;
  phone: string | null;
  balance: number | null; // null when balances are hidden (staff)
};

/**
 * Customer list for the Quick Sale picker. Pass `withBalances` only for owners —
 * staff must never receive financial figures, so they get name/phone only.
 */
export async function listCustomersForPicker(
  businessId: string,
  withBalances = false,
): Promise<PickerCustomer[]> {
  const customers = await prisma.customer.findMany({
    where: { businessId, archivedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, phone: true },
  });
  if (!withBalances) {
    return customers.map((c) => ({ ...c, balance: null }));
  }
  const balances = await getCustomerBalanceMap(businessId);
  return customers.map((c) => ({ ...c, balance: balances.get(c.id) ?? 0 }));
}
