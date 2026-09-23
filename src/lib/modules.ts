import type { ModuleId } from '@/config/modules';

const KEY = 'thaa.modules.v1';

export type ModuleMap = Record<ModuleId, boolean>;

const DEFAULTS: ModuleMap = {
  outbound: false,
  flights: false,
  visa: false,
  corporate: false,
  insurance: false,
};

export function getModules(): ModuleMap {
  if (typeof localStorage === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<ModuleMap>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function isModuleEnabled(id: ModuleId): boolean {
  return getModules()[id];
}

export function setModule(id: ModuleId, on: boolean) {
  const next = { ...getModules(), [id]: on };
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function toggleModule(id: ModuleId) {
  setModule(id, !getModules()[id]);
}

export function resetModules() {
  localStorage.removeItem(KEY);
}