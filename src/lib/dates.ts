const MONTHS: Record<string, number> = Object.fromEntries(
  [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ].reduce<Array<[string, number]>>((acc, name, i) => {
    acc.push([name, i + 1]);
    acc.push([name.slice(0, 3), i + 1]);
    return acc;
  }, [])
);

function monthToNumber(month: string): number | null {
  return MONTHS[month.trim().toLowerCase()] ?? null;
}

export function parseFlexibleDate(input: string): string | null {
  const s = (input ?? '').trim();
  if (s === '') return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (dmy) {
    let d = Number(dmy[1]);
    let m = Number(dmy[2]);
    let y = Number(dmy[3]);
    if (y < 100) y += y < 70 ? 2000 : 1900;
    if (m > 12) [d, m] = [m, d];
    const date = new Date(y, m - 1, d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  const day = s.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{2,4})$/i);
  if (day) {
    const m = monthToNumber(day[2]);
    if (m === null) return null;
    let y = Number(day[3]);
    if (y < 100) y += 2000;
    const date = new Date(y, m - 1, Number(day[1]));
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  return null;
}

function parseDayMonth(day: string, month: string): { day: number; month: number } | null {
  const m = monthToNumber(month);
  if (m === null) return null;
  return { day: Number(day), month: m };
}

function isoFromParts(year: number, month: number, day: number): string {
  const date = new Date(year, month - 1, day);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Parses a contract period label like
 * "16 Oct – 23 Dec 2026" or "24 Dec 2026 – 07 Jan 2027" or "08 Jan 2026 – 07 Jan 2027"
 * into inclusive [from, to] ISO dates.
 */
export function parsePeriodLabel(label: string): { from: string; to: string } | null {
  const s = (label ?? '').trim();
  if (s === '') return null;
  const allYear = s.match(/^all year\s+(\d{4})$/i);
  if (allYear) {
    const y = Number(allYear[1]);
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
  const dotted = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s*[-–—]\s*(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotted) {
    const fy = Number(dotted[3]);
    const ty = Number(dotted[6]);
    return { from: isoFromParts(fy, Number(dotted[2]), Number(dotted[1])), to: isoFromParts(ty, Number(dotted[5]), Number(dotted[4])) };
  }
  const dashMon = s.match(/^(\d{1,2})-([a-z]+)-(\d{2,4})\s*[-–—]\s*(\d{1,2})-([a-z]+)-(\d{2,4})$/i);
  if (dashMon) {
    const a = monthToNumber(dashMon[2]);
    const b = monthToNumber(dashMon[5]);
    if (a === null || b === null) return null;
    const y1 = Number(dashMon[3]);
    const y2 = Number(dashMon[6]);
    return {
      from: isoFromParts(y1 < 100 ? y1 + 2000 : y1, a, Number(dashMon[1])),
      to: isoFromParts(y2 < 100 ? y2 + 2000 : y2, b, Number(dashMon[4])),
    };
  }
  const twoSide = s.match(/^(\d{1,2})\s+([a-z]+)\s*[-–—]\s*(\d{1,2})\s+([a-z]+)\s+(\d{2,4})$/i);
  if (twoSide) {
    const a = parseDayMonth(twoSide[1], twoSide[2]);
    const b = parseDayMonth(twoSide[3], twoSide[4]);
    if (!a || !b) return null;
    const year = Number(twoSide[5]);
    const fy = year < 100 ? year + 2000 : year;
    const toYear = a.month <= b.month ? fy : b.month === 1 ? fy + 1 : fy;
    return { from: isoFromParts(fy, a.month, a.day), to: isoFromParts(toYear, b.month, b.day) };
  }
  const doubleDated = s.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{2,4})\s*[-–—]\s*(\d{1,2})\s+([a-z]+)\s+(\d{2,4})$/i);
  if (doubleDated) {
    const a = parseDayMonth(doubleDated[1], doubleDated[2]);
    const b = parseDayMonth(doubleDated[4], doubleDated[5]);
    if (!a || !b) return null;
    const y1 = Number(doubleDated[3]);
    const y2 = Number(doubleDated[6]);
    return {
      from: isoFromParts(y1 < 100 ? y1 + 2000 : y1, a.month, a.day),
      to: isoFromParts(y2 < 100 ? y2 + 2000 : y2, b.month, b.day),
    };
  }
  return null;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard < 5000) {
    out.push(cur);
    cur = addDays(cur, 1);
    guard += 1;
  }
  return out;
}

export function diffDays(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00').getTime();
  const b = new Date(to + 'T00:00:00').getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function displayDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}