import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pickupApi, apiErrorMessage } from '../../api/client';
import { PickupRequest, RequestStatus } from '../../types';
import {
  Alert,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Spinner,
  StatusBadge,
  formatDate,
} from '../../components/ui';

const FILTERS: (RequestStatus | 'ALL')[] = ['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'];

export default function PickupRequestsPage() {
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [filter, setFilter] = useState<RequestStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState<{ request: PickupRequest; action: 'accept' | 'reject' } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await pickupApi.forProducer();
      setRequests(res.data.data as PickupRequest[]);
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.action === 'accept') {
        await pickupApi.accept(confirm.request.requestId);
        setMessage(
          `Request from ${confirm.request.collector.name} accepted. You can now schedule the pickup.`
        );
      } else {
        await pickupApi.reject(confirm.request.requestId);
        setMessage(`Request from ${confirm.request.collector.name} rejected.`);
      }
      setConfirm(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const shown = filter === 'ALL' ? requests : requests.filter((r) => r.status === filter);

  return (
    <div>
      <PageHeader
        title="Pickup Requests"
        subtitle="Collectors who want to collect your recyclable waste."
      />

      {error && (
        <Alert type="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert type="success" onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

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
          message="When a collector requests one of your listings, it will appear here."
        />
      ) : (
        <div className="space-y-4">
          {shown.map((r) => (
            <div key={r.requestId} className="card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{r.listing.categoryName}</h3>
                    <StatusBadge status={r.status} />
                    {r.pickup && <StatusBadge status={r.pickup.status} />}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {r.listing.quantity} {r.listing.unit} · {r.listing.location}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    Collector: <span className="font-medium">{r.collector.name}</span> ({r.collector.email})
                  </p>
                  {r.message && (
                    <p className="mt-1 rounded-lg bg-slate-50 p-2 text-sm italic text-slate-600">“{r.message}”</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">Requested {formatDate(r.createdAt)}</p>
                  {r.pickup && (
                    <p className="mt-1 text-xs text-brand-700">
                      Scheduled for {formatDate(r.pickup.scheduledDate)}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {r.status === 'PENDING' && (
                    <>
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => setConfirm({ request: r, action: 'accept' })}
                      >
                        Accept
                      </button>
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => setConfirm({ request: r, action: 'reject' })}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {r.status === 'ACCEPTED' && !r.pickup && (
                    <Link to={`/producer/requests/${r.requestId}`} className="btn-primary btn-sm">
                      Schedule pickup
                    </Link>
                  )}
                  <Link to={`/producer/requests/${r.requestId}`} className="btn-secondary btn-sm">
                    Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === 'accept' ? 'Accept this request?' : 'Reject this request?'}
        message={
          confirm?.action === 'accept'
            ? `Accept ${confirm?.request.collector.name}'s request? Other pending requests for this listing will be automatically rejected.`
            : `Reject ${confirm?.request.collector.name}'s request? They will be notified.`
        }
        confirmLabel={confirm?.action === 'accept' ? 'Accept' : 'Reject'}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void runConfirm()}
      />
    </div>
  );
}
