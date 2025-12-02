'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAdmin } from 'shared/adminService';
import BehavioralAnalysisPanel from './components/BehavioralAnalysisPanel';
import SessionAnalyticsView from './components/SessionAnalyticsView';

export default function AnalyticsDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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
      setLoading(false);
    };

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading, router]);

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
        <h1 className="text-4xl font-bold text-white mb-2">Panou Analitic Admin</h1>
        <p className="text-slate-300">Analiză avansată a activității platformei și comportamentului utilizatorilor</p>
      </div>

      {/* Navigation */}
      <div className="mb-6">
        <nav className="flex gap-4 text-sm">
          <Link href="/admin" className="text-slate-400 hover:text-gold-400">Admin</Link>
          <span className="text-slate-500">{'>'}</span>
          <span className="text-gold-400 font-semibold">Analitice</span>
        </nav>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex gap-2 border-b border-gold-500/20">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'overview'
                ? 'border-b-2 border-gold-500 text-gold-400'
                : 'text-slate-400 hover:text-gold-400'
            }`}
          >
            Prezentare Generală
          </button>
          <button
            onClick={() => setActiveTab('behavioral')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'behavioral'
                ? 'border-b-2 border-gold-500 text-gold-400'
                : 'text-slate-400 hover:text-gold-400'
            }`}
          >
            Analiză Comportamentală
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'sessions'
                ? 'border-b-2 border-gold-500 text-gold-400'
                : 'text-slate-400 hover:text-gold-400'
            }`}
          >
            Analiză Sesiuni
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Activity Analytics Link */}
            <div className="bg-navy-800/50 rounded-xl p-6 border border-gold-500/20 hover:border-gold-500/40 transition-colors">
              <h3 className="text-xl font-semibold text-white mb-3">Analiză Activitate Utilizatori</h3>
              <p className="text-slate-300 mb-4">Analiză detaliată a activității individuale a utilizatorilor</p>
              <Link
                href="/admin/analytics/user-activity"
                className="inline-block bg-gold-500 hover:bg-gold-600 text-navy-900 px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Deschide Analiză Utilizatori
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="bg-navy-800/50 rounded-xl p-6 border border-blue-500/20">
              <h3 className="text-xl font-semibold text-white mb-4">Statistici Rapide</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">1,248</div>
                  <div className="text-sm text-slate-400">Utilizatori Activi</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">87%</div>
                  <div className="text-sm text-slate-400">Scor Mediu Angajament</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">42</div>
                  <div className="text-sm text-slate-400">Sesiuni Active</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">3</div>
                  <div className="text-sm text-slate-400">Alerte de Securitate</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'behavioral' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <BehavioralAnalysisPanel />
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <SessionAnalyticsView />
            </div>
          </div>
        )}
      </div>

      {/* Additional Links */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/activity-logs"
          className="bg-navy-800/50 rounded-xl p-4 border border-gold-500/20 hover:border-gold-500/40 transition-colors flex justify-between items-center"
        >
          <span className="text-gold-400 font-semibold">Loguri Activitate Complete</span>
          <span className="text-slate-400">{'>'}</span>
        </Link>
        <Link
          href="/admin/users"
          className="bg-navy-800/50 rounded-xl p-4 border border-blue-500/20 hover:border-blue-500/40 transition-colors flex justify-between items-center"
        >
          <span className="text-blue-400 font-semibold">Gestionare Utilizatori</span>
          <span className="text-slate-400">{'>'}</span>
        </Link>
      </div>
    </div>
  );
}