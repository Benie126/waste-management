import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pickupApi, apiErrorMessage } from '../../api/client';
import { PickupRequest, RequestStatus } from '../../types';
import { Alert, EmptyState, PageHeader, Spinner, StatusBadge, formatDate } from '../../components/ui';

const FILTERS: (RequestStatus | 'ALL')[] = ['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'];

export default function CollectorRequestsPage() {
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [filter, setFilter] = useState<RequestStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await pickupApi.forCollector();
        if (active) setRequests(res.data.data as PickupRequest[]);
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

  const shown = filter === 'ALL' ? requests : requests.filter((r) => r.status === filter);

  return (
    <div>
      <PageHeader title="My Pickup Requests" subtitle="Requests you have sent to waste producers." />

      {error && <Alert type="error">{error}</Alert>}

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`badge border px-3 py-1 ${
              filter === f ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : shown.length === 0 ? (
        <EmptyState
          title="No pickup requests"
          message="Browse available waste and request a listing to get started."
          action={
            <Link to="/collector/available" className="btn-primary">
              Browse available waste
            </Link>
          }
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
                  <th>Request</th>
                  <th>Collection</th>
                  <th>Scheduled</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.requestId}>
                    <td className="font-medium text-slate-800">{r.listing.categoryName}</td>
                    <td>
                      {r.listing.quantity} {r.listing.unit}
                    </td>
                    <td>{r.listing.location}</td>
                    <td>{r.listing.producerName}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>{r.pickup ? <StatusBadge status={r.pickup.status} /> : '—'}</td>
                    <td className="text-slate-500">
                      {r.pickup ? formatDate(r.pickup.scheduledDate) : '—'}
                    </td>
                    <td className="text-right">
                      <Link to={`/collector/requests/${r.requestId}`} className="btn-secondary btn-sm">
                        Details
                      </Link>
                    </td>
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
