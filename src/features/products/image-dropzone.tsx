"use client";

import { useRef, useState } from "react";
import { upload, ImageKitAbortError, ImageKitServerError } from "@imagekit/next";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { resizeImageToBlob, thumbUrl } from "@/lib/image";
import { getUploadAuth } from "./imagekit";

export function ImageDropzone({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(file: File | undefined) {
    if (!file || !file.type.startsWith("image/") || busy) return;
    setError(null);
    setBusy(true);
    try {
      // Shrink in the browser to keep the upload small; ImageKit optimises
      // further on delivery via thumbUrl transforms.
      const blob = await resizeImageToBlob(file, 1280, 0.85);
      const auth = await getUploadAuth();
      const res = await upload({
        file: blob,
        fileName: `product-${Date.now()}.jpg`,
        folder: "/products",
        useUniqueFileName: true,
        token: auth.token,
        expire: auth.expire,
        signature: auth.signature,
        publicKey: auth.publicKey,
      });
      if (res.url) onChange(res.url);
      else setError("Upload failed. Try again.");
    } catch (e) {
      if (e instanceof ImageKitAbortError) setError("Upload cancelled.");
      else if (e instanceof ImageKitServerError)
        setError("ImageKit rejected the upload.");
      else setError(e instanceof Error ? e.message : "Could not upload image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handle(e.dataTransfer.files?.[0]);
        }}
        className="relative grid h-[112px] w-full place-items-center overflow-hidden rounded-xl border border-dashed border-line bg-paper text-muted transition hover:border-brand disabled:cursor-wait"
      >
        {busy ? (
          <span className="flex flex-col items-center gap-1 text-xs">
            <Loader2 className="h-5 w-5 animate-spin" />
            Uploading…
          </span>
        ) : value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbUrl(value, 240)}
              alt="Product"
              className="h-full w-full object-cover"
            />
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
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
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handle(e.target.files?.[0])}
        />
      </button>
      {error && <p className="text-xs text-loss">{error}</p>}
    </div>
  );
}
