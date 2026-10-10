import { useEffect, useState } from 'react';
import { adminApi, apiErrorMessage } from '../../api/client';
import { CollectorProfile } from '../../types';
import {
  Alert,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Spinner,
  VerifyBadge,
  formatDate,
} from '../../components/ui';

export default function CollectorVerificationPage() {
  const [collectors, setCollectors] = useState<CollectorProfile[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('PENDING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState<{ collector: CollectorProfile; status: 'VERIFIED' | 'REJECTED' } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filter !== 'ALL') params.status = filter;
      const res = await adminApi.collectors(params);
      setCollectors(res.data.data as CollectorProfile[]);
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await adminApi.verifyCollector(confirm.collector.userId, confirm.status);
      setMessage(`${confirm.collector.name} has been ${confirm.status.toLowerCase()}.`);
      setConfirm(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Collector Verification"
        subtitle="Verify collectors so they can request protected pickup operations."
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
        {(['ALL', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map((f) => (
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
      ) : collectors.length === 0 ? (
        <EmptyState title="No collectors found" message="There are no collectors with this status." />
      ) : (
        <div className="space-y-4">
          {collectors.map((c) => (
            <div key={c.collectorId} className="card">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{c.name}</h3>
                    <VerifyBadge status={c.verificationStatus} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{c.email}</p>
                  <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="inline text-slate-500">Service area: </dt>
                      <dd className="inline font-medium text-slate-800">{c.serviceArea || '—'}</dd>
                    </div>
                    <div>
                      <dt className="inline text-slate-500">Availability: </dt>
                      <dd className="inline font-medium text-slate-800">{c.availability}</dd>
                    </div>
                    <div>
                      <dt className="inline text-slate-500">Vehicle: </dt>
                      <dd className="inline font-medium text-slate-800">{c.vehicleType ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="inline text-slate-500">Registered: </dt>
                      <dd className="inline font-medium text-slate-800">{formatDate(c.verifiedAt) === '—' ? '—' : formatDate(c.verifiedAt)}</dd>
                    </div>
                  </dl>
                  <div className="mt-2">
                    <span className="text-sm text-slate-500">Accepted materials: </span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {c.acceptedMaterials.length ? (
                        c.acceptedMaterials.map((m) => (
                          <span key={m} className="badge bg-brand-50 text-brand-700">
                            {m}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-400">none set</span>
                      )}
                    </span>
                  </div>
                  {c.bio && <p className="mt-2 text-sm italic text-slate-500">{c.bio}</p>}
                </div>

                <div className="flex shrink-0 gap-2">
                  {c.verificationStatus !== 'VERIFIED' && (
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => setConfirm({ collector: c, status: 'VERIFIED' })}
                    >
                      Verify
                    </button>
                  )}
                  {c.verificationStatus !== 'REJECTED' && (
                    <button
                      className="btn-danger btn-sm"
                      onClick={() => setConfirm({ collector: c, status: 'REJECTED' })}
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.status === 'VERIFIED' ? 'Verify collector?' : 'Reject collector?'}
        message={
          confirm?.status === 'VERIFIED'
            ? `${confirm?.collector.name} will be able to request pickups.`
            : `${confirm?.collector.name} will not be able to request pickups.`
        }
        confirmLabel={confirm?.status === 'VERIFIED' ? 'Verify' : 'Reject'}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void runConfirm()}
      />
    </div>
  );
}
