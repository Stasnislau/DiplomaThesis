import { ComponentType, LazyExoticComponent, lazy } from "react";

/* lazyWithRetry — drop-in replacement for React.lazy that survives
 * stale-tab chunk-name mismatches across deploys.
 *
 * Failure mode this fixes:
 *   1. Browser opens app, caches index.html with hashed chunk names
 *      like /assets/Tasks-X7Y8Z9.js.
 *   2. We deploy a new build → /assets/Tasks-X7Y8Z9.js no longer exists,
 *      replaced by /assets/Tasks-A1B2C3.js.
 *   3. User stays on the old tab and clicks a route that lazy-loads
 *      Tasks. Browser asks for Tasks-X7Y8Z9.js → 404. lazy() rejects
 *      with ChunkLoadError ("Failed to fetch dynamically imported
 *      module") and the app crashes inside Suspense.
 *
 * Strategy: when we see a chunk-load failure, force a full page
 * reload. The reloaded page fetches a fresh index.html with current
 * chunk hashes, and the navigation succeeds.
 *
 * We guard against infinite reload loops with a 30-second
 * sessionStorage cooldown — if a reload doesn't fix the issue (e.g.
 * the asset is genuinely missing), we surface the error after the
 * cooldown window instead of looping forever. */

const RELOAD_KEY = "chunk-reload-attempted-at";
const RELOAD_COOLDOWN_MS = 30_000;

const CHUNK_ERROR_PATTERNS = [
  /Loading chunk \d+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /MIME type/i,
];

export function isChunkLoadError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === "ChunkLoadError") return true;
  return CHUNK_ERROR_PATTERNS.some((p) => p.test(err.message));
}

function shouldReload(): boolean {
  try {
    const last = sessionStorage.getItem(RELOAD_KEY);
    if (!last) return true;
    return Date.now() - Number(last) > RELOAD_COOLDOWN_MS;
  } catch {
    // Private mode or storage disabled — fall back to "yes, reload"
    // so users with strict storage settings still get the recovery
    // path. Worst case: an infinite reload, which is rare and visible.
    return true;
  }
}

function markReloaded(): void {
  try {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    /* ignore — see shouldReload() comment */
  }
}

// Generic constraint matches React.lazy's own signature — ComponentType
// with `any` props because the wrapper is prop-agnostic; the concrete
// component type still flows through to the LazyExoticComponent.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await loader();
    } catch (err) {
      if (!isChunkLoadError(err)) throw err;
      if (!shouldReload()) throw err;

      markReloaded();
      window.location.reload();
      // Return a never-resolving promise so Suspense keeps showing
      // its fallback (a spinner) while the browser tears down the
      // page. If we resolved or rejected here we'd flash an error.
      return new Promise<{ default: T }>(() => {});
    }
  });
}
