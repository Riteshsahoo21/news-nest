import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function GoogleAuthCallback() {
  const [searchParams] = useSearchParams();
  const { completeGoogleLogin } = useAuth();
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const ticket = searchParams.get('ticket');
    if (!ticket) {
      setError('Google sign-in did not return a login ticket. Please try again.');
      return;
    }
    window.history.replaceState(null, '', window.location.pathname);

    completeGoogleLogin(ticket)
      .then((data) => {
        const roles = data?.user?.roles || (data?.user?.role ? [data.user.role] : []);
        navigate(roles.includes('admin') ? '/admin' : '/', { replace: true });
      })
      .catch((err) => setError(err.response?.data?.error || 'Google sign-in could not be completed. Please try again.'));
  }, [completeGoogleLogin, navigate, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-8 text-center shadow-sm">
        {error ? (
          <>
            <h1 className="text-xl font-bold">Sign-in failed</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Link className="text-sm font-semibold text-primary underline" to="/login">Return to login</Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">Completing Google sign-in</h1>
            <p className="text-sm text-muted-foreground">Please wait while we securely finish signing you in.</p>
          </>
        )}
      </div>
    </main>
  );
}
