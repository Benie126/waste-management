import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiErrorMessage } from '../../api/client';
import { homeForRole } from '../../components/Layout';
import { Alert } from '../../components/ui';
import GoogleButton from '../../components/GoogleButton';
import { Role } from '../../types';

const ROLES: { value: Role; label: string; description: string }[] = [
  {
    value: 'WASTE_PRODUCER',
    label: 'Waste Producer',
    description: 'I have recyclable waste to post',
  },
  {
    value: 'COLLECTOR',
    label: 'Collector',
    description: 'I collect recyclable waste',
  },
  {
    value: 'RECYCLING_ORGANIZATION',
    label: 'Recycling Organization',
    description: 'We accept recyclable materials',
  },
];

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
    role: 'WASTE_PRODUCER' as Role,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setBusy(true);
    try {
      const user = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        role: form.role,
      });
      navigate(homeForRole(user.role), { replace: true });
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
      const user = await loginWithGoogle(idToken, form.role);
      navigate(homeForRole(user.role), { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">
            W
          </span>
          <span className="text-xl font-bold text-slate-900">WasteLink</span>
        </Link>

        <div className="card">
          <h1 className="text-xl font-bold text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">Choose the role that describes you.</p>

          {error && (
            <div className="mt-5">
              <Alert type="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
            <fieldset>
              <legend className="label">I am a...</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {ROLES.map((r) => (
                  <label
                    key={r.value}
                    className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
                      form.role === r.value
                        ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-200'
                        : 'border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      className="sr-only"
                      checked={form.role === r.value}
                      onChange={() => set('role', r.value)}
                    />
                    <span className="block font-medium text-slate-800">{r.label}</span>
                    <span className="mt-1 block text-xs text-slate-500">{r.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label className="label" htmlFor="name">
                Full name {form.role === 'RECYCLING_ORGANIZATION' && '(or contact person)'}
              </label>
              <input
                id="name"
                className="input"
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Jane Doe"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  required
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="label" htmlFor="phone">
                  Phone (optional)
                </label>
                <input
                  id="phone"
                  className="input"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+250 7xx xxx xxx"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  required
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
              <div>
                <label className="label" htmlFor="confirm">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  className="input"
                  required
                  value={form.confirm}
                  onChange={(e) => set('confirm', e.target.value)}
                  placeholder="Repeat password"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs uppercase text-slate-400">or</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <GoogleButton onCredential={onGoogle} role={form.role} />

          <p className="mt-6 text-center text-sm text-slate-600">
            Already registered?{' '}
            <Link to="/login" className="link">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
