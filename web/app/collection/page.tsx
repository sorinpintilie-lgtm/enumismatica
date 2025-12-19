'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCollection } from '../hooks/useCollection';
import { CollectionItem } from 'shared/types';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import { formatRON } from '../utils/currency';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getUserCredits, payCollectionSubscriptionWithCredits } from 'shared/creditService';
import { useToast } from '../components/ToastProvider';
import { uploadMultipleImages } from 'shared/storageService';

export default function MyCollectionPage() {
  const { user } = useAuth();
  const { items, loading, error, stats, addItem, updateItem, deleteItem } = useCollection(
    user?.uid || null,
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Abonament + credite pentru "Colecția Mea"
  const [subscriptionActive, setSubscriptionActive] = useState<boolean | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<Date | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);

  const { showToast } = useToast();

  // Check if item is pending approval
  const isPendingApproval = (item: CollectionItem) => {
    return item.tags?.some(tag => tag.includes('-pending'));
  };

  useEffect(() => {
    if (!user?.uid) {
      setSubscriptionActive(null);
      setSubscriptionExpiresAt(null);
      setCredits(null);
      return;
    }

    let cancelled = false;

    const loadStatusAndCredits = async () => {
      setSubscriptionLoading(true);
      setSubscriptionError(null);

      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);

        if (!cancelled) {
          if (snap.exists()) {
            const data = snap.data() as any;
            const rawExpiry = (data as any).collectionSubscriptionExpiresAt;
            let expiresAt: Date | null = null;

            if (rawExpiry && typeof (rawExpiry as any).toDate === 'function') {
              expiresAt = (rawExpiry as any).toDate();
            } else if (rawExpiry instanceof Date) {
              expiresAt = rawExpiry;
            }

            setSubscriptionExpiresAt(expiresAt);

            const now = new Date();
            const isActive = !!expiresAt && expiresAt.getTime() > now.getTime();
            setSubscriptionActive(isActive);
          } else {
            setSubscriptionExpiresAt(null);
            setSubscriptionActive(false);
          }
        }

        setCreditsLoading(true);
        try {
          const value = await getUserCredits(user.uid);
          if (!cancelled) {
            setCredits(value);
          }
        } finally {
          if (!cancelled) {
            setCreditsLoading(false);
          }
        }
      } catch (err: any) {
        console.error('Failed to load collection subscription status', err);
        if (!cancelled) {
          setSubscriptionError(
            err?.message ||
              'Nu s-au putut încărca informațiile despre abonamentul colecției.',
          );
          setSubscriptionActive(false);
        }
      } finally {
        if (!cancelled) {
          setSubscriptionLoading(false);
        }
      }
    };

    loadStatusAndCredits();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const handleActivateSubscription = async () => {
    if (!user?.uid) return;

    try {
      setSubscriptionLoading(true);
      await payCollectionSubscriptionWithCredits(user.uid, 1);

      // Reîncarcă data de expirare a abonamentului
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as any;
        const rawExpiry = (data as any).collectionSubscriptionExpiresAt;
        let expiresAt: Date | null = null;

        if (rawExpiry && typeof (rawExpiry as any).toDate === 'function') {
          expiresAt = (rawExpiry as any).toDate();
        } else if (rawExpiry instanceof Date) {
          expiresAt = rawExpiry;
        }

        setSubscriptionExpiresAt(expiresAt);

        const now = new Date();
        const isActive = !!expiresAt && expiresAt.getTime() > now.getTime();
        setSubscriptionActive(isActive);
      } else {
        setSubscriptionActive(false);
      }

      // Reîncarcă creditele după plată
      const value = await getUserCredits(user.uid);
      setCredits(value);

      showToast({
        type: 'success',
        title: 'Abonament activat',
        message: 'Abonamentul „Colecția Mea” a fost activat pentru 1 an folosind 50 de credite.',
      });
    } catch (err: any) {
      console.error('Failed to activate collection subscription', err);
      showToast({
        type: 'error',
        title: 'Nu s-a putut activa abonamentul',
        message:
          err?.message ||
          'A apărut o eroare la activarea abonamentului „Colecția Mea”. Încearcă din nou.',
      });
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(search) ||
      item.description?.toLowerCase().includes(search) ||
      item.country?.toLowerCase().includes(search) ||
      item.denomination?.toLowerCase().includes(search) ||
      item.tags?.some((tag) => tag.toLowerCase().includes(search))
    );
  });

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-xl rounded-2xl border border-[#e7b73c]/40 bg-navy-900/80 p-8 text-center shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
          <h1 className="text-2xl font-bold text-white mb-3">
            Colecția este disponibilă doar pentru utilizatori autentificați
          </h1>
          <p className="text-sm text-slate-300 mb-5">
            Pentru a vedea și gestiona articolele din colecția ta, trebuie să te autentifici în
            contul tău.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-5 py-2.5 text-sm font-semibold text-[#000940] shadow-lg shadow-[#e7b73c]/50 hover:bg-[#f0c955] transition"
            >
              Autentificare
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full border border-[#e7b73c] px-5 py-2.5 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition"
            >
              Creează cont
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (subscriptionLoading && subscriptionActive === null) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
          <p className="ml-4 text-slate-300">
            Se verifică abonamentul pentru „Colecția Mea”...
          </p>
        </div>
      </div>
    );
  }

  if (subscriptionActive === false) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-gold-500/40 bg-navy-900/80 p-8 shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">Abonament Colecția Mea</h1>
          <p className="text-sm text-slate-300 mb-4">
            Pentru a folosi funcționalitățile „Colecția Mea” (vizualizare, adăugare și gestionare
            articole), este nevoie de un abonament activ plătit cu credite.
          </p>
          <ul className="text-sm text-slate-300 mb-4 list-disc list-inside space-y-1">
            <li>
              Cost: <span className="font-semibold text-gold-300">50 credite / an</span>
            </li>
            <li>Abonamentul îți permite să păstrezi și să gestionezi colecția ta personală.</li>
            <li>
              Creditele se pot obține din bonusul de înregistrare, recomandări sau plăți Netopia.
            </li>
          </ul>
          {subscriptionExpiresAt && (
            <p className="text-xs text-slate-400 mb-3">
              Ultimul abonament a expirat la:{' '}
              <span className="font-semibold text-slate-200">
                {subscriptionExpiresAt.toLocaleString('ro-RO')}
              </span>
            </p>
          )}
          {subscriptionError && (
            <p className="text-xs text-red-300 mb-3">
              {subscriptionError}
            </p>
          )}
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4">
            <div className="text-sm text-slate-200">
              <p className="mb-1">Credite disponibile:</p>
              <p className="text-2xl font-bold text-gold-300">
                {creditsLoading ? '—' : credits ?? 0}
              </p>
            </div>
            <button
              type="button"
              onClick={handleActivateSubscription}
              disabled={subscriptionLoading}
              className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-6 py-2.5 text-sm font-semibold text-[#000940] shadow-[0_0_24px_rgba(231,183,60,0.8)] hover:bg-[#f0c955] disabled:bg-[#c9aa4a] disabled:cursor-not-allowed transition-colors"
            >
              {subscriptionLoading
                ? 'Se activează abonamentul...'
                : 'Activează abonamentul (50 credite / an)'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Page Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-400 mb-2">
          Colecția ta personală
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Colecția Mea</h1>
        <p className="text-slate-300 max-w-2xl">
          Gestionează-ți colecția personală de monede și bancnote, urmărește valoarea totală și istoricul pieselor.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl border border-gold-500/20 bg-navy-800/80 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300 mb-1">Total articole</p>
                <p className="text-3xl font-bold text-white">{stats.totalItems}</p>
              </div>
              <div className="w-12 h-12 bg-gold-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                  <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                  <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gold-500/20 bg-navy-800/80 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300 mb-1">Valoare totală</p>
                <p className="text-3xl font-bold text-gold-400">{formatRON(stats.totalValue)}</p>
              </div>
              <div className="w-12 h-12 bg-gold-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gold-500/20 bg-navy-800/80 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300 mb-1">Investiție</p>
                <p className="text-3xl font-bold text-slate-100">{formatRON(stats.totalInvestment)}</p>
              </div>
              <div className="w-12 h-12 bg-gold-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gold-500/20 bg-navy-800/80 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300 mb-1">Profit/Pierdere</p>
                <p className={`text-3xl font-bold ${stats.totalValue >= stats.totalInvestment ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stats.totalValue >= stats.totalInvestment ? '+' : ''}
                  {formatRON(Math.abs(stats.totalValue - stats.totalInvestment))}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stats.totalValue >= stats.totalInvestment ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                <svg className={`w-6 h-6 ${stats.totalValue >= stats.totalInvestment ? 'text-emerald-400' : 'text-red-400'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="rounded-2xl border border-gold-500/20 bg-navy-800/80 p-4 sm:p-5 mb-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="flex-1 w-full sm:w-auto">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Caută în colecție..."
                className="w-full px-4 py-2 pl-10 border border-gold-500/40 rounded-lg bg-navy-900/40 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e7b73c]"
              />
              <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md border ${viewMode === 'grid' ? 'bg-[#e7b73c] border-[#e7b73c] text-[#000940]' : 'bg-navy-900/40 border-gold-500/30 text-slate-300 hover:bg-navy-800'}`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md border ${viewMode === 'list' ? 'bg-[#e7b73c] border-[#e7b73c] text-[#000940]' : 'bg-navy-900/40 border-gold-500/30 text-slate-300 hover:bg-navy-800'}`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Add Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#e7b73c] hover:bg-[#f0c955] text-[#000940] px-6 py-2 rounded-full font-medium transition-colors flex items-center gap-2 shadow-lg shadow-[#e7b73c]/40"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adaugă Articol
          </button>
        </div>
      </div>

      {/* Collection Grid/List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-gold-500/30 bg-navy-800/80 p-10 text-center shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
          <svg className="w-24 h-24 text-gold-500/60 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="text-xl font-semibold text-white mb-2">
            {searchTerm ? 'Niciun rezultat găsit' : 'Colecția ta este goală'}
          </h3>
          <p className="text-slate-300 mb-6">
            {searchTerm
              ? 'Încearcă să ajustezi termenul de căutare'
              : 'Începe să-ți construiești colecția adăugând primul articol'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-[#e7b73c] hover:bg-[#f0c955] text-[#000940] px-6 py-3 rounded-full font-medium transition-colors shadow-lg shadow-[#e7b73c]/40"
            >
              Adaugă Primul Articol
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <CollectionItemCard
              key={item.id}
              item={item}
              onEdit={() => setEditingItem(item)}
              onDelete={() => {
                if (confirm('Sigur vrei să ștergi acest articol din colecție?')) {
                  deleteItem(item.id);
                }
              }}
              onCancelRequest={async () => {
                if (!user?.uid) return;

                try {
                  // Find the pending product/auction ID
                  const pendingTag = item.tags?.find(tag => tag.includes('-pending'));
                  if (!pendingTag) return;

                  const isAuction = pendingTag.startsWith('auction');
                  const pendingId = (item as any)[isAuction ? 'auctionPendingId' : 'salePendingId'];

                  if (pendingId) {
                    // Delete the pending product
                    const { doc, deleteDoc } = await import('firebase/firestore');
                    const { db } = await import('../lib/firebase');

                    const productRef = doc(db, 'products', pendingId);
                    await deleteDoc(productRef);

                    // If auction, also delete from auctions
                    if (isAuction) {
                      const auctionRef = doc(db, 'auctions', pendingId);
                      await deleteDoc(auctionRef);
                    }
                  }

                  // Update collection item to remove pending status
                  const updatedTags = item.tags?.filter(tag => !tag.includes('-pending')) || [];
                  await updateItem(item.id, {
                    tags: updatedTags,
                    auctionPendingId: undefined,
                    salePendingId: undefined,
                  } as any);

                  showToast({
                    type: 'success',
                    title: 'Cerere anulată',
                    message: 'Cererea de listare a fost anulată cu succes.',
                  });
                } catch (error) {
                  console.error('Failed to cancel request:', error);
                  showToast({
                    type: 'error',
                    title: 'Eroare',
                    message: 'Nu s-a putut anula cererea. Încearcă din nou.',
                  });
                }
              }}
              isPendingApproval={isPendingApproval(item)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-gold-500/20 bg-navy-900/80 overflow-hidden shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
          <table className="min-w-full divide-y divide-navy-700">
            <thead className="bg-navy-800/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Articol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Țară</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">An</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Metal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Valoare</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-navy-700">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-navy-800/60">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {item.images && item.images[0] ? (
                        <img src={item.images[0]} alt={item.name} className="w-10 h-10 rounded-full object-cover mr-3" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 mr-3 flex items-center justify-center">
                          <span className="text-xl">🪙</span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-slate-100">{item.name}</div>
                        <div className="text-sm text-slate-300">{item.denomination}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">{item.country || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">{item.year || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">{item.metal || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-400">
                    {item.currentValue != null ? formatRON(item.currentValue) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="text-blue-300 hover:text-blue-100 mr-3"
                    >
                      Editează
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Sigur vrei să ștergi acest articol?')) {
                          deleteItem(item.id);
                        }
                      }}
                      className="text-red-300 hover:text-red-100"
                    >
                      Șterge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingItem) && (
        <CollectionItemModal
          item={editingItem}
          onClose={() => {
            setShowAddModal(false);
            setEditingItem(null);
          }}
          onSave={async (itemData) => {
            if (editingItem) {
              await updateItem(editingItem.id, itemData);
            } else {
              // Ensure name is present for new items
              if (!itemData.name) {
                throw new Error('Name is required');
              }
              await addItem(itemData as Omit<CollectionItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>);
            }
            setShowAddModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

 // Collection Item Card Component
 function CollectionItemCard({
   item,
   onEdit,
   onDelete,
   onCancelRequest,
   isPendingApproval
 }: {
   item: CollectionItem;
   onEdit: () => void;
   onDelete: () => void;
   onCancelRequest: () => void;
   isPendingApproval: boolean;
 }) {
  // Badges:
  // - "Nou": first 12 hours after createdAt
  // - "Vândut": 24 hours after soldAt (if isSold)
  const now = new Date();

  const createdAtDate =
    item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt as any);
  const isNew =
    createdAtDate &&
    now.getTime() - createdAtDate.getTime() <= 12 * 60 * 60 * 1000; // 12 hours

  let isSoldRecent = false;
  if (item.isSold && item.soldAt) {
    const soldAtDate =
      item.soldAt instanceof Date ? item.soldAt : new Date(item.soldAt as any);
    isSoldRecent =
      soldAtDate &&
      now.getTime() - soldAtDate.getTime() <= 24 * 60 * 60 * 1000; // 24 hours
  }

  const showBadge = isNew || isSoldRecent;

  return (
    <div className="rounded-2xl border border-gold-500/20 bg-navy-900/80 overflow-hidden hover:border-gold-400 hover:shadow-[0_18px_55px_rgba(0,0,0,0.85)] transition-shadow">
      {/* Image */}
      <div className="aspect-square bg-navy-800/60 relative">
        {item.images && item.images[0] ? (
          <img
            src={item.images[0]}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">🪙</span>
          </div>
        )}

        {showBadge && (
          <span
            className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold tracking-wide ${
              isSoldRecent
                ? 'bg-red-600 text-white'
                : 'bg-emerald-500 text-navy-900'
            } shadow-md`}
          >
            {isSoldRecent ? 'Vândut' : 'Nou'}
          </span>
        )}

        {item.rarity && (
          <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
            item.rarity === 'extremely-rare' ? 'bg-purple-100 text-purple-800' :
            item.rarity === 'very-rare' ? 'bg-red-100 text-red-800' :
            item.rarity === 'rare' ? 'bg-orange-100 text-orange-800' :
            item.rarity === 'uncommon' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {item.rarity}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-1 truncate">{item.name}</h3>
        <p className="text-sm text-slate-300 mb-3">{item.denomination || 'N/A'}</p>
        
        <div className="space-y-2 text-sm mb-4">
          {item.country && (
            <div className="flex justify-between">
              <span className="text-slate-300">Țară:</span>
              <span className="font-medium text-slate-100">{item.country}</span>
            </div>
          )}
          {item.year && (
            <div className="flex justify-between">
              <span className="text-slate-300">An:</span>
              <span className="font-medium text-slate-100">{item.year}</span>
            </div>
          )}
          {item.metal && (
            <div className="flex justify-between">
              <span className="text-slate-300">Metal:</span>
              <span className="font-medium text-slate-100">{item.metal}</span>
            </div>
          )}
          {item.grade && (
            <div className="flex justify-between">
              <span className="text-slate-300">Grad:</span>
              <span className="font-medium text-slate-100">{item.grade}</span>
            </div>
          )}
          {item.currentValue && (
            <div className="flex justify-between border-t pt-2">
              <span className="text-slate-300">Valoare:</span>
              <span className="font-bold text-emerald-400">{formatRON(item.currentValue)}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {(() => {
          const visibleTags = (item.tags || []).filter(
            (tag) => tag !== 'shop-purchase' && tag !== 'auction-win'
          );
          return visibleTags.length > 0 ? (
            <div className="flex flex-wrap gap-1 mb-3">
              {visibleTags.map((tag, idx) => (
                <span key={idx} className="text-xs bg-navy-700/80 text-slate-200 px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          ) : null;
        })()}

        {/* Actions */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              disabled={isPendingApproval}
            >
              Editează
            </button>
            <button
              onClick={onDelete}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              disabled={isPendingApproval}
            >
              Șterge
            </button>
          </div>
          {isPendingApproval ? (
            <button
              onClick={onCancelRequest}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Anulează Cererea
            </button>
          ) : (
            <div className="flex gap-2">
              <Link
                href={`/products/new?collectionItemId=${item.id}&listingType=direct`}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors text-center"
              >
                Pune la Vânzare
              </Link>
              <Link
                href={`/products/new?collectionItemId=${item.id}&listingType=auction`}
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors text-center"
              >
                Pune la Licitație
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Collection Item Modal Component (Add/Edit)
function CollectionItemModal({
  item,
  onClose,
  onSave,
}: {
  item: CollectionItem | null;
  onClose: () => void;
  onSave: (data: Partial<CollectionItem>) => Promise<void>;
}) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<CollectionItem>>(
    item || {
      name: '',
      description: '',
      country: '',
      year: undefined,
      denomination: '',
      metal: '',
      grade: '',
      rarity: undefined,
      currentValue: undefined,
      acquisitionPrice: undefined,
      notes: '',
      tags: [],
      images: [],
    }
  );
  const [saving, setSaving] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const selectedFiles = Array.from(files);
      setImageFiles(selectedFiles);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let imageUrls: string[] = formData.images || [];

      // Upload new images if any
      if (imageFiles.length > 0 && user?.uid) {
        const uploadedUrls = await uploadMultipleImages(imageFiles, `collections/${user.uid}`);
        imageUrls = [...imageUrls, ...uploadedUrls];
      }

      await onSave({
        ...formData,
        images: imageUrls,
      });
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-gold-500/40 bg-navy-900/95 shadow-[0_22px_70px_rgba(0,0,0,0.9)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gold-500/30 bg-navy-900/95 px-6 py-4">
          <h2 className="text-2xl font-bold text-white">
            {item ? 'Editează Articol' : 'Adaugă Articol Nou'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Nume Articol *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gold-500/30 bg-navy-800/60 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e7b73c]"
                placeholder="ex: Roman Denarius"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Descriere
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-gold-500/30 bg-navy-800/60 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e7b73c]"
                placeholder="Descriere detaliată..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Țară</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gold-500/30 bg-navy-800/60 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e7b73c]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">An</label>
              <input
                type="number"
                value={formData.year || ''}
                onChange={(e) => setFormData({ ...formData, year: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-4 py-2 rounded-lg border border-gold-500/30 bg-navy-800/60 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e7b73c]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Denominație</label>
              <input
                type="text"
                value={formData.denomination}
                onChange={(e) => setFormData({ ...formData, denomination: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gold-500/30 bg-navy-800/60 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e7b73c]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Metal</label>
              <input
                type="text"
                value={formData.metal}
                onChange={(e) => setFormData({ ...formData, metal: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gold-500/30 bg-navy-800/60 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e7b73c]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Grad</label>
              <input
                type="text"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gold-500/30 bg-navy-800/60 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e7b73c]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Raritate</label>
              <select
                value={formData.rarity || ''}
                onChange={(e) => setFormData({ ...formData, rarity: e.target.value as any })}
                className="w-full px-4 py-2 rounded-lg border border-gold-500/30 bg-navy-800/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#e7b73c]"
              >
                <option value="">Selectează...</option>
                <option value="common">Comună</option>
                <option value="uncommon">Neobișnuită</option>
                <option value="rare">Rară</option>
                <option value="very-rare">Foarte Rară</option>
                <option value="extremely-rare">Extrem de Rară</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Preț Achiziție</label>
              <input
                type="number"
                step="0.01"
                value={formData.acquisitionPrice || ''}
                onChange={(e) => setFormData({ ...formData, acquisitionPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full px-4 py-2 rounded-lg border border-gold-500/30 bg-navy-800/60 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e7b73c]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Valoare Curentă</label>
              <input
                type="number"
                step="0.01"
                value={formData.currentValue || ''}
                onChange={(e) => setFormData({ ...formData, currentValue: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full px-4 py-2 rounded-lg border border-gold-500/30 bg-navy-800/60 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e7b73c]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-200 mb-1">Notițe Personale</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-gold-500/30 bg-navy-800/60 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e7b73c]"
                placeholder="Notițe despre acest articol..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-200 mb-1">Imagini</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-slate-200 file:mr-3 file:rounded-full file:border-0 file:bg-gold-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-navy-900 hover:file:bg-gold-400"
              />
              {imageFiles.length > 0 && (
                <p className="mt-1 text-xs text-slate-300">
                  {imageFiles.length} imagine{imageFiles.length > 1 ? 'i' : ''} selectate
                </p>
              )}
              {formData.images && formData.images.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-slate-400 mb-2">Imagini existente:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {formData.images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Imagine ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg border border-gold-500/30"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-2 flex gap-3 pt-4 border-t border-gold-500/30">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-gold-500/40 bg-navy-900/60 px-6 py-3 text-sm font-medium text-slate-100 hover:bg-navy-800 hover:border-gold-400 transition-colors"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-full bg-[#e7b73c] px-6 py-3 text-sm font-semibold text-[#000940] shadow-lg shadow-[#e7b73c]/40 transition-colors hover:bg-[#f0c955] disabled:bg-[#c9aa4a]"
            >
              {saving ? 'Se salvează...' : item ? 'Actualizează' : 'Adaugă'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
