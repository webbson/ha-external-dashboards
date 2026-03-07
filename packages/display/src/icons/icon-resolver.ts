const cache = new Map<string, string>();
let inflight: Promise<void> | null = null;
let inflightNames: Set<string> = new Set();

// Common HA icons as offline fallback
const FALLBACK_ICONS: Record<string, string> = {
  "mdi-lightbulb":
    "M12,2A7,7 0 0,0 5,9C5,11.47 6.19,13.64 8,15.04V18H16V15.04C17.81,13.64 19,11.47 19,9A7,7 0 0,0 12,2M9,21V20H15V21A1,1 0 0,1 14,22H10A1,1 0 0,1 9,21Z",
  "mdi-home":
    "M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z",
  "mdi-thermometer":
    "M15,13V5A3,3 0 0,0 12,2A3,3 0 0,0 9,5V13A5,5 0 0,0 7,17A5,5 0 0,0 12,22A5,5 0 0,0 17,17A5,5 0 0,0 15,13Z",
  "mdi-fan":
    "M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M12.5,2C17,2 17.11,5.57 14.75,6.75C12.68,7.79 11.17,5.86 13.37,4.5C10.55,4.55 10.55,8.18 12.5,8.18C16.75,8.18 16,2 12.5,2M3.28,11.42C1.26,15.5 4.28,16.68 5.71,14.5C6.96,12.6 4.78,11.42 5.43,13.7C3.7,11.45 7.06,10.13 8.06,11.91C10.28,15.87 3.28,17.4 3.28,11.42M7.5,22C5.36,17.86 8.85,17.11 9.75,19.5C10.5,21.49 8.34,21.85 8.89,19.61C8.35,22.36 5.36,21.12 7.07,18.84C9.85,15.22 13.32,22 7.5,22M20.72,12.58C22.74,8.5 19.72,7.32 18.29,9.5C17.04,11.4 19.22,12.58 18.57,10.3C20.3,12.55 16.94,13.87 15.94,12.09C13.72,8.13 20.72,6.6 20.72,12.58M16.5,2C18.64,6.14 15.15,6.89 14.25,4.5C13.5,2.51 15.66,2.15 15.11,4.39C15.65,1.64 18.64,2.88 16.93,5.16C14.15,8.78 10.68,2 16.5,2Z",
  "mdi-toggle-switch":
    "M17,7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7M17,15A3,3 0 0,1 14,12A3,3 0 0,1 17,9A3,3 0 0,1 20,12A3,3 0 0,1 17,15Z",
  "mdi-eye":
    "M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z",
  "mdi-lock":
    "M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z",
  "mdi-help-circle":
    "M15.07,11.25L14.17,12.17C13.45,12.89 13,13.5 13,15H11V14.5C11,13.39 11.45,12.39 12.17,11.67L13.41,10.41C13.78,10.05 14,9.55 14,9C14,7.89 13.1,7 12,7A2,2 0 0,0 10,9H8A4,4 0 0,1 12,5A4,4 0 0,1 16,9C16,9.88 15.64,10.68 15.07,11.25M13,19H11V17H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z",
  "mdi-weather-partly-cloudy":
    "M12.74,5.47C15.1,6.5 16.35,9.03 15.92,11.46C17.19,12.56 18,14.19 18,16V16.17C18.31,16.06 18.65,16 19,16A3,3 0 0,1 22,19A3,3 0 0,1 19,22H6A4,4 0 0,1 2,18A4,4 0 0,1 6,14H6.27C6,13.34 6,12.65 6.27,12C6.77,10.77 7.84,9.87 9.12,9.5C9.44,8 10.22,6.66 11.44,5.75C11.87,5.43 12.3,5.18 12.74,5.47Z",
  "mdi-play-circle":
    "M10,16.5V7.5L16,12M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z",
  "mdi-video":
    "M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z",
  "mdi-window-shutter":
    "M3,4H21V8H19V20H17V8H7V20H5V8H3V4M8,9H16V11H8V9M8,12H16V14H8V12M8,15H16V17H8V15M8,18H16V20H8V18Z",
  "mdi-robot-vacuum":
    "M12,2C14.65,2 17.2,3.05 19.07,4.93C20.95,6.8 22,9.35 22,12C22,17.52 17.52,22 12,22C6.48,22 2,17.52 2,12C2,6.48 6.48,2 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8Z",
};

// Seed cache with fallbacks
for (const [name, path] of Object.entries(FALLBACK_ICONS)) {
  cache.set(name, path);
}

/** Normalize mdi:name and mdi-name to consistent key */
function normalize(name: string): string {
  return name.replace(":", "-");
}

export function getIconPath(name: string): string | undefined {
  return cache.get(normalize(name));
}

export async function resolveIcons(names: string[]): Promise<void> {
  const unknown = names.filter((n) => !cache.has(normalize(n)));
  if (unknown.length === 0) return;

  // Deduplicate with in-flight request
  const toFetch = unknown.filter((n) => !inflightNames.has(normalize(n)));
  if (toFetch.length === 0) {
    // All requested icons are already in-flight, wait for that to finish
    if (inflight) await inflight;
    return;
  }

  toFetch.forEach((n) => inflightNames.add(normalize(n)));

  const doFetch = async () => {
    try {
      const res = await fetch(`/api/icons/${toFetch.join(",")}`);
      if (!res.ok) return;
      const data = (await res.json()) as Record<string, string>;
      for (const [name, path] of Object.entries(data)) {
        cache.set(normalize(name), path);
      }
    } finally {
      toFetch.forEach((n) => inflightNames.delete(normalize(n)));
      inflight = null;
    }
  };

  inflight = doFetch();
  await inflight;
}

/** Extract mdiIcon names from template strings */
export function extractIconNames(templates: string[]): string[] {
  const names = new Set<string>();
  const pattern = /mdiIcon\s+["']?(mdi[:\-][a-z0-9-]+)["']?/g;
  for (const tpl of templates) {
    let match;
    while ((match = pattern.exec(tpl)) !== null) {
      names.add(match[1]);
    }
    pattern.lastIndex = 0;
  }
  return Array.from(names);
}
