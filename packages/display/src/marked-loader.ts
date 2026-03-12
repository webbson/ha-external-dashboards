let loadPromise: Promise<void> | null = null;

export function ensureMarked(): Promise<void> {
  if ((window as any).__markedLib) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const mod = await import("marked");
    (window as any).__markedLib = mod.marked;
  })();

  return loadPromise;
}
