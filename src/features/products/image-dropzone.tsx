"use client";

import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { resizeImage } from "@/lib/image";

export function ImageDropzone({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handle(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const dataUrl = await resizeImage(file, 360, 0.72);
      if (dataUrl.length <= 280_000) onChange(dataUrl);
    } catch {
      // ignore unreadable images
    }
  }

  return (
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void handle(e.dataTransfer.files?.[0]);
      }}
      className="relative grid h-[112px] w-full place-items-center overflow-hidden rounded-xl border border-dashed border-line bg-paper text-muted transition hover:border-brand"
    >
      {value ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Product" className="h-full w-full object-cover" />
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
  );
}
