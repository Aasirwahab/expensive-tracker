"use server";

import { getUploadAuthParams } from "@imagekit/next/server";
import { getActiveContext } from "@/lib/auth-context";

export type UploadAuth = {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
};

/**
 * Generate short-lived ImageKit upload credentials. The private key stays here
 * on the server; the browser only ever receives a one-time signed token. Only
 * the owner manages products, so only the owner can upload.
 */
export async function getUploadAuth(): Promise<UploadAuth> {
  const ctx = await getActiveContext();
  if (!ctx?.business) throw new Error("Not authorized.");
  if (ctx.role !== "OWNER") throw new Error("Only the owner can upload images.");

  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("ImageKit is not configured. Check your environment keys.");
  }

  const { token, expire, signature } = getUploadAuthParams({
    publicKey,
    privateKey,
  });
  return { token, expire, signature, publicKey };
}
