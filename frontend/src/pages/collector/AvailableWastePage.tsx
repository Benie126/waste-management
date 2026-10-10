import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryApi, listingApi, apiErrorMessage } from '../../api/client';
import { Category, Listing } from '../../types';
import { Alert, EmptyState, PageHeader, Spinner, StatusBadge, formatDate } from '../../components/ui';

export default function AvailableWastePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState({ categoryId: '', location: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (filters.categoryId) params.categoryId = Number(filters.categoryId);
      if (filters.location.trim()) params.location = filters.location.trim();
      if (filters.search.trim()) params.search = filters.search.trim();

      const [l, c] = await Promise.all([listingApi.available(params), categoryApi.list()]);
      setListings(l.data.data as Listing[]);
      setCategories(c.data.data as Category[]);
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void load();
  };

  const reset = () => {
    setFilters({ categoryId: '', location: '', search: '' });
    setTimeout(() => void load(), 0);
  };

  return (
    <div>
      <PageHeader
        title="Available Waste"
        subtitle="Browse recyclable waste listings that are open for collection."
      />

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={onSearch} className="card mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="search">
              Search
            </label>
            <input
              id="search"
              className="input"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Description or category"
            />
          </div>
          <div>
            <label className="label" htmlFor="category">
              Category
            </label>
            <select
              id="category"
              className="input"
              value={filters.categoryId}
              onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.categoryName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="location">
              Location
            </label>
            <input
              id="location"
              className="input"
              value={filters.location}
              onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Kicukiro"
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="btn-primary flex-1">
              Apply
            </button>
            <button type="button" className="btn-secondary" onClick={reset}>
              Reset
            </button>
          </div>
        </div>
      </form>

      {loading ? (
        <Spinner />
      ) : listings.length === 0 ? (
        <EmptyState title="No available waste found" message="Try changing your filters or check back later." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <div key={l.listingId} className="card flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900">{l.categoryName}</h3>
                <StatusBadge status={l.status} />
              </div>
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-medium text-slate-800">
                  {l.quantity} {l.unit}
                </span>{' '}
                · {l.location}
              </p>
              {l.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{l.description}</p>}
              <p className="mt-2 text-xs text-slate-400">
                Posted by {l.producerName} · {formatDate(l.createdAt)}
              </p>
              <div className="mt-auto pt-4">
                <Link to={`/collector/waste/${l.listingId}`} className="btn-primary w-full">
                  View details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
