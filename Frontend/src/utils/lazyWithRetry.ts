import { ComponentType, LazyExoticComponent, lazy } from "react";


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
    return true;
  }
}

function markReloaded(): void {
  try {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch { void 0; }
}

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
      return new Promise<{ default: T }>(() => {});
    }
  });
}
