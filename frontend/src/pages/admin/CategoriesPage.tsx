import { FormEvent, useEffect, useState } from 'react';
import { adminApi, apiErrorMessage } from '../../api/client';
import { Category } from '../../types';
import { Alert, ConfirmDialog, EmptyState, PageHeader, Spinner } from '../../components/ui';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ categoryName: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.categories();
      setCategories(res.data.data as Category[]);
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

  const reset = () => {
    setEditing(null);
    setForm({ categoryName: '', description: '' });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        categoryName: form.categoryName.trim(),
        description: form.description.trim() || undefined,
      };
      if (editing) {
        await adminApi.updateCategory(editing.categoryId, payload);
        setMessage(`Category "${payload.categoryName}" updated.`);
      } else {
        await adminApi.createCategory(payload);
        setMessage(`Category "${payload.categoryName}" created.`);
      }
      reset();
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await adminApi.deleteCategory(confirmDelete.categoryId);
      setMessage(`Category "${confirmDelete.categoryName}" deleted.`);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Waste Categories" subtitle="Manage the recyclable waste categories." />

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
        <div className="card lg:col-span-1">
          <h2 className="font-semibold text-slate-900">
            {editing ? `Edit "${editing.categoryName}"` : 'Add category'}
          </h2>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <div>
              <label className="label" htmlFor="categoryName">
                Category name
              </label>
              <input
                id="categoryName"
                className="input"
                required
                value={form.categoryName}
                onChange={(e) => setForm((f) => ({ ...f, categoryName: e.target.value }))}
                placeholder="e.g. Textiles"
              />
            </div>
            <div>
              <label className="label" htmlFor="description">
                Description (optional)
              </label>
              <input
                id="description"
                className="input"
                maxLength={255}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1" disabled={busy}>
                {busy ? 'Saving...' : editing ? 'Save changes' : 'Add category'}
              </button>
              {editing && (
                <button type="button" className="btn-secondary" onClick={reset}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="lg:col-span-2">
          {loading ? (
            <Spinner />
          ) : categories.length === 0 ? (
            <EmptyState title="No categories yet" message="Add a waste category to get started." />
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Description</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.categoryId}>
                        <td className="text-slate-500">{c.categoryId}</td>
                        <td className="font-medium text-slate-800">{c.categoryName}</td>
                        <td className="text-slate-500">{c.description ?? '—'}</td>
                        <td className="text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              className="btn-secondary btn-sm"
                              onClick={() => {
                                setEditing(c);
                                setForm({ categoryName: c.categoryName, description: c.description ?? '' });
                              }}
                            >
                              Edit
                            </button>
                            <button className="btn-danger btn-sm" onClick={() => setConfirmDelete(c)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete category?"
        message={`Delete "${confirmDelete?.categoryName}"? Categories used by existing listings cannot be deleted.`}
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
