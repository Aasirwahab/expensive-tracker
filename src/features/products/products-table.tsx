"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Package, Pencil, Trash2, X } from "lucide-react";
import { formatRs, formatNumber } from "@/lib/money";
import { thumbUrl } from "@/lib/image";
import { ImageDropzone } from "./image-dropzone";
import {
  updateProduct,
  archiveProduct,
  type ProductFormState,
} from "./actions";

export type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  currentCost: number;
  stockQuantity: number;
  lowStockThreshold: number | null;
};

const fieldClass =
  "w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-surface";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";

export function ProductsTable({
  products,
  isOwner,
}: {
  products: ProductRow[];
  isOwner: boolean;
}) {
  const [editing, setEditing] = useState<ProductRow | null>(null);

  if (products.length === 0) {
    return (
      <div className="grid place-items-center py-12 text-center">
        <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-ink/5 text-ink">
          <Package className="h-5 w-5" />
        </div>
        <p className="font-medium">No products yet</p>
        <p className="text-sm text-muted">
          {isOwner
            ? "Add your first product above to get started."
            : "The owner hasn't added any products yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-2 py-2 font-medium">Product</th>
            <th className="px-2 py-2 font-medium">SKU</th>
            <th className="px-2 py-2 text-right font-medium">Cost</th>
            <th className="px-2 py-2 text-right font-medium">Stock</th>
            <th className="px-2 py-2 text-right font-medium">Stock value</th>
            {isOwner && (
              <th className="px-2 py-2 text-right font-medium">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const low =
              p.lowStockThreshold != null &&
              p.stockQuantity <= p.lowStockThreshold;
            return (
              <tr key={p.id} className="border-b border-line/60 last:border-0">
                <td className="px-2 py-3">
                  <div className="flex items-center gap-2.5">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbUrl(p.imageUrl, 96)}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink/5 font-display text-xs font-bold text-ink">
                        {p.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="font-medium">{p.name}</span>
                  </div>
                </td>
                <td className="px-2 py-3 text-muted">{p.sku ?? "—"}</td>
                <td className="px-2 py-3 text-right font-mono tnum">
                  {formatRs(p.currentCost)}
                </td>
                <td className="px-2 py-3 text-right font-mono tnum">
                  <span className={low ? "text-loss" : ""}>
                    {formatNumber(p.stockQuantity)}
                  </span>
                  {low && (
                    <span className="ml-1 rounded bg-loss/10 px-1 text-[10px] text-loss">
                      low
                    </span>
                  )}
                </td>
                <td className="px-2 py-3 text-right font-mono tnum">
                  {formatRs(p.currentCost * p.stockQuantity)}
                </td>
                {isOwner && (
                  <td className="px-2 py-3">
                    <RowActions product={p} onEdit={() => setEditing(p)} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {editing && (
        <EditModal product={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function RowActions({
  product,
  onEdit,
}: {
  product: ProductRow;
  onEdit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-2 text-xs">
        <span className="text-muted">Remove?</span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await archiveProduct(product.id);
            })
          }
          className="font-semibold text-loss disabled:opacity-50"
        >
          {pending ? "Removing…" : "Yes"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-muted"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={onEdit}
        aria-label="Edit"
        className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-paper hover:text-text"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Remove"
        className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-loss/10 hover:text-loss"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function EditModal({
  product,
  onClose,
}: {
  product: ProductRow;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateProduct,
    { error: null } as ProductFormState,
  );
  const [imageUrl, setImageUrl] = useState(product.imageUrl ?? "");

  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold tracking-tight">
            Edit product
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-paper"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="imageUrl" value={imageUrl} />

          <div className="grid grid-cols-[120px_1fr] gap-4">
            <div>
              <span className={labelClass}>Photo</span>
              <ImageDropzone value={imageUrl} onChange={setImageUrl} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelClass} htmlFor="edit-name">
                  Product name
                </label>
                <input
                  id="edit-name"
                  name="name"
                  required
                  defaultValue={product.name}
                  className={fieldClass}
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass} htmlFor="edit-sku">
                  SKU / code
                </label>
                <input
                  id="edit-sku"
                  name="sku"
                  defaultValue={product.sku ?? ""}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="edit-cost">
                  Purchase cost (Rs)
                </label>
                <input
                  id="edit-cost"
                  name="currentCost"
                  type="number"
                  min="0"
                  step="1"
                  required
                  defaultValue={product.currentCost}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="edit-stock">
                  Stock
                </label>
                <input
                  id="edit-stock"
                  name="stockQuantity"
                  type="number"
                  min="0"
                  step="1"
                  required
                  defaultValue={product.stockQuantity}
                  className={fieldClass}
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass} htmlFor="edit-low">
                  Low-stock alert{" "}
                  <span className="text-muted/60">(optional)</span>
                </label>
                <input
                  id="edit-low"
                  name="lowStockThreshold"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={product.lowStockThreshold ?? ""}
                  className={fieldClass}
                />
              </div>
            </div>
          </div>

          {state.error && <p className="text-sm text-loss">{state.error}</p>}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted hover:bg-paper"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
