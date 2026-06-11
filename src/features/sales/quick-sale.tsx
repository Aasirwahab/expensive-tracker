"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Plus, Minus, Trash2, ShoppingBag, Check } from "lucide-react";
import { formatRs } from "@/lib/money";
import { createSale, type SaleResult } from "./actions";

export type SaleProduct = {
  id: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  currentCost: number; // 0 for staff (cost is owner-only)
  stockQuantity: number;
  allowNegativeStock: boolean;
};

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

const PAYMENTS = [
  { v: "CASH", l: "Cash" },
  { v: "CARD", l: "Card" },
  { v: "BANK_TRANSFER", l: "Bank" },
  { v: "OTHER", l: "Other" },
] as const;

export function QuickSale({
  products,
  showProfit,
}: {
  products: SaleProduct[];
  showProfit: boolean;
}) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState<string>("CASH");
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
    setDone(null);
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

  function complete() {
    setError(null);
    setDone(null);
    if (cart.length === 0) return setError("Add a product first.");
    if (cart.some((l) => l.unitPrice <= 0))
      return setError("Enter a selling price for every item.");

    startTransition(async () => {
      const res: SaleResult = await createSale({
        items: cart.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
        paymentMethod: payment,
        idempotencyKey,
      });
      if (res.ok) {
        setDone(res.saleNumber);
        setCart([]);
        setIdempotencyKey(crypto.randomUUID());
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
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/plain", p.id)
                  }
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
                    {/* qty stepper */}
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
                    {/* selling price */}
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

        {/* Totals */}
        <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">Total</span>
            <span className="font-mono text-lg font-semibold tnum">
              {formatRs(totals.revenue)}
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
                  {formatRs(totals.profit)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Payment */}
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

        <button
          type="button"
          onClick={complete}
          disabled={pending || cart.length === 0}
          className="mt-3 w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep disabled:opacity-60"
        >
          {pending ? "Saving sale…" : `Complete sale · ${formatRs(totals.revenue)}`}
        </button>

        {error && (
          <p className="mt-2 rounded-lg bg-loss/10 px-3 py-2 text-sm text-loss">
            {error}
          </p>
        )}
        {done && (
          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium text-brand-deep">
            <Check className="h-4 w-4" /> Sale #{done} recorded. Stock updated.
          </p>
        )}
      </div>
    </div>
  );
}
