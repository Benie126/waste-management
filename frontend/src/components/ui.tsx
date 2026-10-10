import { ReactNode } from 'react';
import { ListingStatus, PickupStatus, RequestStatus, Role } from '../types';

const LISTING_STYLES: Record<ListingStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  REQUESTED: 'bg-amber-100 text-amber-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  COLLECTED: 'bg-slate-200 text-slate-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const REQUEST_STYLES: Record<RequestStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-200 text-slate-700',
};

const PICKUP_STYLES: Record<PickupStatus, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-700',
};

const VERIFY_STYLES: Record<string, string> = {
  VERIFIED: 'bg-green-100 text-green-800',
  PENDING: 'bg-amber-100 text-amber-800',
  REJECTED: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }: { status: ListingStatus | RequestStatus | PickupStatus }) {
  const style =
    LISTING_STYLES[status as ListingStatus] ??
    REQUEST_STYLES[status as RequestStatus] ??
    PICKUP_STYLES[status as PickupStatus] ??
    'bg-slate-100 text-slate-700';
  return <span className={`badge ${style}`}>{status.replace('_', ' ')}</span>;
}

export function VerifyBadge({ status }: { status: string }) {
  return <span className={`badge ${VERIFY_STYLES[status] ?? 'bg-slate-100 text-slate-700'}`}>{status}</span>;
}

export function RoleBadge({ role }: { role: Role }) {
  const styles: Record<Role, string> = {
    WASTE_PRODUCER: 'bg-emerald-100 text-emerald-800',
    COLLECTOR: 'bg-blue-100 text-blue-800',
    RECYCLING_ORGANIZATION: 'bg-purple-100 text-purple-800',
    ADMIN: 'bg-slate-800 text-white',
  };
  return <span className={`badge ${styles[role]}`}>{role.replace(/_/g, ' ')}</span>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = 'brand',
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: 'brand' | 'amber' | 'blue' | 'slate';
}) {
  const accents = {
    brand: 'text-brand-700',
    amber: 'text-amber-600',
    blue: 'text-blue-600',
    slate: 'text-slate-700',
  };
  return (
    <div className="card">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accents[accent]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function Alert({
  type = 'info',
  children,
  onClose,
}: {
  type?: 'info' | 'success' | 'error' | 'warning';
  children: ReactNode;
  onClose?: () => void;
}) {
  const styles = {
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    success: 'border-green-200 bg-green-50 text-green-800',
    error: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
  };
  return (
    <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${styles[type]}`}>
      <div>{children}</div>
      {onClose && (
        <button onClick={onClose} className="font-bold opacity-60 hover:opacity-100" aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}

export function Spinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {message && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  busy,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500" aria-label={`${rating} out of 5`}>
      {'★'.repeat(rating)}
      <span className="text-slate-300">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
