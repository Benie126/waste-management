import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collectorApi, apiErrorMessage } from '../../api/client';
import { Listing } from '../../types';
import { Alert, EmptyState, PageHeader, Spinner, StatusBadge, formatDate } from '../../components/ui';

export default function RecommendedPage() {
  const [matches, setMatches] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await collectorApi.recommendations();
        if (active) setMatches(res.data.data as Listing[]);
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
        title="Recommended Waste"
        subtitle="Listings matched to your accepted materials and service area."
      />

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <Spinner />
      ) : matches.length === 0 ? (
        <EmptyState
          title="No recommendations right now"
          message="Set your accepted materials and service area in your profile to receive matches."
          action={
            <Link to="/profile" className="btn-primary">
              Update profile
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((l) => (
            <div key={l.listingId} className="card flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900">{l.categoryName}</h3>
                <StatusBadge status={l.status} />
              </div>
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-medium text-slate-800">
                  {l.quantity} {l.unit}
                </span>{' '}
                · {l.location}
              </p>
              {typeof l.score === 'number' && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Match score</span>
                    <span className="font-semibold text-brand-700">{l.score}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${Math.min(100, l.score)}%` }}
                    />
                  </div>
                  {l.reasons && (
                    <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                      {l.reasons.map((r) => (
                        <li key={r}>• {r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <p className="mt-2 text-xs text-slate-400">{formatDate(l.createdAt)}</p>
              <div className="mt-auto pt-4">
                <Link to={`/collector/waste/${l.listingId}`} className="btn-primary w-full">
                  View details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
