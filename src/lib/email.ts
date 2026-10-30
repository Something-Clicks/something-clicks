import type { Kind } from "./store/types";

export type Notification = { kind: Kind; id: string; record: Record<string, unknown> };

/** Placeholder until email notifications are wired up. */
export async function notifyOwner(_n: Notification): Promise<void> {}
