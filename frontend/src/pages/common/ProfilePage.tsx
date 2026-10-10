import { FormEvent, useEffect, useState } from 'react';
import { authApi, categoryApi, collectorApi, organizationApi, apiErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Category, CollectorProfile, OrganizationProfile } from '../../types';
import { Alert, PageHeader, RoleBadge, Spinner, VerifyBadge, formatDate } from '../../components/ui';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', password: '', confirm: '' });
  const [categories, setCategories] = useState<Category[]>([]);
  const [collector, setCollector] = useState<CollectorProfile | null>(null);
  const [collectorForm, setCollectorForm] = useState({
    serviceArea: '',
    availability: 'AVAILABLE' as 'AVAILABLE' | 'UNAVAILABLE',
    acceptedMaterials: [] as string[],
    vehicleType: '',
    bio: '',
  });
  const [org, setOrg] = useState<OrganizationProfile | null>(null);
  const [orgForm, setOrgForm] = useState({ organizationName: '', address: '', acceptedMaterials: [] as string[] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setForm({ name: user.name, phone: user.phone ?? '', password: '', confirm: '' });
      try {
        const catRes = await categoryApi.list();
        if (!active) return;
        setCategories(catRes.data.data as Category[]);

        if (user.role === 'COLLECTOR') {
          const res = await collectorApi.me();
          const p = res.data.data as CollectorProfile;
          if (!active) return;
          setCollector(p);
          setCollectorForm({
            serviceArea: p.serviceArea,
            availability: p.availability,
            acceptedMaterials: p.acceptedMaterials,
            vehicleType: p.vehicleType ?? '',
            bio: p.bio ?? '',
          });
        }
        if (user.role === 'RECYCLING_ORGANIZATION') {
          const res = await organizationApi.me();
          const p = res.data.data as OrganizationProfile;
          if (!active) return;
          setOrg(p);
          setOrgForm({
            organizationName: p.organizationName,
            address: p.address ?? '',
            acceptedMaterials: p.acceptedMaterials,
          });
        }
      } catch (err) {
        if (active) setError(apiErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const saveAccount = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (form.password && form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      const res = await authApi.updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        ...(form.password ? { password: form.password } : {}),
      });
      updateUser(res.data.data);
      setForm((f) => ({ ...f, password: '', confirm: '' }));
      setMessage('Account details updated.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const saveCollector = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const res = await collectorApi.update({
        serviceArea: collectorForm.serviceArea.trim(),
        availability: collectorForm.availability,
        acceptedMaterials: collectorForm.acceptedMaterials,
        vehicleType: collectorForm.vehicleType.trim() || null,
        bio: collectorForm.bio.trim() || null,
      });
      setCollector(res.data.data as CollectorProfile);
      setMessage('Collector profile updated.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const saveOrg = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const res = await organizationApi.update({
        organizationName: orgForm.organizationName.trim(),
        address: orgForm.address.trim() || null,
        acceptedMaterials: orgForm.acceptedMaterials,
      });
      setOrg(res.data.data as OrganizationProfile);
      setMessage('Organization profile updated.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleMaterial = (
    list: string[],
    setter: (v: string[]) => void,
    name: string
  ) => setter(list.includes(name) ? list.filter((m) => m !== name) : [...list, name]);

  if (!user) return null;
  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Manage your account and role-specific settings." />

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
        <div className="card">
          <h2 className="font-semibold text-slate-900">Account</h2>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-800">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-800">{user.name}</p>
              <p className="truncate text-sm text-slate-500">{user.email}</p>
            </div>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Role</span>
              <RoleBadge role={user.role} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status</span>
              <span className={`badge ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                {user.isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Member since</span>
              <span className="font-medium text-slate-800">{formatDate(user.createdAt)}</span>
            </div>
            {collector && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Verification</span>
                <VerifyBadge status={collector.verificationStatus} />
              </div>
            )}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-slate-900">Account details</h2>
          <form onSubmit={saveAccount} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                className="input"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label" htmlFor="phone">
                Phone
              </label>
              <input
                id="phone"
                className="input"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+250 7xx xxx xxx"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                New password (optional)
              </label>
              <input
                id="password"
                type="password"
                className="input"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Leave blank to keep current"
              />
            </div>
            <div>
              <label className="label" htmlFor="confirm">
                Confirm new password
              </label>
              <input
                id="confirm"
                type="password"
                className="input"
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Saving...' : 'Save account details'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {user.role === 'COLLECTOR' && collector && (
        <div className="card mt-6">
          <h2 className="font-semibold text-slate-900">Collector settings</h2>
          <p className="mt-1 text-sm text-slate-500">
            These settings drive smart matching: material type, service area and availability.
          </p>
          <form onSubmit={saveCollector} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="serviceArea">
                  Service area
                </label>
                <input
                  id="serviceArea"
                  className="input"
                  required
                  value={collectorForm.serviceArea}
                  onChange={(e) => setCollectorForm((f) => ({ ...f, serviceArea: e.target.value }))}
                  placeholder="e.g. Kicukiro"
                />
              </div>
              <div>
                <label className="label" htmlFor="availability">
                  Availability
                </label>
                <select
                  id="availability"
                  className="input"
                  value={collectorForm.availability}
                  onChange={(e) =>
                    setCollectorForm((f) => ({ ...f, availability: e.target.value as 'AVAILABLE' | 'UNAVAILABLE' }))
                  }
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="UNAVAILABLE">UNAVAILABLE</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="vehicleType">
                  Vehicle type
                </label>
                <input
                  id="vehicleType"
                  className="input"
                  value={collectorForm.vehicleType}
                  onChange={(e) => setCollectorForm((f) => ({ ...f, vehicleType: e.target.value }))}
                  placeholder="e.g. Pickup truck"
                />
              </div>
            </div>

            <fieldset>
              <legend className="label">Accepted materials</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {categories.map((c) => (
                  <label
                    key={c.categoryId}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm ${
                      collectorForm.acceptedMaterials.includes(c.categoryName)
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={collectorForm.acceptedMaterials.includes(c.categoryName)}
                      onChange={() =>
                        toggleMaterial(
                          collectorForm.acceptedMaterials,
                          (v) => setCollectorForm((f) => ({ ...f, acceptedMaterials: v })),
                          c.categoryName
                        )
                      }
                    />
                    {c.categoryName}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label className="label" htmlFor="bio">
                Short bio (optional)
              </label>
              <textarea
                id="bio"
                className="input min-h-[72px]"
                maxLength={500}
                value={collectorForm.bio}
                onChange={(e) => setCollectorForm((f) => ({ ...f, bio: e.target.value }))}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Saving...' : 'Save collector settings'}
            </button>
          </form>
        </div>
      )}

      {user.role === 'RECYCLING_ORGANIZATION' && org && (
        <div className="card mt-6">
          <h2 className="font-semibold text-slate-900">Organization settings</h2>
          <form onSubmit={saveOrg} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="orgName">
                  Organization name
                </label>
                <input
                  id="orgName"
                  className="input"
                  required
                  value={orgForm.organizationName}
                  onChange={(e) => setOrgForm((f) => ({ ...f, organizationName: e.target.value }))}
                />
              </div>
              <div>
                <label className="label" htmlFor="orgAddress">
                  Address
                </label>
                <input
                  id="orgAddress"
                  className="input"
                  value={orgForm.address}
                  onChange={(e) => setOrgForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
            </div>

            <fieldset>
              <legend className="label">Accepted materials</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {categories.map((c) => (
                  <label
                    key={c.categoryId}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm ${
                      orgForm.acceptedMaterials.includes(c.categoryName)
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={orgForm.acceptedMaterials.includes(c.categoryName)}
                      onChange={() =>
                        toggleMaterial(orgForm.acceptedMaterials, (v) => setOrgForm((f) => ({ ...f, acceptedMaterials: v })), c.categoryName)
                      }
                    />
                    {c.categoryName}
                  </label>
                ))}
              </div>
            </fieldset>

            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Saving...' : 'Save organization settings'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
