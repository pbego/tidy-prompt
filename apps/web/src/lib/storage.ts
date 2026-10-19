/**
 * localStorage access that never throws.
 *
 * Storage can be full, disabled, or unavailable in a private window — and a
 * prompt editor that crashes on load because of that is worse than one that
 * quietly stops remembering. Every failure degrades to "no saved state".
 */

const PREFIX = "tidy-prompt:";

export const StorageKeys = {
  working: `${PREFIX}working`,
  customTags: `${PREFIX}custom-tags`,
  saved: `${PREFIX}saved`,
} as const;

function storage(): Storage | null {
  try {
    const probe = globalThis.localStorage;
    if (!probe) return null;
    // Safari in private mode exposes localStorage but throws on write.
    const key = `${PREFIX}probe`;
    probe.setItem(key, "1");
    probe.removeItem(key);
    return probe;
  } catch {
    return null;
  }
}

export function readString(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeString(key: string, value: string): boolean {
  try {
    storage()?.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = readString(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    return writeString(key, JSON.stringify(value));
  } catch {
    return false;
  }
}

export function remove(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    /* nothing useful to do */
  }
}

export function isStorageAvailable(): boolean {
  return storage() !== null;
}
