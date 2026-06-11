"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { createProduct, type ProductFormState } from "./actions";

const initialState: ProductFormState = { error: null };

const fieldClass =
  "w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-surface";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";

// Resize an image file to a small JPEG data URL so we never store huge blobs.
function resizeImage(file: File, maxSize: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

export function ProductForm() {
  const [state, formAction, pending] = useActionState(
    createProduct,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imgError, setImgError] = useState("");

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setImageUrl("");
    }
  }, [state]);

  async function handleFile(file: File | undefined) {
    setImgError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImgError("Please choose an image file.");
      return;
    }
    try {
      const dataUrl = await resizeImage(file, 360, 0.72);
      if (dataUrl.length > 280_000) {
        setImgError("That photo is too large — try a smaller one.");
        return;
      }
      setImageUrl(dataUrl);
    } catch {
      setImgError("Could not read that image.");
    }
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="imageUrl" value={imageUrl} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr]">
        {/* Photo drop zone */}
        <div>
          <span className={labelClass}>Photo</span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void handleFile(e.dataTransfer.files?.[0]);
            }}
            className="relative grid h-[112px] w-full place-items-center overflow-hidden rounded-xl border border-dashed border-line bg-paper text-muted transition hover:border-brand"
          >
            {imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Product preview"
                  className="h-full w-full object-cover"
                />
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageUrl("");
                  }}
                  className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              </>
            ) : (
              <span className="flex flex-col items-center gap-1 text-xs">
                <ImagePlus className="h-5 w-5" />
                Drag or click
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          {imgError && <p className="mt-1 text-xs text-loss">{imgError}</p>}
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="name">
              Product name
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder="e.g. Blue cotton shirt"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="sku">
              SKU / code <span className="text-muted/60">(optional)</span>
            </label>
            <input
              id="sku"
              name="sku"
              placeholder="e.g. SHIRT-01"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="openingStock">
              Opening stock
            </label>
            <input
              id="openingStock"
              name="openingStock"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="currentCost">
              Purchase cost (Rs)
            </label>
            <input
              id="currentCost"
              name="currentCost"
              type="number"
              min="0"
              step="1"
              required
              placeholder="0"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="defaultPrice">
              Selling price (Rs)
            </label>
            <input
              id="defaultPrice"
              name="defaultPrice"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              className={fieldClass}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add product"}
        </button>
        {state.error && <span className="text-sm text-loss">{state.error}</span>}
        {state.ok && !state.error && (
          <span className="text-sm font-medium text-brand-deep">Added ✓</span>
        )}
      </div>
    </form>
  );
}
