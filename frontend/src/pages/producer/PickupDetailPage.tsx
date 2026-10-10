import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { pickupApi, apiErrorMessage } from '../../api/client';
import { PickupRequest } from '../../types';
import { Alert, PageHeader, Spinner, StatusBadge, formatDate } from '../../components/ui';

export default function PickupDetailPage() {
  const { id } = useParams();
  const [request, setRequest] = useState<PickupRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await pickupApi.get(Number(id));
      setRequest(res.data.data as PickupRequest);
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
  }, [id]);

  const onSchedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!request) return;
    setBusy(true);
    setError('');
    try {
      await pickupApi.schedule(request.requestId, {
        scheduledDate: new Date(scheduledDate).toISOString(),
        notes: notes.trim() || undefined,
      });
      setMessage('Pickup scheduled. The collector has been notified.');
      setScheduledDate('');
      setNotes('');
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;
  if (error && !request) return <Alert type="error">{error}</Alert>;
  if (!request) return <Alert type="error">Pickup request not found.</Alert>;

  return (
    <div>
      <PageHeader
        title={`Pickup Request #${request.requestId}`}
        subtitle={`${request.listing.categoryName} · ${request.listing.quantity} ${request.listing.unit} · ${request.listing.location}`}
        actions={
          <Link to="/producer/requests" className="btn-secondary">
            Back to requests
          </Link>
        }
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-slate-900">Request status</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">Request:</span>
            <StatusBadge status={request.status} />
            {request.pickup && (
              <>
                <span className="ml-2 text-sm text-slate-500">Collection:</span>
                <StatusBadge status={request.pickup.status} />
              </>
            )}
          </div>

          <dl className="mt-5 divide-y divide-slate-100">
            <Row label="Waste category" value={request.listing.categoryName} />
            <Row label="Quantity" value={`${request.listing.quantity} ${request.listing.unit}`} />
            <Row label="Location" value={request.listing.location} />
            <Row label="Collector" value={`${request.collector.name} (${request.collector.email})`} />
            <Row label="Requested on" value={formatDate(request.createdAt)} />
            {request.pickup && (
              <>
                <Row label="Scheduled date" value={formatDate(request.pickup.scheduledDate)} />
                <Row label="Completed at" value={formatDate(request.pickup.completedAt)} />
              </>
            )}
          </dl>

          {request.message && (
            <div className="mt-4 rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Collector message</p>
              <p className="mt-1 text-sm text-slate-700">{request.message}</p>
            </div>
          )}

          {request.pickup && request.pickup.status === 'COMPLETED' && (
            <div className="mt-4">
              <Link to="/producer/history" className="btn-primary">
                Leave feedback in collection history
              </Link>
            </div>
          )}
        </div>

        <div className="card">
          {request.status === 'ACCEPTED' && !request.pickup ? (
            <>
              <h2 className="font-semibold text-slate-900">Schedule this pickup</h2>
              <p className="mt-1 text-sm text-slate-500">Choose a date and time for the collection.</p>
              <form onSubmit={onSchedule} className="mt-4 space-y-3">
                <div>
                  <label className="label" htmlFor="scheduledDate">
                    Scheduled date &amp; time
                  </label>
                  <input
                    id="scheduledDate"
                    type="datetime-local"
                    className="input"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="notes">
                    Notes (optional)
                  </label>
                  <textarea
                    id="notes"
                    className="input min-h-[72px]"
                    maxLength={500}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Access instructions, gate code..."
                  />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={busy}>
                  {busy ? 'Scheduling...' : 'Schedule pickup'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="font-semibold text-slate-900">Next steps</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {request.status === 'PENDING' && <li>Review and accept or reject this request.</li>}
                {request.status === 'ACCEPTED' && request.pickup && <li>Waiting for the collector to update the collection status.</li>}
                {request.status === 'REJECTED' && <li>This request was rejected.</li>}
                {request.pickup?.status === 'COMPLETED' && <li>Collection completed — leave feedback in history.</li>}
                {request.pickup?.status === 'IN_PROGRESS' && <li>The collector is on the way / collecting now.</li>}
              </ul>
              {request.status === 'PENDING' && (
                <Link to="/producer/requests" className="btn-secondary mt-4 w-full">
                  Go to requests
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}
