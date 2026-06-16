"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  Plus,
  Search,
  Phone,
  Pencil,
  Trash2,
  HandCoins,
  ReceiptText,
  ChevronDown,
  X,
} from "lucide-react";
import { formatRs } from "@/lib/money";
import type { SupplierWithBalance, SupplierLedgerEntry } from "./queries";
import { archiveSupplier, loadSupplierHistory } from "./actions";
import {
  SupplierForm,
  BillForm,
  SupplierPaymentForm,
  type EditableSupplier,
} from "./forms";

type Modal =
  | { type: "add" }
  | { type: "edit"; supplier: EditableSupplier }
  | { type: "pay"; supplier: SupplierWithBalance }
  | { type: "bill"; supplier: SupplierWithBalance }
  | null;

function balanceClass(balance: number) {
  if (balance > 0) return "text-loss"; // shop owes the supplier
  if (balance < 0) return "text-brand-deep"; // paid ahead / advance
  return "text-muted";
}

export function SuppliersList({
  suppliers,
}: {
  suppliers: SupplierWithBalance[];
}) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<
    Record<string, SupplierLedgerEntry[] | "loading">
  >({});
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const q = query.trim().toLowerCase();
  const filtered = q
    ? suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(q) || (s.phone?.includes(q) ?? false),
      )
    : suppliers;

  function toggleExpand(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!history[id]) {
      setHistory((h) => ({ ...h, [id]: "loading" }));
      loadSupplierHistory(id).then((res) => {
        setHistory((h) => ({ ...h, [id]: res.ok ? res.entries : [] }));
      });
    }
  }

  function doArchive(id: string) {
    startTransition(async () => {
      await archiveSupplier(id);
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
          <Plus className="h-4 w-4" /> Add supplier
        </button>
      </div>

      {suppliers.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-line py-14 text-center">
          <p className="font-medium">No suppliers yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted">
            Add the people you buy stock from, then record their bills and the
            payments you make.
          </p>
        </div>
      ) : (
        <>
        {/* Mobile: stacked cards so there's no sideways scrolling on phones. */}
        <div className="space-y-2.5 sm:hidden">
          {filtered.map((s) => (
            <SupplierCard
              key={s.id}
              s={s}
              isOpen={expanded === s.id}
              rows={history[s.id]}
              pending={pending}
              confirmArchive={confirmArchive}
              onToggle={() => toggleExpand(s.id)}
              onPay={() => setModal({ type: "pay", supplier: s })}
              onBill={() => setModal({ type: "bill", supplier: s })}
              onEdit={() =>
                setModal({
                  type: "edit",
                  supplier: {
                    id: s.id,
                    name: s.name,
                    phone: s.phone,
                    note: s.note,
                  },
                })
              }
              onAskArchive={() => setConfirmArchive(s.id)}
              onCancelArchive={() => setConfirmArchive(null)}
              onConfirmArchive={() => doArchive(s.id)}
            />
          ))}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">
              No suppliers match your search.
            </p>
          )}
        </div>

        {/* Desktop / tablet: full table. */}
        <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5 font-medium">Supplier</th>
                <th className="px-4 py-2.5 font-medium">Last activity</th>
                <th className="px-4 py-2.5 text-right font-medium">You owe</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <RowGroup
                  key={s.id}
                  s={s}
                  isOpen={expanded === s.id}
                  rows={history[s.id]}
                  pending={pending}
                  confirmArchive={confirmArchive}
                  onToggle={() => toggleExpand(s.id)}
                  onPay={() => setModal({ type: "pay", supplier: s })}
                  onBill={() => setModal({ type: "bill", supplier: s })}
                  onEdit={() =>
                    setModal({
                      type: "edit",
                      supplier: {
                        id: s.id,
                        name: s.name,
                        phone: s.phone,
                        note: s.note,
                      },
                    })
                  }
                  onAskArchive={() => setConfirmArchive(s.id)}
                  onCancelArchive={() => setConfirmArchive(null)}
                  onConfirmArchive={() => doArchive(s.id)}
                />
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">
              No suppliers match your search.
            </p>
          )}
        </div>
        </>
      )}

      {modal && (
        <Overlay onClose={() => setModal(null)}>
          {modal.type === "pay" ? (
            <>
              <h3 className="mb-4 font-display text-lg font-bold tracking-tight">
                Record payment
              </h3>
              <SupplierPaymentForm
                supplierId={modal.supplier.id}
                supplierName={modal.supplier.name}
                balance={modal.supplier.balance}
                onClose={() => setModal(null)}
              />
            </>
          ) : modal.type === "bill" ? (
            <>
              <h3 className="mb-1 font-display text-lg font-bold tracking-tight">
                Add a bill
              </h3>
              <p className="mb-4 text-xs text-muted">
                Money you owe {modal.supplier.name} — a delivery, an old balance,
                etc.
              </p>
              <BillForm
                supplierId={modal.supplier.id}
                supplierName={modal.supplier.name}
                balance={modal.supplier.balance}
                onClose={() => setModal(null)}
              />
            </>
          ) : (
            <>
              <h3 className="mb-4 font-display text-lg font-bold tracking-tight">
                {modal.type === "edit" ? "Edit supplier" : "Add supplier"}
              </h3>
              <SupplierForm
                supplier={modal.type === "edit" ? modal.supplier : undefined}
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
  s,
  isOpen,
  rows,
  pending,
  confirmArchive,
  onToggle,
  onPay,
  onBill,
  onEdit,
  onAskArchive,
  onCancelArchive,
  onConfirmArchive,
}: {
  s: SupplierWithBalance;
  isOpen: boolean;
  rows: SupplierLedgerEntry[] | "loading" | undefined;
  pending: boolean;
  confirmArchive: string | null;
  onToggle: () => void;
  onPay: () => void;
  onBill: () => void;
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
              <span className="block font-medium">{s.name}</span>
              {s.phone && (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Phone className="h-3 w-3" /> {s.phone}
                </span>
              )}
            </span>
          </button>
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-muted">
          {s.lastActivity ?? "—"}
        </td>
        <td
          className={`px-4 py-3 text-right font-mono font-semibold tnum ${balanceClass(s.balance)}`}
        >
          {s.balance < 0 ? `${formatRs(-s.balance)} adv` : formatRs(s.balance)}
        </td>
        <td className="px-4 py-3">
          <SupplierActions
            onBill={onBill}
            onPay={onPay}
            onEdit={onEdit}
            onAskArchive={onAskArchive}
          />
        </td>
      </tr>

      {confirmArchive === s.id && (
        <tr className="border-b border-line/60 bg-loss/5">
          <td colSpan={4} className="px-4 py-2.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted">
                Remove {s.name}? Their bill history stays intact.
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
            <SupplierDetail s={s} rows={rows} />
          </td>
        </tr>
      )}
    </>
  );
}

// The 4 row actions (add bill / pay / edit / remove) — shared by the desktop
// table row and the mobile card.
function SupplierActions({
  onBill,
  onPay,
  onEdit,
  onAskArchive,
}: {
  onBill: () => void;
  onPay: () => void;
  onEdit: () => void;
  onAskArchive: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={onBill}
        title="Add a bill you owe this supplier"
        className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-text transition hover:border-loss hover:text-loss"
      >
        <ReceiptText className="h-3.5 w-3.5" /> Add bill
      </button>
      <button
        type="button"
        onClick={onPay}
        title="Record money you paid this supplier"
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
  );
}

// The expanded bill/payment detail — shared by the desktop row and the card.
function SupplierDetail({
  s,
  rows,
}: {
  s: SupplierWithBalance;
  rows: SupplierLedgerEntry[] | "loading" | undefined;
}) {
  return (
    <>
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-muted">
        <span>
          Total billed{" "}
          <span className="font-mono font-medium text-text tnum">
            {formatRs(s.billed)}
          </span>
        </span>
        <span>
          Paid{" "}
          <span className="font-mono font-medium text-brand-deep tnum">
            {formatRs(s.paid)}
          </span>
        </span>
        {s.note && <span>Note: {s.note}</span>}
      </div>
      {rows === "loading" || rows === undefined ? (
        <p className="py-2 text-xs text-muted">Loading history…</p>
      ) : rows.length === 0 ? (
        <p className="py-2 text-xs text-muted">No bills or payments yet.</p>
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
    </>
  );
}

// Phone-friendly card version of one supplier row.
function SupplierCard({
  s,
  isOpen,
  rows,
  pending,
  confirmArchive,
  onToggle,
  onPay,
  onBill,
  onEdit,
  onAskArchive,
  onCancelArchive,
  onConfirmArchive,
}: {
  s: SupplierWithBalance;
  isOpen: boolean;
  rows: SupplierLedgerEntry[] | "loading" | undefined;
  pending: boolean;
  confirmArchive: string | null;
  onToggle: () => void;
  onPay: () => void;
  onBill: () => void;
  onEdit: () => void;
  onAskArchive: () => void;
  onCancelArchive: () => void;
  onConfirmArchive: () => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 p-3 text-left"
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition ${isOpen ? "rotate-180" : ""}`}
        />
        <div className="min-w-0 flex-1">
          <span className="block font-medium">{s.name}</span>
          {s.phone ? (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Phone className="h-3 w-3" /> {s.phone}
            </span>
          ) : (
            <span className="text-xs text-muted">{s.lastActivity ?? "—"}</span>
          )}
        </div>
        <div className="shrink-0 text-right">
          <span
            className={`block font-mono font-semibold tnum ${balanceClass(s.balance)}`}
          >
            {s.balance < 0 ? `${formatRs(-s.balance)} adv` : formatRs(s.balance)}
          </span>
          <span className="text-[11px] text-muted">you owe</span>
        </div>
      </button>

      <div className="flex justify-end border-t border-line/60 px-3 py-2">
        <SupplierActions
          onBill={onBill}
          onPay={onPay}
          onEdit={onEdit}
          onAskArchive={onAskArchive}
        />
      </div>

      {confirmArchive === s.id && (
        <div className="border-t border-line/60 bg-loss/5 px-3 py-2.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">
              Remove {s.name}? Their bill history stays intact.
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={onConfirmArchive}
                className="font-semibold text-loss disabled:opacity-50"
              >
                {pending ? "…" : "Yes, remove"}
              </button>
              <button type="button" onClick={onCancelArchive} className="text-muted">
                Cancel
              </button>
            </span>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="border-t border-line/60 px-3 py-3">
          <SupplierDetail s={s} rows={rows} />
        </div>
      )}
    </div>
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
