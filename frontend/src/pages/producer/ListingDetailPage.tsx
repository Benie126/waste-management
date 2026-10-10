import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { listingApi, apiErrorMessage } from '../../api/client';
import { Listing } from '../../types';
import { Alert, PageHeader, Spinner, StatusBadge, formatDate } from '../../components/ui';

export default function ListingDetailPage() {
  const { id } = useParams();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await listingApi.get(Number(id));
        if (active) setListing(res.data.data as Listing);
      } catch (err) {
        if (active) setError(apiErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <Alert type="error">{error}</Alert>;
  if (!listing) return <Alert type="error">Listing not found.</Alert>;

  const rows: [string, string][] = [
    ['Category', listing.categoryName],
    ['Quantity', `${listing.quantity} ${listing.unit}`],
    ['Location', listing.location],
    ['Status', listing.status],
    ['Created', formatDate(listing.createdAt)],
    ['Last updated', formatDate(listing.updatedAt)],
  ];

  return (
    <div>
      <PageHeader
        title={`Listing #${listing.listingId}`}
        subtitle={`${listing.categoryName} · ${listing.quantity} ${listing.unit} · ${listing.location}`}
        actions={
          <>
            {!['COLLECTED', 'CANCELLED'].includes(listing.status) && (
              <Link to={`/producer/listings/${listing.listingId}/edit`} className="btn-secondary">
                Edit
              </Link>
            )}
            <Link to="/producer/listings" className="btn-secondary">
              Back to listings
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-slate-900">Listing details</h2>
          <dl className="mt-4 divide-y divide-slate-100">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-3">
                <dt className="text-sm text-slate-500">{label}</dt>
                <dd className="text-sm font-medium text-slate-800">
                  {label === 'Status' ? <StatusBadge status={listing.status} /> : value}
                </dd>
              </div>
            ))}
          </dl>
          {listing.description && (
            <div className="mt-4 rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Description</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{listing.description}</p>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-900">What happens next?</h2>
          <ol className="mt-3 space-y-3 text-sm text-slate-600">
            <li>1. Collectors browse available waste and request this listing.</li>
            <li>2. You review requests under Pickup Requests and accept one.</li>
            <li>3. Schedule the accepted pickup with a date and time.</li>
            <li>4. The collector updates the status until collection is complete.</li>
            <li>5. Leave feedback once the collection is completed.</li>
          </ol>
          <Link to="/producer/requests" className="btn-primary mt-4 w-full">
            View pickup requests
          </Link>
        </div>
      </div>
    </div>
  );
}
