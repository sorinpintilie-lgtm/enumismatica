'use client';

import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isAdmin, getUsersWithPendingVerification, updateUserVerificationStatus } from 'shared/adminService';
import { User } from 'shared/types';

export default function AdminVerification() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [verificationLoading, setVerificationLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending');

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
      await loadUsers();
      setLoading(false);
    };

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading, router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      let allUsers: User[] = [];
      
      if (filterStatus === 'pending') {
        allUsers = await getUsersWithPendingVerification();
      } else {
        // For other statuses, we need to fetch all users and filter
        const { getAllUsers } = await import('shared/adminService');
        const users = await getAllUsers();
        allUsers = users.filter(u => 
          filterStatus === 'all' || 
          u.idVerificationStatus === filterStatus
        );
      }
      
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVerificationStatus = async (userId: string, status: 'verified' | 'rejected') => {
    if (!user) return;

    try {
      setVerificationLoading(userId);
      const result = await updateUserVerificationStatus(userId, status, user.uid);
      if (!result.success) {
        alert(`Eroare: ${result.error}`);
      } else {
        await loadUsers();
      }
    } catch (error: any) {
      alert(`Eroare: ${error?.message || error}`);
    } finally {
      setVerificationLoading(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (u.idDocumentNumber && u.idDocumentNumber.includes(searchQuery));
    return matchesSearch;
  });

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
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Verificare Identitate</h1>
          <Link
            href="/admin"
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium"
          >
            Înapoi la Admin
          </Link>
        </div>

        {/* Filters and Search */}
        <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Caută</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nume, email sau număr document..."
                className="w-full bg-navy-700 border border-gold-500/30 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full bg-navy-700 border border-gold-500/30 rounded-lg px-4 py-2 text-white"
              >
                <option value="pending">În așteptare</option>
                <option value="verified">Verificate</option>
                <option value="rejected">Respinse</option>
                <option value="all">Toate</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadUsers}
                disabled={loading}
                className="bg-gold-500 hover:bg-gold-600 text-navy-900 px-6 py-2 rounded-lg font-semibold disabled:opacity-60"
              >
                {loading ? 'Se încarcă...' : 'Actualizează'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
            <p className="text-sm text-slate-400">Total cereri</p>
            <p className="text-2xl font-bold text-white">{filteredUsers.length}</p>
          </div>
          <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
            <p className="text-sm text-slate-400">În așteptare</p>
            <p className="text-2xl font-bold text-yellow-400">{filteredUsers.filter(u => u.idVerificationStatus === 'pending').length}</p>
          </div>
          <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
            <p className="text-sm text-slate-400">Verificate</p>
            <p className="text-2xl font-bold text-emerald-400">{filteredUsers.filter(u => u.idVerificationStatus === 'verified').length}</p>
          </div>
          <div className="bg-navy-800/50 rounded-lg border border-gold-500/20 p-4">
            <p className="text-sm text-slate-400">Respinse</p>
            <p className="text-2xl font-bold text-red-400">{filteredUsers.filter(u => u.idVerificationStatus === 'rejected').length}</p>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-navy-800/50 rounded-lg border border-gold-500/20">
          <div className="p-6">
            {filteredUsers.length === 0 ? (
              <p className="text-slate-400 text-center py-8">
                {filterStatus === 'pending' ? 'Nicio cerere de verificare în așteptare.' : 'Niciun utilizator găsit.'}
              </p>
            ) : (
              <div className="space-y-6">
                {filteredUsers.map((u) => (
                  <div key={u.id} className="border border-gold-500/20 rounded-lg p-6 bg-navy-900/30">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Link
                            href={`/admin/users/${u.id}`}
                            className="text-lg font-semibold text-gold-400 hover:text-gold-300"
                          >
                            {u.displayName}
                          </Link>
                          <span className={`px-3 py-1 text-xs rounded-full font-semibold ${
                            u.idVerificationStatus === 'verified'
                              ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                              : u.idVerificationStatus === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/40'
                              : 'bg-red-500/20 text-red-200 border border-red-500/40'
                          }`}>
                            {u.idVerificationStatus === 'verified' ? 'VERIFICAT' : 
                             u.idVerificationStatus === 'pending' ? 'ÎN AȘTEPTARE' : 'RESPINS'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-slate-400">Email</p>
                            <p className="text-white font-medium">{u.email}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Document</p>
                            <p className="text-white font-medium">
                              {u.idDocumentType === 'passport' ? 'Pașaport' : u.idDocumentType === 'ci' ? 'Carte de identitate' : 'Document'}
                              {u.idDocumentNumber && ` ••••${u.idDocumentNumber.slice(-4)}`}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Cont creat</p>
                            <p className="text-white font-medium">{u.createdAt.toLocaleDateString()}</p>
                          </div>
                        </div>

                        {/* Document Photos */}
                        {u.idDocumentPhotos && u.idDocumentPhotos.length > 0 ? (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-slate-200 mb-2">Documente încărcate:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-md">
                              {u.idDocumentPhotos.map((photoUrl: string, index: number) => (
                                <div key={index} className="border border-gold-500/30 rounded-lg overflow-hidden">
                                  <img
                                    src={photoUrl}
                                    alt={`Document photo ${index + 1}`}
                                    className="w-full h-48 object-contain bg-navy-700"
                                  />
                                  <p className="text-xs text-slate-400 text-center py-1 bg-navy-800">
                                    {index === 0 ? 'Față document' : 'Spate document'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 mb-4">Utilizatorul nu a încărcat fotografii ale documentului.</p>
                        )}

                        <Link
                          href={`/admin/users/${u.id}`}
                          className="inline-flex items-center text-sm text-gold-400 hover:text-gold-300 font-medium"
                        >
                          Vezi profil complet →
                        </Link>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-6">
                        {u.idVerificationStatus === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateVerificationStatus(u.id, 'verified')}
                              disabled={!!verificationLoading}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {verificationLoading === u.id ? 'Se procesează...' : 'Verifică'}
                            </button>
                            <button
                              onClick={() => handleUpdateVerificationStatus(u.id, 'rejected')}
                              disabled={!!verificationLoading}
                              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {verificationLoading === u.id ? 'Se procesează...' : 'Respinge'}
                            </button>
                          </>
                        )}
                        {u.idVerificationStatus === 'verified' && (
                          <button
                            onClick={() => handleUpdateVerificationStatus(u.id, 'rejected')}
                            disabled={!!verificationLoading}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {verificationLoading === u.id ? 'Se procesează...' : 'Respinge'}
                          </button>
                        )}
                        {u.idVerificationStatus === 'rejected' && (
                          <button
                            onClick={() => handleUpdateVerificationStatus(u.id, 'verified')}
                            disabled={!!verificationLoading}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {verificationLoading === u.id ? 'Se procesează...' : 'Verifică'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}