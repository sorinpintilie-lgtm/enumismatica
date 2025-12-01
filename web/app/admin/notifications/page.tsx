'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  getAdminNotifications,
  subscribeToAdminNotifications,
  markNotificationAsRead,
  markNotificationActionTaken,
  AdminNotification,
  NotificationSeverity,
} from 'shared/adminNotificationService';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import Link from 'next/link';

export default function AdminNotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<NotificationSeverity | 'all'>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [expandedNotification, setExpandedNotification] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.isAdmin && !realtimeEnabled) {
      loadNotifications();
    }
  }, [user, filterSeverity, showUnreadOnly, realtimeEnabled]);

  useEffect(() => {
    if (!user?.isAdmin || !realtimeEnabled) return;

    const filters: any = {};
    if (filterSeverity !== 'all') {
      filters.severity = filterSeverity;
    }
    if (showUnreadOnly) {
      filters.unreadOnly = true;
    }

    const unsubscribe = subscribeToAdminNotifications(
      (newNotifications) => {
        setNotifications(newNotifications);
        setLoading(false);
      },
      filters,
      (error) => {
        console.error('Realtime notifications error:', error);
      }
    );

    return () => unsubscribe();
  }, [user, realtimeEnabled, filterSeverity, showUnreadOnly]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const filters: any = { limit: 100 };
      if (filterSeverity !== 'all') {
        filters.severity = filterSeverity;
      }
      if (showUnreadOnly) {
        filters.unreadOnly = true;
      }

      const fetchedNotifications = await getAdminNotifications(filters);
      setNotifications(fetchedNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      if (!realtimeEnabled) {
        await loadNotifications();
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkActionTaken = async (notificationId: string) => {
    if (!user) return;
    try {
      await markNotificationActionTaken(notificationId, user.uid);
      if (!realtimeEnabled) {
        await loadNotifications();
      }
    } catch (error) {
      console.error('Failed to mark action taken:', error);
    }
  };

  const getSeverityColor = (severity: NotificationSeverity): string => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'security':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'info':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getSeverityIcon = (severity: NotificationSeverity): string => {
    switch (severity) {
      case 'critical':
        return '!!!';
      case 'security':
        return 'SEC';
      case 'warning':
        return 'WARN';
      case 'info':
        return 'INFO';
      default:
        return '?';
    }
  };

  if (authLoading || !user?.isAdmin) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const criticalCount = notifications.filter((n) => n.severity === 'critical' && !n.actionTaken).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Notificări Admin</h1>
        <p className="text-slate-300">Alerte și notificări pentru evenimente critice</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
          <p className="text-sm text-slate-400">Total Notificări</p>
          <p className="text-2xl font-bold text-white">{notifications.length}</p>
        </div>
        <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
          <p className="text-sm text-slate-400">Necitite</p>
          <p className="text-2xl font-bold text-blue-400">{unreadCount}</p>
        </div>
        <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
          <p className="text-sm text-slate-400">Critice</p>
          <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
        </div>
        <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
          <p className="text-sm text-slate-400">Securitate</p>
          <p className="text-2xl font-bold text-orange-400">
            {notifications.filter((n) => n.severity === 'security').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-navy-800/50 rounded-2xl border border-gold-500/20 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Severitate</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              className="w-full bg-navy-700 border border-gold-500/30 rounded-lg px-4 py-2 text-white"
            >
              <option value="all">Toate</option>
              <option value="critical">Critice</option>
              <option value="security">Securitate</option>
              <option value="warning">Avertismente</option>
              <option value="info">Informații</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Filtru</label>
            <button
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors ${
                showUnreadOnly
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-navy-700 hover:bg-navy-600 text-slate-300'
              }`}
            >
              {showUnreadOnly ? 'Doar Necitite' : 'Toate'}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Actualizare</label>
            <button
              onClick={() => setRealtimeEnabled(!realtimeEnabled)}
              className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors ${
                realtimeEnabled
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-navy-700 hover:bg-navy-600 text-slate-300'
              }`}
            >
              {realtimeEnabled ? 'LIVE' : 'Pauzat'}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto"></div>
            <p className="text-slate-300 mt-4">Se încarcă notificările...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 bg-navy-800/50 rounded-2xl border border-gold-500/20">
            <p className="text-slate-300 text-lg">Nu există notificări</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-navy-800/50 rounded-lg p-4 border transition-colors cursor-pointer ${
                notification.read
                  ? 'border-gold-500/10 opacity-75'
                  : 'border-gold-500/30'
              }`}
              onClick={() => setExpandedNotification(expandedNotification === notification.id ? null : notification.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getSeverityColor(notification.severity)}`}>
                      {getSeverityIcon(notification.severity)}
                    </span>
                    <h3 className="text-lg font-semibold text-white">{notification.title}</h3>
                    {!notification.read && (
                      <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs font-semibold border border-blue-500/30">
                        NOU
                      </span>
                    )}
                    {notification.actionTaken && (
                      <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs font-semibold border border-green-500/30">
                        REZOLVAT
                      </span>
                    )}
                    <span className="text-slate-400 text-sm">
                      {formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true, locale: ro })}
                    </span>
                  </div>

                  <p className="text-slate-300 mb-2">{notification.message}</p>

                  {notification.userEmail && (
                    <div className="text-sm text-slate-400">
                      <span className="text-slate-500">Utilizator:</span>{' '}
                      {notification.userId ? (
                        <Link
                          href={`/admin/users/${notification.userId}`}
                          className="text-gold-400 hover:text-gold-300 font-mono"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {notification.userEmail}
                        </Link>
                      ) : (
                        <span className="text-gold-400 font-mono">{notification.userEmail}</span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id!);
                        }}
                        className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 px-3 py-1 rounded text-sm font-semibold transition-colors"
                      >
                        Marchează ca citit
                      </button>
                    )}
                    {!notification.actionTaken && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkActionTaken(notification.id!);
                        }}
                        className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300 px-3 py-1 rounded text-sm font-semibold transition-colors"
                      >
                        Marchează ca rezolvat
                      </button>
                    )}
                  </div>
                </div>

                <button className="text-slate-400 hover:text-white transition-colors ml-4">
                  {expandedNotification === notification.id ? '▼' : '▶'}
                </button>
              </div>

              {/* Expanded Details */}
              {expandedNotification === notification.id && notification.metadata && (
                <div className="mt-4 pt-4 border-t border-gold-500/20">
                  <div className="bg-navy-900/50 rounded-lg p-4">
                    <h4 className="text-gold-400 font-semibold mb-2">Detalii Metadata:</h4>
                    <pre className="text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono">
                      {JSON.stringify(notification.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}