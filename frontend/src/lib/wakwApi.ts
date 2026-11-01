// Helpers for a backend that sleeps when idle (SnapDeploy free tier).

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Fire-and-forget request that starts waking the backend.
 * Call it once when the login page loads, so the server wakes while the user types.
 */
export function warmUp(baseUrl: string): void {
  fetch(`${baseUrl}/health`, { mode: "no-cors", cache: "no-store" }).catch(
    () => {},
  );
}

interface WaitOptions {
  onWaiting?: () => void;
  timeoutMs?: number;
  intervalMs?: number;
}

/**
 * Polls /health until the API answers with real JSON.
 * While the server sleeps, the platform serves a wake page (HTML, no CORS headers),
 * so the request either throws or is not JSON; we keep retrying until it is.
 */
export async function waitUntilAwake(
  baseUrl: string,
  opts: WaitOptions = {},
): Promise<true> {
  const { onWaiting, timeoutMs = 120_000, intervalMs = 3_000 } = opts;
  const startedAt = Date.now();
  let notified = false;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/health`, { cache: "no-store" });
      const type = res.headers.get("content-type") ?? "";
      if (res.ok && type.includes("application/json")) return true;
    } catch {
      // network / CORS error while the wake page is being served: keep waiting
    }
    if (!notified) {
      notified = true;
      onWaiting?.();
    }
    await sleep(intervalMs);
  }
  throw new Error("The server did not wake up in time. Please try again.");
}
