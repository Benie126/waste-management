import { useEffect, useState } from 'react';
import { adminApi, apiErrorMessage } from '../../api/client';
import { ActivityLog } from '../../types';
import { Alert, EmptyState, PageHeader, Spinner, formatDate } from '../../components/ui';

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await adminApi.activities(200);
        if (active) setActivities(res.data.data as ActivityLog[]);
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
        title="System Activities"
        subtitle="Event log stored in MongoDB (registrations, listings, pickups, admin actions)."
      />

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <Spinner />
      ) : activities.length === 0 ? (
        <EmptyState
          title="No activity recorded"
          message="System activity is stored in MongoDB. Ensure MongoDB is running and events have occurred."
        />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Description</th>
                  <th>Actor</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a._id}>
                    <td>
                      <span className="badge bg-slate-100 text-slate-700">{a.action}</span>
                    </td>
                    <td className="text-slate-600">
                      {a.entityType}
                      {a.entityId !== null && a.entityId !== undefined ? ` #${a.entityId}` : ''}
                    </td>
                    <td className="text-slate-600">{a.description || '—'}</td>
                    <td className="text-slate-500">
                      {a.actorId ? `${a.actorRole ?? 'USER'} #${a.actorId}` : 'SYSTEM'}
                    </td>
                    <td className="text-slate-500">{formatDate(a.createdAt)}</td>
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
