import { useEffect, useState } from 'react';
import { pickupApi, apiErrorMessage } from '../../api/client';
import { Feedback, PickupRequest } from '../../types';
import {
  Alert,
  EmptyState,
  PageHeader,
  Spinner,
  Stars,
  StatusBadge,
  formatDate,
} from '../../components/ui';

export default function CollectionHistoryPage() {
  const [history, setHistory] = useState<PickupRequest[]>([]);
  const [feedbackByPickup, setFeedbackByPickup] = useState<Record<number, Feedback[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [openFor, setOpenFor] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await pickupApi.history();
      const rows = res.data.data as PickupRequest[];
      setHistory(rows);

      // Load existing feedback for completed pickups.
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
      setFeedbackByPickup(Object.fromEntries(entries));
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

  const submitFeedback = async (pickupId: number) => {
    setBusy(true);
    setError('');
    try {
      await pickupApi.feedback({ pickupId, rating, comment: comment.trim() || undefined });
      setMessage('Thank you — your feedback was recorded.');
      setOpenFor(null);
      setComment('');
      setRating(5);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const completed = history.filter((r) => r.pickup?.status === 'COMPLETED');

  return (
    <div>
      <PageHeader title="Collection History" subtitle="Completed and past collections of your waste." />

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

      {loading ? (
        <Spinner />
      ) : history.length === 0 ? (
        <EmptyState
          title="No collections yet"
          message="Once a collector completes a pickup, it will appear in your collection history."
        />
      ) : (
        <div className="space-y-4">
          {history.map((r) => {
            const pickupId = r.pickup!.pickupId;
            const feedback = feedbackByPickup[pickupId] ?? [];
            const hasFeedback = feedback.some((f) => f.userId === r.listing.producerId) || feedback.length > 0;
            return (
              <div key={r.requestId} className="card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{r.listing.categoryName}</h3>
                      <StatusBadge status={r.pickup!.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {r.listing.quantity} {r.listing.unit} · {r.listing.location}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">Collected by {r.collector.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Scheduled {formatDate(r.pickup!.scheduledDate)}
                      {r.pickup!.completedAt ? ` · Completed ${formatDate(r.pickup!.completedAt)}` : ''}
                    </p>
                  </div>

                  {r.pickup!.status === 'COMPLETED' && (
                    <div className="shrink-0">
                      {hasFeedback ? (
                        <div className="text-right">
                          <Stars rating={feedback[0]?.rating ?? 5} />
                          <p className="mt-1 text-xs text-slate-500">Feedback submitted</p>
                        </div>
                      ) : (
                        <button className="btn-primary btn-sm" onClick={() => setOpenFor(pickupId)}>
                          Give feedback
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {openFor === pickupId && (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <label className="label" htmlFor={`rating-${pickupId}`}>
                      Rating
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id={`rating-${pickupId}`}
                        type="range"
                        min={1}
                        max={5}
                        value={rating}
                        onChange={(e) => setRating(Number(e.target.value))}
                        className="w-40"
                      />
                      <Stars rating={rating} />
                    </div>
                    <div className="mt-3">
                      <label className="label" htmlFor={`comment-${pickupId}`}>
                        Comment (optional)
                      </label>
                      <textarea
                        id={`comment-${pickupId}`}
                        className="input min-h-[72px]"
                        maxLength={500}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="How was the collection experience?"
                      />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        className="btn-primary btn-sm"
                        disabled={busy}
                        onClick={() => void submitFeedback(pickupId)}
                      >
                        {busy ? 'Submitting...' : 'Submit feedback'}
                      </button>
                      <button className="btn-secondary btn-sm" onClick={() => setOpenFor(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {feedback.length > 0 && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Feedback</p>
                    {feedback.map((f) => (
                      <p key={f.feedbackId} className="mt-1 text-sm text-slate-700">
                        <Stars rating={f.rating} /> {f.comment && <span>— {f.comment}</span>}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {completed.length === 0 && (
            <p className="text-sm text-slate-500">No completed collections yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
