import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { pickupApi, apiErrorMessage } from '../../api/client';
import { PickupRequest } from '../../types';
import { Alert, PageHeader, Spinner, StatusBadge, formatDate } from '../../components/ui';

export default function CollectorRequestDetailPage() {
  const { id } = useParams();
  const [request, setRequest] = useState<PickupRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
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

  const update = async (status: 'IN_PROGRESS' | 'COMPLETED') => {
    if (!request) return;
    setBusy(true);
    setError('');
    try {
      await pickupApi.updateStatus(request.requestId, status);
      setMessage(
        status === 'COMPLETED'
          ? 'Collection marked as completed. The producer has been notified.'
          : 'Collection marked as in progress.'
      );
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;
  if (error && !request) return <Alert type="error">{error}</Alert>;
  if (!request) return <Alert type="error">Request not found.</Alert>;

  const pickup = request.pickup;

  return (
    <div>
      <PageHeader
        title={`Request #${request.requestId}`}
        subtitle={`${request.listing.categoryName} · ${request.listing.quantity} ${request.listing.unit} · ${request.listing.location}`}
        actions={
          <Link to="/collector/requests" className="btn-secondary">
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">Request:</span>
            <StatusBadge status={request.status} />
            {pickup && (
              <>
                <span className="ml-2 text-sm text-slate-500">Collection:</span>
                <StatusBadge status={pickup.status} />
              </>
            )}
          </div>

          <dl className="mt-5 divide-y divide-slate-100">
            <Row label="Category" value={request.listing.categoryName} />
            <Row label="Quantity" value={`${request.listing.quantity} ${request.listing.unit}`} />
            <Row label="Location" value={request.listing.location} />
            <Row label="Producer" value={`${request.listing.producerName} (${request.listing.producerEmail})`} />
            <Row label="Requested on" value={formatDate(request.createdAt)} />
            {pickup && <Row label="Scheduled for" value={formatDate(pickup.scheduledDate)} />}
            {pickup?.completedAt && <Row label="Completed at" value={formatDate(pickup.completedAt)} />}
          </dl>

          {request.message && (
            <div className="mt-4 rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Your message</p>
              <p className="mt-1 text-sm text-slate-700">{request.message}</p>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-900">Collection progress</h2>

          {request.status === 'PENDING' && (
            <p className="mt-2 text-sm text-slate-600">
              Waiting for the producer to accept your request.
            </p>
          )}
          {request.status === 'REJECTED' && (
            <p className="mt-2 text-sm text-slate-600">
              This request was rejected. You can request other listings.
            </p>
          )}
          {request.status === 'ACCEPTED' && !pickup && (
            <p className="mt-2 text-sm text-slate-600">
              Accepted! Waiting for the producer to schedule the pickup date.
            </p>
          )}

          {pickup && (
            <div className="mt-4 space-y-3">
              {pickup.status === 'SCHEDULED' && (
                <button className="btn-primary w-full" disabled={busy} onClick={() => void update('IN_PROGRESS')}>
                  {busy ? 'Updating...' : 'Start collection'}
                </button>
              )}
              {pickup.status === 'IN_PROGRESS' && (
                <button className="btn-primary w-full" disabled={busy} onClick={() => void update('COMPLETED')}>
                  {busy ? 'Updating...' : 'Mark as collected'}
                </button>
              )}
              {pickup.status === 'COMPLETED' && (
                <Alert type="success">This collection is complete. Thank you!</Alert>
              )}
              {pickup.status === 'CANCELLED' && <Alert type="warning">This pickup was cancelled.</Alert>}
            </div>
          )}

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-700">Status flow</h3>
            <ol className="mt-2 space-y-1 text-xs text-slate-500">
              <li>1. Request sent (PENDING)</li>
              <li>2. Producer accepts (ACCEPTED)</li>
              <li>3. Producer schedules (SCHEDULED)</li>
              <li>4. You start collection (IN_PROGRESS)</li>
              <li>5. You mark collected (COMPLETED)</li>
            </ol>
          </div>
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
