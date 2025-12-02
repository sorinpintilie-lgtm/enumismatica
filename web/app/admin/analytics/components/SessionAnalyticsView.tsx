'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { isAdmin } from 'shared/adminService';

interface SessionAnalyticsData {
  totalSessions: number;
  activeSessions: number;
  averageSessionDuration: number;
  sessionDurationDistribution: Record<string, number>;
  engagementBySession: Record<string, {
    sessionId: string;
    duration: number;
    engagementScore: number;
    eventCount: number;
  }>;
}

export default function SessionAnalyticsView() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<SessionAnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

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

      setIsAdminUser(true);
      fetchSessionAnalytics();
    };

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!autoRefresh || !isAdminUser) return;

    const interval = setInterval(() => {
      fetchSessionAnalytics();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, isAdminUser]);

  const fetchSessionAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/analytics/session-metrics');
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to fetch session analytics');
        return;
      }

      setSessionData(data.data);
    } catch (error) {
      console.error('Failed to fetch session analytics:', error);
      setError('Failed to fetch session analytics');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading || !isAdminUser) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-navy-800/50 rounded-xl p-6 border border-purple-500/20">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-white">Analiză Sesiuni</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSessionAnalytics}
            disabled={loading}
            className="bg-gold-500 hover:bg-gold-600 text-navy-900 px-3 py-1 rounded text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Se încarcă...' : 'Actualizează'}
          </button>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-slate-300">Actualizare automată</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">{sessionData?.totalSessions}</div>
          <div className="text-sm text-slate-400">Sesiuni Totale</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{sessionData?.activeSessions}</div>
          <div className="text-sm text-slate-400">Sesiuni Active</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{sessionData?.averageSessionDuration}s</div>
          <div className="text-sm text-slate-400">Durată Medie</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {sessionData ? Math.round((sessionData.activeSessions / sessionData.totalSessions) * 100) : 0}%
          </div>
          <div className="text-sm text-slate-400">Rată Activitate</div>
        </div>
      </div>

      {/* Duration Distribution */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-purple-400 mb-3">Distribuție Durată Sesiuni</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {sessionData?.sessionDurationDistribution && Object.entries(sessionData.sessionDurationDistribution).map(([range, count]) => (
            <div key={range} className="bg-navy-700/50 rounded-lg p-3">
              <div className="text-lg font-bold text-purple-400">{count}</div>
              <div className="text-xs text-slate-400 truncate">{range}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Engaged Sessions */}
      <div>
        <h4 className="text-lg font-semibold text-green-400 mb-3">Sesiuni cu Cel Mai Mare Angajament</h4>
        {sessionData?.engagementBySession && Object.values(sessionData.engagementBySession)
          .sort((a, b) => b.engagementScore - a.engagementScore)
          .slice(0, 5)
          .map((session) => (
            <div key={session.sessionId} className="bg-navy-700/50 rounded-lg p-3 mb-2">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="text-sm font-mono text-green-400 truncate mb-1">
                    {session.sessionId}
                  </div>
                  <div className="text-xs text-slate-400">
                    {session.duration}s • {session.eventCount} evenimente • Scor: {session.engagementScore}%
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}