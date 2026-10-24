import { useEffect, useRef, useState } from 'react';

const GOOGLE_SCRIPT_ID = 'google-identity-services';

function getLoginUri() {
  if (import.meta.env.VITE_GOOGLE_LOGIN_URI) return import.meta.env.VITE_GOOGLE_LOGIN_URI;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://${window.location.hostname}:5000/api/auth/google`;
  }
  return new URL('/api/auth/google', window.location.origin).toString();
}

export default function GoogleSignInButton() {
  const buttonRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const renderButton = () => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!active || !buttonRef.current || !window.google?.accounts?.id) return;
      if (!clientId) {
        setError('Google sign-in is not configured.');
        return;
      }

      buttonRef.current.replaceChildren();
      window.google.accounts.id.initialize({
        client_id: clientId,
        ux_mode: 'redirect',
        login_uri: getLoginUri(),
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: document.documentElement.classList.contains('dark') ? 'filled_black' : 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        width: Math.min(buttonRef.current.clientWidth || 360, 400),
      });
    };

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    if (window.google?.accounts?.id) {
      renderButton();
    } else if (existingScript) {
      existingScript.addEventListener('load', renderButton);
    } else {
      const script = document.createElement('script');
      script.id = GOOGLE_SCRIPT_ID;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = renderButton;
      script.onerror = () => active && setError('Could not load Google sign-in. Check your connection and try again.');
      document.head.appendChild(script);
    }

    return () => {
      active = false;
      existingScript?.removeEventListener('load', renderButton);
    };
  }, []);

  return (
    <div className="w-full">
      <div ref={buttonRef} className="flex min-h-11 w-full justify-center" />
      {error && <p role="status" className="mt-2 text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
