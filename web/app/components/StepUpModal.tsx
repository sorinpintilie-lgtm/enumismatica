'use client';

import { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../lib/firebase';

type StepUpModalProps = {
  open: boolean;
  onClose: () => void;
  actions: string[];
  title?: string;
  description?: string;
  onVerified: (stepUpToken: string) => void | Promise<void>;
};

export function StepUpModal(props: StepUpModalProps) {
  const { open, onClose, actions, onVerified, title, description } = props;

  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  if (!open) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const current = auth.currentUser;
    if (!current?.email) {
      setError('Nu ești autentificat.');
      return;
    }
    if (!password) {
      setError('Introdu parola curentă.');
      return;
    }
    if (!code.trim()) {
      setError(useBackupCode ? 'Introdu un cod de rezervă.' : 'Introdu codul 2FA.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: re-authenticate with password (updates auth_time on fresh token).
      const credential = EmailAuthProvider.credential(current.email, password);
      await reauthenticateWithCredential(current, credential);
      const token = await current.getIdToken(true);

      // Step 2: verify 2FA server-side and issue a one-time step-up token.
      const res = await fetch('/api/auth/step-up/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          method: useBackupCode ? 'backup' : 'totp',
          code,
          actions,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Nu s-a putut verifica securitatea.');
      }

      const data = await res.json();
      const stepUpToken = String(data?.stepUpToken || '').trim();
      if (!stepUpToken) throw new Error('Token invalid.');

      await onVerified(stepUpToken);
      setPassword('');
      setCode('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Nu s-a putut verifica.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-gold-500/30 bg-navy-900/95 p-6 shadow-[0_22px_80px_rgba(0,0,0,0.9)]">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{title || 'Confirmare securitate'}</h3>
            <p className="text-xs text-slate-400 mt-1">
              {description || 'Confirmă parola + 2FA pentru a continua.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-white" aria-label="Închide">
            ✕
          </button>
        </div>

        <form onSubmit={handleVerify} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">Parola curentă</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(false);
                setCode('');
                setError('');
              }}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                !useBackupCode
                  ? 'bg-gold-500 text-navy-900 border-gold-400'
                  : 'bg-navy-900/40 text-slate-200 border-gold-500/30 hover:bg-navy-900/60'
              }`}
            >
              Cod 2FA
            </button>
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(true);
                setCode('');
                setError('');
              }}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                useBackupCode
                  ? 'bg-gold-500 text-navy-900 border-gold-400'
                  : 'bg-navy-900/40 text-slate-200 border-gold-500/30 hover:bg-navy-900/60'
              }`}
            >
              Cod de rezervă
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">
              {useBackupCode ? 'Cod de rezervă' : 'Cod 2FA (6 cifre)'}
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={useBackupCode ? 'ABCD-EF12' : '000000'}
              maxLength={useBackupCode ? 9 : 6}
              className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none text-center tracking-widest"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-200 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold-500 hover:bg-gold-600 text-navy-900 px-6 py-2 rounded-lg font-semibold disabled:opacity-60"
          >
            {loading ? 'Se verifică...' : 'Confirmă'}
          </button>
        </form>
      </div>
    </div>
  );
}

