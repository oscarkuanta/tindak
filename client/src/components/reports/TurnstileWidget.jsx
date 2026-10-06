import { useEffect, useRef } from 'react';

const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export function TurnstileWidget({ onToken, error }) {
  const containerRef = useRef(null);
  const onTokenRef = useRef(onToken);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return undefined;
    let widgetId;
    let active = true;

    function renderWidget() {
      if (!active || !window.turnstile || !containerRef.current || widgetId) return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => onTokenRef.current(token),
        'expired-callback': () => onTokenRef.current(''),
        'error-callback': () => onTokenRef.current(''),
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      let script = document.querySelector('script[data-tindak-turnstile]');
      if (!script) {
        script = document.createElement('script');
        script.src = TURNSTILE_SCRIPT_URL;
        script.async = true;
        script.defer = true;
        script.dataset.tindakTurnstile = 'true';
        document.head.append(script);
      }
      script.addEventListener('load', renderWidget);
      return () => {
        active = false;
        script.removeEventListener('load', renderWidget);
        if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      };
    }

    return () => {
      active = false;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  return (
    <div>
      <p className="mb-2 text-sm font-medium">Verifikasi keamanan</p>
      {siteKey ? (
        <div ref={containerRef} aria-label="Verifikasi Cloudflare Turnstile" />
      ) : (
        <div className="rounded-base border border-warning/40 bg-warning/10 p-3 text-sm text-text-muted">
          Captcha belum dikonfigurasi. Isi <code>VITE_TURNSTILE_SITE_KEY</code> untuk mengaktifkan
          Turnstile.
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
