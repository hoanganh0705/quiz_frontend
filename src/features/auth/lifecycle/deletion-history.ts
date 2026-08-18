

const PUBLIC_LANDING_PATH = '/';

export function buildDeletionReplaceHistory(): () => void {
return () => {
if (typeof window === 'undefined') return;
if (typeof window.history === 'undefined') return;
if (typeof window.history.replaceState !== 'function') return;

try {
window.history.replaceState(
null,
'',
PUBLIC_LANDING_PATH,
      );
    } catch {
      // Defensive: a buggy browser shim might throw. The
      // coordinator swallows step errors so navigation can still
      // proceed.
    }
  };
}

export const DELETION_PUBLIC_LANDING_PATH = PUBLIC_LANDING_PATH;
