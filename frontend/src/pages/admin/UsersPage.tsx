import { useEffect, useState } from 'react';
import { adminApi, apiErrorMessage } from '../../api/client';
import { Role, User } from '../../types';
import {
  Alert,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  RoleBadge,
  Spinner,
  formatDateOnly,
} from '../../components/ui';

const ROLES: (Role | '')[] = ['', 'WASTE_PRODUCER', 'COLLECTOR', 'RECYCLING_ORGANIZATION', 'ADMIN'];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<{ role: Role | ''; search: string }>({ role: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.role) params.role = filters.role;
      if (filters.search.trim()) params.search = filters.search.trim();
      const res = await adminApi.users(params);
      setUsers(res.data.data as User[]);
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
  }, [filters.role]);

  const toggleActive = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await adminApi.setUserActive(confirm.userId, !confirm.isActive);
      setMessage(`${confirm.name} has been ${confirm.isActive ? 'deactivated' : 'activated'}.`);
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
      <PageHeader title="Users" subtitle="View and manage all WasteLink accounts." />

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

      <form
        className="card mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="search">
              Search
            </label>
            <input
              id="search"
              className="input"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Name or email"
            />
          </div>
          <div>
            <label className="label" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              className="input"
              value={filters.role}
              onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value as Role | '' }))}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r ? r.replace(/_/g, ' ') : 'All roles'}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full">
              Apply filters
            </button>
          </div>
        </div>
      </form>

      {loading ? (
        <Spinner />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" message="Try a different search or role filter." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.userId}>
                    <td className="font-medium text-slate-800">{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone ?? '—'}</td>
                    <td>
                      <RoleBadge role={u.role} />
                    </td>
                    <td>
                      <span
                        className={`badge ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}
                      >
                        {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="text-slate-500">{formatDateOnly(u.createdAt)}</td>
                    <td className="text-right">
                      {u.role !== 'ADMIN' && (
                        <button
                          className={u.isActive ? 'btn-danger btn-sm' : 'btn-primary btn-sm'}
                          onClick={() => setConfirm(u)}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
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
        title={confirm?.isActive ? 'Deactivate user?' : 'Activate user?'}
        message={
          confirm?.isActive
            ? `${confirm?.name} will no longer be able to log in or use WasteLink.`
            : `${confirm?.name} will regain access to WasteLink.`
        }
        confirmLabel={confirm?.isActive ? 'Deactivate' : 'Activate'}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void toggleActive()}
      />
    </div>
  );
}
