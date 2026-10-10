import { useEffect, useState } from 'react';
import { organizationApi, apiErrorMessage } from '../../api/client';
import { Listing } from '../../types';
import { Alert, EmptyState, PageHeader, Spinner, StatusBadge, formatDate } from '../../components/ui';

export default function OrganizationListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await organizationApi.listings();
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

  return (
    <div>
      <PageHeader
        title="Relevant Recyclable Waste"
        subtitle="Listings whose material your organization accepts."
      />

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <Spinner />
      ) : listings.length === 0 ? (
        <EmptyState
          title="No relevant listings"
          message="Add accepted materials in your profile to see matching recyclable waste."
        />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Location</th>
                  <th>Producer</th>
                  <th>Status</th>
                  <th>Description</th>
                  <th>Posted</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.listingId}>
                    <td className="font-medium text-slate-800">{l.categoryName}</td>
                    <td>
                      {l.quantity} {l.unit}
                    </td>
                    <td>{l.location}</td>
                    <td>{l.producerName}</td>
                    <td>
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="max-w-xs truncate text-slate-500">{l.description ?? '—'}</td>
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
