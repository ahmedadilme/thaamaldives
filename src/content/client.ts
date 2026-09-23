import { DEFAULTS } from './defaults';
import type { SiteContent } from './types';

const KEY = 'thaa.content.v1';

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
  } catch {
    // storage unavailable — keep in-memory defaults
  }
}

export function resetContent() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export const contentKey = KEY;