import { useNotifications } from '../../context/NotificationContext';
import { Alert, EmptyState, PageHeader, Spinner, formatDate } from '../../components/ui';

export default function NotificationsPage() {
  const { notifications, unread, loading, refresh, markRead, markAllRead } = useNotifications();

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Updates about your listings, pickup requests and collections."
        actions={
          <>
            <button className="btn-secondary" onClick={() => void refresh()}>
              Refresh
            </button>
            {unread > 0 && (
              <button className="btn-primary" onClick={() => void markAllRead()}>
                Mark all as read
              </button>
            )}
          </>
        }
      />

      {loading ? (
        <Spinner />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          message="Notifications are delivered asynchronously through RabbitMQ. You'll see updates about pickups and collections here."
        />
      ) : (
        <>
          <Alert type="info">
            {unread > 0 ? `You have ${unread} unread notification(s).` : 'All notifications are read.'}
          </Alert>
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`card flex items-start justify-between gap-3 ${
                  n.read ? 'bg-white' : 'border-brand-200 bg-brand-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                  <div>
                    <p className="text-sm text-slate-800">{n.message}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {n.type.replace(/_/g, ' ')} · {formatDate(n.createdAt)}
                    </p>
                  </div>
                </div>
                {!n.read && (
                  <button className="btn-secondary btn-sm shrink-0" onClick={() => void markRead(n._id)}>
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
