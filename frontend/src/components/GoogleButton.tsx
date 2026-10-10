import { useEffect, useRef, useState } from 'react';
import { Role } from '../types';

let googleInitGuard = false;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (res: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

/**
 * Renders the official Google Sign-In button.
 * Requires VITE_GOOGLE_CLIENT_ID to be set; otherwise it renders a clear
 * message instead of a broken button.
 */
export default function GoogleButton({
  onCredential,
  role,
  label = 'Continue with Google',
}: {
  onCredential: (idToken: string) => void;
  role?: Role;
  label?: string;
}) {
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    if (googleInitGuard) return;

    let cancelled = false;

    const init = () => {
      if (cancelled || !window.google || !containerRef.current) return false;
      googleInitGuard = true;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (res) => onCredential(res.credential),
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'signin_with',
        locale: 'en',
      });
      setReady(true);
      return true;
    };

    if (!init()) {
      const timer = window.setInterval(() => {
        if (init()) window.clearInterval(timer);
      }, 300);
      window.setTimeout(() => window.clearInterval(timer), 8000);
      return () => {
        cancelled = true;
        window.clearInterval(timer);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential]);

  if (!clientId) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
        Google Sign-In is not configured. Set <code>VITE_GOOGLE_CLIENT_ID</code> to enable it.
        {role ? ` (would register as ${role.replace(/_/g, ' ')})` : ''}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={containerRef} />
      {!ready && <span className="text-xs text-slate-400">Loading Google Sign-In…</span>}
      <span className="sr-only">{label}</span>
    </div>
  );
}
