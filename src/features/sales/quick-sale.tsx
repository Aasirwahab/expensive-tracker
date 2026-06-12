"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Check,
  Printer,
  UserPlus,
  X,
} from "lucide-react";
import { formatRs } from "@/lib/money";
import { createSale, type SaleResult } from "./actions";
import { quickCreateCustomer } from "@/features/customers/actions";

export type SaleProduct = {
  id: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  currentCost: number; // 0 for staff (cost is owner-only)
  stockQuantity: number;
  allowNegativeStock: boolean;
};

export type PickerCustomer = {
  id: string;
  name: string;
  phone: string | null;
  balance: number | null; // outstanding owed; null when hidden from staff
};

// Short balance label for the customer picker (owner view).
function balanceLabel(b: number): { text: string; cls: string } {
  if (b > 0) return { text: `owes ${formatRs(b)}`, cls: "text-loss" };
  if (b < 0) return { text: `${formatRs(-b)} adv`, cls: "text-brand-deep" };
  return { text: "no dues", cls: "text-muted" };
}

type CartLine = {
  productId: string;
  name: string;
  imageUrl: string | null;
  unitCost: number;
  stock: number;
  allowNeg: boolean;
  quantity: number;
  unitPrice: number;
};

type ReceiptData = {
  saleNumber: string;
  date: Date;
  payment: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  owed: number;
  customerName: string | null;
};

const PAYMENTS = [
  { v: "CASH", l: "Cash" },
  { v: "CARD", l: "Card" },
  { v: "BANK_TRANSFER", l: "Bank" },
  { v: "CREDIT", l: "Credit" },
  { v: "OTHER", l: "Other" },
] as const;

const paymentLabel = (v: string) => PAYMENTS.find((p) => p.v === v)?.l ?? v;

export function QuickSale({
  products,
  customers,
  showProfit,
  businessName,
  initialCustomerId = null,
}: {
  products: SaleProduct[];
  customers: PickerCustomer[];
  showProfit: boolean;
  businessName: string;
  initialCustomerId?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  // Arriving with a customer (from the Customers page) starts a credit sale.
  const [payment, setPayment] = useState<string>(
    initialCustomerId ? "CREDIT" : "CASH",
  );
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [pending, startTransition] = useTransition();

  const [discount, setDiscount] = useState("");

  // Credit ("udhaar") sale state.
  const [people, setPeople] = useState<PickerCustomer[]>(customers);
  const [customerId, setCustomerId] = useState<string | null>(initialCustomerId);
  const [custQuery, setCustQuery] = useState("");
  const [paidNow, setPaidNow] = useState("");
  const [addingCustomer, startAddCustomer] = useTransition();

  const selectedCustomer = people.find((c) => c.id === customerId) ?? null;
  const isCredit = payment === "CREDIT";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku?.toLowerCase().includes(q) ?? false),
    );
  }, [products, query]);

  function addToCart(p: SaleProduct) {
    setError(null);
    setCart((prev) => {
      const found = prev.find((l) => l.productId === p.id);
      const max = p.allowNegativeStock ? Infinity : p.stockQuantity;
      if (found) {
        if (found.quantity >= max) return prev;
        return prev.map((l) =>
          l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      if (!p.allowNegativeStock && p.stockQuantity <= 0) return prev;
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          imageUrl: p.imageUrl,
          unitCost: p.currentCost,
          stock: p.stockQuantity,
          allowNeg: p.allowNegativeStock,
          quantity: 1,
          unitPrice: 0,
        },
      ];
    });
  }

  function setQty(id: string, qty: number) {
    setCart((prev) =>
      prev.map((l) => {
        if (l.productId !== id) return l;
        const max = l.allowNeg ? Infinity : l.stock;
        return { ...l, quantity: Math.max(1, Math.min(max, Math.floor(qty))) };
      }),
    );
  }

  function setPrice(id: string, value: string) {
    const price = Math.max(0, Math.floor(Number(value) || 0));
    setCart((prev) =>
      prev.map((l) => (l.productId === id ? { ...l, unitPrice: price } : l)),
    );
  }

  function removeLine(id: string) {
    setCart((prev) => prev.filter((l) => l.productId !== id));
  }

  const totals = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    for (const l of cart) {
      revenue += l.quantity * l.unitPrice;
      cost += l.quantity * l.unitCost;
    }
    return { revenue, cost, profit: revenue - cost };
  }, [cart]);

  // Discount (whole rupees) is capped at the subtotal; netTotal is what's due.
  const discountValue = Math.min(
    Math.max(0, Math.floor(Number(discount) || 0)),
    totals.revenue,
  );
  const netTotal = totals.revenue - discountValue;

  // For a credit sale: how much is paid up front (clamped to the net total).
  const paidUpFront = Math.min(
    Math.max(0, Math.floor(Number(paidNow) || 0)),
    netTotal,
  );

  function complete() {
    setError(null);
    if (cart.length === 0) return setError("Add a product first.");
    if (cart.some((l) => l.unitPrice <= 0))
      return setError("Enter a selling price for every item.");
    if (isCredit && !customerId)
      return setError("Pick a customer for a credit sale.");

    const snapshot = cart.map((l) => ({
      name: l.name,
      qty: l.quantity,
      price: l.unitPrice,
    }));
    const customerName = selectedCustomer?.name ?? null;

    startTransition(async () => {
      const res: SaleResult = await createSale({
        items: cart.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
        paymentMethod: payment,
        discount: discountValue,
        customerId: isCredit ? customerId : null,
        amountPaid: isCredit ? paidUpFront : undefined,
        idempotencyKey,
      });
      if (res.ok) {
        setReceipt({
          saleNumber: res.saleNumber,
          date: new Date(),
          payment,
          items: snapshot,
          total: res.total,
          owed: res.owed,
          customerName,
        });
        setCart([]);
        setIdempotencyKey(crypto.randomUUID());
        setDiscount("");
        setCustomerId(null);
        setCustQuery("");
        setPaidNow("");
        setPayment("CASH");
      } else {
        setError(res.error);
      }
    });
  }

  function addCustomer(name: string) {
    const trimmed = name.trim();
    if (!trimmed || addingCustomer) return;
    startAddCustomer(async () => {
      const res = await quickCreateCustomer({ name: trimmed });
      if (res.ok) {
        // A brand-new customer has no balance yet.
        setPeople((prev) => [...prev, { ...res.customer, balance: 0 }]);
        setCustomerId(res.customer.id);
        setCustQuery("");
        setError(null);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
      {/* Products */}
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-xl border border-line bg-paper py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand focus:bg-surface"
          />
        </div>

        {products.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            No products yet. Add some on the Products page first.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => {
              const out = !p.allowNegativeStock && p.stockQuantity <= 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={out}
                  draggable={!out}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
                  onClick={() => addToCart(p)}
                  className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface text-left transition hover:border-brand hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="grid aspect-square w-full place-items-center bg-paper">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="font-display text-xl font-bold text-ink/30">
                        {p.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted">
                      {out ? "Out of stock" : `${p.stockQuantity} in stock`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bill / cart */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData("text/plain");
          const p = products.find((x) => x.id === id);
          if (p) addToCart(p);
        }}
        className="flex h-fit flex-col rounded-2xl border border-line bg-surface p-4 lg:sticky lg:top-20"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-bold tracking-tight">
            Current sale
          </h2>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setCart([])}
              className="text-xs text-muted hover:text-loss"
            >
              Clear
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="grid place-items-center rounded-xl border border-dashed border-line py-10 text-center">
            <ShoppingBag className="mb-2 h-6 w-6 text-muted" />
            <p className="text-sm text-muted">Tap or drag a product here</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {cart.map((l) => (
              <li key={l.productId} className="flex gap-2.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-paper">
                  {l.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-ink/40">
                      {l.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium">{l.name}</p>
                    <button
                      type="button"
                      onClick={() => removeLine(l.productId)}
                      className="text-muted hover:text-loss"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-line">
                      <button
                        type="button"
                        onClick={() => setQty(l.productId, l.quantity - 1)}
                        className="grid h-7 w-7 place-items-center text-muted hover:text-text"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-7 text-center font-mono text-sm tnum">
                        {l.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(l.productId, l.quantity + 1)}
                        className="grid h-7 w-7 place-items-center text-muted hover:text-text"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="relative flex-1">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">
                        Rs
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={l.unitPrice === 0 ? "" : l.unitPrice}
                        onChange={(e) => setPrice(l.productId, e.target.value)}
                        placeholder="Price"
                        className="w-full rounded-lg border border-line bg-paper py-1.5 pl-7 pr-2 text-right font-mono text-sm tnum outline-none focus:border-brand focus:bg-surface"
                      />
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-muted">
                      {l.quantity} × {formatRs(l.unitPrice)}
                    </span>
                    <span className="font-mono font-medium tnum">
                      {formatRs(l.quantity * l.unitPrice)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">Discount</span>
            <div className="relative w-28">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">
                Rs
              </span>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-line bg-paper py-1.5 pl-7 pr-2 text-right font-mono text-sm tnum outline-none focus:border-brand focus:bg-surface"
              />
            </div>
          </div>
          {discountValue > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Subtotal</span>
              <span className="font-mono tnum text-muted">
                {formatRs(totals.revenue)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted">Total</span>
            <span className="font-mono text-lg font-semibold tnum">
              {formatRs(netTotal)}
            </span>
          </div>
          {showProfit && (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Cost</span>
                <span className="font-mono tnum text-muted">
                  {formatRs(totals.cost)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Profit</span>
                <span className="font-mono font-semibold tnum text-brand-deep">
                  {formatRs(netTotal - totals.cost)}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {PAYMENTS.map((p) => (
            <button
              key={p.v}
              type="button"
              onClick={() => setPayment(p.v)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                payment === p.v
                  ? "bg-ink text-white"
                  : "border border-line text-muted hover:text-text"
              }`}
            >
              {p.l}
            </button>
          ))}
        </div>

        {isCredit && (
          <div className="mt-3 space-y-2 rounded-xl border border-line bg-paper/60 p-3">
            <p className="text-xs font-medium text-muted">
              On credit (Khata) —{" "}
              {selectedCustomer
                ? `${selectedCustomer.name} pays later`
                : "pick who pays later"}
            </p>
            {selectedCustomer ? (
              <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {selectedCustomer.name}
                  </p>
                  {selectedCustomer.phone && (
                    <p className="truncate text-xs text-muted">
                      {selectedCustomer.phone}
                    </p>
                  )}
                  {showProfit && selectedCustomer.balance != null && (
                    <p
                      className={`truncate text-xs ${balanceLabel(selectedCustomer.balance).cls}`}
                    >
                      Currently {balanceLabel(selectedCustomer.balance).text}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setCustomerId(null)}
                  className="text-muted hover:text-loss"
                  aria-label="Change customer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  value={custQuery}
                  onChange={(e) => setCustQuery(e.target.value)}
                  placeholder="Search or add customer…"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand"
                />
                {(() => {
                  const q = custQuery.trim().toLowerCase();
                  const matches = q
                    ? people.filter(
                        (c) =>
                          c.name.toLowerCase().includes(q) ||
                          (c.phone?.includes(q) ?? false),
                      )
                    : people;
                  const exact = people.some(
                    (c) => c.name.trim().toLowerCase() === q,
                  );
                  return (
                    <div className="mt-1.5 max-h-40 space-y-1 overflow-y-auto">
                      {matches.slice(0, 6).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCustomerId(c.id);
                            setCustQuery("");
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-surface"
                        >
                          <span className="truncate">{c.name}</span>
                          {showProfit && c.balance != null ? (
                            <span
                              className={`ml-2 shrink-0 text-xs ${balanceLabel(c.balance).cls}`}
                            >
                              {balanceLabel(c.balance).text}
                            </span>
                          ) : c.phone ? (
                            <span className="ml-2 shrink-0 text-xs text-muted">
                              {c.phone}
                            </span>
                          ) : null}
                        </button>
                      ))}
                      {q && !exact && (
                        <button
                          type="button"
                          disabled={addingCustomer}
                          onClick={() => addCustomer(custQuery)}
                          className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-brand-deep hover:bg-surface disabled:opacity-60"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          {addingCustomer
                            ? "Adding…"
                            : `Add "${custQuery.trim()}"`}
                        </button>
                      )}
                      {matches.length === 0 && !q && (
                        <p className="px-2.5 py-1.5 text-xs text-muted">
                          No customers yet — type a name to add one.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">
                Rs
              </span>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={paidNow}
                onChange={(e) => setPaidNow(e.target.value)}
                placeholder="Paid now (optional)"
                className="w-full rounded-lg border border-line bg-surface py-2 pl-7 pr-2 text-right font-mono text-sm tnum outline-none focus:border-brand"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Going on tab</span>
              <span className="font-mono font-semibold tnum text-loss">
                {formatRs(Math.max(0, netTotal - paidUpFront))}
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={complete}
          disabled={pending || cart.length === 0}
          className="mt-3 w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep disabled:opacity-60"
        >
          {pending
            ? "Saving sale…"
            : isCredit
              ? `Save credit sale · ${formatRs(netTotal)}`
              : `Complete sale · ${formatRs(netTotal)}`}
        </button>

        {error && (
          <p className="mt-2 rounded-lg bg-loss/10 px-3 py-2 text-sm text-loss">
            {error}
          </p>
        )}
      </div>

      {/* Receipt */}
      {receipt && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => setReceipt(null)}
        >
          <div
            className="receipt-print w-full max-w-xs rounded-2xl bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <p className="font-display text-lg font-bold">{businessName}</p>
              <p className="text-xs text-muted">Receipt #{receipt.saleNumber}</p>
              <p className="text-xs text-muted">
                {receipt.date.toLocaleString()}
              </p>
            </div>
            <div className="my-3 space-y-1 border-t border-dashed border-line pt-3 text-sm">
              {receipt.items.map((it, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span className="truncate">
                    {it.name}{" "}
                    <span className="text-muted">× {it.qty}</span>
                  </span>
                  <span className="font-mono tnum">
                    {formatRs(it.qty * it.price)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t border-dashed border-line pt-3 text-sm font-semibold">
              <span>Total</span>
              <span className="font-mono tnum">{formatRs(receipt.total)}</span>
            </div>
            {receipt.owed > 0 ? (
              <div className="mt-2 space-y-0.5 rounded-lg bg-loss/10 px-3 py-2 text-xs">
                {receipt.customerName && (
                  <div className="flex justify-between">
                    <span className="text-muted">Customer</span>
                    <span className="font-medium text-text">
                      {receipt.customerName}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-loss">
                  <span>On credit (due)</span>
                  <span className="font-mono tnum">{formatRs(receipt.owed)}</span>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-center text-xs text-muted">
                Paid by {paymentLabel(receipt.payment)}
              </p>
            )}
            <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs font-medium text-brand-deep">
              <Check className="h-3.5 w-3.5" /> Thank you!
            </p>

            <div className="no-print mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="flex-1 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-text hover:bg-paper"
              >
                New sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
