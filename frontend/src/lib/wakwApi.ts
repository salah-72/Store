// Helpers for a backend that sleeps when idle (SnapDeploy free tier).
//
// Important: on this host a sleeping container is only woken by a *browser navigation*
// (opening the URL), not by fetch/XHR. So we wake it with a hidden iframe (a navigation),
// and poll /health with fetch until the API really answers with JSON.

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Opens baseUrl/health in a hidden iframe (counts as a browser visit). Returns a cleanup fn. */
function startBrowserWake(baseUrl: string): () => void {
  const frame = document.createElement("iframe");
  frame.style.display = "none";
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.src = `${baseUrl}/health?wake=${Date.now()}`;
  document.body.appendChild(frame);
  return () => frame.remove();
}

interface WaitOptions {
  onWaiting?: () => void;
  timeoutMs?: number;
  intervalMs?: number;
  /** how often to re-trigger the hidden browser visit while still asleep */
  rewakeEveryMs?: number;
}

/**
 * Resolves when GET baseUrl/health answers with real JSON.
 * While the server sleeps, the platform serves a wake page (HTML, no CORS headers),
 * so the probe throws or is not JSON; we trigger a browser wake and keep retrying.
 */
export async function waitUntilAwake(
  baseUrl: string,
  opts: WaitOptions = {},
): Promise<true> {
  const {
    onWaiting,
    timeoutMs = 150_000,
    intervalMs = 3_000,
    rewakeEveryMs = 45_000,
  } = opts;
  const startedAt = Date.now();
  let notified = false;
  let stopWake: (() => void) | null = null;
  let lastWakeAt = 0;

  try {
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
      if (Date.now() - lastWakeAt > rewakeEveryMs) {
        stopWake?.();
        stopWake = startBrowserWake(baseUrl);
        lastWakeAt = Date.now();
      }
      await sleep(intervalMs);
    }
    throw new Error("The server did not wake up in time. Please try again.");
  } finally {
    stopWake?.();
  }
}
