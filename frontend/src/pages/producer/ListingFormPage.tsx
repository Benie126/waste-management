import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { categoryApi, listingApi, apiErrorMessage } from '../../api/client';
import { Category, Listing, MatchResult } from '../../types';
import { Alert, PageHeader, Spinner, VerifyBadge } from '../../components/ui';

const UNITS = ['kg', 'tonnes', 'pieces', 'bags'];

export default function ListingFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    categoryId: '',
    quantity: '',
    unit: 'kg',
    location: '',
    description: '',
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState<MatchResult[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const catRes = await categoryApi.list();
        if (!active) return;
        const cats = catRes.data.data as Category[];
        setCategories(cats);

        if (isEdit) {
          const res = await listingApi.get(Number(id));
          const listing = res.data.data as Listing;
          if (!active) return;
          setForm({
            categoryId: String(listing.categoryId),
            quantity: String(listing.quantity),
            unit: listing.unit,
            location: listing.location,
            description: listing.description ?? '',
          });
        }
      } catch (err) {
        if (active) setError(apiErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, isEdit]);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = {
        categoryId: Number(form.categoryId),
        quantity: Number(form.quantity),
        unit: form.unit,
        location: form.location.trim(),
        description: form.description.trim() || undefined,
      };
      if (isEdit) {
        await listingApi.update(Number(id), payload);
        navigate('/producer/listings');
      } else {
        const res = await listingApi.create(payload);
        const created = res.data.data as Listing;
        setMatches(created.matches ?? []);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  // After creating, show the rule-based matches so the producer sees who can collect.
  if (matches) {
    return (
      <div>
        <PageHeader title="Listing created" subtitle="Your waste is now visible to suitable collectors." />
        <Alert type="success">Your listing was created and is now AVAILABLE for collectors.</Alert>

        <div className="card mt-4">
          <h2 className="font-semibold text-slate-900">Smart matching results</h2>
          <p className="mt-1 text-sm text-slate-500">
            Collectors matched by material type, service area and availability.
          </p>
          {matches.length === 0 ? (
            <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              No verified collector currently matches this material and area. Your listing is still
              visible to collectors browsing available waste.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {matches.map((m) => (
                <li key={m.collectorId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-slate-800">
                      {m.collectorName}{' '}
                      <span className="ml-1 text-xs font-normal text-slate-500">score {m.score}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Service area: {m.serviceArea || '—'} · {m.reasons.join(' · ')}
                    </p>
                  </div>
                  <VerifyBadge status={m.verificationStatus} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/producer/listings" className="btn-primary">
            Go to my listings
          </Link>
          <button
            className="btn-secondary"
            onClick={() => {
              setMatches(null);
              setForm({ categoryId: '', quantity: '', unit: 'kg', location: '', description: '' });
            }}
          >
            Create another listing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Waste Listing' : 'Create Waste Listing'}
        subtitle={
          isEdit
            ? 'Update the details of your recyclable waste listing.'
            : 'Describe the recyclable waste you want collected.'
        }
      />

      {error && <Alert type="error">{error}</Alert>}

      <div className="card max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="categoryId">
              Waste category
            </label>
            <select
              id="categoryId"
              className="input"
              required
              value={form.categoryId}
              onChange={(e) => set('categoryId', e.target.value)}
            >
              <option value="">Select a category...</option>
              {categories.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.categoryName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="quantity">
                Quantity
              </label>
              <input
                id="quantity"
                type="number"
                min="0.01"
                step="0.01"
                className="input"
                required
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                placeholder="10"
              />
            </div>
            <div>
              <label className="label" htmlFor="unit">
                Unit
              </label>
              <select id="unit" className="input" value={form.unit} onChange={(e) => set('unit', e.target.value)}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="location">
              Location / area
            </label>
            <input
              id="location"
              className="input"
              required
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="e.g. Kicukiro"
            />
            <p className="mt-1 text-xs text-slate-500">
              Matching uses this area against collector service areas.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="description">
              Description (optional)
            </label>
            <textarea
              id="description"
              className="input min-h-[96px]"
              maxLength={2000}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Condition, packaging, access instructions..."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Saving...' : isEdit ? 'Save changes' : 'Create listing'}
            </button>
            <Link to="/producer/listings" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
