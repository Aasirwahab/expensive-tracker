import { prisma } from "@/lib/db";
import { getActiveContext } from "@/lib/auth-context";
import { resolvePeriod } from "@/lib/date-range";
import { toCsv } from "@/lib/csv";

export async function GET(request: Request) {
  const ctx = await getActiveContext();
  if (!ctx?.business) return new Response("Unauthorized", { status: 401 });
  if (ctx.role !== "OWNER") return new Response("Forbidden", { status: 403 });

  const params = new URL(request.url).searchParams;
  const { range, month } = resolvePeriod(params.get("range"), params.get("month"));
  const expenseDate = range.from
    ? { gte: range.from, lte: range.to }
    : { lte: range.to };

  const expenses = await prisma.expense.findMany({
    where: { businessId: ctx.business.id, status: "ACTIVE", expenseDate },
    include: {
      expenseCategory: { select: { name: true } },
      createdBy: { select: { displayName: true } },
    },
    orderBy: { expenseDate: "desc" },
  });

  const headers = [
    "Date",
    "Category",
    "Description",
    "Payee",
    "Payment",
    "Amount",
    "Entered by",
  ];
  const rows = expenses.map((e) => [
    e.expenseDate.toISOString().slice(0, 10),
    e.expenseCategory.name,
    e.description,
    e.payee ?? "",
    e.paymentMethod ? String(e.paymentMethod) : "",
    e.amount,
    e.createdBy.displayName,
  ]);

  return new Response(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="expenses-${month ?? range.key}.csv"`,
    },
  });
}
