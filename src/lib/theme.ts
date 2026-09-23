export type ThemeId = 'default' | 'thaa' | 'ocean' | 'sunset' | 'custom';

export interface ThemeDef {
  id: ThemeId;
  name: string;
  description: string;
  swatches: string[];
}

export const THEMES: ThemeDef[] = [
  {
    id: 'default',
    name: 'Maldivian Teal & Gold',
    description: 'The signature look — turquoise brand greens, warm gold accents, sand paper.',
    swatches: ['#1d927d', '#d4951f', '#f5efe2', '#fbf7ef', '#0f1214'],
  },
  {
    id: 'thaa',
    name: 'Thaa Maldives',
    description: 'The official brand palette — logo blues and teals over cool gray neutrals.',
    swatches: ['#035AA6', '#30B1BF', '#0E4C59', '#327303', '#666666'],
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    description: 'Cooler navy-teal water tones with soft blue-tinged neutrals.',
    swatches: ['#0a7089', '#d4951f', '#f0f6f8', '#f6fbfc', '#0f1214'],
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm terracotta brand tones over honeyed sand — golden-hour energy.',
    swatches: ['#e05f3f', '#d4951f', '#f8efe1', '#fdf8f0', '#0f1214'],
  },
];

export const CUSTOM_THEME: ThemeId = 'custom';

export interface CustomPalette {
  brand: string;
  accent: string;
  paper: string;
  neutral: string;
}

export const DEFAULT_CUSTOM_PALETTE: CustomPalette = {
  brand: '#035AA6',
  accent: '#327303',
  paper: '#F7FAFD',
  neutral: '#8A97A6',
};

const KEY = 'thaa.theme.v1';
const CUSTOM_KEY = 'thaa.theme.custom.v1';

const isTheme = (v: unknown): v is ThemeId =>
  typeof v === 'string' && (v === CUSTOM_THEME || THEMES.some((t) => t.id === v));

export function getTheme(): ThemeId {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw && isTheme(raw)) return raw;
    } catch {
      // fall through to default
    }
  }
  return 'default';
}

export function setTheme(id: ThemeId) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // ignore
  }
}

export function resetTheme() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/* ------------------------------ Custom palette ----------------------------- */

const HEX_RE = /^[0-9a-f]{6}$/i;

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, '');
  if (!HEX_RE.test(clean)) return null;
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function isHex(hex: string): boolean {
  return hexToRgb(hex) !== null;
}

export function isPalette(p: unknown): p is CustomPalette {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  return ['brand', 'accent', 'paper', 'neutral'].every(
    (k) => typeof o[k] === 'string' && isHex(o[k] as string)
  );
}

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

const rgbString = (c: [number, number, number]) => `${c[0]} ${c[1]} ${c[2]}`;

interface RampStep {
  shade: number;
  t: number;
}

const WHITE: [number, number, number] = [255, 255, 255];
const BLACK: [number, number, number] = [0, 0, 0];

const BRAND_RAMP: RampStep[] = [
  { shade: 50, t: 0.92 },
  { shade: 100, t: 0.82 },
  { shade: 200, t: 0.68 },
  { shade: 300, t: 0.5 },
  { shade: 400, t: 0.3 },
  { shade: 500, t: 0.12 },
  { shade: 600, t: 0 },
  { shade: 700, t: 0.18 },
  { shade: 800, t: 0.3 },
  { shade: 900, t: 0.45 },
  { shade: 950, t: 0.65 },
];

const SAND_RAMP: RampStep[] = [
  { shade: 50, t: 0.9 },
  { shade: 100, t: 0.78 },
  { shade: 200, t: 0.6 },
  { shade: 300, t: 0.38 },
  { shade: 400, t: 0.18 },
  { shade: 500, t: 0 },
];

function scaleVars(anchor: string, ramp: RampStep[], name: string): Record<string, string> {
  const rgb = hexToRgb(anchor);
  if (!rgb) return {};
  const out: Record<string, string> = {};
  for (const { shade, t } of ramp) {
    const target = shade >= 600 ? BLACK : WHITE;
    out[`--color-${name}-${shade}`] = rgbString(mix(rgb, target, t));
  }
  return out;
}

export function paletteToVars(p: CustomPalette): Record<string, string> {
  const paper = hexToRgb(p.paper) ?? [255, 255, 255];
  return {
    ...scaleVars(p.brand, BRAND_RAMP, 'brand'),
    ...scaleVars(p.accent, BRAND_RAMP, 'gold'),
    ...scaleVars(p.neutral, SAND_RAMP, 'sand'),
    '--color-cream': rgbString(paper),
  };
}

const THEME_VAR_KEYS = [
  ...BRAND_RAMP.map((s) => `--color-brand-${s.shade}`),
  ...BRAND_RAMP.map((s) => `--color-gold-${s.shade}`),
  ...SAND_RAMP.map((s) => `--color-sand-${s.shade}`),
  '--color-cream',
];

function clearThemeVars(el: HTMLElement) {
  for (const k of THEME_VAR_KEYS) el.style.removeProperty(k);
}

export function getCustomPalette(): CustomPalette | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (raw) {
      const p: unknown = JSON.parse(raw);
      if (isPalette(p)) return p;
    }
  } catch {
    // fall through
  }
  return null;
}

export function setCustomPalette(p: CustomPalette): boolean {
  if (!isPalette(p)) return false;
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}

export function resetCustomPalette() {
  try {
    localStorage.removeItem(CUSTOM_KEY);
  } catch {
    // ignore
  }
}

/* --------------------------------- Applying -------------------------------- */

export function applyTheme(id: ThemeId) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  clearThemeVars(el);
  if (id === CUSTOM_THEME) {
    delete el.dataset.theme;
    const palette = getCustomPalette();
    if (palette) {
      const vars = paletteToVars(palette);
      for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
    }
  } else if (id === 'default') {
    delete el.dataset.theme;
  } else {
    el.dataset.theme = id;
  }
}