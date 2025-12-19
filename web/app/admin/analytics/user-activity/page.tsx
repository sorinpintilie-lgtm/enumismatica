'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAdmin, isSuperAdmin } from 'shared/adminService';
import { formatDistanceToNow, format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface UserActivityAnalytics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  lastActivity: Date | null;
  sessionsCount: number;
  engagementScore: number;
  suspiciousScore: number;
  sessionDurationStats: {
    average: number;
    total: number;
    longest: number;
    shortest: number;
  };
  geoDistribution: Record<string, number>;
}

export default function UserActivityAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [analytics, setAnalytics] = useState<UserActivityAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('7days');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
		const checkAdmin = async () => {
			if (!user) {
				router.push('/login');
				return;
			}

			const adminStatus = await isAdmin(user.uid);
			if (!adminStatus) {
				router.push('/dashboard');
				return;
			}

			// User activity analytics is restricted to super-admins.
			const superAdminStatus = await isSuperAdmin(user.uid);
			if (!superAdminStatus) {
				router.push('/admin/moderator');
				return;
			}

			setIsAdminUser(true);
			setLoading(false);
    };

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading, router]);

  const fetchUserAnalytics = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/analytics/user-activity?userId=${userId}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to fetch user analytics');
        return;
      }

      setAnalytics(data.data);
    } catch (error) {
      console.error('Failed to fetch user analytics:', error);
      setError('Failed to fetch user analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      setUserId(searchTerm.trim());
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Analiză Activitate Utilizatori</h1>
        <p className="text-slate-300">Analiză avansată a comportamentului și angajamentului utilizatorilor</p>
      </div>

      {/* Navigation */}
      <div className="mb-6">
        <nav className="flex gap-4 text-sm">
          <Link href="/admin" className="text-slate-400 hover:text-gold-400">Admin</Link>
          <span className="text-slate-500">{'>'}</span>
          <Link href="/admin/analytics" className="text-slate-400 hover:text-gold-400">Analitice</Link>
          <span className="text-slate-500">{'>'}</span>
          <span className="text-gold-400 font-semibold">Activitate Utilizatori</span>
        </nav>
      </div>

      {/* Controls */}
      <div className="bg-navy-800/50 rounded-2xl p-6 mb-6 backdrop-blur-sm border border-gold-500/20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* User Search */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">ID Utilizator</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Caută utilizator..."
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

          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Perioadă</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full bg-navy-700 border border-gold-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gold-500"
            >
              <option value="24h">Ultimile 24 de ore</option>
              <option value="7days">Ultimile 7 zile</option>
              <option value="30days">Ultimile 30 de zile</option>
              <option value="90days">Ultimile 90 de zile</option>
              <option value="all">Toate datele</option>
            </select>
          </div>

          {/* Action Button */}
          <div className="flex items-end">
            <button
              onClick={fetchUserAnalytics}
              disabled={!userId || loading}
              className={`w-full bg-gold-500 hover:bg-gold-600 text-navy-900 px-6 py-2 rounded-lg font-semibold transition-colors ${!userId || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Se încarcă...' : 'Analizează'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-300">
          {error}
        </div>
      )}

      {/* Analytics Display */}
      {analytics && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-navy-800/50 rounded-xl p-6 border border-gold-500/20">
              <div className="text-3xl font-bold text-gold-400 mb-2">{analytics.totalEvents}</div>
              <div className="text-sm text-slate-400">Evenimente Totale</div>
            </div>

            <div className="bg-navy-800/50 rounded-xl p-6 border border-blue-500/20">
              <div className="text-3xl font-bold text-blue-400 mb-2">{analytics.sessionsCount}</div>
              <div className="text-sm text-slate-400">Sesiuni</div>
            </div>

            <div className="bg-navy-800/50 rounded-xl p-6 border border-green-500/20">
              <div className="text-3xl font-bold text-green-400 mb-2">{analytics.engagementScore}%</div>
              <div className="text-sm text-slate-400">Scor Angajament</div>
            </div>

            <div className="bg-navy-800/50 rounded-xl p-6 border border-red-500/20">
              <div className="text-3xl font-bold text-red-400 mb-2">{analytics.suspiciousScore}%</div>
              <div className="text-sm text-slate-400">Scor Activitate Suspectă</div>
            </div>
          </div>

          {/* Session Metrics */}
          <div className="bg-navy-800/50 rounded-xl p-6 border border-gold-500/20">
            <h3 className="text-xl font-semibold text-white mb-4">Metrice Sesiuni</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{analytics.sessionDurationStats.average}s</div>
                <div className="text-sm text-slate-400">Durată Medie Sesiune</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{analytics.sessionDurationStats.longest}s</div>
                <div className="text-sm text-slate-400">Sesiune Cea Mai Lungă</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{analytics.sessionDurationStats.shortest}s</div>
                <div className="text-sm text-slate-400">Sesiune Cea Mai Scurtă</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{analytics.sessionDurationStats.total}s</div>
                <div className="text-sm text-slate-400">Durată Totală Sesiuni</div>
              </div>
            </div>
          </div>

          {/* Event Type Distribution */}
          <div className="bg-navy-800/50 rounded-xl p-6 border border-gold-500/20">
            <h3 className="text-xl font-semibold text-white mb-4">Distribuție Tipuri Evenimente</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(analytics.eventsByType)
                .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
                .slice(0, 8)
                .map(([eventType, count]) => (
                  <div key={eventType} className="bg-navy-700/50 rounded-lg p-3">
                    <div className="text-lg font-bold text-gold-400">{count}</div>
                    <div className="text-xs text-slate-400 truncate">{eventType}</div>
                  </div>
                ))}
            </div>
          </div>

          {/* Geographic Distribution */}
          {Object.keys(analytics.geoDistribution).length > 0 && (
            <div className="bg-navy-800/50 rounded-xl p-6 border border-gold-500/20">
              <h3 className="text-xl font-semibold text-white mb-4">Distribuție Geografică</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(analytics.geoDistribution)
                  .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
                  .map(([country, count]) => (
                    <div key={country} className="bg-navy-700/50 rounded-lg p-3">
                      <div className="text-lg font-bold text-blue-400">{count}</div>
                      <div className="text-xs text-slate-400 truncate">{country}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Last Activity */}
          <div className="bg-navy-800/50 rounded-xl p-6 border border-gold-500/20">
            <h3 className="text-xl font-semibold text-white mb-4">Ultima Activitate</h3>
            {analytics.lastActivity ? (
              <div className="text-slate-300">
                <div className="text-lg">
                  {format(analytics.lastActivity, 'PPPPpppp', { locale: ro })}
                </div>
                <div className="text-sm text-slate-400">
                  ({formatDistanceToNow(analytics.lastActivity, { addSuffix: true, locale: ro })})
                </div>
              </div>
            ) : (
              <div className="text-slate-400">Niciună</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
