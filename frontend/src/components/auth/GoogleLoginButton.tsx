import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: { client_id: string; callback(response: { credential?: string }): void }): void;
          renderButton(element: HTMLElement, options: Record<string, unknown>): void;
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    const script = existing || document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Không thể tải Google Sign-In. Kiểm tra kết nối mạng.'));
    if (!existing) document.head.appendChild(script);
  });
  return scriptPromise;
}

export function GoogleLoginButton({ onCredential, onError, disabled }: {
  onCredential: (idToken: string) => void;
  onError: (message: string) => void;
  disabled: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

  useEffect(() => {
    if (!clientId || !container.current) return;
    let active = true;
    loadGoogleIdentity().then(() => {
      if (!active || !container.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: response => response.credential
          ? onCredential(response.credential)
          : onError('Google không trả ID Token.'),
      });
      container.current.replaceChildren();
      window.google.accounts.id.renderButton(container.current, {
        type: 'standard', theme: 'outline', size: 'large', text: 'signin_with',
        shape: 'rectangular', logo_alignment: 'left', width: 352,
      });
    }).catch(error => onError(error instanceof Error ? error.message : 'Không thể tải Google Sign-In.'));
    return () => { active = false; };
  }, [clientId, onCredential, onError]);

  if (!clientId) {
    return <p className="text-center text-xs text-amber-300">Google Sign-In chưa được cấu hình.</p>;
  }
  return <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
    <div ref={container} className="flex min-h-10 justify-center" aria-label="Đăng nhập bằng Google" />
  </div>;
}
