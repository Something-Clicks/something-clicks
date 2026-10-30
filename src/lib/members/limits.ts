import { headers } from "next/headers";
import { clientIp, hashIp } from "@/lib/request";
import { getStore } from "@/lib/store";

/** True when allowed. Keys are per visitor (hashed IP) unless a key is given. Fails open, like the forms. */
export async function allow(name: string, windowSeconds: number, max: number, key?: string): Promise<boolean> {
  const id = key ?? (await hashIp(clientIp(await headers())));
  try {
    return await getStore().checkRateLimit(`${name}:${id}`, windowSeconds, max);
  } catch (error) {
    console.error(`[limits] ${name} check failed`, error);
    return true;
  }
}

export const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
