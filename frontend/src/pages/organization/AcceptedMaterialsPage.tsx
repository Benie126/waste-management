import { FormEvent, useEffect, useState } from 'react';
import { categoryApi, organizationApi, apiErrorMessage } from '../../api/client';
import { Category, OrganizationProfile } from '../../types';
import { Alert, PageHeader, Spinner } from '../../components/ui';

export default function AcceptedMaterialsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({ organizationName: '', address: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [c, p] = await Promise.all([categoryApi.list(), organizationApi.me()]);
        if (!active) return;
        setCategories(c.data.data as Category[]);
        const profile = p.data.data as OrganizationProfile;
        setSelected(profile.acceptedMaterials);
        setForm({
          organizationName: profile.organizationName,
          address: profile.address ?? '',
          description: profile.description ?? '',
        });
      } catch (err) {
        if (active) setError(apiErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const toggle = (name: string) =>
    setSelected((prev) => (prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await organizationApi.update({
        organizationName: form.organizationName.trim(),
        address: form.address.trim() || null,
        description: form.description.trim() || null,
        acceptedMaterials: selected,
      });
      setMessage('Accepted materials and profile updated.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Accepted Materials"
        subtitle="Choose the recyclable materials your organization accepts."
      />

      {error && (
        <Alert type="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert type="success" onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      <div className="card max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="label" htmlFor="orgName">
              Organization name
            </label>
            <input
              id="orgName"
              className="input"
              required
              value={form.organizationName}
              onChange={(e) => setForm((f) => ({ ...f, organizationName: e.target.value }))}
            />
          </div>

          <div>
            <label className="label" htmlFor="address">
              Address
            </label>
            <input
              id="address"
              className="input"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="e.g. Nyarugenge, Kigali"
            />
          </div>

          <fieldset>
            <legend className="label">Accepted materials ({selected.length} selected)</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {categories.map((c) => (
                <label
                  key={c.categoryId}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
                    selected.includes(c.categoryName)
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-slate-300 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={selected.includes(c.categoryName)}
                    onChange={() => toggle(c.categoryName)}
                  />
                  <span>
                    <span className="block font-medium text-slate-800">{c.categoryName}</span>
                    {c.description && <span className="mt-0.5 block text-xs text-slate-500">{c.description}</span>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="label" htmlFor="description">
              Description (optional)
            </label>
            <textarea
              id="description"
              className="input min-h-[80px]"
              maxLength={500}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
