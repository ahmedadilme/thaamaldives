import { DEFAULTS } from './defaults';
import type { SiteContent } from './types';

const KEY = 'thaa.content.v1';

const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version += 1;
  for (const fn of listeners) fn();
}

/** Notifies subscribers whenever content changes in this tab. */
export function subscribeContent(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function contentVersion(): number {
  return version;
}

// Content saved in one tab should show up in the others without a refresh.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === null || e.key === KEY) emit();
  });
}

export function getContent(): SiteContent {
  if (typeof localStorage === 'undefined') return DEFAULTS;
  let over: Partial<SiteContent> | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    over = raw ? (JSON.parse(raw) as Partial<SiteContent>) : null;
  } catch {
    over = null;
  }
  if (!over) return DEFAULTS;

  const merged = { ...DEFAULTS } as SiteContent;
  const target = merged as unknown as Record<string, unknown>;

  for (const key of Object.keys(DEFAULTS)) {
    const value = (over as Record<string, unknown>)[key];
    if (value === undefined || value === null) continue;
    const base = (DEFAULTS as unknown as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      target[key] = value;
    } else if (typeof value === 'object' && base && typeof base === 'object' && !Array.isArray(base)) {
      target[key] = { ...(base as Record<string, unknown>), ...(value as Record<string, unknown>) };
    } else {
      target[key] = value;
    }
  }
  return merged;
}

export function patchContent(patch: Partial<SiteContent>) {
  const current = readRaw() ?? {};
  const next = current as unknown as Record<string, unknown>;

  for (const key of Object.keys(patch)) {
    const value = (patch as unknown as Record<string, unknown>)[key];
    if (value === undefined) continue;
    const prev = next[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && prev && typeof prev === 'object' && !Array.isArray(prev)) {
      next[key] = { ...(prev as Record<string, unknown>), ...(value as Record<string, unknown>) };
    } else {
      next[key] = value;
    }
  }
  writeRaw(next as Partial<SiteContent>);
}

export function patchGroup<K extends keyof SiteContent>(key: K, patch: Partial<SiteContent[K]>) {
  const current = getContent();
  const base = current[key];
  if (Array.isArray(base)) {
    patchContent({ [key]: patch } as Partial<SiteContent>);
    return;
  }
  const next = { ...(base as Record<string, unknown>), ...(patch as Record<string, unknown>) };
  patchContent({ [key]: next } as Partial<SiteContent>);
}

function readRaw(): Partial<SiteContent> | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<SiteContent>) : null;
  } catch {
    return null;
  }
}

function writeRaw(data: Partial<SiteContent>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    emit();
  } catch {
    // storage unavailable — keep in-memory defaults
  }
}

export function resetContent() {
  try {
    localStorage.removeItem(KEY);
    emit();
  } catch {
    // ignore
  }
}

const BACKUP_VERSION = 1;

export interface ContentBackup {
  app: 'thaa-maldives';
  version: number;
  exportedAt: string;
  content: Partial<SiteContent>;
}

/** Serialise the current overrides for download. */
export function exportContent(): ContentBackup {
  return {
    app: 'thaa-maldives',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    content: readRaw() ?? {},
  };
}

/**
 * Restore a backup produced by exportContent().
 * Only keys that exist in DEFAULTS are accepted, so a stale or hand-edited
 * file cannot inject unknown fields into the site shape.
 */
export function importContent(json: string): { ok: boolean; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }

  const backup = parsed as Partial<ContentBackup>;
  if (!backup || backup.app !== 'thaa-maldives') {
    return { ok: false, error: 'That does not look like a THAA content backup.' };
  }
  const incoming = backup.content;
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return { ok: false, error: 'The backup file has no content section.' };
  }

  const accepted: Record<string, unknown> = {};
  const source = incoming as Record<string, unknown>;
  for (const key of Object.keys(DEFAULTS)) {
    const value = source[key];
    if (value !== undefined && value !== null) accepted[key] = value;
  }

  if (Object.keys(accepted).length === 0) {
    return { ok: false, error: 'The backup file contained no recognisable content.' };
  }

  try {
    localStorage.setItem(KEY, JSON.stringify(accepted));
  } catch {
    return { ok: false, error: 'Could not write to browser storage.' };
  }
  emit();
  return { ok: true };
}

export const contentKey = KEY;