import { useEffect, useState } from 'react';
import { adminApi, apiErrorMessage } from '../../api/client';
import { Listing } from '../../types';
import { Alert, EmptyState, PageHeader, Spinner, StatusBadge, formatDate } from '../../components/ui';

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await adminApi.listings();
        if (active) setListings(res.data.data as Listing[]);
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

  const term = search.trim().toLowerCase();
  const shown = term
    ? listings.filter(
        (l) =>
          l.categoryName.toLowerCase().includes(term) ||
          l.location.toLowerCase().includes(term) ||
          l.producerName.toLowerCase().includes(term)
      )
    : listings;

  return (
    <div>
      <PageHeader title="Waste Listings" subtitle="All recyclable waste listings in the system." />

      {error && <Alert type="error">{error}</Alert>}

      <div className="card mb-4">
        <label className="label" htmlFor="search">
          Search listings
        </label>
        <input
          id="search"
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Category, location or producer"
        />
      </div>

      {loading ? (
        <Spinner />
      ) : shown.length === 0 ? (
        <EmptyState title="No listings found" message="No waste listings match your search." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Location</th>
                  <th>Producer</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((l) => (
                  <tr key={l.listingId}>
                    <td className="text-slate-500">#{l.listingId}</td>
                    <td className="font-medium text-slate-800">{l.categoryName}</td>
                    <td>
                      {l.quantity} {l.unit}
                    </td>
                    <td>{l.location}</td>
                    <td>{l.producerName}</td>
                    <td>
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="text-slate-500">{formatDate(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
