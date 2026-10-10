import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { notificationApi } from '../api/client';
import { Notification } from '../types';
import { useAuth } from './AuthContext';

interface NotificationContextValue {
  notifications: Notification[];
  unread: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnread(0);
      return;
    }
    setLoading(true);
    try {
      const res = await notificationApi.list();
      setNotifications((res.data.data?.notifications ?? []) as Notification[]);
      setUnread(Number(res.data.data?.unread ?? 0));
    } catch {
      // Notifications are non-critical: fail quietly (Mongo may be offline).
      setNotifications([]);
      setUnread(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
    if (!user) return;
    const timer = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(timer);
  }, [user, refresh]);

  const markRead = useCallback(
    async (id: string) => {
      await notificationApi.markRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setUnread((prev) => Math.max(0, prev - 1));
    },
    []
  );

  const markAllRead = useCallback(async () => {
    await notificationApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }, []);

  const value = useMemo(
    () => ({ notifications, unread, loading, refresh, markRead, markAllRead }),
    [notifications, unread, loading, refresh, markRead, markAllRead]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
}
