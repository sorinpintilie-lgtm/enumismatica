'use client';

import { useAuth } from '../../../context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  isAdmin,
  getUserAnalytics,
  getUserCollection,
  getUserConversations,
  getConversationMessages,
  deleteUserCollectionItem,
  deleteConversation,
} from 'shared/adminService';
import {
  adminResetUserPassword,
  banUser,
  unbanUser,
  changeUserRole,
  deleteUserAccount,
  updateUserCredits,
  forceLogoutUser,
} from 'shared/adminControlService';
import {
  getUserActivityStats,
  getActivityLogs,
  ActivityLog,
} from 'shared/activityLogService';
import { User, CollectionItem, Conversation, ChatMessage } from 'shared/types';
import { getDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';

export default function AdminUserDetail() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<ChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'collection' | 'messages' | 'activity' | 'controls'>('overview');

  // Restrict tab access for non-superadmins
  const handleTabChange = (tab: 'overview' | 'collection' | 'messages' | 'activity' | 'controls') => {
    if ((tab === 'messages' || tab === 'activity') && !currentUser?.isSuperAdmin) {
      return; // Don't allow changing to restricted tabs
    }
    setActiveTab(tab);
  };
  const [activityStats, setActivityStats] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [actionReason, setActionReason] = useState('');
  const [newCredits, setNewCredits] = useState(0);
  const [showControlModal, setShowControlModal] = useState<string | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);

  const [personalDetailsSaving, setPersonalDetailsSaving] = useState(false);
  const [personalDetailsError, setPersonalDetailsError] = useState<string | null>(null);
  const [personalDetailsSaved, setPersonalDetailsSaved] = useState(false);
  const [personalDetailsDraft, setPersonalDetailsDraft] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    county: '',
    postalCode: '',
    country: 'România',
    bankAccount: '',
  });

  useEffect(() => {
    const checkAdminAndLoad = async () => {
      if (!currentUser) {
        router.push('/login');
        return;
      }

      const adminStatus = await isAdmin(currentUser.uid);
      if (!adminStatus) {
        router.push('/dashboard');
        return;
      }

      setIsAdminUser(true);
      await loadUserData();
      setLoading(false);
    };

    if (!authLoading) {
      checkAdminAndLoad();
    }
  }, [currentUser, authLoading, router, userId]);

  // Redirect non-superadmins away from restricted tabs
  useEffect(() => {
    if (currentUser && !currentUser.isSuperAdmin && (activeTab === 'messages' || activeTab === 'activity')) {
      setActiveTab('overview');
    }
  }, [currentUser, activeTab]);

  const loadUserData = async () => {
    try {
      // Load user document
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = {
          id: userDoc.id,
          ...userDoc.data(),
          createdAt: userDoc.data().createdAt?.toDate() || new Date(),
          updatedAt: userDoc.data().updatedAt?.toDate() || new Date(),
        } as User;
        setUser(userData);
        setNewCredits(userData.credits || 0);

        const details = ((userDoc.data() as any).personalDetails || {}) as any;
        setPersonalDetailsDraft({
          firstName: details.firstName || '',
          lastName: details.lastName || '',
          phone: details.phone || '',
          address: details.address || '',
          county: details.county || '',
          postalCode: details.postalCode || '',
          country: details.country || 'România',
          bankAccount: details.bankAccount || '',
        });
      }

      // Load analytics
      const analyticsData = await getUserAnalytics(userId);
      setAnalytics(analyticsData);

      // Load collection
      const collectionData = await getUserCollection(userId);
      setCollection(collectionData);

      // Load conversations and activity only for superadmins
      if (currentUser?.isSuperAdmin) {
        // Load conversations
        const conversationsData = await getUserConversations(userId);
        setConversations(conversationsData);

        // Load activity stats
        const stats = await getUserActivityStats(userId);
        setActivityStats(stats);

        // Load recent activity
        const { logs } = await getActivityLogs({ userId, limit: 20 });
        setRecentActivity(logs);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleSavePersonalDetailsAdmin = async () => {
    if (!currentUser) return;
    setPersonalDetailsSaved(false);
    setPersonalDetailsError(null);

    try {
      setPersonalDetailsSaving(true);
      await updateDoc(doc(db, 'users', userId), {
        personalDetails: {
          firstName: personalDetailsDraft.firstName.trim(),
          lastName: personalDetailsDraft.lastName.trim(),
          phone: personalDetailsDraft.phone.trim(),
          address: personalDetailsDraft.address.trim(),
          county: personalDetailsDraft.county.trim(),
          postalCode: personalDetailsDraft.postalCode.trim(),
          country: personalDetailsDraft.country.trim() || 'România',
          bankAccount: personalDetailsDraft.bankAccount.trim(),
        },
        updatedAt: serverTimestamp(),
      });
      setPersonalDetailsSaved(true);
      await loadUserData();
    } catch (err: any) {
      console.error('Failed to save personal details (admin)', err);
      setPersonalDetailsError(err?.message || 'Nu s-au putut salva datele personale.');
    } finally {
      setPersonalDetailsSaving(false);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    const messages = await getConversationMessages(conversationId);
    setConversationMessages(messages);
    setSelectedConversation(conversationId);
  };

  const handleDeleteCollectionItem = async (itemId: string) => {
    if (!confirm('Șterge această piesă din colecția utilizatorului?')) return;
    
    const result = await deleteUserCollectionItem(userId, itemId);
    if (result.success) {
      await loadUserData();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!confirm('Șterge această conversație?')) return;
    
    const result = await deleteConversation(conversationId);
    if (result.success) {
      await loadUserData();
      if (selectedConversation === conversationId) {
        setSelectedConversation(null);
        setConversationMessages([]);
      }
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleResetPassword = async () => {
    if (!user || !currentUser) return;
    if (!actionReason.trim()) {
      alert('Te rog introdu un motiv pentru această acțiune');
      return;
    }

    try {
      await adminResetUserPassword(
        userId,
        user.email,
        currentUser.uid,
        currentUser.email || '',
        actionReason
      );
      alert('Email de resetare parolă trimis cu succes!');
      setShowControlModal(null);
      setActionReason('');
      await loadUserData();
    } catch (error) {
      alert(`Eroare: ${error}`);
    }
  };

  const handleBanUser = async () => {
    if (!user || !currentUser) return;
    if (!actionReason.trim()) {
      alert('Te rog introdu un motiv pentru ban');
      return;
    }

    try {
      await banUser(userId, currentUser.uid, currentUser.email || '', actionReason);
      alert('Utilizator blocat cu succes!');
      setShowControlModal(null);
      setActionReason('');
      await loadUserData();
    } catch (error) {
      alert(`Eroare: ${error}`);
    }
  };

  const handleUnbanUser = async () => {
    if (!user || !currentUser) return;

    try {
      await unbanUser(userId, currentUser.uid, currentUser.email || '', actionReason);
      alert('Utilizator deblocat cu succes!');
      setShowControlModal(null);
      setActionReason('');
      await loadUserData();
    } catch (error) {
      alert(`Eroare: ${error}`);
    }
  };

  const handleChangeRole = async (newRole: 'superadmin' | 'admin' | 'user') => {
    if (!user || !currentUser) return;
    if (!actionReason.trim()) {
      alert('Te rog introdu un motiv pentru schimbarea rolului');
      return;
    }

    try {
      await changeUserRole(userId, newRole, currentUser.uid, currentUser.email || '', actionReason);
      alert(`Rol schimbat cu succes în ${newRole}!`);
      setShowControlModal(null);
      setActionReason('');
      await loadUserData();
    } catch (error) {
      alert(`Eroare: ${error}`);
    }
  };

  const handleUpdateCredits = async () => {
    if (!user || !currentUser) return;
    if (!actionReason.trim()) {
      alert('Te rog introdu un motiv pentru actualizarea creditelor');
      return;
    }

    try {
      await updateUserCredits(userId, newCredits, currentUser.uid, currentUser.email || '', actionReason);
      alert('Credite actualizate cu succes!');
      setShowControlModal(null);
      setActionReason('');
      await loadUserData();
    } catch (error) {
      alert(`Eroare: ${error}`);
    }
  };

  const handleForceLogout = async () => {
    if (!user || !currentUser) return;
    if (!actionReason.trim()) {
      alert('Te rog introdu un motiv pentru deconectare forțată');
      return;
    }

    try {
      await forceLogoutUser(userId, currentUser.uid, currentUser.email || '', actionReason);
      alert('Utilizatorul va fi deconectat la următoarea cerere!');
      setShowControlModal(null);
      setActionReason('');
      await loadUserData();
    } catch (error) {
      alert(`Eroare: ${error}`);
    }
  };

  const handleUpdateVerificationStatus = async (status: 'verified' | 'rejected') => {
    if (!currentUser || !user) return;
    if (!user.idDocumentNumber) {
      alert('Utilizatorul nu a furnizat un document de identitate.');
      return;
    }

    try {
      setVerificationLoading(true);
      const { updateUserVerificationStatus } = await import('shared/adminService');
      const result = await updateUserVerificationStatus(userId, status, currentUser.uid);
      if (!result.success) {
        alert(`Eroare: ${result.error}`);
      } else {
        await loadUserData();
      }
    } catch (error: any) {
      alert(`Eroare: ${error?.message || error}`);
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!user || !currentUser) return;
    if (!actionReason.trim()) {
      alert('Te rog introdu un motiv pentru ștergere');
      return;
    }
    if (!confirm('ATENȚIE: Această acțiune va marca contul ca șters. Ești sigur?')) return;

    try {
      await deleteUserAccount(userId, currentUser.uid, currentUser.email || '', actionReason);
      alert('Utilizator șters cu succes!');
      router.push('/admin/users');
    } catch (error) {
      alert(`Eroare: ${error}`);
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

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Utilizator negăsit</h1>
          <Link href="/admin/users" className="text-gold-400 hover:text-gold-300">
            ← Înapoi la utilizatori
          </Link>
        </div>
      </div>
    );
  }

  const isBanned = (user as any).banned === true;

  const hasIdentityData = !!user.idDocumentNumber;
  const documentTypeLabel =
    user.idDocumentType === 'passport'
      ? 'Pașaport'
      : user.idDocumentType === 'ci'
      ? 'Carte de identitate'
      : 'Document';
  const maskedDocumentNumber = user.idDocumentNumber
    ? String(user.idDocumentNumber).replace(/.(?=.{4})/g, '•')
    : '';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin/users" className="text-gold-400 hover:text-gold-300 font-medium mb-4 inline-block">
            ← Înapoi la utilizatori
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user.avatar && (
                <img src={user.avatar} alt={user.displayName} className="w-16 h-16 rounded-full border-2 border-gold-500" />
              )}
              <div>
                <h1 className="text-3xl font-bold text-white">{user.displayName}</h1>
                <p className="text-slate-300">{user.email}</p>
                <div className="flex gap-2 mt-2">
                  {user.role === 'superadmin' && (
                    <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                      SUPER ADMIN
                    </span>
                  )}
                  {user.role === 'admin' && (
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Admin
                    </span>
                  )}
                  {user.idVerificationStatus === 'verified' && (
                    <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      VERIFICAT
                    </span>
                  )}
                  {isBanned && (
                    <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                      BLOCAT
                    </span>
                  )}
                  <span className="px-2 py-1 text-xs rounded-full bg-navy-700 text-slate-300 font-mono">
                    ID: {user.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('controls')}
              className="bg-gold-500 hover:bg-gold-600 text-navy-900 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Controale Admin
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
              <p className="text-sm text-slate-400">Piese</p>
              <p className="text-2xl font-bold text-white">{analytics.totalProducts}</p>
            </div>
            <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
              <p className="text-sm text-slate-400">Licitații</p>
              <p className="text-2xl font-bold text-white">{analytics.totalAuctions}</p>
            </div>
            <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
              <p className="text-sm text-slate-400">Licitări</p>
              <p className="text-2xl font-bold text-white">{analytics.totalBids}</p>
            </div>
            <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
              <p className="text-sm text-slate-400">Colecție</p>
              <p className="text-2xl font-bold text-white">{analytics.totalCollectionItems}</p>
            </div>
            <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
              <p className="text-sm text-slate-400">Conversații</p>
              <p className="text-2xl font-bold text-white">{analytics.totalConversations}</p>
            </div>
            <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
              <p className="text-sm text-slate-400">Credite</p>
              <p className="text-2xl font-bold text-gold-400">{user.credits || 0}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gold-500/20 mb-6">
          <nav className="flex gap-4 overflow-x-auto">
            {[
              'overview',
              'collection',
              ...(currentUser?.isSuperAdmin ? ['messages', 'activity'] : []),
              'controls'
            ].map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab as any)}
                className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-gold-500 text-gold-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'overview' && 'Prezentare'}
                {tab === 'collection' && `Colecție (${collection.length})`}
                {tab === 'messages' && `Mesaje (${conversations.length})`}
                {tab === 'activity' && 'Activitate'}
                {tab === 'controls' && 'Controale'}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Statistici Piese</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-300">Aprobate:</span>
                  <span className="font-medium text-green-400">{analytics.approvedProducts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">În așteptare:</span>
                  <span className="font-medium text-yellow-400">{analytics.pendingProducts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Respinse:</span>
                  <span className="font-medium text-red-400">{analytics.rejectedProducts}</span>
                </div>
              </div>
            </div>

            <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Statistici Licitații</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-300">Active:</span>
                  <span className="font-medium text-green-400">{analytics.activeAuctions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Încheiate:</span>
                  <span className="font-medium text-slate-300">{analytics.endedAuctions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Total licitări plasate:</span>
                  <span className="font-medium text-blue-400">{analytics.totalBids}</span>
                </div>
              </div>
            </div>

            <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Verificare Identitate</h3>
              {hasIdentityData ? (
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-slate-300">
                      Tip document:{' '}
                      <span className="font-semibold text-gold-300">{documentTypeLabel}</span>
                    </p>
                    <p className="text-slate-300">
                      Număr document:{' '}
                      <span className="font-mono text-gold-200">{maskedDocumentNumber}</span>
                    </p>
                    <p className="text-slate-300">
                      Status:{' '}
                      <span className="font-semibold">
                        {user.idVerificationStatus === 'verified'
                          ? 'Verificat'
                          : user.idVerificationStatus === 'pending'
                          ? 'În așteptare'
                          : user.idVerificationStatus === 'rejected'
                          ? 'Respins'
                          : 'Neverificat'}
                      </span>
                    </p>
                  </div>
                  
                  {/* ID Document Photos */}
                  {(user as any).idDocumentPhotos && (user as any).idDocumentPhotos.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-slate-200">Documente încărcate:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(user as any).idDocumentPhotos.map((photoUrl: string, index: number) => (
                          <div key={index} className="border border-gold-500/30 rounded-lg p-2">
                            <img
                              src={photoUrl}
                              alt={`Document photo ${index + 1}`}
                              className="w-full h-auto rounded-md max-h-64 object-contain"
                            />
                            <p className="text-xs text-slate-400 mt-1 text-center">
                              {index === 0 ? 'Față document' : 'Spate document'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Utilizatorul nu a încărcat fotografii ale documentului.
                    </p>
                  )}
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateVerificationStatus('verified')}
                      disabled={verificationLoading || user.idVerificationStatus === 'verified'}
                      className="inline-flex items-center rounded-md bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Marchează ca verificat
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateVerificationStatus('rejected')}
                      disabled={verificationLoading}
                      className="inline-flex items-center rounded-md bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-200 border border-red-500/40 hover:bg-red-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Marchează ca respins
                    </button>
                  </div>
                  {verificationLoading && (
                    <p className="mt-2 text-xs text-slate-400">Se actualizează statusul de verificare...</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Utilizatorul nu a furnizat date de identitate la înregistrare.
                </p>
              )}
            </div>

            <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Date personale (private)</h3>
              <p className="text-xs text-slate-400 mb-4">
                Vizibile doar pentru utilizator și administratori.
              </p>

              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Nume</label>
                    <input
                      value={personalDetailsDraft.lastName}
                      onChange={(e) => setPersonalDetailsDraft((p) => ({ ...p, lastName: e.target.value }))}
                      className="w-full rounded-lg border border-gold-500/30 bg-navy-900/60 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Prenume</label>
                    <input
                      value={personalDetailsDraft.firstName}
                      onChange={(e) => setPersonalDetailsDraft((p) => ({ ...p, firstName: e.target.value }))}
                      className="w-full rounded-lg border border-gold-500/30 bg-navy-900/60 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Telefon</label>
                  <input
                    value={personalDetailsDraft.phone}
                    onChange={(e) => setPersonalDetailsDraft((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-lg border border-gold-500/30 bg-navy-900/60 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Adresă</label>
                  <input
                    value={personalDetailsDraft.address}
                    onChange={(e) => setPersonalDetailsDraft((p) => ({ ...p, address: e.target.value }))}
                    className="w-full rounded-lg border border-gold-500/30 bg-navy-900/60 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Județ</label>
                    <input
                      value={personalDetailsDraft.county}
                      onChange={(e) => setPersonalDetailsDraft((p) => ({ ...p, county: e.target.value }))}
                      className="w-full rounded-lg border border-gold-500/30 bg-navy-900/60 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Cod poștal</label>
                    <input
                      value={personalDetailsDraft.postalCode}
                      onChange={(e) => setPersonalDetailsDraft((p) => ({ ...p, postalCode: e.target.value }))}
                      className="w-full rounded-lg border border-gold-500/30 bg-navy-900/60 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Țară</label>
                    <input
                      value={personalDetailsDraft.country}
                      onChange={(e) => setPersonalDetailsDraft((p) => ({ ...p, country: e.target.value }))}
                      className="w-full rounded-lg border border-gold-500/30 bg-navy-900/60 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cont bancar (IBAN)</label>
                  <input
                    value={personalDetailsDraft.bankAccount}
                    onChange={(e) => setPersonalDetailsDraft((p) => ({ ...p, bankAccount: e.target.value }))}
                    className="w-full rounded-lg border border-gold-500/30 bg-navy-900/60 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                    placeholder="RO..."
                  />
                </div>

                {personalDetailsError && (
                  <p className="text-xs text-red-200 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
                    {personalDetailsError}
                  </p>
                )}
                {personalDetailsSaved && (
                  <p className="text-xs text-emerald-200 border border-emerald-500/30 bg-emerald-500/10 rounded-lg px-3 py-2">
                    Datele au fost salvate.
                  </p>
                )}

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleSavePersonalDetailsAdmin}
                    disabled={personalDetailsSaving}
                    className="inline-flex items-center rounded-md bg-gold-500/90 px-3 py-2 text-xs font-semibold text-navy-900 hover:bg-gold-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {personalDetailsSaving ? 'Se salvează…' : 'Salvează datele'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'collection' && (
          <div className="bg-navy-800/50 rounded-lg border border-gold-500/20">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Colecția Personală ({collection.length} piese)
              </h3>
              {collection.length === 0 ? (
                <p className="text-slate-400">Utilizatorul nu are piese în colecție.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {collection.map((item) => (
                    <div key={item.id} className="border border-gold-500/20 rounded-lg p-4 bg-navy-900/50">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-white">{item.name}</h4>
                        <button
                          onClick={() => handleDeleteCollectionItem(item.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Șterge
                        </button>
                      </div>
                      <div className="text-sm space-y-1">
                        {item.country && <p className="text-slate-300">Țară: {item.country}</p>}
                        {item.year && <p className="text-slate-300">An: {item.year}</p>}
                        {item.metal && <p className="text-slate-300">Metal: {item.metal}</p>}
                        {item.grade && <p className="text-slate-300">Grad: {item.grade}</p>}
                        {item.currentValue && (
                          <p className="text-green-400 font-medium">Valoare: ${Math.round(item.currentValue)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversations List */}
            <div className="bg-navy-800/50 rounded-lg border border-gold-500/20">
              <div className="p-4 border-b border-gold-500/20">
                <h3 className="font-semibold text-white">Conversații ({conversations.length})</h3>
              </div>
              <div className="divide-y divide-gold-500/20 max-h-[600px] overflow-y-auto">
                {conversations.length === 0 ? (
                  <p className="p-4 text-slate-400 text-sm">Nicio conversație</p>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`p-4 cursor-pointer hover:bg-navy-700/50 ${
                        selectedConversation === conv.id ? 'bg-navy-700' : ''
                      }`}
                      onClick={() => loadConversationMessages(conv.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">
                            Conversație #{conv.id.slice(-6)}
                          </p>
                          {conv.lastMessage && (
                            <p className="text-sm text-slate-400 truncate mt-1">
                              {conv.lastMessage}
                            </p>
                          )}
                          {conv.auctionId && (
                            <p className="text-xs text-gold-400 mt-1">
                              Licitație: {conv.auctionId.slice(-6)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv.id);
                          }}
                          className="text-red-400 hover:text-red-300 text-xs ml-2"
                        >
                          Șterge
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Messages View */}
            <div className="lg:col-span-2 bg-navy-800/50 rounded-lg border border-gold-500/20">
              <div className="p-4 border-b border-gold-500/20">
                <h3 className="font-semibold text-white">
                  {selectedConversation ? `Mesaje Conversație` : 'Selectează o conversație'}
                </h3>
              </div>
              <div className="p-4 max-h-[600px] overflow-y-auto">
                {!selectedConversation ? (
                  <p className="text-slate-400 text-center py-8">
                    Selectează o conversație pentru a vedea mesajele
                  </p>
                ) : conversationMessages.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">Niciun mesaj în această conversație</p>
                ) : (
                  <div className="space-y-4">
                    {conversationMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderId === userId ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.senderId === userId
                            ? 'bg-gold-500 text-navy-900'
                            : 'bg-navy-700 text-white'
                        }`}>
                          <p className="text-sm font-medium mb-1">
                            {msg.senderName || 'Unknown'}
                            {msg.senderId === userId && ' (Acest utilizator)'}
                          </p>
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {msg.timestamp.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-6">
            {/* Activity Stats */}
            {activityStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
                  <p className="text-sm text-slate-400">Total Evenimente</p>
                  <p className="text-2xl font-bold text-white">{activityStats.totalEvents}</p>
                </div>
                <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
                  <p className="text-sm text-slate-400">Sesiuni</p>
                  <p className="text-2xl font-bold text-white">{activityStats.sessionsCount}</p>
                </div>
                <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
                  <p className="text-sm text-slate-400">Ultima Activitate</p>
                  <p className="text-sm font-medium text-gold-400">
                    {activityStats.lastActivity
                      ? formatDistanceToNow(activityStats.lastActivity, { addSuffix: true, locale: ro })
                      : 'N/A'}
                  </p>
                </div>
                <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
                  <p className="text-sm text-slate-400">Tipuri Evenimente</p>
                  <p className="text-2xl font-bold text-white">{Object.keys(activityStats.eventsByType).length}</p>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Activitate Recentă</h3>
              <div className="space-y-2">
                {recentActivity.length === 0 ? (
                  <p className="text-slate-400">Nicio activitate înregistrată</p>
                ) : (
                  recentActivity.map((log) => (
                    <div key={log.id} className="bg-navy-900/50 rounded-lg p-3 border border-gold-500/10">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono text-gold-400">{log.eventType}</span>
                        <span className="text-xs text-slate-400">
                          {formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true, locale: ro })}
                        </span>
                      </div>
                      {log.metadata.page && (
                        <p className="text-xs text-slate-400 mt-1">Pagină: {log.metadata.page}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'controls' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Password Reset */}
            <button
              onClick={() => setShowControlModal('password')}
              className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 p-6 rounded-lg text-left transition-colors"
            >
              <h3 className="font-semibold text-lg mb-2">Resetare Parolă</h3>
              <p className="text-sm opacity-80">Trimite email de resetare parolă utilizatorului</p>
            </button>

            {/* Ban/Unban */}
            {!isBanned ? (
              <button
                onClick={() => setShowControlModal('ban')}
                className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 p-6 rounded-lg text-left transition-colors"
              >
                <h3 className="font-semibold text-lg mb-2">Blochează Utilizator</h3>
                <p className="text-sm opacity-80">Blochează accesul utilizatorului la platformă</p>
              </button>
            ) : (
              <button
                onClick={() => setShowControlModal('unban')}
                className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300 p-6 rounded-lg text-left transition-colors"
              >
                <h3 className="font-semibold text-lg mb-2">Deblochează Utilizator</h3>
                <p className="text-sm opacity-80">Permite din nou accesul utilizatorului</p>
              </button>
            )}

            {/* Change Role - Only for SuperAdmin or if target is not admin/superadmin */}
            {(currentUser?.isSuperAdmin || (user.role !== 'admin' && user.role !== 'superadmin')) && (
              <button
                onClick={() => setShowControlModal('role')}
                className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 p-6 rounded-lg text-left transition-colors"
              >
                <h3 className="font-semibold text-lg mb-2">Schimbă Rol</h3>
                <p className="text-sm opacity-80">Modifică rolul utilizatorului</p>
              </button>
            )}

            {/* Update Credits */}
            <button
              onClick={() => setShowControlModal('credits')}
              className="bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-300 p-6 rounded-lg text-left transition-colors"
            >
              <h3 className="font-semibold text-lg mb-2">Actualizează Credite</h3>
              <p className="text-sm opacity-80">Modifică numărul de credite al utilizatorului</p>
            </button>

            {/* Force Logout */}
            <button
              onClick={() => setShowControlModal('logout')}
              className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-300 p-6 rounded-lg text-left transition-colors"
            >
              <h3 className="font-semibold text-lg mb-2">Deconectare Forțată</h3>
              <p className="text-sm opacity-80">Forțează deconectarea utilizatorului</p>
            </button>

            {/* Delete User - Only for SuperAdmin or if target is regular user */}
            {(currentUser?.isSuperAdmin || user.role === 'user') && (
              <button
                onClick={() => setShowControlModal('delete')}
                className="bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-300 p-6 rounded-lg text-left transition-colors"
              >
                <h3 className="font-semibold text-lg mb-2">Șterge Cont</h3>
                <p className="text-sm opacity-80">Marchează contul ca șters (soft delete)</p>
              </button>
            )}
          </div>
        )}

        {/* Control Modal */}
        {showControlModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-navy-800 rounded-lg border border-gold-500/30 p-6 max-w-md w-full">
              <h2 className="text-xl font-bold text-white mb-4">
                {showControlModal === 'password' && 'Resetare Parolă'}
                {showControlModal === 'ban' && 'Blochează Utilizator'}
                {showControlModal === 'unban' && 'Deblochează Utilizator'}
                {showControlModal === 'role' && 'Schimbă Rol'}
                {showControlModal === 'credits' && 'Actualizează Credite'}
                {showControlModal === 'logout' && 'Deconectare Forțată'}
                {showControlModal === 'delete' && 'Șterge Cont'}
              </h2>

              {showControlModal === 'credits' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Număr Credite
                  </label>
                  <input
                    type="number"
                    value={newCredits}
                    onChange={(e) => setNewCredits(parseInt(e.target.value) || 0)}
                    className="w-full bg-navy-700 border border-gold-500/30 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              )}

              {showControlModal === 'role' && (
                <div className="mb-4 space-y-2">
                  {currentUser?.isSuperAdmin && (
                    <button
                      onClick={() => handleChangeRole('superadmin')}
                      className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg font-semibold"
                    >
                      Setează ca Super Admin
                    </button>
                  )}
                  <button
                    onClick={() => handleChangeRole('admin')}
                    className="w-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 px-4 py-2 rounded-lg"
                  >
                    Setează ca Admin
                  </button>
                  <button
                    onClick={() => handleChangeRole('user')}
                    className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 px-4 py-2 rounded-lg"
                  >
                    Setează ca User
                  </button>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Motiv {showControlModal !== 'unban' && '(obligatoriu)'}
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full bg-navy-700 border border-gold-500/30 rounded-lg px-4 py-2 text-white h-24"
                  placeholder="Introdu motivul pentru această acțiune..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowControlModal(null);
                    setActionReason('');
                  }}
                  className="flex-1 bg-navy-700 hover:bg-navy-600 text-white px-4 py-2 rounded-lg"
                >
                  Anulează
                </button>
                <button
                  onClick={() => {
                    if (showControlModal === 'password') handleResetPassword();
                    else if (showControlModal === 'ban') handleBanUser();
                    else if (showControlModal === 'unban') handleUnbanUser();
                    else if (showControlModal === 'credits') handleUpdateCredits();
                    else if (showControlModal === 'logout') handleForceLogout();
                    else if (showControlModal === 'delete') handleDeleteUser();
                  }}
                  className="flex-1 bg-gold-500 hover:bg-gold-600 text-navy-900 px-4 py-2 rounded-lg font-semibold"
                >
                  Confirmă
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
