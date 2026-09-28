/* ------------------------------------------------------------------------ */
/*  /admin password gate                                                      */
/* ------------------------------------------------------------------------ */
/**
 * IMPORTANT — read before relying on this.
 *
 * This is a DETERRENT, not real security. The expected password ships inside
 * the JS bundle, so anyone who opens devtools can read it. What it does buy
 * you is that /admin stops being an open, guessable, publicly-linked screen.
 *
 * Real protection must come from the host or CDN in front of the site (basic
 * auth, Cloudflare Access, Netlify/Vercel password protection). Do both.
 *
 * Unlock state lives in sessionStorage, so it survives reloads and in-tab
 * navigation but is dropped when the tab is closed. `lockAdmin()` clears it
 * immediately and broadcasts ADMIN_LOCK_EVENT so the gate can re-render.
 */

const UNLOCK_KEY = 'thaa.admin.unlocked';

/** Fired on `window` by lockAdmin() so <AdminGate> can close itself. */
export const ADMIN_LOCK_EVENT = 'thaa:admin-lock';

const configuredPassword = (): string =>
  String((import.meta.env as Record<string, string | undefined>).VITE_ADMIN_PASSWORD ?? '').trim();

/** True when a password has been set, i.e. the gate is actually armed. */
export const isAdminProtected = (): boolean => configuredPassword().length > 0;

/** Dev builds may bypass an unconfigured gate so local work is not blocked. */
export const isAdminBypassable = (): boolean => Boolean(import.meta.env.DEV) && !isAdminProtected();

export function isAdminUnlocked(): boolean {
  if (isAdminBypassable()) return true;
  if (!isAdminProtected()) return false;
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

/** Returns true when the password matched and the session is now unlocked. */
export function unlockAdmin(password: string): boolean {
  if (isAdminBypassable()) return true;
  if (!isAdminProtected()) return false;
  if (password !== configuredPassword()) return false;
  try {
    sessionStorage.setItem(UNLOCK_KEY, '1');
  } catch {
    /* storage blocked — gate stays closed for this render */
    return false;
  }
  return true;
}

export function lockAdmin() {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(ADMIN_LOCK_EVENT));
}
