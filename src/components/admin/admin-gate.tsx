import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { KeyRound, Lock, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui';
import { isAdminBypassable, isAdminProtected, isAdminUnlocked, unlockAdmin, ADMIN_LOCK_EVENT } from '@/lib/admin-auth';

export function AdminGate({ children }: { children: ReactNode }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(isAdminUnlocked);

  // The sign-out button inside /admin cannot re-render this gate directly, so
  // lockAdmin() announces itself on the window and we close here.
  useEffect(() => {
    const onLock = () => {
      setUnlocked(false);
      setPassword('');
    };
    window.addEventListener(ADMIN_LOCK_EVENT, onLock);
    return () => window.removeEventListener(ADMIN_LOCK_EVENT, onLock);
  }, []);

  if (isAdminBypassable()) return <>{children}</>;
  if (!isAdminProtected()) return <NotConfigured />;
  if (unlocked) return <>{children}</>;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (unlockAdmin(password)) {
      setError(null);
      setUnlocked(true);
      return;
    }
    setPassword('');
    setError('Incorrect password. Try again.');
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-5 py-20">
      <form onSubmit={onSubmit} className="w-full rounded-3xl border border-ink-950/8 bg-white p-8 shadow-card">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <Lock size={22} />
        </span>
        <h1 className="font-display mt-5 text-2xl font-semibold text-ink-950">Operations area</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          This screen manages rates, availability, site content and themes. Enter the admin password to continue.
        </p>

        <label className="mt-6 block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">Password</span>
          <div className="relative">
            <KeyRound size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="password"
              value={password}
              autoFocus
              autoComplete="current-password"
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              className="w-full rounded-xl border border-ink-950/10 bg-white py-2.5 pl-10 pr-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </label>

        {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}

        <Button type="submit" size="md" className="mt-6 w-full" disabled={!password.trim()}>
          Unlock
        </Button>

        <p className="mt-6 border-t border-ink-950/8 pt-4 text-xs leading-relaxed text-ink-400">
          This is a browser-side gate, not real security — the check runs in JavaScript. Keep the admin route protected at
          your host or CDN as well.
        </p>
      </form>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-5 py-20">
      <div className="w-full rounded-3xl border border-rose-200 bg-rose-50 p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-100 text-rose-700">
          <ShieldAlert size={22} />
        </span>
        <h1 className="font-display mt-5 text-2xl font-semibold text-ink-950">Admin is locked</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">
          No admin password is set, so this area is closed rather than left open. Set{' '}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">VITE_ADMIN_PASSWORD</code> in your{' '}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">.env</code> and restart the dev server or rebuild.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          The value is inlined into the client bundle at build time, so treat it as a deterrent and also protect the
          route at your host or CDN.
        </p>
      </div>
    </div>
  );
}
