let loadPromise: Promise<void> | null = null;

export function ensureMapLibreGL(): Promise<void> {
  if ((window as any).maplibregl) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const [mod] = await Promise.all([
      import("maplibre-gl"),
      import("maplibre-gl/dist/maplibre-gl.css"),
    ]);
    (window as any).maplibregl = mod.default ?? mod;
  })();

  return loadPromise;
}
