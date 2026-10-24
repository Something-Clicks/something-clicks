import "server-only";

// Base URL from PromoteKit's public API docs (Bearer auth). The full partner integration is not built yet;
// this module only supports the admin connection test, which is a single read-only request.
export const PROMOTEKIT_API_BASE = "https://www.promotekit.com/api/v1";

export type PromoteKitConnectionResult =
  | { status: "connected" }
  | { status: "unauthorized" } // 401: key rejected
  | { status: "forbidden" } // 403: no active or trialing plan
  | { status: "unreachable" } // network error or timeout
  | { status: "not_configured" } // PROMOTEKIT_API_KEY missing in this environment
  | { status: "unexpected"; httpStatus: number };

/**
 * Lists affiliates once to check the API key and plan. Read-only; creates nothing. Never returns, logs, or
 * includes the key or the response body in its result.
 */
export async function testPromoteKitConnection(
  apiKey: string | null | undefined = process.env.PROMOTEKIT_API_KEY,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 10_000,
): Promise<PromoteKitConnectionResult> {
  if (!apiKey) return { status: "not_configured" };

  let response: Response;
  try {
    response = await fetchImpl(`${PROMOTEKIT_API_BASE}/affiliates`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return { status: "unreachable" };
  }

  // The body isn't needed and may contain affiliate data; discard it.
  await response.body?.cancel().catch(() => {});

  if (response.ok) return { status: "connected" };
  if (response.status === 401) return { status: "unauthorized" };
  if (response.status === 403) return { status: "forbidden" };
  return { status: "unexpected", httpStatus: response.status };
}
