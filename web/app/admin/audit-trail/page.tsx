'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { getAdminActions, UserControlAction } from 'shared/adminControlService';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';

export default function AuditTrailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [actions, setActions] = useState<UserControlAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.isAdmin) {
      loadAuditTrail();
    }
  }, [user]);

  const loadAuditTrail = async () => {
    try {
      setLoading(true);
      const adminActions = await getAdminActions(200);
      // Sort by timestamp descending
      adminActions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActions(adminActions);
    } catch (error) {
      console.error('Failed to load audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string): string => {
    switch (action) {
      case 'ban':
      case 'delete':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'unban':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'role_change':
        return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
      case 'password_reset':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'update_credits':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      default:
        return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
    }
  };

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      ban: 'Blocare Utilizator',
      unban: 'Deblocare Utilizator',
      delete: 'Ștergere Cont',
      role_change: 'Schimbare Rol',
      password_reset: 'Resetare Parolă',
      update_credits: 'Actualizare Credite',
    };
    return labels[action] || action;
  };

  if (authLoading || !user?.isAdmin) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Audit Trail Admin</h1>
        <p className="text-slate-300">Istoric complet al acțiunilor administrative</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
          <p className="text-sm text-slate-400">Total Acțiuni</p>
          <p className="text-2xl font-bold text-white">{actions.length}</p>
        </div>
        <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
          <p className="text-sm text-slate-400">Blocări</p>
          <p className="text-2xl font-bold text-red-400">
            {actions.filter((a) => a.action === 'ban').length}
          </p>
        </div>
        <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
          <p className="text-sm text-slate-400">Resetări Parolă</p>
          <p className="text-2xl font-bold text-blue-400">
            {actions.filter((a) => a.action === 'password_reset').length}
          </p>
        </div>
        <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
          <p className="text-sm text-slate-400">Schimbări Rol</p>
          <p className="text-2xl font-bold text-purple-400">
            {actions.filter((a) => a.action === 'role_change').length}
          </p>
        </div>
      </div>

      {/* Actions List */}
      <div className="bg-navy-800/50 rounded-2xl border border-gold-500/20 p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Istoric Acțiuni</h2>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto"></div>
            <p className="text-slate-300 mt-4">Se încarcă...</p>
          </div>
        ) : actions.length === 0 ? (
          <p className="text-slate-400 text-center py-12">Nicio acțiune administrativă înregistrată</p>
        ) : (
          <div className="space-y-2">
            {actions.map((action, index) => (
              <div
                key={`${action.userId}-${action.timestamp.getTime()}-${index}`}
                className="bg-navy-900/50 rounded-lg p-4 border border-gold-500/10 hover:border-gold-500/20 transition-colors cursor-pointer"
                onClick={() => setExpandedAction(expandedAction === `${index}` ? null : `${index}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-lg text-sm font-semibold border ${getActionColor(action.action)}`}>
                        {getActionLabel(action.action)}
                      </span>
                      <span className="text-slate-400 text-sm">
                        {formatDistanceToNow(action.timestamp, { addSuffix: true, locale: ro })}
                      </span>
                    </div>
                    
                    <div className="text-slate-300 text-sm space-y-1">
                      <div>
                        <span className="text-slate-500">Admin:</span>{' '}
                        <span className="text-gold-400 font-mono">{action.performedByEmail}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Utilizator Țintă:</span>{' '}
                        <span className="text-white font-mono">{action.metadata?.targetUserEmail || action.userId}</span>
                      </div>
                      {action.reason && (
                        <div>
                          <span className="text-slate-500">Motiv:</span>{' '}
                          <span className="text-slate-300">{action.reason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button className="text-slate-400 hover:text-white transition-colors ml-4">
                    {expandedAction === `${index}` ? '▼' : '▶'}
                  </button>
                </div>

                {/* Expanded Details */}
                {expandedAction === `${index}` && (
                  <div className="mt-4 pt-4 border-t border-gold-500/20">
                    <div className="bg-navy-900/80 rounded-lg p-4">
                      <h4 className="text-gold-400 font-semibold mb-2">Detalii Complete:</h4>
                      <pre className="text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono">
                        {JSON.stringify(
                          {
                            ...action,
                            timestamp: action.timestamp.toISOString(),
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}