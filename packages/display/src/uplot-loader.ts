let loadPromise: Promise<void> | null = null;

export function ensureUPlot(): Promise<void> {
  if ((window as any).uPlot) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const [mod] = await Promise.all([
      import("uplot"),
      import("uplot/dist/uPlot.min.css"),
    ]);
    (window as any).uPlot = mod.default;
  })();

  return loadPromise;
}
