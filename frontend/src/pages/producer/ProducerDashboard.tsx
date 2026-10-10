import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listingApi, pickupApi, apiErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Listing, PickupRequest } from '../../types';
import { Alert, EmptyState, PageHeader, Spinner, StatCard, StatusBadge, formatDate } from '../../components/ui';

export default function ProducerDashboard() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [l, r] = await Promise.all([listingApi.mine(), pickupApi.forProducer()]);
        if (!active) return;
        setListings(l.data.data as Listing[]);
        setRequests(r.data.data as PickupRequest[]);
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

  const active = listings.filter((l) => ['AVAILABLE', 'REQUESTED', 'SCHEDULED'].includes(l.status)).length;
  const pending = requests.filter((r) => r.status === 'PENDING').length;
  const completed = requests.filter((r) => r.pickup?.status === 'COMPLETED').length;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0] ?? ''}`}
        subtitle="Overview of your recyclable waste listings and pickups."
        actions={
          <Link to="/producer/listings/new" className="btn-primary">
            + Add Waste Listing
          </Link>
        }
      />

      {error && <Alert type="error">{error}</Alert>}
      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Active Listings" value={active} hint={`${listings.length} total`} />
            <StatCard label="Pickup Requests" value={requests.length} hint={`${pending} awaiting you`} accent="amber" />
            <StatCard label="Completed Collections" value={completed} accent="blue" />
            <StatCard label="Total Listings" value={listings.length} accent="slate" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="card">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Recent Waste Listings</h2>
                <Link to="/producer/listings" className="text-sm link">
                  View all
                </Link>
              </div>
              {listings.length === 0 ? (
                <EmptyState
                  title="No listings yet"
                  message="Post your first recyclable waste listing to start receiving pickup requests."
                  action={
                    <Link to="/producer/listings/new" className="btn-primary">
                      Create listing
                    </Link>
                  }
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {listings.slice(0, 5).map((l) => (
                    <li key={l.listingId} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">{l.categoryName}</p>
                        <p className="text-xs text-slate-500">
                          {l.quantity} {l.unit} · {l.location}
                        </p>
                      </div>
                      <StatusBadge status={l.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Pickup Requests</h2>
                <Link to="/producer/requests" className="text-sm link">
                  View all
                </Link>
              </div>
              {requests.length === 0 ? (
                <EmptyState title="No pickup requests" message="Requests from collectors will appear here." />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {requests.slice(0, 5).map((r) => (
                    <li key={r.requestId} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">{r.listing.categoryName}</p>
                        <p className="text-xs text-slate-500">
                          {r.collector.name} · {formatDate(r.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
