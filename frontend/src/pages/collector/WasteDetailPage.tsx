import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { collectorApi, listingApi, pickupApi, apiErrorMessage } from '../../api/client';
import { CollectorProfile, Listing } from '../../types';
import { Alert, PageHeader, Spinner, StatusBadge, formatDate } from '../../components/ui';

export default function WasteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [profile, setProfile] = useState<CollectorProfile | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [l, p] = await Promise.all([listingApi.get(Number(id)), collectorApi.me()]);
        if (!active) return;
        setListing(l.data.data as Listing);
        setProfile(p.data.data as CollectorProfile);
      } catch (err) {
        if (active) setError(apiErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const requestPickup = async (e: FormEvent) => {
    e.preventDefault();
    if (!listing) return;
    setBusy(true);
    setError('');
    try {
      await pickupApi.create({ listingId: listing.listingId, message: message.trim() || undefined });
      setSuccess('Pickup request sent. The producer will review it shortly.');
      setTimeout(() => navigate('/collector/requests'), 1200);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;
  if (error && !listing) return <Alert type="error">{error}</Alert>;
  if (!listing) return <Alert type="error">Listing not found.</Alert>;

  const verified = profile?.verificationStatus === 'VERIFIED';
  const open = ['AVAILABLE', 'REQUESTED'].includes(listing.status);

  return (
    <div>
      <PageHeader
        title={listing.categoryName}
        subtitle={`${listing.quantity} ${listing.unit} · ${listing.location}`}
        actions={
          <Link to="/collector/available" className="btn-secondary">
            Back to available waste
          </Link>
        }
      />

      {error && (
        <Alert type="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && <Alert type="success">{success}</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-slate-900">Waste details</h2>
            <StatusBadge status={listing.status} />
          </div>
          <dl className="mt-4 divide-y divide-slate-100">
            <Row label="Category" value={listing.categoryName} />
            <Row label="Quantity" value={`${listing.quantity} ${listing.unit}`} />
            <Row label="Location" value={listing.location} />
            <Row label="Posted by" value={`${listing.producerName} (${listing.producerEmail})`} />
            <Row label="Posted on" value={formatDate(listing.createdAt)} />
          </dl>
          {listing.description && (
            <div className="mt-4 rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Description</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{listing.description}</p>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-900">Request this pickup</h2>

          {!verified && (
            <Alert type="warning">
              Your collector account is <strong>{profile?.verificationStatus}</strong>. You must be
              verified by an administrator before requesting pickups.
            </Alert>
          )}

          {!open && (
            <Alert type="info">
              This listing is no longer open for new requests (status: {listing.status}).
            </Alert>
          )}

          <form onSubmit={requestPickup} className="mt-3 space-y-3">
            <div>
              <label className="label" htmlFor="message">
                Message to producer (optional)
              </label>
              <textarea
                id="message"
                className="input min-h-[96px]"
                maxLength={500}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="When can you collect? Any special equipment?"
                disabled={!verified || !open}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={busy || !verified || !open}>
              {busy ? 'Sending request...' : 'Request pickup'}
            </button>
          </form>

          {profile && (
            <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <p>
                Your service area: <span className="font-medium text-slate-700">{profile.serviceArea || 'not set'}</span>
              </p>
              <p className="mt-1">
                Accepts:{' '}
                <span className="font-medium text-slate-700">
                  {profile.acceptedMaterials.join(', ') || 'none set'}
                </span>
              </p>
            </div>
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
