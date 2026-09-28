import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Database,
  Download,
  FileText,
  FileUp,
  History,
  Info,
  LayoutDashboard,
  LogOut,
  Palette,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Upload,
  XCircle,
} from 'lucide-react';
import { isAdminProtected, lockAdmin } from '@/lib/admin-auth';
import { MODULES, type ModuleId } from '@/config/modules';
import { getModules, resetModules, setModule } from '@/lib/modules';
import {
  DEFAULT_CUSTOM_PALETTE,
  THEMES,
  applyTheme,
  getCustomPalette,
  getTheme,
  isHex,
  paletteToVars,
  resetCustomPalette,
  resetTheme,
  setCustomPalette,
  setTheme,
  type CustomPalette,
  type ThemeId,
} from '@/lib/theme';
import { cx, SectionHeading } from '@/components/ui';
import { ContentTab } from '@/components/admin/content-tab';
import { MediaTab } from '@/components/admin/media-tab';
import { getContent, patchContent, exportContent, importContent } from '@/content/client';
import { properties } from '@/data/properties';
import {
  getInventory,
  getOverview,
  isOverrideActive,
  patchAvailability,
  publishInventory,
  resetToArtifact,
} from '@/inventory/client';
import { importInventoryFromCsv, CSV_COLUMNS } from '@/inventory/importer';
import type { ContractLike } from '@/inventory/importer';
import { priceValueLabel } from '@/inventory/schema';
import type {
  AvailabilityStatus,
  ImportJob,
  InventoryData,
  RatePeriod,
} from '@/inventory/schema';
import { displayDate, todayISO } from '@/lib/dates';

type Section = 'dashboard' | 'inventory' | 'imports' | 'modules' | 'media' | 'content' | 'settings';

const NAV: Array<{ id: Section; label: string; icon: typeof Boxes }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'imports', label: 'Imports', icon: Upload },
  { id: 'modules', label: 'Modules', icon: Settings2 },
  { id: 'media', label: 'Media', icon: Upload },
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Palette },
];

const CUSTOM_FIELDS: Array<{ key: keyof CustomPalette; label: string; hint: string }> = [
  { key: 'brand', label: 'Brand', hint: 'Primary — buttons & links' },
  { key: 'accent', label: 'Accent', hint: 'Highlights & flourishes' },
  { key: 'paper', label: 'Paper', hint: 'Page background' },
  { key: 'neutral', label: 'Neutral', hint: 'Cards & surfaces' },
];

const safeHex = (h: string) => (/^#[0-9a-f]{6}$/i.test(h) ? h : '#000000');

const STATUS_TONES: Record<AvailabilityStatus, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700',
  ON_REQUEST: 'bg-amber-50 text-amber-700',
  SOLD_OUT: 'bg-rose-50 text-rose-700',
  STOP_SELL: 'bg-ink-950/8 text-ink-600',
};

function StatusPill({ status }: { status: AvailabilityStatus }) {
  return (
    <span className={cx('rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', STATUS_TONES[status])}>
      {status.replace('_', ' ')}
    </span>
  );
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-3xl border border-ink-950/8 bg-white p-6 shadow-card', className)}>{children}</div>;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-400">{label}</p>
      <p className="font-display mt-2 text-3xl font-semibold text-ink-950">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </Card>
  );
}

const rateKey = (r: RatePeriod) => `${r.resortSlug}__${r.roomCode}__${r.mealCode}__${r.validFrom}`;

export default function Admin() {
  const [section, setSection] = useState<Section>('dashboard');
  const [, setRefresh] = useState(0);

  const reload = () => setRefresh((r) => r + 1);

  return (
    <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <SectionHeading
          eyebrow="THAA · Operations"
          title="Inventory ops center."
          description="Rates, availability, imports and pipeline modules for the THAA Maldives product layer — one source of truth feeding the public site."
        />
        {isAdminProtected() && (
          <button
            onClick={lockAdmin}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-ink-950/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut size={13} /> Lock admin
          </button>
        )}
      </div>

      <div className="mt-10 flex flex-col gap-8 lg:flex-row">
        <nav className="flex shrink-0 flex-row gap-2 overflow-x-auto lg:w-56 lg:flex-col">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={cx(
                'inline-flex shrink-0 items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors',
                section === item.id ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-sand-100'
              )}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          {(() => {
            switch (section) {
              case 'dashboard':
                return <DashboardTab onNavigate={setSection} reload={reload} />;
              case 'inventory':
                return <InventoryTab reload={reload} />;
              case 'imports':
                return <ImportsTab reload={reload} />;
              case 'modules':
                return <ModulesTab onGoContent={() => setSection('content')} />;
              case 'content':
                return <ContentTab />;
              case 'media':
                return <MediaTab />;
              case 'settings':
                return <SettingsTab />;
            }
          })()}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Dashboard ------------------------------- */

function DashboardTab({ onNavigate, reload }: { onNavigate: (s: Section) => void; reload: () => void }) {
  const overview = getOverview();
  const inv = getInventory();
  const override = isOverrideActive();
  const latest: ImportJob | undefined = inv.imports[0];

  return (
    <div className="space-y-5">
      {override && (
        <button
          onClick={() => {
            resetToArtifact();
            reload();
          }}
          className="flex w-full items-start gap-3 rounded-3xl border border-gold-500/40 bg-sand-100 p-5 text-left"
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-gold-600" />
          <span className="text-sm leading-relaxed text-ink-700">
            <strong className="text-ink-950">Local override active</strong> — the site is reading availability data from a
            local browser override, not the committed artifact. <span className="font-semibold underline">Click to roll back to the artifact.</span>
          </span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Version" value={String(overview.version)} hint="storage v1" />
        <Stat label="Resorts" value={String(overview.resorts)} hint="properties seeded" />
        <Stat label="Rate rows" value={overview.rateRows.toLocaleString()} />
        <Stat label="Avail. days" value={overview.availabilityDays.toLocaleString()} hint="daily expanded" />
        <Stat label="Transfers" value={String(overview.transfers)} />
        <Stat label="Imports" value={String(overview.imports)} hint={override ? '1 override on top' : 'artifact only'} />
      </div>

      <div
        className={cx(
          'flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm',
          overview.priceVisible
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-amber-200 bg-amber-50 text-amber-900'
        )}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest">Prices</span>
        <span className="font-semibold">{overview.provenanceLabel}</span>
        <span className="text-xs opacity-80">{overview.provenanceReason}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-display text-xl font-semibold text-ink-950">Search window</h3>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-700">Checks every night</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-600">
            Availability is stored as a row per resort · room · night, independent of rate validity. The public site
            never reads Excel or contract files directly — it always goes through the availability client.
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-display text-xl font-semibold text-ink-950">Latest import</h3>
            {latest ? (
              <span className={cx(
                'rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider',
                latest.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : latest.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
              )}>
                {latest.status}
              </span>
            ) : (
              <span className="rounded-full bg-ink-950/8 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-500">None</span>
            )}
          </div>
          {latest ? (
            <div className="mt-3 space-y-1 text-sm text-ink-600">
              <p><strong className="text-ink-950">{latest.filename}</strong> · {latest.source}</p>
              <p>
                {latest.rowsCreated} created · {latest.rowsUpdated} updated · {latest.rowsUnchanged} unchanged · {latest.rowsFailed} failed
              </p>
              <p className="text-xs text-ink-400">{displayDate(latest.startedAt.slice(0, 10))}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-600">No import jobs yet — seed the artifact or upload a CSV in Imports.</p>
          )}
          <button
            onClick={() => onNavigate('imports')}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-brand-500"
          >
            <FileUp size={13} /> Go to Imports
          </button>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------- Inventory ------------------------------- */

function InventoryTab({ reload }: { reload: () => void }) {
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'availability' | 'rates' | 'transfers'>('availability');
  const inv = getInventory();
  const resorts = useMemo(() => Array.from(new Set(inv.rates.map((r) => r.resortSlug))).sort(), [inv]);
  const [resort, setResort] = useState(resorts[0] ?? '');
  const [date, setDate] = useState(todayISO());

  const rows = useMemo(
    () => inv.availability.filter((a) => a.resortSlug === resort && a.date === date),
    [inv, resort, date]
  );

  const [drafts, setDrafts] = useState<Record<string, { status: AvailabilityStatus; availableRooms: number | null }>>({});

  const setDraft = (key: string, status: AvailabilityStatus, availableRooms: number | null) =>
    setDrafts((prev) => ({ ...prev, [key]: { status, availableRooms } }));

  const saveEdits = () => {
    const updates = rows
      .filter((r) => {
        const d = drafts[r.roomCode];
        return d && (d.status !== r.status || d.availableRooms !== r.availableRooms);
      })
      .map((r) => ({ resortSlug: r.resortSlug, roomCode: r.roomCode, date: r.date, ...drafts[r.roomCode] }));
    if (updates.length === 0) return;
    const patch = patchAvailability(updates);
    try {
      publishInventory(patch.inventory);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
      return;
    }
    setDrafts({});
    reload();
  };

  const rates = useMemo(
    () => inv.rates.filter((r) => r.resortSlug === resort),
    [inv, resort]
  );

  const transferRows = inv.transfers;

  const tabs: Array<{ id: typeof tab; label: string }> = [
    { id: 'availability', label: 'Availability' },
    { id: 'rates', label: 'Rates' },
    { id: 'transfers', label: 'Transfers' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cx(
                'rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors',
                tab === t.id ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 hover:bg-sand-100'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab !== 'transfers' && (
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={resort}
              onChange={(e) => setResort(e.target.value)}
              className="rounded-full border border-ink-950/10 bg-white px-4 py-2 text-sm font-semibold text-ink-700 focus:outline-none"
            >
              {resorts.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {tab === 'availability' && (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-full border border-ink-950/10 bg-white px-4 py-2 text-sm font-semibold text-ink-700 focus:border-brand-500 focus:outline-none"
              />
            )}
          </div>
        )}

        {message && (
          <p
            className={cx(
              'flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm',
              /published|full|Nothing was published/i.test(message)
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-ink-950/10 bg-sand-50 text-ink-700'
            )}
          >
            <Info size={15} className="mt-0.5 shrink-0" />
            {message}
          </p>
        )}
      </div>

      {tab === 'availability' && (
        <>
          <div className="flex items-center justify-between gap-4 text-sm text-ink-500">
            <p>
              {rows.length} room/night rows for <strong className="text-ink-950">{resort}</strong> on{' '}
              <strong className="text-ink-950">{displayDate(date)}</strong>.
            </p>
            <button
              onClick={saveEdits}
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-brand-500"
            >
              <Database size={13} /> Save changes
            </button>
          </div>
          <Card className="p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-950/8 text-[11px] uppercase tracking-wider text-ink-400">
                  <th className="px-5 py-3">Room</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Rooms for sale</th>
                  <th className="px-5 py-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const d = drafts[r.roomCode];
                  const status = d?.status ?? r.status;
                  const rooms = d?.availableRooms ?? r.availableRooms;
                  return (
                    <tr key={r.roomCode} className="border-b border-ink-950/5 last:border-0">
                      <td className="px-5 py-3 font-semibold text-ink-950">{r.roomCode}</td>
                      <td className="px-5 py-3">
                        <select
                          value={status}
                          onChange={(e) => setDraft(r.roomCode, e.target.value as AvailabilityStatus, rooms)}
                          className="rounded-lg border border-ink-950/10 bg-white px-2 py-1 text-xs font-semibold"
                        >
                          {(['AVAILABLE', 'ON_REQUEST', 'SOLD_OUT', 'STOP_SELL'] as AvailabilityStatus[]).map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <span className="ml-2"><StatusPill status={status} /></span>
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          min={0}
                          value={rooms ?? ''}
                          onChange={(e) => setDraft(r.roomCode, status, e.target.value === '' ? null : Number(e.target.value))}
                          className="w-20 rounded-lg border border-ink-950/10 bg-white px-2 py-1 text-center text-xs font-semibold"
                          placeholder="∞"
                        />
                      </td>
                      <td className="px-5 py-3 text-xs text-ink-500">{r.source}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {tab === 'rates' && (
        <Card className="p-0">
          <div className="max-h-[520px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-ink-950/8 text-[11px] uppercase tracking-wider text-ink-400">
                <th className="px-5 py-3">Room</th>
                <th className="px-5 py-3">Board</th>
                <th className="px-5 py-3">Valid</th>
                <th className="px-5 py-3 text-right">SGL</th>
                <th className="px-5 py-3 text-right">DBL</th>
                <th className="px-5 py-3 text-right">TPL</th>
                <th className="px-5 py-3">Cur</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id} className="border-b border-ink-950/5 last:border-0">
                  <td className="px-5 py-2.5 font-semibold text-ink-950">{r.roomCode}</td>
                  <td className="px-5 py-2.5">{r.mealCode}</td>
                  <td className="px-5 py-2.5 text-xs text-ink-500">{displayDate(r.validFrom)} → {displayDate(r.validTo)}</td>
                  <td className="px-5 py-2.5 text-right">{r.sgl}</td>
                  <td className="px-5 py-2.5 text-right">{r.dbl}</td>
                  <td className="px-5 py-2.5 text-right">{r.tpl}</td>
                  <td className="px-5 py-2.5 text-xs text-ink-500">{r.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Card>
      )}

      {tab === 'transfers' && (
        <Card className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-950/8 text-[11px] uppercase tracking-wider text-ink-400">
                <th className="px-5 py-3">Resort</th>
                <th className="px-5 py-3">Mode</th>
                <th className="px-5 py-3">Period</th>
                <th className="px-5 py-3 text-right">Adult</th>
                <th className="px-5 py-3 text-right">Child</th>
                <th className="px-5 py-3">Currency</th>
                <th className="px-5 py-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {transferRows.map((t) => (
                <tr key={t.id} className="border-b border-ink-950/5 last:border-0">
                  <td className="px-5 py-3 font-semibold text-ink-950">{t.resortSlug}</td>
                  <td className="px-5 py-3 text-xs text-ink-600">{t.mode}</td>
                  <td className="px-5 py-3 text-xs text-ink-600">
                    {t.periodLabel ?? ([t.validFrom, t.validTo].filter(Boolean).join(' → ') || '—')}
                  </td>
                  <td className="px-5 py-3 text-right">{priceValueLabel(t.adult)}</td>
                  <td className="px-5 py-3 text-right">{priceValueLabel(t.child)}</td>
                  <td className="px-5 py-3">{t.currency}</td>
                  <td className="px-5 py-3 text-xs text-ink-500">{t.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* -------------------------------- Imports -------------------------------- */

function ImportsTab({ reload }: { reload: () => void }) {
  const [candidate, setCandidate] = useState<InventoryData | null>(null);
  const [fileName, setFileName] = useState('');
  const [message, setMessage] = useState('');
  const inv = getInventory();

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      try {
        const result = importInventoryFromCsv(text, {
          properties: properties as unknown as ContractLike[],
          current: getInventory(),
          filename: file.name,
          sourceId: file.name,
        });
        setCandidate(result.inventory);
        setMessage('');
      } catch (err) {
        setCandidate(null);
        setMessage(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsText(file);
  };

  const job = candidate?.imports[0];
  const currentRateMap = useMemo(() => new Map(inv.rates.map((r) => [rateKey(r), r])), [inv]);
  const candidateRates = candidate?.rates ?? [];

  const diffKind = (r: RatePeriod) => {
    const prev = currentRateMap.get(rateKey(r));
    if (!prev) return 'new';
    if (
      prev.sgl === r.sgl &&
      prev.dbl === r.dbl &&
      prev.tpl === r.tpl &&
      prev.qtrp === r.qtrp &&
      prev.ext === r.ext &&
      prev.child === r.child &&
      prev.infant === r.infant
    )
      return 'same';
    return 'changed';
  };

  const diffTone: Record<'new' | 'changed' | 'same', string> = {
    new: 'bg-emerald-50 text-emerald-700',
    changed: 'bg-amber-50 text-amber-700',
    same: 'bg-ink-950/8 text-ink-500',
  };

  const publish = () => {
    if (!candidate) return;
    try {
      publishInventory(candidate);
    } catch (err) {
      // Leave the candidate staged so the operator can free up storage and retry
      // instead of losing the import they just reviewed.
      setMessage(err instanceof Error ? err.message : String(err));
      return;
    }
    setMessage('Published. The site now reads this data version.');
    setCandidate(null);
    setFileName('');
    reload();
  };

  const discard = () => {
    setCandidate(null);
    setFileName('');
    setMessage('');
  };

  const previewRates = candidateRates.slice(0, 40);

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-xl font-semibold text-ink-950">Upload a contract CSV</h3>
            <p className="mt-1 text-sm text-ink-500">
              One row per resort · room · board · date window. Columns: {CSV_COLUMNS.length} (Resort, Room Type, Meal
              Plan, Date From/To, Currency, SGL/DBL/TPL/QTRP/Extra Adult/Child/Infant Rates, Available Rooms, Transfer
              Adult/Child, Availability Status, Source).
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <a
              href="/import-template.csv"
              download="import-template.csv"
              className="inline-flex items-center gap-2 rounded-full border border-ink-950/20 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-ink-700 transition-colors hover:border-gold-500 hover:bg-gold-500 hover:text-ink-950"
            >
              <Download size={14} /> Template
            </a>
            <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-gold-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-ink-950 shadow-[0_12px_30px_-12px_rgb(var(--color-gold-500)/0.8)] transition-colors hover:bg-gold-400">
              <Upload size={14} /> Choose CSV
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
            </label>
          </div>
        </div>
        {fileName && !candidate && (
          <p className="mt-4 text-sm text-ink-600">Parsed <strong className="text-ink-950">{fileName}</strong> — see preview below.</p>
        )}
        {message && (
          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-sand-100 p-3 text-sm text-ink-700">
            <CheckCircle2 size={16} className="text-gold-600" /> {message}
          </p>
        )}
      </Card>

      {job && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat label="Rows" value={String(job.rowsProcessed)} />
          <Stat label="Created" value={String(job.rowsCreated)} />
          <Stat label="Updated" value={String(job.rowsUpdated)} />
          <Stat label="Failed" value={String(job.rowsFailed)} />
        </div>
      )}

      {job && job.errors.length > 0 && (
        <Card>
          <h4 className="flex items-center gap-2 text-sm font-bold text-ink-950">
            <AlertTriangle size={15} className="text-gold-600" /> {job.errors.length} validation error(s)
          </h4>
          <ul className="mt-3 space-y-1.5">
            {job.errors.slice(0, 20).map((err, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink-600">
                <XCircle size={14} className="mt-0.5 shrink-0 text-rose-500" />
                <span>
                  <strong className="text-ink-950">Row {err.rowNumber}</strong> · {err.field}: {err.message}
                  {err.code && <code className="ml-2 rounded bg-ink-950/6 px-1.5 py-0.5 text-[10px] font-bold text-ink-500">{err.code}</code>}
                  {err.detail?.conflicts && err.detail.conflicts.length > 0 && (
                    <span className="mt-1 block text-xs text-ink-500">
                      {err.detail.conflicts.map((c) => `${c.field}: kept ${c.existing}, dropped ${c.incoming}`).join(' · ')}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {candidate && (
        <Card className="p-0">
          <div className="border-b border-ink-950/8 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="font-display text-lg font-semibold text-ink-950">Preview — drafted vs current</h4>
              <div className="flex gap-2">
                <button
                  onClick={discard}
                  className="inline-flex items-center gap-2 rounded-full border border-ink-950/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink-700 transition-colors hover:border-rose-400 hover:bg-rose-50"
                >
                  <XCircle size={13} /> Discard
                </button>
                <button
                  onClick={publish}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-brand-500"
                >
                  <Database size={13} /> Publish
                </button>
              </div>
            </div>
          </div>
          <div className="max-h-[460px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-ink-950/8 text-[11px] uppercase tracking-wider text-ink-400">
                  <th className="px-5 py-3">Change</th>
                  <th className="px-5 py-3">Resort</th>
                  <th className="px-5 py-3">Room</th>
                  <th className="px-5 py-3">Board</th>
                  <th className="px-5 py-3">SGL</th>
                  <th className="px-5 py-3">DBL</th>
                  <th className="px-5 py-3">TPL</th>
                  <th className="px-5 py-3">Cur</th>
                </tr>
              </thead>
              <tbody>
                {previewRates.map((r) => {
                  const kind = diffKind(r);
                  const prev = currentRateMap.get(rateKey(r));
                  return (
                    <tr key={r.id} className="border-b border-ink-950/5 last:border-0">
                      <td className="px-5 py-2.5">
                        <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', diffTone[kind])}>
                          {kind}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 font-semibold text-ink-950">{r.resortSlug}</td>
                      <td className="px-5 py-2.5">{r.roomCode}</td>
                      <td className="px-5 py-2.5">{r.mealCode}</td>
                      <td className="px-5 py-2.5 text-right">
                        <span className={cx(prev && prev.sgl !== r.sgl && 'font-bold text-ink-950')}>
                          {String(prev?.sgl ?? '—')} → {String(r.sgl)}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <span className={cx(prev && prev.dbl !== r.dbl && 'font-bold text-ink-950')}>
                          {String(prev?.dbl ?? '—')} → {String(r.dbl)}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <span className={cx(prev && prev.tpl !== r.tpl && 'font-bold text-ink-950')}>
                          {String(prev?.tpl ?? '—')} → {String(r.tpl)}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-xs text-ink-500">{r.currency}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {candidateRates.length > previewRates.length && (
            <p className="px-5 py-3 text-xs text-ink-500">Showing {previewRates.length} of {candidateRates.length} rate rows.</p>
          )}
        </Card>
      )}

      <HistoryList onRollback={discard} />
    </div>
  );
}

function HistoryList({ onRollback }: { onRollback: () => void }) {
  const inv = getInventory();
  const overridden = isOverrideActive();

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-ink-950">
          <History size={18} /> Import history
        </h3>
        <button
          onClick={() => {
            resetToArtifact();
            onRollback();
          }}
          className="inline-flex items-center gap-2 rounded-full border border-ink-950/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink-700 transition-colors hover:border-gold-500 hover:bg-gold-500 hover:text-ink-950"
        >
          <RotateCcw size={13} /> Rollback to artifact
        </button>
      </div>
      {overridden && <p className="mt-2 text-xs text-gold-600">Reverts the local override and returns the site to the committed inventory.</p>}
      <ul className="mt-4 space-y-3">
        {inv.imports.map((job) => (
          <li key={job.id} className="flex flex-col gap-1 rounded-2xl bg-sand-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-950">
                {job.filename}
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-500">{job.sourceType}</span>
              </p>
              <p className="text-xs text-ink-500">
                {job.rowsCreated} created · {job.rowsUpdated} updated · {job.rowsUnchanged} unchanged · {job.rowsFailed} failed
              </p>
            </div>
            <span className={cx(
              'shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider',
              job.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : job.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
            )}>
              {job.status}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* -------------------------------- Settings -------------------------------- */

function SettingsTab() {
  const [active, setActive] = useState<ThemeId>(getTheme());
  const [pop, setPop] = useState<{ enabled: boolean; delayMs: number }>(() => getContent().settings.offerPop);
  const [custom, setCustom] = useState<CustomPalette>(() => getCustomPalette() ?? { ...DEFAULT_CUSTOM_PALETTE });
  const [backupNote, setBackupNote] = useState<string | null>(null);

  const pick = (id: ThemeId) => {
    setTheme(id);
    applyTheme(id);
    setActive(id);
  };

  const reset = () => {
    resetTheme();
    resetCustomPalette();
    applyTheme('default');
    setActive('default');
    setCustom({ ...DEFAULT_CUSTOM_PALETTE });
  };

  const setCustomField = (key: keyof CustomPalette, value: string) =>
    setCustom((c) => ({ ...c, [key]: value }));

  const applyCustomTheme = () => {
    if (!isHex(custom.brand) || !isHex(custom.accent) || !isHex(custom.paper) || !isHex(custom.neutral)) return;
    setCustomPalette(custom);
    pick('custom');
  };

  const resetCustomTheme = () => {
    resetCustomPalette();
    setCustom({ ...DEFAULT_CUSTOM_PALETTE });
    if (active === 'custom') pick('default');
  };

  const customValid = isHex(custom.brand) && isHex(custom.accent) && isHex(custom.paper) && isHex(custom.neutral);
  const preview = customValid ? paletteToVars(custom) : null;

  const onExport = () => {
    const blob = new Blob([JSON.stringify(exportContent(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thaa-content-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = (file: File) => {
    void file.text().then((text) => {
      const res = importContent(text);
      if (res.ok) {
        setBackupNote('Content restored from backup. Reload to see every change.');
      } else {
        setBackupNote(res.error ?? 'Import failed.');
      }
    });
  };

  const patchPop = (patch: Partial<{ enabled: boolean; delayMs: number }>) => {
    const next = { ...pop, ...patch };
    setPop(next);
    patchContent({ settings: { offerPop: next } });
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-ink-950">
              <Palette size={18} /> Brand theme
            </h3>
            <p className="mt-1 text-sm text-ink-500">
              Curated colour schemes applied instantly across every page via CSS variables — or roll your own custom
              palette below. Gold is the accent, ink stays for readable text.
            </p>
          </div>
          <button
            onClick={reset}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-ink-950/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink-700 transition-colors hover:border-gold-500 hover:bg-gold-500 hover:text-ink-950"
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {THEMES.map((t) => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => pick(t.id)}
                className={cx(
                  'rounded-3xl border p-5 text-left transition-all',
                  isActive ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-600' : 'border-ink-950/10 bg-white hover:border-brand-300'
                )}
              >
                <span className="flex gap-1.5">
                  {t.swatches.map((c, i) => (
                    <span key={i} className="h-6 w-6 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </span>
                <span className="mt-3 block font-semibold text-ink-950">{t.name}</span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-500">{t.description}</span>
                {isActive && (
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    <CheckCircle2 size={11} /> Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-ink-950">
              <SlidersHorizontal size={18} /> Custom palette
            </h3>
            <p className="mt-1 text-sm text-ink-500">
              Pick each colour as a hex value — full ramps are derived automatically and applied live. Saved forever in
              the browser, just like the presets.
            </p>
          </div>
          {active === 'custom' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              <CheckCircle2 size={11} /> Active
            </span>
          )}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {CUSTOM_FIELDS.map((f) => (
            <label key={f.key} className="flex items-center gap-3 rounded-2xl border border-ink-950/10 bg-white p-3">
              <input
                type="color"
                value={safeHex(custom[f.key])}
                onChange={(e) => setCustomField(f.key, e.target.value)}
                className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-1"
                aria-label={`${f.label} colour`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold uppercase tracking-wider text-ink-700">{f.label}</span>
                <span className="block text-[11px] text-ink-400">{f.hint}</span>
              </span>
              <input
                type="text"
                value={custom[f.key]}
                onChange={(e) => setCustomField(f.key, e.target.value)}
                className={cx(
                  'w-24 rounded-lg border bg-cream px-2 py-1.5 font-mono text-xs text-ink-800 focus:outline-none',
                  isHex(custom[f.key]) ? 'border-ink-950/12 focus:border-brand-500' : 'border-red-400 focus:border-red-400'
                )}
                placeholder="#000000"
                spellCheck={false}
              />
            </label>
          ))}
        </div>

        {preview && (
          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-400">Live preview</p>
            <div className="mt-2 flex items-end gap-2">
              {(
                [
                  ['brand-300', 'brand-300'],
                  ['brand-600', 'brand-600'],
                  ['gold-400', 'gold-400'],
                  ['gold-600', 'gold-600'],
                  ['sand-400', 'sand-400'],
                  ['cream', 'cream'],
                ] as const
              ).map(([key, label]) => (
                <span key={key} className="flex flex-1 flex-col gap-1">
                  <span
                    className="h-10 rounded-lg border border-ink-950/10"
                    style={{ backgroundColor: `rgb(${preview[`--color-${key}`]})` }}
                  />
                  <span className="text-center text-[10px] text-ink-400">{label}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={applyCustomTheme}
            disabled={!customValid}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gold-500 px-6 py-3 text-xs font-bold uppercase tracking-wider text-ink-950 shadow-[0_12px_30px_-12px_rgb(var(--color-gold-500)/0.8)] transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 size={15} /> Apply custom theme
          </button>
          <button
            onClick={resetCustomTheme}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-ink-950/20 px-4 py-3 text-xs font-bold uppercase tracking-wider text-ink-700 transition-colors hover:border-gold-500 hover:bg-gold-500 hover:text-ink-950"
          >
            <RotateCcw size={13} /> Reset palette
          </button>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink-950">Site behaviour</h3>
            <p className="mt-1 text-sm text-ink-500">The special-offer pop card on the public site.</p>
          </div>
          <button
            onClick={() => patchPop({ enabled: !pop.enabled, delayMs: pop.delayMs })}
            aria-pressed={pop.enabled}
            className="flex shrink-0 items-center gap-3"
          >
            <span className={cx('relative h-7 w-12 rounded-full transition-colors', pop.enabled ? 'bg-brand-600' : 'bg-ink-950/15')}>
              <span className={cx('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', pop.enabled ? 'left-6' : 'left-1')} />
            </span>
            <span className={cx('w-14 text-xs font-black uppercase tracking-wider', pop.enabled ? 'text-brand-700' : 'text-ink-400')}>
              {pop.enabled ? 'On' : 'Off'}
            </span>
          </button>
        </div>
        <label className="mt-4 block max-w-xs">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
            Delay before the card appears (ms)
          </span>
          <input
            type="number"
            min={0}
            step={500}
            value={pop.delayMs}
            onChange={(e) => patchPop({ delayMs: Math.max(0, Number(e.target.value) || 0) })}
            className="w-full rounded-xl border border-ink-950/10 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
          />
        </label>
        <p className="mt-3 text-xs leading-relaxed text-ink-400">
          Shown on every page load after the delay. Closing hides it until you refresh; “Not interested” hides that
          offer for a week. Offers are edited in the Content section.
        </p>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink-950">Content backup</h3>
            <p className="mt-1 text-sm text-ink-500">
              Site content lives in this browser only. Download a copy before clearing site data or switching machine.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={onExport}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-brand-500"
          >
            <Download size={14} /> Export JSON
          </button>
          <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-ink-950/20 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-ink-700 transition-colors hover:border-gold-500 hover:bg-gold-500 hover:text-ink-950">
            <Upload size={14} /> Import backup
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImport(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {backupNote && <p className="mt-4 text-xs leading-relaxed text-ink-600">{backupNote}</p>}
      </Card>
    </div>
  );
}

/* -------------------------------- Modules -------------------------------- */

function ModulesTab({ onGoContent }: { onGoContent?: () => void }) {
  const [modules, setModules] = useState(getModules());

  const toggle = (id: ModuleId) => {
    setModule(id, !modules[id]);
    setModules(getModules());
  };

  const onCount = MODULES.filter((m) => modules[m.id]).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-3xl border border-ink-950/8 bg-white p-6 shadow-card">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <Settings2 size={22} />
          </span>
          <div>
            <p className="font-semibold">Core — Maldives stays</p>
            <p className="mt-0.5 text-sm text-ink-500">Resorts, hotels, guest houses, Explore, Packages, Guide, Contact. Always on.</p>
          </div>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">Always on</span>
      </div>

      {MODULES.map((m) => {
        const on = modules[m.id];
        return (
          <div key={m.id} className="flex flex-col gap-4 rounded-3xl border border-ink-950/8 bg-white p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">{m.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">{m.description}</p>
              {m.id === 'outbound' && (
                <button
                  onClick={onGoContent}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-700 hover:text-brand-600"
                >
                  <FileText size={13} /> Manage outbound content
                </button>
              )}
            </div>
            <button onClick={() => toggle(m.id)} aria-pressed={on} className="flex shrink-0 items-center gap-3">
              <span className={cx('relative h-7 w-12 rounded-full transition-colors', on ? 'bg-brand-600' : 'bg-ink-950/15')}>
                <span className={cx('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'left-6' : 'left-1')} />
              </span>
              <span className={cx('w-14 text-xs font-black uppercase tracking-wider', on ? 'text-brand-700' : 'text-ink-400')}>
                {on ? 'On' : 'Off'}
              </span>
            </button>
          </div>
        );
      })}

      <div className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-sand-100 p-6 sm:flex-row sm:items-center">
        <p className="text-sm text-ink-600">
          <strong className="text-ink-950">{onCount}</strong> of {MODULES.length} future modules enabled. Outbound,
          flights, visa, corporate and insurance are OFF by default and reserved for a later release.
        </p>
        <button
          onClick={() => {
            resetModules();
            setModules(getModules());
          }}
          className="inline-flex items-center gap-2 rounded-full border border-ink-950/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink-700 transition-colors hover:border-gold-500 hover:bg-gold-500 hover:text-ink-950"
        >
          <RotateCcw size={13} /> Reset to defaults
        </button>
      </div>
    </div>
  );
}