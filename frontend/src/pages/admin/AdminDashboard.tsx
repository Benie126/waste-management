import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, apiErrorMessage } from '../../api/client';
import { AdminStats } from '../../types';
import { Alert, PageHeader, Spinner, StatCard } from '../../components/ui';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await adminApi.stats();
        if (active) setStats(res.data.data as AdminStats);
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

  const byRole = stats?.users.byRole ?? {};
  const listingStatus = stats?.listings.byStatus ?? {};
  const requestStatus = stats?.pickupRequests.byStatus ?? {};
  const pickupStatus = stats?.pickups.byStatus ?? {};

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="System statistics and platform activity."
        actions={
          <Link to="/admin/collectors" className="btn-primary">
            Verify collectors
            {stats && stats.collectors.pending > 0 ? ` (${stats.collectors.pending})` : ''}
          </Link>
        }
      />

      {error && <Alert type="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={stats?.users.total ?? 0} />
        <StatCard label="Waste listings" value={stats?.listings.total ?? 0} accent="blue" />
        <StatCard label="Collectors verified" value={`${stats?.collectors.verified ?? 0}/${stats?.collectors.total ?? 0}`} />
        <StatCard label="Pending verifications" value={stats?.collectors.pending ?? 0} accent="amber" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold text-slate-900">Users by role</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {['WASTE_PRODUCER', 'COLLECTOR', 'RECYCLING_ORGANIZATION', 'ADMIN'].map((role) => (
              <li key={role} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-slate-600">{role.replace(/_/g, ' ')}</span>
                <span className="font-semibold text-slate-900">{byRole[role] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-900">Listings by status</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {['AVAILABLE', 'REQUESTED', 'SCHEDULED', 'COLLECTED', 'CANCELLED'].map((status) => (
              <li key={status} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-slate-600">{status.replace('_', ' ')}</span>
                <span className="font-semibold text-slate-900">{listingStatus[status] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-900">Pickup requests</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {['PENDING', 'ACCEPTED', 'REJECTED'].map((status) => (
              <li key={status} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-slate-600">{status}</span>
                <span className="font-semibold text-slate-900">{requestStatus[status] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-900">Pickups</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((status) => (
              <li key={status} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-slate-600">{status.replace('_', ' ')}</span>
                <span className="font-semibold text-slate-900">{pickupStatus[status] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/admin/users" className="btn-secondary">
          Manage users
        </Link>
        <Link to="/admin/categories" className="btn-secondary">
          Waste categories
        </Link>
        <Link to="/admin/listings" className="btn-secondary">
          View listings
        </Link>
        <Link to="/admin/pickups" className="btn-secondary">
          Pickup activities
        </Link>
        <Link to="/admin/activities" className="btn-secondary">
          System activities
        </Link>
      </div>
    </div>
  );
}
