import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listingApi, apiErrorMessage } from '../../api/client';
import { Listing, ListingStatus } from '../../types';
import {
  Alert,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Spinner,
  StatusBadge,
  formatDate,
} from '../../components/ui';

const FILTERS: (ListingStatus | 'ALL')[] = ['ALL', 'AVAILABLE', 'REQUESTED', 'SCHEDULED', 'COLLECTED', 'CANCELLED'];

export default function MyListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filter, setFilter] = useState<ListingStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<{ listing: Listing; action: 'cancel' | 'delete' } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listingApi.mine();
      setListings(res.data.data as Listing[]);
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
      if (confirm.action === 'cancel') await listingApi.cancel(confirm.listing.listingId);
      else await listingApi.remove(confirm.listing.listingId);
      setConfirm(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const shown = filter === 'ALL' ? listings : listings.filter((l) => l.status === filter);

  return (
    <div>
      <PageHeader
        title="My Waste Listings"
        subtitle="Manage the recyclable waste you have posted."
        actions={
          <Link to="/producer/listings/new" className="btn-primary">
            + Add Waste Listing
          </Link>
        }
      />

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
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : shown.length === 0 ? (
        <EmptyState
          title="No listings found"
          message="Create a waste listing so collectors can find and request it."
          action={
            <Link to="/producer/listings/new" className="btn-primary">
              Create listing
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
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((l) => (
                  <tr key={l.listingId}>
                    <td className="font-medium text-slate-800">{l.categoryName}</td>
                    <td>
                      {l.quantity} {l.unit}
                    </td>
                    <td>{l.location}</td>
                    <td>
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="text-slate-500">{formatDate(l.createdAt)}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Link to={`/producer/listings/${l.listingId}`} className="btn-secondary btn-sm">
                          View
                        </Link>
                        {!['COLLECTED', 'CANCELLED'].includes(l.status) && (
                          <>
                            <Link to={`/producer/listings/${l.listingId}/edit`} className="btn-secondary btn-sm">
                              Edit
                            </Link>
                            <button
                              className="btn-secondary btn-sm"
                              onClick={() => setConfirm({ listing: l, action: 'cancel' })}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {l.status === 'CANCELLED' && (
                          <button
                            className="btn-danger btn-sm"
                            onClick={() => setConfirm({ listing: l, action: 'delete' })}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === 'cancel' ? 'Cancel listing?' : 'Delete listing?'}
        message={
          confirm?.action === 'cancel'
            ? 'This listing will be marked as cancelled and hidden from collectors.'
            : 'This permanently deletes the listing. This action cannot be undone.'
        }
        confirmLabel={confirm?.action === 'cancel' ? 'Cancel listing' : 'Delete'}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void runConfirm()}
      />
    </div>
  );
}
