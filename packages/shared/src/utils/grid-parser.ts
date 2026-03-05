/** Extract unique named area identifiers from a CSS grid-template string */
export function parseGridAreas(gridTemplate: string): string[] {
  const matches = gridTemplate.match(/["'][^"']+["']/g) ?? [];
  const areas = new Set<string>();
  for (const m of matches) {
    const names = m.slice(1, -1).trim().split(/\s+/);
    for (const name of names) {
      if (name !== ".") areas.add(name);
    }
  }
  return [...areas];
}
