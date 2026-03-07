/**
 * Simple glob matching for HA entity IDs.
 * Supports * (any chars) and ? (single char).
 */

export function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}

export function matchGlob(pattern: string, entityIds: string[]): string[] {
  const regex = globToRegex(pattern);
  return entityIds.filter((id) => regex.test(id));
}

export function isGlobPattern(value: string): boolean {
  return value.includes("*") || value.includes("?");
}
