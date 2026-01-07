'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  updatePassword,
  sendPasswordResetEmail as firebaseSendPasswordReset,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import {
  sendPasswordChangedEmail,
  send2FAEnabledEmail,
  send2FADisabledEmail
} from 'shared/emailService';
import { doc, updateDoc, getDoc, serverTimestamp, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorQR, setTwoFactorQR] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [twoFactorSuccess, setTwoFactorSuccess] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);

  // Email preferences
  const [emailNotifications, setEmailNotifications] = useState({
    marketing: true,
    auctions: true,
    messages: true,
    purchases: true,
    security: true,
  });
  const [emailPrefsLoading, setEmailPrefsLoading] = useState(false);
  const [emailPrefsSuccess, setEmailPrefsSuccess] = useState('');

  // Security log
  const [securityLog, setSecurityLog] = useState<any[]>([]);
  const [securityLogLoading, setSecurityLogLoading] = useState(false);

  // Account deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.uid) {
      loadUserSettings();
      loadSecurityLog();
    }
  }, [user?.uid]);

  const loadUserSettings = async () => {
    if (!user?.uid) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setTwoFactorEnabled(data.twoFactorEnabled || false);
        setEmailNotifications(data.emailNotifications || {
          marketing: true,
          auctions: true,
          messages: true,
          purchases: true,
          security: true,
        });
      }
    } catch (err) {
      console.error('Failed to load user settings', err);
    }
  };

  const loadSecurityLog = async () => {
    if (!user?.uid) return;
    setSecurityLogLoading(true);
    try {
      const logsRef = collection(db, 'securityLogs');
      const q = query(
        logsRef,
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(),
      }));
      setSecurityLog(logs);
    } catch (err) {
      console.error('Failed to load security log', err);
    } finally {
      setSecurityLogLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!user || !auth.currentUser) {
      setPasswordError('Nu ești autentificat.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Parola nouă trebuie să aibă cel puțin 6 caractere.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Parolele nu se potrivesc.');
      return;
    }

    setPasswordLoading(true);

    try {
      // Reauthenticate user
      const credential = EmailAuthProvider.credential(
        user.email!,
        currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, newPassword);

      // Log security event
      await logSecurityEvent('password_changed', 'Parolă schimbată cu succes');

      // Send email notification
      try {
        await sendPasswordChangedEmail(user.email!);
      } catch (emailErr) {
        console.error('Failed to send password change email:', emailErr);
      }

      setPasswordSuccess('Parola a fost schimbată cu succes!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password change error:', err);
      if (err.code === 'auth/wrong-password') {
        setPasswordError('Parola curentă este incorectă.');
      } else {
        setPasswordError(err.message || 'Nu s-a putut schimba parola.');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (!user?.uid) return;
    setTwoFactorLoading(true);
    setTwoFactorError('');

    try {
      // Call API to generate 2FA secret
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!res.ok) {
        throw new Error('Failed to setup 2FA');
      }

      const data = await res.json();
      setTwoFactorSecret(data.secret);
      setTwoFactorQR(data.qrCode);
    } catch (err: any) {
      setTwoFactorError(err.message || 'Nu s-a putut activa 2FA.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!user?.uid || !twoFactorCode) return;
    setTwoFactorLoading(true);
    setTwoFactorError('');

    try {
      // Verify the code
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.uid, 
          code: twoFactorCode,
          secret: twoFactorSecret 
        }),
      });

      if (!res.ok) {
        throw new Error('Cod invalid');
      }

      // Enable 2FA in user document
      await updateDoc(doc(db, 'users', user.uid), {
        twoFactorEnabled: true,
        twoFactorSecret: twoFactorSecret,
        updatedAt: serverTimestamp(),
      });

      await logSecurityEvent('2fa_enabled', 'Autentificare cu doi factori activată');

      // Send email notification
      try {
        await send2FAEnabledEmail(user.email!);
      } catch (emailErr) {
        console.error('Failed to send 2FA enabled email:', emailErr);
      }

      setTwoFactorEnabled(true);
      setTwoFactorSuccess('Autentificarea cu doi factori a fost activată!');
      setTwoFactorSecret('');
      setTwoFactorQR('');
      setTwoFactorCode('');
    } catch (err: any) {
      setTwoFactorError(err.message || 'Cod invalid. Te rugăm să încerci din nou.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!user?.uid) return;
    const confirmed = window.confirm('Ești sigur că vrei să dezactivezi autentificarea cu doi factori?');
    if (!confirmed) return;

    setTwoFactorLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        updatedAt: serverTimestamp(),
      });

      await logSecurityEvent('2fa_disabled', 'Autentificare cu doi factori dezactivată');

      // Send email notification
      try {
        await send2FADisabledEmail(user.email!);
      } catch (emailErr) {
        console.error('Failed to send 2FA disabled email:', emailErr);
      }

      setTwoFactorEnabled(false);
      setTwoFactorSuccess('Autentificarea cu doi factori a fost dezactivată.');
    } catch (err: any) {
      setTwoFactorError(err.message || 'Nu s-a putut dezactiva 2FA.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleSaveEmailPreferences = async () => {
    if (!user?.uid) return;
    setEmailPrefsLoading(true);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        emailNotifications,
        updatedAt: serverTimestamp(),
      });

      setEmailPrefsSuccess('Preferințele au fost salvate!');
      setTimeout(() => setEmailPrefsSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to save email preferences', err);
    } finally {
      setEmailPrefsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.uid || deleteConfirmText !== 'ȘTERGE CONTUL') {
      return;
    }

    setDeleteLoading(true);
    try {
      // Call API to delete account
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!res.ok) {
        throw new Error('Failed to delete account');
      }

      // Sign out and redirect
      await auth.signOut();
      router.push('/');
    } catch (err: any) {
      alert(err.message || 'Nu s-a putut șterge contul.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const logSecurityEvent = async (action: string, description: string) => {
    if (!user?.uid) return;
    try {
      const logRef = collection(db, 'securityLogs');
      await updateDoc(doc(logRef), {
        userId: user.uid,
        action,
        description,
        timestamp: serverTimestamp(),
        ipAddress: 'N/A', // Would need server-side implementation
      });
      loadSecurityLog();
    } catch (err) {
      console.error('Failed to log security event', err);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-gold-400 hover:text-gold-300 text-sm mb-2 inline-block">
            ← Înapoi la Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white">Setări Cont</h1>
          <p className="text-slate-300 mt-2">Gestionează securitatea și preferințele contului tău</p>
        </div>

        <div className="space-y-6">
          {/* Password Change Section */}
          <div className="bg-gradient-to-br from-navy-600 to-navy-800 backdrop-blur-sm p-6 rounded-2xl border border-gold-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            <h2 className="text-xl font-semibold text-white mb-4">Schimbă Parola</h2>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Parola curentă</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Parola nouă</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Confirmă parola nouă</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                  required
                  minLength={6}
                />
              </div>

              {passwordError && (
                <p className="text-sm text-red-200 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
                  {passwordError}
                </p>
              )}

              {passwordSuccess && (
                <p className="text-sm text-emerald-200 border border-emerald-500/30 bg-emerald-500/10 rounded-lg px-3 py-2">
                  {passwordSuccess}
                </p>
              )}

              <button
                type="submit"
                disabled={passwordLoading}
                className="bg-gold-500 hover:bg-gold-600 text-navy-900 px-6 py-2 rounded-lg font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {passwordLoading ? 'Se schimbă...' : 'Schimbă Parola'}
              </button>
            </form>
          </div>

          {/* 2FA Section */}
          <div className="bg-gradient-to-br from-navy-600 to-navy-800 backdrop-blur-sm p-6 rounded-2xl border border-gold-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Autentificare cu Doi Factori (2FA)</h2>
                <p className="text-sm text-slate-300 mt-1">
                  Adaugă un nivel suplimentar de securitate contului tău
                </p>
              </div>
              {twoFactorEnabled && (
                <span className="px-3 py-1 text-xs rounded-full font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">
                  ACTIVAT
                </span>
              )}
            </div>

            {!twoFactorEnabled ? (
              <>
                {!twoFactorSecret ? (
                  <button
                    onClick={handleEnable2FA}
                    disabled={twoFactorLoading}
                    className="bg-gold-500 hover:bg-gold-600 text-navy-900 px-6 py-2 rounded-lg font-semibold disabled:opacity-60"
                  >
                    {twoFactorLoading ? 'Se configurează...' : 'Activează 2FA'}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-navy-900/40 rounded-lg p-4">
                      <p className="text-sm text-slate-200 mb-3">
                        Scanează acest cod QR cu aplicația ta de autentificare (Google Authenticator, Authy, etc.):
                      </p>
                      {twoFactorQR && (
                        <div className="flex justify-center mb-4">
                          <img src={twoFactorQR} alt="QR Code" className="w-48 h-48" />
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mb-2">Sau introdu manual acest cod:</p>
                      <code className="block bg-navy-950 text-gold-300 p-2 rounded text-sm font-mono break-all">
                        {twoFactorSecret}
                      </code>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-1">
                        Introdu codul din aplicație pentru verificare
                      </label>
                      <input
                        type="text"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value)}
                        placeholder="000000"
                        maxLength={6}
                        className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={handleVerify2FA}
                      disabled={twoFactorLoading || twoFactorCode.length !== 6}
                      className="bg-gold-500 hover:bg-gold-600 text-navy-900 px-6 py-2 rounded-lg font-semibold disabled:opacity-60"
                    >
                      {twoFactorLoading ? 'Se verifică...' : 'Verifică și Activează'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-emerald-200">
                  Autentificarea cu doi factori este activată pentru contul tău.
                </p>
                <button
                  onClick={handleDisable2FA}
                  disabled={twoFactorLoading}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 px-6 py-2 rounded-lg font-semibold disabled:opacity-60"
                >
                  {twoFactorLoading ? 'Se dezactivează...' : 'Dezactivează 2FA'}
                </button>
              </div>
            )}

            {twoFactorError && (
              <p className="text-sm text-red-200 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2 mt-4">
                {twoFactorError}
              </p>
            )}

            {twoFactorSuccess && (
              <p className="text-sm text-emerald-200 border border-emerald-500/30 bg-emerald-500/10 rounded-lg px-3 py-2 mt-4">
                {twoFactorSuccess}
              </p>
            )}
          </div>

          {/* Email Notifications */}
          <div className="bg-gradient-to-br from-navy-600 to-navy-800 backdrop-blur-sm p-6 rounded-2xl border border-gold-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            <h2 className="text-xl font-semibold text-white mb-4">Preferințe Email</h2>
            
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-navy-900/40 rounded-lg cursor-pointer hover:bg-navy-900/60">
                <span className="text-sm text-slate-200">Notificări marketing și oferte</span>
                <input
                  type="checkbox"
                  checked={emailNotifications.marketing}
                  onChange={(e) => setEmailNotifications(prev => ({ ...prev, marketing: e.target.checked }))}
                  className="w-5 h-5 text-gold-500 rounded focus:ring-gold-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-navy-900/40 rounded-lg cursor-pointer hover:bg-navy-900/60">
                <span className="text-sm text-slate-200">Notificări licitații</span>
                <input
                  type="checkbox"
                  checked={emailNotifications.auctions}
                  onChange={(e) => setEmailNotifications(prev => ({ ...prev, auctions: e.target.checked }))}
                  className="w-5 h-5 text-gold-500 rounded focus:ring-gold-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-navy-900/40 rounded-lg cursor-pointer hover:bg-navy-900/60">
                <span className="text-sm text-slate-200">Notificări mesaje noi</span>
                <input
                  type="checkbox"
                  checked={emailNotifications.messages}
                  onChange={(e) => setEmailNotifications(prev => ({ ...prev, messages: e.target.checked }))}
                  className="w-5 h-5 text-gold-500 rounded focus:ring-gold-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-navy-900/40 rounded-lg cursor-pointer hover:bg-navy-900/60">
                <span className="text-sm text-slate-200">Notificări cumpărături și vânzări</span>
                <input
                  type="checkbox"
                  checked={emailNotifications.purchases}
                  onChange={(e) => setEmailNotifications(prev => ({ ...prev, purchases: e.target.checked }))}
                  className="w-5 h-5 text-gold-500 rounded focus:ring-gold-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-navy-900/40 rounded-lg cursor-pointer hover:bg-navy-900/60">
                <span className="text-sm text-slate-200">Alerte de securitate (recomandat)</span>
                <input
                  type="checkbox"
                  checked={emailNotifications.security}
                  onChange={(e) => setEmailNotifications(prev => ({ ...prev, security: e.target.checked }))}
                  className="w-5 h-5 text-gold-500 rounded focus:ring-gold-500"
                />
              </label>
            </div>

            {emailPrefsSuccess && (
              <p className="text-sm text-emerald-200 border border-emerald-500/30 bg-emerald-500/10 rounded-lg px-3 py-2 mt-4">
                {emailPrefsSuccess}
              </p>
            )}

            <button
              onClick={handleSaveEmailPreferences}
              disabled={emailPrefsLoading}
              className="mt-4 bg-gold-500 hover:bg-gold-600 text-navy-900 px-6 py-2 rounded-lg font-semibold disabled:opacity-60"
            >
              {emailPrefsLoading ? 'Se salvează...' : 'Salvează Preferințe'}
            </button>
          </div>

          {/* Security Log */}
          <div className="bg-gradient-to-br from-navy-600 to-navy-800 backdrop-blur-sm p-6 rounded-2xl border border-gold-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            <h2 className="text-xl font-semibold text-white mb-4">Activitate Securitate</h2>
            
            {securityLogLoading ? (
              <p className="text-sm text-slate-300">Se încarcă...</p>
            ) : securityLog.length === 0 ? (
              <p className="text-sm text-slate-300">Nicio activitate înregistrată.</p>
            ) : (
              <div className="space-y-2">
                {securityLog.map((log) => (
                  <div key={log.id} className="p-3 bg-navy-900/40 rounded-lg border border-gold-500/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{log.description}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {log.timestamp.toLocaleString('ro-RO')}
                        </p>
                      </div>
                      <span className="text-xs text-gold-300 font-mono">{log.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="bg-gradient-to-br from-red-900/20 to-red-800/20 backdrop-blur-sm p-6 rounded-2xl border border-red-500/40 shadow-[0_12px_40px_rgba(220,38,38,0.3)]">
            <h2 className="text-xl font-semibold text-red-200 mb-4">Zonă Periculoasă</h2>
            
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 px-6 py-2 rounded-lg font-semibold"
              >
                Șterge Contul
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-red-200">
                  Această acțiune este permanentă și nu poate fi anulată. Toate datele tale vor fi șterse.
                </p>
                <div>
                  <label className="block text-sm font-medium text-red-200 mb-1">
                    Scrie "ȘTERGE CONTUL" pentru a confirma
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full rounded-lg border border-red-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-red-400 focus:outline-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading || deleteConfirmText !== 'ȘTERGE CONTUL'}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {deleteLoading ? 'Se șterge...' : 'Confirmă Ștergerea'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    className="bg-navy-700 hover:bg-navy-600 text-white px-6 py-2 rounded-lg font-semibold"
                  >
                    Anulează
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
