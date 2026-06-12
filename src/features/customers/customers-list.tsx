"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Phone,
  Pencil,
  Trash2,
  HandCoins,
  ReceiptText,
  ChevronDown,
  Zap,
  X,
} from "lucide-react";
import { formatRs } from "@/lib/money";
import type { CustomerWithBalance, LedgerEntry } from "./queries";
import {
  archiveCustomer,
  loadCustomerHistory,
} from "./actions";
import { CustomerForm, type EditableCustomer } from "./customer-form";
import { PaymentForm } from "./payment-form";
import { ChargeForm } from "./charge-form";

type Modal =
  | { type: "add" }
  | { type: "edit"; customer: EditableCustomer }
  | { type: "pay"; customer: CustomerWithBalance }
  | { type: "charge"; customer: CustomerWithBalance }
  | null;

function balanceClass(balance: number) {
  if (balance > 0) return "text-loss"; // owes the shop
  if (balance < 0) return "text-brand-deep"; // advance / overpaid
  return "text-muted";
}

export function CustomersList({
  customers,
}: {
  customers: CustomerWithBalance[];
}) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<
    Record<string, LedgerEntry[] | "loading">
  >({});
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const q = query.trim().toLowerCase();
  const filtered = q
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) || (c.phone?.includes(q) ?? false),
      )
    : customers;

  function toggleExpand(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!history[id]) {
      setHistory((h) => ({ ...h, [id]: "loading" }));
      loadCustomerHistory(id).then((res) => {
        setHistory((h) => ({ ...h, [id]: res.ok ? res.entries : [] }));
      });
    }
  }

  function doArchive(id: string) {
    startTransition(async () => {
      await archiveCustomer(id);
      setConfirmArchive(null);
      setExpanded(null);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or phone…"
            className="w-full rounded-xl border border-line bg-paper py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand focus:bg-surface"
          />
        </div>
        <button
          type="button"
          onClick={() => setModal({ type: "add" })}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep"
        >
          <Plus className="h-4 w-4" /> Add customer
        </button>
      </div>

      {customers.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-line py-14 text-center">
          <p className="font-medium">No customers yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted">
            Add a customer here, or put a sale on credit in Quick Sale to start a
            tab.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">Last activity</th>
                <th className="px-4 py-2.5 text-right font-medium">Balance</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <RowGroup
                  key={c.id}
                  c={c}
                  isOpen={expanded === c.id}
                  rows={history[c.id]}
                  pending={pending}
                  confirmArchive={confirmArchive}
                  onToggle={() => toggleExpand(c.id)}
                  onPay={() => setModal({ type: "pay", customer: c })}
                  onCharge={() => setModal({ type: "charge", customer: c })}
                  onEdit={() =>
                    setModal({
                      type: "edit",
                      customer: {
                        id: c.id,
                        name: c.name,
                        phone: c.phone,
                        note: c.note,
                      },
                    })
                  }
                  onAskArchive={() => setConfirmArchive(c.id)}
                  onCancelArchive={() => setConfirmArchive(null)}
                  onConfirmArchive={() => doArchive(c.id)}
                />
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">
              No customers match your search.
            </p>
          )}
        </div>
      )}

      {modal && (
        <Overlay onClose={() => setModal(null)}>
          {modal.type === "pay" ? (
            <>
              <h3 className="mb-4 font-display text-lg font-bold tracking-tight">
                Record payment
              </h3>
              <PaymentForm
                customerId={modal.customer.id}
                customerName={modal.customer.name}
                balance={modal.customer.balance}
                onClose={() => setModal(null)}
              />
            </>
          ) : modal.type === "charge" ? (
            <>
              <h3 className="mb-1 font-display text-lg font-bold tracking-tight">
                Add to tab
              </h3>
              <p className="mb-4 text-xs text-muted">
                Money {modal.customer.name} owes you that isn&apos;t a product
                sale — a repair, an old balance, etc.
              </p>
              <ChargeForm
                customerId={modal.customer.id}
                customerName={modal.customer.name}
                balance={modal.customer.balance}
                onClose={() => setModal(null)}
              />
            </>
          ) : (
            <>
              <h3 className="mb-4 font-display text-lg font-bold tracking-tight">
                {modal.type === "edit" ? "Edit customer" : "Add customer"}
              </h3>
              <CustomerForm
                customer={modal.type === "edit" ? modal.customer : undefined}
                onClose={() => setModal(null)}
              />
            </>
          )}
        </Overlay>
      )}
    </div>
  );
}

function RowGroup({
  c,
  isOpen,
  rows,
  pending,
  confirmArchive,
  onToggle,
  onPay,
  onCharge,
  onEdit,
  onAskArchive,
  onCancelArchive,
  onConfirmArchive,
}: {
  c: CustomerWithBalance;
  isOpen: boolean;
  rows: LedgerEntry[] | "loading" | undefined;
  pending: boolean;
  confirmArchive: string | null;
  onToggle: () => void;
  onPay: () => void;
  onCharge: () => void;
  onEdit: () => void;
  onAskArchive: () => void;
  onCancelArchive: () => void;
  onConfirmArchive: () => void;
}) {
  return (
    <>
      <tr className="border-b border-line/60 last:border-0">
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-2 text-left"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 text-muted transition ${isOpen ? "rotate-180" : ""}`}
            />
            <span>
              <span className="block font-medium">{c.name}</span>
              {c.phone && (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Phone className="h-3 w-3" /> {c.phone}
                </span>
              )}
            </span>
          </button>
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-muted">
          {c.lastActivity ?? "—"}
        </td>
        <td
          className={`px-4 py-3 text-right font-mono font-semibold tnum ${balanceClass(c.balance)}`}
        >
          {c.balance < 0
            ? `${formatRs(-c.balance)} adv`
            : formatRs(c.balance)}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={onCharge}
              title="Add money they owe you (repair, old balance, etc.)"
              className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-text transition hover:border-loss hover:text-loss"
            >
              <ReceiptText className="h-3.5 w-3.5" /> Add to tab
            </button>
            <button
              type="button"
              onClick={onPay}
              title="Record money they paid you"
              className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-text transition hover:border-brand hover:text-brand-deep"
            >
              <HandCoins className="h-3.5 w-3.5" /> Pay
            </button>
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-paper hover:text-text"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onAskArchive}
              aria-label="Remove"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-loss/10 hover:text-loss"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {confirmArchive === c.id && (
        <tr className="border-b border-line/60 bg-loss/5">
          <td colSpan={4} className="px-4 py-2.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted">
                Remove {c.name}? Their past sales stay intact.
              </span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={onConfirmArchive}
                  className="font-semibold text-loss disabled:opacity-50"
                >
                  {pending ? "…" : "Yes, remove"}
                </button>
                <button
                  type="button"
                  onClick={onCancelArchive}
                  className="text-muted"
                >
                  Cancel
                </button>
              </span>
            </div>
          </td>
        </tr>
      )}

      {isOpen && (
        <tr className="border-b border-line/60 bg-paper/40">
          <td colSpan={4} className="px-4 py-3">
            <div className="mb-3">
              <Link
                href={`/quick-sale?customer=${c.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-ink-soft"
              >
                <Zap className="h-3.5 w-3.5" /> New credit sale
              </Link>
            </div>
            <div className="mb-2 flex flex-wrap gap-4 text-xs text-muted">
              <span>
                Billed on credit{" "}
                <span className="font-mono font-medium text-text tnum">
                  {formatRs(c.creditBilled)}
                </span>
              </span>
              {c.charged > 0 && (
                <span>
                  Added to tab{" "}
                  <span className="font-mono font-medium text-text tnum">
                    {formatRs(c.charged)}
                  </span>
                </span>
              )}
              <span>
                Repaid{" "}
                <span className="font-mono font-medium text-brand-deep tnum">
                  {formatRs(c.repaid)}
                </span>
              </span>
              {c.note && <span>Note: {c.note}</span>}
            </div>
            {rows === "loading" || rows === undefined ? (
              <p className="py-2 text-xs text-muted">Loading history…</p>
            ) : rows.length === 0 ? (
              <p className="py-2 text-xs text-muted">No credit history yet.</p>
            ) : (
              <ul className="space-y-1">
                {rows.map((e) => (
                  <li
                    key={`${e.kind}-${e.id}`}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-muted">
                      {e.date} · {e.label}
                    </span>
                    <span
                      className={`font-mono tnum ${e.amount < 0 ? "text-brand-deep" : "text-loss"}`}
                    >
                      {e.amount < 0 ? "−" : "+"}
                      {formatRs(Math.abs(e.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function Overlay({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-paper hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
