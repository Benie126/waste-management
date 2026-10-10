import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collectorApi, listingApi, pickupApi, apiErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { CollectorProfile, Listing, PickupRequest } from '../../types';
import {
  Alert,
  EmptyState,
  PageHeader,
  Spinner,
  StatCard,
  StatusBadge,
  VerifyBadge,
  formatDate,
} from '../../components/ui';

export default function CollectorDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CollectorProfile | null>(null);
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [available, setAvailable] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [p, r, a] = await Promise.all([
          collectorApi.me(),
          pickupApi.forCollector(),
          listingApi.available(),
        ]);
        if (!active) return;
        setProfile(p.data.data as CollectorProfile);
        setRequests(r.data.data as PickupRequest[]);
        setAvailable(a.data.data as Listing[]);
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

  if (loading) return <Spinner />;

  const accepted = requests.filter((r) => r.status === 'ACCEPTED').length;
  const completed = requests.filter((r) => r.pickup?.status === 'COMPLETED').length;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0] ?? ''}`}
        subtitle="Find recyclable waste and manage your collections."
        actions={
          <Link to="/collector/available" className="btn-primary">
            Browse Available Waste
          </Link>
        }
      />

      {error && <Alert type="error">{error}</Alert>}

      {profile?.verificationStatus !== 'VERIFIED' && (
        <Alert type="warning">
          <strong>Verification required.</strong> An administrator must verify your collector account
          before you can request pickups. Keep your profile and accepted materials up to date.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Available Listings" value={available.length} hint="open for requests" />
        <StatCard label="My Requests" value={requests.length} hint={`${accepted} accepted`} accent="amber" />
        <StatCard label="Completed Collections" value={completed} accent="blue" />
        <StatCard label="Service Area" value={profile?.serviceArea || '—'} accent="slate" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="font-semibold text-slate-900">Collector profile</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Verification</span>
              {profile && <VerifyBadge status={profile.verificationStatus} />}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Availability</span>
              <span className="font-medium text-slate-800">{profile?.availability}</span>
            </div>
            <div>
              <span className="text-slate-500">Accepted materials</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {profile?.acceptedMaterials.length ? (
                  profile.acceptedMaterials.map((m) => (
                    <span key={m} className="badge bg-brand-50 text-brand-700">
                      {m}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400">None set — update your profile</span>
                )}
              </div>
            </div>
          </div>
          <Link to="/profile" className="btn-secondary mt-4 w-full">
            Update profile
          </Link>
        </div>

        <div className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent available waste</h2>
            <Link to="/collector/available" className="text-sm link">
              View all
            </Link>
          </div>
          {available.length === 0 ? (
            <EmptyState title="No available waste right now" message="Check back later for new listings." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {available.slice(0, 6).map((l) => (
                <li key={l.listingId} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{l.categoryName}</p>
                    <p className="text-xs text-slate-500">
                      {l.quantity} {l.unit} · {l.location} · {formatDate(l.createdAt)}
                    </p>
                  </div>
                  <Link to={`/collector/waste/${l.listingId}`} className="btn-secondary btn-sm">
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">My recent requests</h2>
          <Link to="/collector/requests" className="text-sm link">
            View all
          </Link>
        </div>
        {requests.length === 0 ? (
          <EmptyState title="No pickup requests yet" message="Request a listing to get started." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Request</th>
                  <th>Collection</th>
                  <th>Requested</th>
                </tr>
              </thead>
              <tbody>
                {requests.slice(0, 5).map((r) => (
                  <tr key={r.requestId}>
                    <td className="font-medium text-slate-800">{r.listing.categoryName}</td>
                    <td>{r.listing.location}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>{r.pickup ? <StatusBadge status={r.pickup.status} /> : '—'}</td>
                    <td className="text-slate-500">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
