import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { organizationApi, apiErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Listing, OrganizationProfile } from '../../types';
import { Alert, EmptyState, PageHeader, Spinner, StatCard, StatusBadge, formatDate } from '../../components/ui';

interface OrgStats {
  acceptedMaterials: number;
  relevantListings: number;
  availableListings: number;
}

export default function OrganizationDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [p, s, l] = await Promise.all([
          organizationApi.me(),
          organizationApi.stats(),
          organizationApi.listings(),
        ]);
        if (!active) return;
        setProfile(p.data.data as OrganizationProfile);
        setStats(s.data.data as OrgStats);
        setListings(l.data.data as Listing[]);
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

  return (
    <div>
      <PageHeader
        title={profile?.organizationName || `Welcome, ${user?.name ?? ''}`}
        subtitle="Recyclable waste relevant to the materials your organization accepts."
        actions={
          <Link to="/organization/materials" className="btn-primary">
            Manage accepted materials
          </Link>
        }
      />

      {error && <Alert type="error">{error}</Alert>}

      {profile && profile.acceptedMaterials.length === 0 && (
        <Alert type="warning">
          You have not selected any accepted materials yet. Add them so WasteLink can show relevant
          recyclable waste.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Accepted materials" value={stats?.acceptedMaterials ?? 0} />
        <StatCard label="Relevant listings" value={stats?.relevantListings ?? 0} accent="blue" />
        <StatCard label="Available now" value={stats?.availableListings ?? 0} accent="amber" />
      </div>

      <div className="mt-6 card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Relevant recyclable waste</h2>
          <Link to="/organization/listings" className="text-sm link">
            View all
          </Link>
        </div>
        {listings.length === 0 ? (
          <EmptyState
            title="No relevant waste found"
            message="Set the materials your organization accepts to see matching listings."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Location</th>
                  <th>Producer</th>
                  <th>Status</th>
                  <th>Posted</th>
                </tr>
              </thead>
              <tbody>
                {listings.slice(0, 8).map((l) => (
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
                    <td className="text-slate-500">{formatDate(l.createdAt)}</td>
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
