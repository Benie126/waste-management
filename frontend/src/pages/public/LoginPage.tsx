import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiErrorMessage } from '../../api/client';
import { homeForRole } from '../../components/Layout';
import { Alert } from '../../components/ui';
import GoogleButton from '../../components/GoogleButton';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const go = (role: Parameters<typeof homeForRole>[0]) => {
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from && from !== '/login' ? from : homeForRole(role), { replace: true });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      go(user.role);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async (idToken: string) => {
    setError('');
    setBusy(true);
    try {
      const user = await loginWithGoogle(idToken);
      go(user.role);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">
            W
          </span>
          <span className="text-xl font-bold text-slate-900">WasteLink</span>
        </Link>

        <div className="card">
          <h1 className="text-xl font-bold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Log in to manage your waste collections.</p>

          <div className="mt-5">
            {error && <Alert type="error">{error}</Alert>}
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div>
                <label className="label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs uppercase text-slate-400">or</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <GoogleButton onCredential={onGoogle} />
          </div>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="link">
              Register
            </Link>
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-500">
          <p className="font-semibold text-slate-600">Development accounts (password: Password123!)</p>
          <ul className="mt-2 space-y-1">
            <li>admin@wastelink.rw — Admin</li>
            <li>alice@wastelink.rw — Waste Producer</li>
            <li>chris@wastelink.rw — Collector (verified)</li>
            <li>ecorwanda@wastelink.rw — Recycling Organization</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
