'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { isAdmin } from 'shared/adminService';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface SuspiciousUser {
  userId: string;
  score: number;
  suspiciousEvents: string[];
  reason: string;
}

interface UnusualPattern {
  pattern: string;
  count: number;
  usersAffected: string[];
}

interface BehavioralAnalysisData {
  suspiciousUsers: SuspiciousUser[];
  unusualPatterns: UnusualPattern[];
}

export default function BehavioralAnalysisPanel() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<BehavioralAnalysisData | null>(null);
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
      fetchBehavioralAnalysis();
    };

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!autoRefresh || !isAdminUser) return;

    const interval = setInterval(() => {
      fetchBehavioralAnalysis();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, isAdminUser]);

  const fetchBehavioralAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/analytics/behavioral-patterns');
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to fetch behavioral analysis');
        return;
      }

      setAnalysis(data.data);
    } catch (error) {
      console.error('Failed to fetch behavioral analysis:', error);
      setError('Failed to fetch behavioral analysis');
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
    <div className="bg-navy-800/50 rounded-xl p-6 border border-red-500/20">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-white">Analiză Comportamentală</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchBehavioralAnalysis}
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

      {/* Suspicious Users */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-red-400 mb-3">Utilizatori Suspecți</h4>
        {analysis?.suspiciousUsers?.length === 0 ? (
          <div className="text-slate-400 text-sm">Niciun utilizator suspect detectat</div>
        ) : (
          <div className="space-y-3">
            {analysis?.suspiciousUsers?.map((suspiciousUser) => (
              <div key={suspiciousUser.userId} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-red-400">{suspiciousUser.userId}</span>
                      <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded text-xs font-semibold">
                        Scor: {suspiciousUser.score}%
                      </span>
                    </div>
                    <div className="text-sm text-slate-300 mb-2">
                      {suspiciousUser.reason}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {suspiciousUser.suspiciousEvents.map((event, index) => (
                        <span key={index} className="bg-red-600/20 text-red-300 px-2 py-1 rounded text-xs">
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unusual Patterns */}
      <div>
        <h4 className="text-lg font-semibold text-yellow-400 mb-3">Modele Neobișnuite</h4>
        {analysis?.unusualPatterns?.length === 0 ? (
          <div className="text-slate-400 text-sm">Niciun model neobișnuit detectat</div>
        ) : (
          <div className="space-y-3">
            {analysis?.unusualPatterns?.map((pattern, index) => (
              <div key={index} className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-sm font-mono text-yellow-400 mb-1">
                      {pattern.pattern}
                    </div>
                    <div className="text-sm text-slate-300 mb-2">
                      {pattern.count} evenimente, {pattern.usersAffected.length} utilizatori afectați
                    </div>
                  </div>
                  <div className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs font-semibold ml-2">
                    Frecvență: {pattern.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}