import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pickupApi, apiErrorMessage } from '../../api/client';
import { Feedback, PickupRequest } from '../../types';
import {
  Alert,
  EmptyState,
  PageHeader,
  Spinner,
  Stars,
  StatusBadge,
  StatCard,
  formatDate,
} from '../../components/ui';

export default function CollectorCollectionsPage() {
  const [history, setHistory] = useState<PickupRequest[]>([]);
  const [feedbackByPickup, setFeedbackByPickup] = useState<Record<number, Feedback[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await pickupApi.history();
        const rows = res.data.data as PickupRequest[];
        if (!active) return;
        setHistory(rows);

        const completed = rows.filter((r) => r.pickup?.status === 'COMPLETED');
        const entries = await Promise.all(
          completed.map(async (r) => {
            try {
              const f = await pickupApi.feedbackFor(r.pickup!.pickupId);
              return [r.pickup!.pickupId, f.data.data as Feedback[]] as const;
            } catch {
              return [r.pickup!.pickupId, []] as const;
            }
          })
        );
        if (active) setFeedbackByPickup(Object.fromEntries(entries));
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

  const completed = history.filter((r) => r.pickup?.status === 'COMPLETED');
  const inProgress = history.filter((r) => r.pickup?.status === 'IN_PROGRESS');
  const scheduled = history.filter((r) => r.pickup?.status === 'SCHEDULED');

  const ratings = completed
    .map((r) => feedbackByPickup[r.pickup!.pickupId]?.[0]?.rating)
    .filter((r): r is number => typeof r === 'number');
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '—';

  return (
    <div>
      <PageHeader title="Collections" subtitle="Your scheduled, in-progress and completed collections." />

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Scheduled" value={scheduled.length} accent="blue" />
            <StatCard label="In progress" value={inProgress.length} accent="amber" />
            <StatCard label="Completed" value={completed.length} />
            <StatCard label="Average rating" value={avgRating} accent="slate" />
          </div>

          <div className="mt-6">
            {history.length === 0 ? (
              <EmptyState
                title="No collections yet"
                message="Once a producer schedules an accepted pickup, it will appear here."
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
                        <th>Producer</th>
                        <th>Location</th>
                        <th>Scheduled</th>
                        <th>Status</th>
                        <th>Rating</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((r) => {
                        const fb = feedbackByPickup[r.pickup!.pickupId] ?? [];
                        return (
                          <tr key={r.requestId}>
                            <td className="font-medium text-slate-800">{r.listing.categoryName}</td>
                            <td>{r.listing.producerName}</td>
                            <td>{r.listing.location}</td>
                            <td className="text-slate-500">{formatDate(r.pickup!.scheduledDate)}</td>
                            <td>
                              <StatusBadge status={r.pickup!.status} />
                            </td>
                            <td>{fb.length ? <Stars rating={fb[0].rating} /> : '—'}</td>
                            <td className="text-right">
                              <Link to={`/collector/requests/${r.requestId}`} className="btn-secondary btn-sm">
                                Details
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
