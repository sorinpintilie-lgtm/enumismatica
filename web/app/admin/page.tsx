'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isAdmin, isSuperAdmin } from 'shared/adminService';
import {
  getRecentActivity,
  subscribeToActivityLogs,
  ActivityLog,
} from 'shared/activityLogService';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import { useConversations } from '../hooks/useChat';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalProducts: number;
  totalAuctions: number;
  activeAuctions: number;
  totalBids: number;
  recentActivity: ActivityLog[];
  suspiciousActivity: ActivityLog[];
  errorCount: number;
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [realtimeActivity, setRealtimeActivity] = useState<ActivityLog[]>([]);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [adminTargetUserId, setAdminTargetUserId] = useState('');
  const [startingChat, setStartingChat] = useState(false);
  const { startConversation } = useConversations(user?.uid || null);

  // Quick listing search (products / auctions)
  const [listingSearchType, setListingSearchType] = useState<'product' | 'auction'>('product');
  const [listingSearchText, setListingSearchText] = useState('');

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

      // Only super-admins get access to the full admin dashboard.
      const superAdminStatus = await isSuperAdmin(user.uid);
      if (!superAdminStatus) {
        router.push('/admin/moderator');
        return;
      }

      setIsAdminUser(true);
      await loadDashboardData();
      setLoading(false);
    };

    if (!authLoading) {
      checkAdminAndLoad();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!isAdminUser || !realtimeEnabled) return;

    const unsubscribe = subscribeToActivityLogs(
      { limit: 50 },
      (logs) => {
        setRealtimeActivity(logs);
      },
      (error) => {
        console.error('Realtime activity error:', error);
        // Don't show error to user, just disable realtime
        setRealtimeEnabled(false);
      }
    );

    return () => unsubscribe();
  }, [isAdminUser, realtimeEnabled]);

  const handleStartAdminChat = async () => {
    if (!adminTargetUserId.trim() || !user) return;

    setStartingChat(true);
    try {
      const conversationId = await startConversation(adminTargetUserId.trim(), undefined, undefined, true);
      router.push(`/messages?conversation=${conversationId}`);
      setAdminTargetUserId('');
    } catch (error: any) {
      console.error('Failed to start admin chat:', error);
      const errorMessage = error?.message?.includes('permission-denied')
        ? 'Nu aveți permisiunea să creați conversații de suport'
        : 'Eroare la pornirea conversației de suport';
      alert(errorMessage);
    } finally {
      setStartingChat(false);
    }
  };

  const normalizeListingId = (raw: string): string => {
    const text = raw.trim();
    if (!text) return '';

    // Allow pasting full URLs like https://.../products/<id> or /auctions/<id>
    const m = text.match(/\/(products|auctions)\/([^/?#]+)/i);
    if (m?.[2]) return m[2];

    return text;
  };

  const handleListingSearch = () => {
    const id = normalizeListingId(listingSearchText);
    if (!id) return;

    if (listingSearchType === 'product') {
      router.push(`/products/${id}`);
      return;
    }

    router.push(`/auctions/${id}`);
  };

  const loadDashboardData = async () => {
    try {
      // Get total users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnapshot.size;

      // Get active users (logged in last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const activeUsersQuery = query(
        collection(db, 'users'),
        where('updatedAt', '>=', sevenDaysAgo)
      );
      const activeUsersSnapshot = await getDocs(activeUsersQuery);
      const activeUsers = activeUsersSnapshot.size;

      // Get total products
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const totalProducts = productsSnapshot.size;

      // Get total auctions
      const auctionsSnapshot = await getDocs(collection(db, 'auctions'));
      const totalAuctions = auctionsSnapshot.size;

      // Get active auctions
      const activeAuctionsQuery = query(
        collection(db, 'auctions'),
        where('status', '==', 'active')
      );
      const activeAuctionsSnapshot = await getDocs(activeAuctionsQuery);
      const activeAuctions = activeAuctionsSnapshot.size;

      // Get total bids (approximate from all auctions)
      let totalBids = 0;
      for (const auctionDoc of auctionsSnapshot.docs) {
        const bidsSnapshot = await getDocs(collection(db, 'auctions', auctionDoc.id, 'bids'));
        totalBids += bidsSnapshot.size;
      }

      // Get recent activity
      const recentActivity = await getRecentActivity(100);

      // Get suspicious activity
      const suspiciousActivity = recentActivity.filter(
        (log) =>
          log.eventType.includes('suspicious') ||
          log.eventType.includes('unauthorized') ||
          log.eventType.includes('rate_limit')
      );

      // Count errors
      const errorCount = recentActivity.filter(
        (log) => log.eventType.includes('error')
      ).length;

      setStats({
        totalUsers,
        activeUsers,
        totalProducts,
        totalAuctions,
        activeAuctions,
        totalBids,
        recentActivity: recentActivity.slice(0, 20),
        suspiciousActivity,
        errorCount,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
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

  const activityToDisplay = realtimeEnabled ? realtimeActivity : stats?.recentActivity || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Panou Admin</h1>
          <p className="text-slate-300">Monitorizare și control complet al platformei</p>
        </div>

        {/* Quick Search (Listing) */}
        <div className="mb-8 rounded-2xl border border-gold-500/20 bg-navy-800/40 p-6">
          <h2 className="text-xl font-bold text-white mb-3">Caută rapid anunț / licitație</h2>
          <p className="text-sm text-slate-300 mb-4">
            Introdu ID-ul (sau link-ul) și te ducem direct la pagina anunțului.
          </p>
          <div className="flex flex-col md:flex-row gap-3">
            <select
              value={listingSearchType}
              onChange={(e) => setListingSearchType(e.target.value as any)}
              className="px-4 py-3 rounded-lg bg-navy-900/70 text-slate-50 border border-gold-500/25 focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="product">E-shop (produs)</option>
              <option value="auction">Licitație</option>
            </select>
            <input
              type="text"
              value={listingSearchText}
              onChange={(e) => setListingSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleListingSearch();
                }
              }}
              placeholder="ex: 2a9c... sau https://site.ro/auctions/2a9c..."
              className="flex-1 px-4 py-3 rounded-lg bg-navy-900/70 text-slate-50 placeholder-slate-400 border border-gold-500/25 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            <button
              type="button"
              onClick={handleListingSearch}
              disabled={!listingSearchText.trim()}
              className="px-6 py-3 rounded-lg bg-[#e7b73c] text-[#000940] font-semibold shadow-[0_0_24px_rgba(231,183,60,0.55)] hover:bg-[#f0c955] disabled:bg-navy-700 disabled:text-slate-400 transition-colors"
            >
              Caută
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link
            href="/admin/users"
            className="bg-navy-800/50 hover:bg-navy-700/50 border border-gold-500/20 hover:border-gold-500/40 rounded-lg p-6 transition-colors"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Utilizatori</h3>
            <p className="text-3xl font-bold text-gold-400">{stats?.totalUsers || 0}</p>
            <p className="text-sm text-slate-400 mt-1">{stats?.activeUsers || 0} activi</p>
          </Link>

          <Link
            href="/admin/products"
            className="bg-navy-800/50 hover:bg-navy-700/50 border border-gold-500/20 hover:border-gold-500/40 rounded-lg p-6 transition-colors"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Piese</h3>
            <p className="text-3xl font-bold text-gold-400">{stats?.totalProducts || 0}</p>
            <p className="text-sm text-slate-400 mt-1">Total catalog</p>
          </Link>

          <Link
            href="/admin/auctions"
            className="bg-navy-800/50 hover:bg-navy-700/50 border border-gold-500/20 hover:border-gold-500/40 rounded-lg p-6 transition-colors"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Licitații</h3>
            <p className="text-3xl font-bold text-gold-400">{stats?.activeAuctions || 0}</p>
            <p className="text-sm text-slate-400 mt-1">{stats?.totalAuctions || 0} total</p>
          </Link>

          <Link
            href="/admin/activity-logs"
            className="bg-navy-800/50 hover:bg-navy-700/50 border border-gold-500/20 hover:border-gold-500/40 rounded-lg p-6 transition-colors"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Loguri</h3>
            <p className="text-3xl font-bold text-gold-400">{activityToDisplay.length}</p>
            <p className="text-sm text-slate-400 mt-1">Evenimente recente</p>
          </Link>
        </div>

        {/* Admin Support Chat */}
        <div className="bg-gradient-to-r from-amber-900/20 via-orange-900/20 to-red-900/20 border border-amber-500/30 rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Suport Utilizatori
          </h2>
          <p className="text-slate-300 mb-4">
            Începe o conversație de suport cu orice utilizator pentru ajutor sau moderare
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={adminTargetUserId}
              onChange={(e) => setAdminTargetUserId(e.target.value)}
              placeholder="Introduceți ID-ul utilizatorului..."
              className="flex-1 px-4 py-3 rounded-lg bg-navy-800/70 text-slate-50 placeholder-slate-400 border border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <button
              onClick={handleStartAdminChat}
              disabled={!adminTargetUserId.trim() || startingChat}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-navy-700 disabled:text-slate-400 text-black font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              {startingChat ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  Se pornește...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  Începe Chat
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-amber-200 mt-3">
            💡 Utilizați ID-ul complet al utilizatorului pentru a începe conversația
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
            <p className="text-sm text-slate-400">Total Licitări</p>
            <p className="text-2xl font-bold text-white">{stats?.totalBids || 0}</p>
          </div>

          <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
            <p className="text-sm text-slate-400">Activitate Suspectă</p>
            <p className="text-2xl font-bold text-red-400">{stats?.suspiciousActivity.length || 0}</p>
          </div>

          <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
            <p className="text-sm text-slate-400">Erori</p>
            <p className="text-2xl font-bold text-orange-400">{stats?.errorCount || 0}</p>
          </div>

          <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
            <p className="text-sm text-slate-400">Status Sistem</p>
            <p className="text-lg font-bold text-green-400">ONLINE</p>
          </div>
        </div>

        {/* Real-time Activity Feed */}
        <div className="bg-navy-800/50 rounded-2xl border border-gold-500/20 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Activitate în Timp Real</h2>
            <button
              onClick={() => setRealtimeEnabled(!realtimeEnabled)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                realtimeEnabled
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-navy-700 hover:bg-navy-600 text-slate-300'
              }`}
            >
              {realtimeEnabled ? 'LIVE' : 'Pauzat'}
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {activityToDisplay.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Nicio activitate recentă</p>
            ) : (
              activityToDisplay.map((log) => (
                <div
                  key={log.id}
                  className="bg-navy-900/50 rounded-lg p-4 border border-gold-500/10 hover:border-gold-500/20 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`text-sm font-mono font-semibold ${
                            log.eventType.includes('error') || log.eventType.includes('suspicious')
                              ? 'text-red-400'
                              : log.eventType.startsWith('admin_')
                              ? 'text-purple-400'
                              : log.eventType.includes('login')
                              ? 'text-green-400'
                              : 'text-blue-400'
                          }`}
                        >
                          {log.eventType}
                        </span>
                        {log.isAdmin && (
                          <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs font-semibold border border-purple-500/30">
                            ADMIN
                          </span>
                        )}
                        <span className="text-slate-400 text-sm">
                          {formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true, locale: ro })}
                        </span>
                      </div>
                      <div className="text-slate-300 text-sm">
                        <span className="text-slate-500">Utilizator:</span>{' '}
                        <span className="text-gold-400 font-mono">
                          {log.userName || log.userEmail || log.userId.slice(0, 8)}
                        </span>
                        {log.metadata.page && (
                          <>
                            {' | '}
                            <span className="text-slate-500">Pagină:</span> {log.metadata.page}
                          </>
                        )}
                        {log.metadata.device && (
                          <>
                            {' | '}
                            <span className="text-slate-500">Dispozitiv:</span> {log.metadata.device}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Suspicious Activity Alert */}
        {stats && stats.suspiciousActivity.length > 0 && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-red-300 mb-4">
              Alerte Securitate ({stats.suspiciousActivity.length})
            </h2>
            <div className="space-y-2">
              {stats.suspiciousActivity.slice(0, 5).map((log) => (
                <div key={log.id} className="bg-red-900/30 rounded-lg p-4 border border-red-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-red-300 font-semibold">{log.eventType}</span>
                      <p className="text-sm text-red-200 mt-1">
                        Utilizator: {log.userName || log.userEmail || log.userId}
                      </p>
                      {log.metadata.ipAddress && (
                        <p className="text-xs text-red-200 mt-1">IP: {log.metadata.ipAddress}</p>
                      )}
                    </div>
                    <span className="text-xs text-red-300">
                      {formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true, locale: ro })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/admin/activity-logs"
              className="mt-4 inline-block text-red-300 hover:text-red-200 font-semibold"
            >
              Vezi toate alertele →
            </Link>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            href="/admin/users"
            className="bg-navy-800/50 hover:bg-navy-700/50 border border-gold-500/20 hover:border-gold-500/40 rounded-lg p-6 transition-colors"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Gestionare Utilizatori</h3>
            <p className="text-sm text-slate-400">
              Vizualizează, editează și controlează conturile utilizatorilor
            </p>
          </Link>

          <Link
            href="/admin/transactions"
            className="bg-navy-800/50 hover:bg-navy-700/50 border border-gold-500/20 hover:border-gold-500/40 rounded-lg p-6 transition-colors"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Tranzacții</h3>
            <p className="text-sm text-slate-400">
              Comenzi + licitații încheiate, cu chat și detalii
            </p>
          </Link>

          <Link
            href="/admin/activity-logs"
            className="bg-navy-800/50 hover:bg-navy-700/50 border border-gold-500/20 hover:border-gold-500/40 rounded-lg p-6 transition-colors"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Loguri Detaliate</h3>
            <p className="text-sm text-slate-400">
              Monitorizare completă a activității utilizatorilor
            </p>
          </Link>

          <Link
            href="/admin/conversations"
            className="bg-navy-800/50 hover:bg-navy-700/50 border border-gold-500/20 hover:border-gold-500/40 rounded-lg p-6 transition-colors"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Conversații</h3>
            <p className="text-sm text-slate-400">
              Monitorizează mesajele și conversațiile utilizatorilor
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
