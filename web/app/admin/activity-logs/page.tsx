'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAdmin } from 'shared/adminService';
import {
  getActivityLogs,
  subscribeToActivityLogs,
  searchActivityLogs,
  getUserActivityStats,
  ActivityLog,
  ActivityEventType,
  ActivityLogFilter,
} from '../../../../shared/activityLogService';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';

const EVENT_TYPE_LABELS: Record<ActivityEventType, string> = {
  // Authentication
  user_login: '[AUTH] Autentificare',
  user_logout: '[AUTH] Deconectare',
  user_register: '[AUTH] Înregistrare',
  password_reset_request: '[AUTH] Cerere resetare parolă',
  password_reset_complete: '[AUTH] Parolă resetată',
  email_verification: '[AUTH] Verificare email',
  // Navigation
  page_view: '[NAV] Vizualizare pagină',
  page_leave: '[NAV] Părăsire pagină',
  // Products
  product_view: '[PROD] Vizualizare produs',
  product_search: '[PROD] Căutare produse',
  product_filter: '[PROD] Filtrare produse',
  product_create: '[PROD] Creare produs',
  product_update: '[PROD] Actualizare produs',
  product_delete: '[PROD] Ștergere produs',
  // Auctions
  auction_view: '[AUCT] Vizualizare licitație',
  auction_create: '[AUCT] Creare licitație',
  auction_bid: '[AUCT] Licitare',
  auction_auto_bid_set: '[AUCT] Setare licitare automată',
  auction_auto_bid_cancel: '[AUCT] Anulare licitare automată',
  auction_end: '[AUCT] Închidere licitație',
  auction_win: '[AUCT] Câștig licitație',
  // Collection
  collection_add: '[COLL] Adăugare în colecție',
  collection_remove: '[COLL] Eliminare din colecție',
  collection_view: '[COLL] Vizualizare colecție',
  // Chat
  message_send: '[CHAT] Trimitere mesaj',
  message_read: '[CHAT] Citire mesaj',
  conversation_start: '[CHAT] Început conversație',
  // Admin
  admin_user_view: '[ADMIN] Vizualizare utilizator',
  admin_user_edit: '[ADMIN] Editare utilizator',
  admin_user_delete: '[ADMIN] Ștergere utilizator',
  admin_user_ban: '[ADMIN] Blocare utilizator',
  admin_user_unban: '[ADMIN] Deblocare utilizator',
  admin_password_reset: '[ADMIN] Resetare parolă',
  admin_role_change: '[ADMIN] Schimbare rol',
  admin_auction_edit: '[ADMIN] Editare licitație',
  admin_auction_cancel: '[ADMIN] Anulare licitație',
  admin_product_edit: '[ADMIN] Editare produs',
  admin_product_delete: '[ADMIN] Ștergere produs',
  admin_logs_view: '[ADMIN] Vizualizare loguri',
  admin_analytics_access: '[ADMIN] Acces panou analitice',
  // Errors
  error_occurred: '[ERROR] Eroare',
  api_error: '[ERROR] Eroare API',
  payment_error: '[ERROR] Eroare plată',
  security_error: '[SECURITY] Eroare de securitate',
  // Security
  suspicious_activity: '[SECURITY] Activitate suspectă',
  rate_limit_exceeded: '[SECURITY] Limită de rate depășită',
  unauthorized_access_attempt: '[SECURITY] Tentativă acces neautorizat',
};

const EVENT_CATEGORIES = {
  'Toate': [],
  'Autentificare': ['user_login', 'user_logout', 'user_register', 'password_reset_request', 'password_reset_complete', 'email_verification'],
  'Navigare': ['page_view', 'page_leave'],
  'Produse': ['product_view', 'product_search', 'product_filter', 'product_create', 'product_update', 'product_delete'],
  'Licitații': ['auction_view', 'auction_create', 'auction_bid', 'auction_auto_bid_set', 'auction_auto_bid_cancel', 'auction_end', 'auction_win'],
  'Colecție': ['collection_add', 'collection_remove', 'collection_view'],
  'Chat': ['message_send', 'message_read', 'conversation_start'],
  'Admin': ['admin_user_view', 'admin_user_edit', 'admin_user_delete', 'admin_user_ban', 'admin_user_unban', 'admin_password_reset', 'admin_role_change', 'admin_auction_edit', 'admin_auction_cancel', 'admin_product_edit', 'admin_product_delete', 'admin_logs_view'],
  'Erori': ['error_occurred', 'api_error', 'payment_error'],
  'Securitate': ['suspicious_activity', 'rate_limit_exceeded', 'unauthorized_access_attempt'],
};

export default function ActivityLogsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Toate');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminAndLoad = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      const adminStatus = await isAdmin(user.uid);
      if (!adminStatus) {
        router.push('/dashboard');
        return;
      }

      setIsAdminUser(true);
      await loadLogs();
      setLoading(false);
    };

    if (!authLoading) {
      checkAdminAndLoad();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (isAdminUser) {
      loadLogs();
    }
  }, [selectedCategory, selectedUserId]);

  useEffect(() => {
    if (!isAdminUser || !realTimeEnabled) return;

    const filter: ActivityLogFilter = {
      limit: 100,
    };

    if (selectedUserId) {
      filter.userId = selectedUserId;
    }

    if (selectedCategory !== 'Toate') {
      filter.eventType = EVENT_CATEGORIES[selectedCategory as keyof typeof EVENT_CATEGORIES] as ActivityEventType[];
    }

    const unsubscribe = subscribeToActivityLogs(
      filter,
      (newLogs) => {
        setLogs(newLogs);
      },
      (error) => {
        console.error('Real-time logs error:', error);
      }
    );

    return () => unsubscribe();
  }, [user, realTimeEnabled, selectedCategory, selectedUserId]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const filter: ActivityLogFilter = {
        limit: 100,
      };

      if (selectedUserId) {
        filter.userId = selectedUserId;
      }

      if (selectedCategory !== 'Toate') {
        filter.eventType = EVENT_CATEGORIES[selectedCategory as keyof typeof EVENT_CATEGORIES] as ActivityEventType[];
      }

      const { logs: fetchedLogs } = await getActivityLogs(filter);
      setLogs(fetchedLogs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadLogs();
      return;
    }

    try {
      setLoading(true);
      const filter: ActivityLogFilter = {};
      
      if (selectedUserId) {
        filter.userId = selectedUserId;
      }

      const results = await searchActivityLogs(searchTerm, filter);
      setLogs(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventColor = (eventType: ActivityEventType): string => {
    if (eventType.startsWith('admin_')) return 'text-purple-400';
    if (eventType.includes('error') || eventType.includes('suspicious')) return 'text-red-400';
    if (eventType.includes('login') || eventType.includes('register')) return 'text-green-400';
    if (eventType.includes('bid') || eventType.includes('auction')) return 'text-yellow-400';
    return 'text-blue-400';
  };

  const getEventBadgeColor = (eventType: ActivityEventType): string => {
    if (eventType.startsWith('admin_')) return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    if (eventType.includes('error') || eventType.includes('suspicious')) return 'bg-red-500/20 text-red-300 border-red-500/30';
    if (eventType.includes('login') || eventType.includes('register')) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (eventType.includes('bid') || eventType.includes('auction')) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  };

  if (authLoading || loading || !isAdminUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Loguri Activitate</h1>
        <p className="text-slate-300">Monitorizare completă a activității utilizatorilor</p>
      </div>

      {/* Controls */}
      <div className="bg-navy-800/50 rounded-2xl p-6 mb-6 backdrop-blur-sm border border-gold-500/20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Căutare</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Caută în loguri..."
                className="flex-1 bg-navy-700 border border-gold-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-gold-500"
              />
              <button
                onClick={handleSearch}
                className="bg-gold-500 hover:bg-gold-600 text-navy-900 px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Caută
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Categorie</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-navy-700 border border-gold-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gold-500"
            >
              {Object.keys(EVENT_CATEGORIES).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Utilizator ID</label>
            <input
              type="text"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              placeholder="ID utilizator..."
              className="w-full bg-navy-700 border border-gold-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-gold-500"
            />
          </div>

          {/* Real-time Toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Actualizare</label>
            <button
              onClick={() => setRealTimeEnabled(!realTimeEnabled)}
              className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors ${
                realTimeEnabled
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-navy-700 hover:bg-navy-600 text-slate-300'
              }`}
            >
              {realTimeEnabled ? 'LIVE' : 'Pauzat'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gold-500/20">
          <div className="text-center">
            <div className="text-2xl font-bold text-gold-400">{logs.length}</div>
            <div className="text-sm text-slate-400">Total Evenimente</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {new Set(logs.map((l) => l.userId)).size}
            </div>
            <div className="text-sm text-slate-400">Utilizatori Unici</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {logs.filter((l) => l.isAdmin).length}
            </div>
            <div className="text-sm text-slate-400">Acțiuni Admin</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">
              {logs.filter((l) => l.eventType.includes('error') || l.eventType.includes('suspicious')).length}
            </div>
            <div className="text-sm text-slate-400">Erori/Alerte</div>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto"></div>
            <p className="text-slate-300 mt-4">Se încarcă logurile...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 bg-navy-800/50 rounded-2xl border border-gold-500/20">
            <p className="text-slate-300 text-lg">Nu s-au găsit loguri</p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="bg-navy-800/50 rounded-lg p-4 border border-gold-500/20 hover:border-gold-500/40 transition-colors cursor-pointer"
              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={`text-sm font-mono font-semibold ${getEventColor(log.eventType)}`}>
                      {EVENT_TYPE_LABELS[log.eventType]}
                    </span>
                    {log.isAdmin && (
                      <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs font-semibold border border-purple-500/30">
                        ADMIN
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded text-xs font-semibold border ${getEventBadgeColor(log.eventType)}`}>
                      {log.eventType}
                    </span>
                    <span className="text-slate-400 text-sm">
                      {formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true, locale: ro })}
                    </span>
                  </div>
                  <div className="text-slate-300 text-sm space-y-1">
                    <div>
                      <span className="text-slate-500">Utilizator:</span>{' '}
                      <span className="text-gold-400 font-mono">{log.userName || log.userEmail || log.userId}</span>
                    </div>
                    {log.sessionId && (
                      <div>
                        <span className="text-slate-500">Sesiune:</span>{' '}
                        <span className="font-mono text-xs">{log.sessionId}</span>
                      </div>
                    )}
                    {log.metadata.page && (
                      <div>
                        <span className="text-slate-500">Pagină:</span>{' '}
                        <span className="font-mono">{log.metadata.page}</span>
                      </div>
                    )}
                    {log.metadata.device && (
                      <div>
                        <span className="text-slate-500">Dispozitiv:</span> {log.metadata.device} - {log.metadata.browser} ({log.metadata.os})
                      </div>
                    )}
                    {log.metadata.ipAddress && (
                      <div>
                        <span className="text-slate-500">IP:</span>{' '}
                        <span className="font-mono">{log.metadata.ipAddress}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button className="text-slate-400 hover:text-white transition-colors ml-4">
                  {expandedLog === log.id ? '▼' : '▶'}
                </button>
              </div>

              {/* Expanded Details */}
              {expandedLog === log.id && (
                <div className="mt-4 pt-4 border-t border-gold-500/20">
                  <div className="bg-navy-900/50 rounded-lg p-4">
                    <h4 className="text-gold-400 font-semibold mb-2">Detalii Complete:</h4>
                    <pre className="text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono">
                      {JSON.stringify(
                        {
                          ...log,
                          timestamp: log.timestamp.toDate().toISOString(),
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Load More Button */}
      {!loading && logs.length >= 100 && (
        <div className="mt-6 text-center">
          <button
            onClick={loadLogs}
            className="bg-gold-500 hover:bg-gold-600 text-navy-900 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Încarcă Mai Multe
          </button>
        </div>
      )}
    </div>
  );
}