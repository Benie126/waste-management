import { useEffect, useState } from 'react';
import { adminApi, apiErrorMessage } from '../../api/client';
import { PickupRequest } from '../../types';
import { Alert, EmptyState, PageHeader, Spinner, StatusBadge, formatDate } from '../../components/ui';

export default function AdminPickupsPage() {
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await adminApi.pickups();
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

  return (
    <div>
      <PageHeader title="Pickup Activities" subtitle="All pickup requests and their collection status." />

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <Spinner />
      ) : requests.length === 0 ? (
        <EmptyState title="No pickup activity yet" message="Pickup requests will appear here." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Category</th>
                  <th>Producer</th>
                  <th>Collector</th>
                  <th>Request</th>
                  <th>Collection</th>
                  <th>Scheduled</th>
                  <th>Requested</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.requestId}>
                    <td className="text-slate-500">#{r.requestId}</td>
                    <td className="font-medium text-slate-800">{r.listing.categoryName}</td>
                    <td>{r.listing.producerName}</td>
                    <td>{r.collector.name}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>{r.pickup ? <StatusBadge status={r.pickup.status} /> : '—'}</td>
                    <td className="text-slate-500">{r.pickup ? formatDate(r.pickup.scheduledDate) : '—'}</td>
                    <td className="text-slate-500">{formatDate(r.createdAt)}</td>
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
