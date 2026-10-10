import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Role } from '../types';
import { formatDate } from './ui';

interface NavItem {
  to: string;
  label: string;
}

const NAV: Record<Role, NavItem[]> = {
  WASTE_PRODUCER: [
    { to: '/producer', label: 'Dashboard' },
    { to: '/producer/listings', label: 'My Waste Listings' },
    { to: '/producer/listings/new', label: 'Create Listing' },
    { to: '/producer/requests', label: 'Pickup Requests' },
    { to: '/producer/history', label: 'Collection History' },
    { to: '/profile', label: 'Profile' },
  ],
  COLLECTOR: [
    { to: '/collector', label: 'Dashboard' },
    { to: '/collector/available', label: 'Available Waste' },
    { to: '/collector/recommended', label: 'Recommended' },
    { to: '/collector/requests', label: 'My Pickup Requests' },
    { to: '/collector/collections', label: 'Collections' },
    { to: '/profile', label: 'Profile' },
  ],
  RECYCLING_ORGANIZATION: [
    { to: '/organization', label: 'Dashboard' },
    { to: '/organization/materials', label: 'Accepted Materials' },
    { to: '/organization/listings', label: 'Relevant Waste' },
    { to: '/profile', label: 'Profile' },
  ],
  ADMIN: [
    { to: '/admin', label: 'Admin Dashboard' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/collectors', label: 'Collector Verification' },
    { to: '/admin/categories', label: 'Waste Categories' },
    { to: '/admin/listings', label: 'Listings' },
    { to: '/admin/pickups', label: 'Pickup Activities' },
    { to: '/admin/activities', label: 'System Activities' },
    { to: '/profile', label: 'Profile' },
  ],
};

const ROLE_HOME: Record<Role, string> = {
  WASTE_PRODUCER: '/producer',
  COLLECTOR: '/collector',
  RECYCLING_ORGANIZATION: '/organization',
  ADMIN: '/admin',
};

export function homeForRole(role: Role): string {
  return ROLE_HOME[role];
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { notifications, unread, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  if (!user) return null;
  const items = NAV[user.role];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebar = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === ROLE_HOME[user.role]}
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
            <Link to={ROLE_HOME[user.role]} className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                W
              </span>
              <span className="text-lg font-bold text-slate-900">WasteLink</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setUserOpen(false);
                }}
                aria-label="Notifications"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                    <span className="text-sm font-semibold">Notifications</span>
                    {unread > 0 && (
                      <button className="text-xs text-brand-700 hover:underline" onClick={() => void markAllRead()}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n._id}
                          onClick={() => !n.read && void markRead(n._id)}
                          className={`block w-full border-b border-slate-50 px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                            n.read ? 'text-slate-500' : 'text-slate-800'
                          }`}
                        >
                          <span className="flex items-start gap-2">
                            {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                            <span>
                              <span className="block">{n.message}</span>
                              <span className="mt-0.5 block text-xs text-slate-400">{formatDate(n.createdAt)}</span>
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
                onClick={() => {
                  setUserOpen((v) => !v);
                  setNotifOpen(false);
                }}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-medium leading-tight text-slate-800">{user.name}</span>
                  <span className="block text-xs leading-tight text-slate-500">
                    {user.role.replace(/_/g, ' ')}
                  </span>
                </span>
              </button>
              {userOpen && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-2">
                    <p className="truncate text-sm font-medium text-slate-800">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setUserOpen(false)}
                  >
                    My Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          {sidebar}
        </aside>

        {/* Mobile sidebar */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <aside className="fixed left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] w-64 flex-col border-r border-slate-200 bg-white lg:hidden">
              {sidebar}
            </aside>
          </>
        )}

        <main className="min-w-0 flex-1 p-4 sm:p-6" onClick={() => {
          if (notifOpen) setNotifOpen(false);
          if (userOpen) setUserOpen(false);
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
