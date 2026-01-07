'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { logout } from 'shared/auth';
import { useRouter } from 'next/navigation';
import { useProducts } from '../hooks/useProducts';
import { useAuctions } from '../hooks/useAuctions';
import Link from 'next/link';
import { getUserCredits, boostProductWithCredits } from 'shared/creditService';
import { getUserAutoBidsForUser, cancelAutoBid } from 'shared/auctionService';
import { getOrdersForBuyer, getSalesForSeller } from 'shared/orderService';
import { formatRON } from '../utils/currency';
import type { AutoBid, Auction } from 'shared/types';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { products } = useProducts(user?.uid);
  const { auctions } = useAuctions();
  const { useConversations } = require('../hooks/useChat');
  const { useCollection } = require('../hooks/useCollection');
  const { conversations, totalUnreadCount } = useConversations(user?.uid || null);
  const { items: collectionItems, stats: collectionStats } = useCollection(user?.uid || null);

  const [credits, setCredits] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [creditsError, setCreditsError] = useState<string | null>(null);
  const [autoBids, setAutoBids] = useState<{ autoBid: AutoBid; auction: Auction | null }[]>([]);
  const [autoBidsLoading, setAutoBidsLoading] = useState(false);

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [productById, setProductById] = useState<Record<string, any>>({});

  const [showAllMyProducts, setShowAllMyProducts] = useState(false);

  const [personalDetailsLoading, setPersonalDetailsLoading] = useState(false);
  const [personalDetailsSaving, setPersonalDetailsSaving] = useState(false);
  const [personalDetailsError, setPersonalDetailsError] = useState<string | null>(null);
  const [personalDetailsSaved, setPersonalDetailsSaved] = useState(false);
  const [personalDetails, setPersonalDetails] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    county: '',
    postalCode: '',
    country: 'România',
    billingAddress: '',
    billingCounty: '',
    billingPostalCode: '',
    billingCountry: 'România',
    bankAccount: '',
  });
  
  // Identity verification state
  const [idDocumentType, setIdDocumentType] = useState<'ci' | 'passport'>('ci');
  const [idDocumentNumber, setIdDocumentNumber] = useState('');
  const [frontPhoto, setFrontPhoto] = useState<File | null>(null);
  const [backPhoto, setBackPhoto] = useState<File | null>(null);
  const [frontPhotoPreview, setFrontPhotoPreview] = useState<string | null>(null);
  const [backPhotoPreview, setBackPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    // Diagnostic logging for "stuck on loading" / unauthenticated dashboard.
    console.log('[dashboard] auth state', {
      loading,
      hasUser: !!user,
      uid: user?.uid,
    });
  }, [loading, user?.uid]);

  useEffect(() => {
    // If the user is not authenticated, do not leave them stuck on a spinner.
    // Redirect to login.
    if (!loading && !user) {
      console.warn('[dashboard] unauthenticated: redirecting to /login');
      router.replace('/login');
    }
  }, [loading, user, router]);

  // Funcție pentru copierea adresei de livrare la adresa de facturare
  const copyDeliveryToBilling = () => {
    setPersonalDetails((p) => ({
      ...p,
      billingAddress: p.address,
      billingCounty: p.county,
      billingPostalCode: p.postalCode,
      billingCountry: p.country,
    }));
  };

  useEffect(() => {
    let isMounted = true;

    const loadCredits = async () => {
      if (!user?.uid) {
        if (isMounted) {
          setCredits(null);
        }
        return;
      }
      setCreditsLoading(true);
      setCreditsError(null);
      try {
        const value = await getUserCredits(user.uid);
        if (isMounted) {
          setCredits(value);
        }
      } catch (err) {
        console.error('Failed to load credits', err);
        if (isMounted) {
          setCreditsError('Nu s-au putut încărca creditele.');
        }
      } finally {
        if (isMounted) {
          setCreditsLoading(false);
        }
      }
    };

    loadCredits();

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  // Load recent direct shop orders/sales and cache product titles for clarity.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.uid || !db) return;
      setTransactionsLoading(true);
      setTransactionsError(null);
      try {
        const [orders, sales] = await Promise.all([
          getOrdersForBuyer(user.uid),
          getSalesForSeller(user.uid),
        ]);

        if (cancelled) return;
        setRecentOrders(orders.slice(0, 5));
        setRecentSales(sales.slice(0, 5));

        // Build product cache (includes orders + sales + ended auctions we already have in memory)
        const ids = new Set<string>();
        orders.forEach((o) => o.productId && ids.add(o.productId));
        sales.forEach((o) => o.productId && ids.add(o.productId));
        auctions.forEach((a) => a.productId && ids.add(a.productId));

        const entries = await Promise.all(
          Array.from(ids).map(async (id) => {
            try {
              const snap = await getDoc(doc(db, 'products', id));
              if (!snap.exists()) return [id, null] as const;
              const data = snap.data() as any;
              return [id, { id, name: data.name, images: data.images || [] }] as const;
            } catch {
              return [id, null] as const;
            }
          }),
        );

        if (cancelled) return;
        const next: Record<string, any> = {};
        for (const [id, value] of entries) {
          if (value) next[id] = value;
        }
        setProductById(next);
      } catch (err: any) {
        console.error('Failed to load dashboard transactions', err);
        if (!cancelled) setTransactionsError(err?.message || 'Nu s-au putut încărca tranzacțiile.');
      } finally {
        if (!cancelled) setTransactionsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, auctions]);

  useEffect(() => {
    let mounted = true;
    const loadPersonalDetails = async () => {
      if (!user?.uid) return;
      setPersonalDetailsLoading(true);
      setPersonalDetailsError(null);
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists()) return;
        const data = snap.data() as any;
        const details = (data.personalDetails || {}) as any;
        if (!mounted) return;
        setPersonalDetails({
          firstName: details.firstName || '',
          lastName: details.lastName || '',
          phone: details.phone || '',
          address: details.address || '',
          county: details.county || '',
          postalCode: details.postalCode || '',
          country: details.country || 'România',
          billingAddress: details.billingAddress || '',
          billingCounty: details.billingCounty || '',
          billingPostalCode: details.billingPostalCode || '',
          billingCountry: details.billingCountry || 'România',
          bankAccount: details.bankAccount || '',
        });
      } catch (err: any) {
        console.error('Failed to load personal details', err);
        if (mounted) {
          setPersonalDetailsError(err?.message || 'Nu s-au putut încărca datele personale.');
        }
      } finally {
        if (mounted) {
          setPersonalDetailsLoading(false);
        }
      }
    };

    loadPersonalDetails();
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  const handleSavePersonalDetails = async () => {
    if (!user?.uid) return;
    setPersonalDetailsSaved(false);
    setPersonalDetailsError(null);

    // Basic validation
    if (!personalDetails.firstName.trim() || !personalDetails.lastName.trim()) {
      setPersonalDetailsError('Completează numele și prenumele.');
      return;
    }
    if (!personalDetails.phone.trim()) {
      setPersonalDetailsError('Completează numărul de telefon.');
      return;
    }
    if (!personalDetails.address.trim()) {
      setPersonalDetailsError('Completează adresa.');
      return;
    }

    try {
      setPersonalDetailsSaving(true);
      await updateDoc(doc(db, 'users', user.uid), {
        personalDetails: {
          firstName: personalDetails.firstName.trim(),
          lastName: personalDetails.lastName.trim(),
          phone: personalDetails.phone.trim(),
          address: personalDetails.address.trim(),
          county: personalDetails.county.trim(),
          postalCode: personalDetails.postalCode.trim(),
          country: personalDetails.country.trim() || 'România',
          billingAddress: personalDetails.billingAddress.trim(),
          billingCounty: personalDetails.billingCounty.trim(),
          billingPostalCode: personalDetails.billingPostalCode.trim(),
          billingCountry: personalDetails.billingCountry.trim() || 'România',
          bankAccount: personalDetails.bankAccount.trim(),
        },
        updatedAt: serverTimestamp(),
      });
      setPersonalDetailsSaved(true);
    } catch (err: any) {
      console.error('Failed to save personal details', err);
      setPersonalDetailsError(err?.message || 'Nu s-au putut salva datele personale.');
    } finally {
      setPersonalDetailsSaving(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadAutoBids = async () => {
      if (!user?.uid) {
        if (isMounted) {
          setAutoBids([]);
        }
        return;
      }

      setAutoBidsLoading(true);
      try {
        const data = await getUserAutoBidsForUser(user.uid);
        if (isMounted) {
          setAutoBids(data);
        }
      } catch (err) {
        console.error('Failed to load user auto-bids', err);
      } finally {
        if (isMounted) {
          setAutoBidsLoading(false);
        }
      }
    };

    loadAutoBids();

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const handleBoostProduct = async (productId: string) => {
    if (!user?.uid) return;
    try {
      await boostProductWithCredits(user.uid, productId);
      // Credits and product boost fields will refresh via Firestore listeners
    } catch (err: any) {
      console.error('Failed to boost product', err);
      alert(err?.message || 'Nu s-a putut aplica boost-ul pentru această piesă.');
    }
  };

  const handleCancelAutoBidFromDashboard = async (auctionId: string) => {
    if (!user?.uid) return;

    const confirmed = window.confirm(
      'Ești sigur că vrei să anulezi licitarea automată pentru această licitație?',
    );
    if (!confirmed) return;

    try {
      await cancelAutoBid(auctionId, user.uid);
      setAutoBids((prev) => prev.filter((entry) => entry.autoBid.auctionId !== auctionId));
    } catch (err: any) {
      console.error('Failed to cancel auto-bid', err);
      alert(err?.message || 'Nu s-a putut anula licitarea automată pentru această licitație.');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Identity verification file upload handlers
  const handleFrontPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFrontPhoto(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setFrontPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBackPhoto(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setBackPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitVerification = async () => {
    if (!user?.uid) return;
    
    // Validate inputs
    if (!idDocumentNumber.trim()) {
      setUploadError('Te rugăm să introduci numărul documentului.');
      return;
    }
    
    if (!frontPhoto) {
      setUploadError('Te rugăm să încarci fotografia feței documentului.');
      return;
    }
    
    if (!backPhoto) {
      setUploadError('Te rugăm să încarci fotografia spate documentului.');
      return;
    }
    
    try {
      setUploading(true);
      setUploadError(null);
      setUploadSuccess(false);
      
      // Import the storage service
      const { uploadIdDocumentPhoto } = await import('shared/storageService');
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      
      // Upload both photos
      const frontPhotoUrl = await uploadIdDocumentPhoto(frontPhoto, user.uid, idDocumentType);
      const backPhotoUrl = await uploadIdDocumentPhoto(backPhoto, user.uid, idDocumentType);
      
      // Update user document with verification data
      await updateDoc(doc(db, 'users', user.uid), {
        idDocumentType,
        idDocumentNumber: idDocumentNumber.trim(),
        idDocumentPhotos: [frontPhotoUrl, backPhotoUrl],
        idVerificationStatus: 'pending',
        updatedAt: serverTimestamp()
      });
      
      setUploadSuccess(true);
      setFrontPhoto(null);
      setBackPhoto(null);
      setFrontPhotoPreview(null);
      setBackPhotoPreview(null);
      
    } catch (err: any) {
      console.error('Failed to submit verification', err);
      setUploadError(err?.message || 'Nu s-a putut trimite cererea de verificare.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
          <p className="ml-4 text-slate-300">Se încarcă...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-slate-300">Redirecționare către autentificare...</p>
      </div>
    );
  }

  // Filter auctions where user is participating (either as bidder or owner)
  const userAuctions = auctions.filter(auction =>
    auction.currentBidderId === user.uid || auction.ownerId === user.uid
  );
  
  // Separate owned auctions from bid auctions
  const ownedAuctions = auctions.filter(auction => auction.ownerId === user.uid);
  const biddingAuctions = auctions.filter(auction => auction.currentBidderId === user.uid && auction.ownerId !== user.uid);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 rounded-3xl border border-gold-500/40 bg-gradient-to-r from-navy-700 via-navy-800 to-navy-900 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-400">
                Contul meu
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-white">
                  Bine ai revenit, {user.email}
                </h1>
                {user.idVerificationStatus === 'verified' && (
                  <span className="inline-flex items-center rounded-full border border-emerald-400/70 bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                    Cont verificat
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-300">
                Vezi rapid colecția ta, mesajele, licitațiile active și creditele disponibile pentru boost-uri.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              {user && (
                <div className="rounded-2xl border border-gold-500/60 bg-navy-900/60 px-4 py-3 text-sm text-slate-100 shadow-[0_10px_40px_rgba(231,183,60,0.25)] max-w-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-400">
                    Link de invitație
                  </p>
                  <p className="mt-1 break-all text-xs">
                    {typeof window !== 'undefined'
                      ? `${window.location.origin}/register?ref=${user.uid}`
                      : `/register?ref=${user.uid}`}
                  </p>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-6 py-2 text-sm font-semibold text-navy-900 shadow-lg shadow-[0_0_25px_rgba(231,183,60,0.7)] transition hover:bg-[#f0c955]"
              >
                Deconectare
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-gradient-to-br from-navy-600 to-navy-800 backdrop-blur-sm p-6 rounded-2xl border border-gold-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:border-gold-400 transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Creditele Mele</h3>
              <svg className="w-8 h-8 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11.93A5.001 5.001 0 0110 5a5 5 0 011 9.93z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gold-300">
              {creditsLoading ? '—' : credits ?? 0}
            </p>
            <p className="text-sm text-slate-200">Credite disponibile pentru boost-uri și recompense</p>
            {creditsError && (
              <p className="text-xs text-red-300 mt-1">{creditsError}</p>
            )}
          </div>

          <Link href="/collection" className="bg-gradient-to-br from-navy-600 to-navy-800 backdrop-blur-sm p-6 rounded-2xl border border-gold-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:border-gold-400 transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Colecția Mea</h3>
              <svg className="w-8 h-8 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gold-300">{collectionItems?.length || 0}</p>
            <p className="text-sm text-slate-200">Articole în colecție</p>
            {collectionStats && collectionStats.totalValue > 0 && (
              <p className="text-sm text-gold-200 mt-1 font-semibold">Valoare: {formatRON(collectionStats.totalValue)}</p>
            )}
          </Link>

          <Link href="/messages" className="bg-gradient-to-br from-navy-600 to-navy-800 backdrop-blur-sm p-6 rounded-2xl border border-gold-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:border-gold-400 transition-all relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Mesaje</h3>
              <svg className="w-8 h-8 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gold-300">{conversations?.length || 0}</p>
            <p className="text-sm text-slate-200">Conversații active</p>
            {totalUnreadCount > 0 && (
              <>
                <p className="text-sm text-gold-200 mt-1 font-semibold">{totalUnreadCount} necitite</p>
                <span className="absolute top-4 right-4 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-gold-600 rounded-full">
                  {totalUnreadCount}
                </span>
              </>
            )}
          </Link>

          <div className="bg-gradient-to-br from-navy-600 to-navy-800 backdrop-blur-sm p-6 rounded-2xl border border-gold-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:border-gold-400 transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Produsele Mele</h3>
              <svg className="w-8 h-8 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gold-300">{products.length}</p>
            <p className="text-sm text-slate-200">Listate pentru vânzare</p>
          </div>

          <div className="bg-gradient-to-br from-navy-600 to-navy-800 backdrop-blur-sm p-6 rounded-2xl border border-gold-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:border-gold-400 transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Licitații Active</h3>
              <svg className="w-8 h-8 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gold-300">{userAuctions.length}</p>
            <p className="text-sm text-slate-200">Licitații la care participi</p>
          </div>
        </div>

        {/* Quick Actions */}
      <div className="bg-gradient-to-r from-gold-500 to-gold-600 rounded-2xl shadow-[0_20px_60px_rgba(231,183,60,0.3)] p-6 mb-8 border border-gold-400">
        <h2 className="text-xl font-semibold text-navy-900 mb-4">Acțiuni Rapide</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Link
            href="/collection"
            className="bg-[#e7b73c] hover:bg-[#f0c955] text-white px-4 py-3 rounded-xl text-center font-semibold transition-all shadow-lg shadow-[0_0_25px_rgba(231,183,60,0.5)]"
          >
            Colecția Mea
          </Link>
          <Link
            href="/messages"
            className="relative bg-[#e7b73c] hover:bg-[#f0c955] text-white px-4 py-3 rounded-xl text-center font-semibold transition-all shadow-lg shadow-[0_0_25px_rgba(231,183,60,0.5)]"
          >
            Mesaje
            {totalUnreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-navy-900 text-white text-xs font-bold px-2 py-1 rounded-full">
                {totalUnreadCount}
              </span>
            )}
          </Link>
          <Link
            href="/products"
            className="bg-[#e7b73c] hover:bg-[#f0c955] text-white px-4 py-3 rounded-xl text-center font-semibold transition-all shadow-lg shadow-[0_0_25px_rgba(231,183,60,0.5)]"
          >
            Magazin
          </Link>
          <Link
            href="/auctions"
            className="bg-[#e7b73c] hover:bg-[#f0c955] text-white px-4 py-3 rounded-xl text-center font-semibold transition-all shadow-lg shadow-[0_0_25px_rgba(231,183,60,0.5)]"
          >
            Licitații
          </Link>
          <Link
            href="/auction-wins"
            className="bg-[#e7b73c] hover:bg-[#f0c955] text-white px-4 py-3 rounded-xl text-center font-semibold transition-all shadow-lg shadow-[0_0_25px_rgba(231,183,60,0.5)]"
          >
            Câștigate
          </Link>
        </div>
      </div>

        {/* Transactions overview */}
        <div className="mb-8 rounded-2xl border border-gold-500/25 bg-navy-900/70 p-6 shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Tranzacțiile mele</h2>
              <p className="text-sm text-slate-300">
                Cumpărări și vânzări (magazin + licitații) cu acces rapid la detaliile tranzacției.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/orders"
                className="inline-flex items-center justify-center rounded-full border border-[#e7b73c]/70 px-4 py-2 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
              >
                Cumpărări
              </Link>
              <Link
                href="/auction-wins"
                className="inline-flex items-center justify-center rounded-full border border-[#e7b73c]/70 px-4 py-2 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
              >
                Licitații câștigate
              </Link>
              <Link
                href="/sales"
                className="inline-flex items-center justify-center rounded-full border border-[#e7b73c]/70 px-4 py-2 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
              >
                Vânzări
              </Link>
            </div>
          </div>

          {transactionsError && (
            <p className="text-sm text-red-200 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2 mb-4">
              {transactionsError}
            </p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchases */}
            <div className="rounded-2xl border border-gold-500/20 bg-navy-950/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-white">Cumpărări recente</h3>
                <span className="text-xs text-slate-300">{transactionsLoading ? '—' : recentOrders.length}</span>
              </div>

              {transactionsLoading ? (
                <p className="text-sm text-slate-300">Se încarcă...</p>
              ) : recentOrders.length === 0 ? (
                <p className="text-sm text-slate-300">Nu ai încă cumpărări înregistrate.</p>
              ) : (
                <div className="space-y-2">
                  {recentOrders.slice(0, 3).map((o: any) => {
                    const p = productById[o.productId];
                    const title = p?.name || `Piesă ${o.productId}`;
                    const sellerLabel =
                      o.sellerId === 'monetaria-statului'
                        ? 'Monetaria Statului'
                        : o.sellerName || `Vânzător #${o.sellerId.slice(-6)}`;
                    return (
                      <div
                        key={o.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-gold-500/15 bg-navy-900/40 p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white line-clamp-1">{title}</p>
                          <p className="text-xs text-slate-300">
                            Ai cumpărat de la{' '}
                            {o.sellerId === 'monetaria-statului' ? (
                              <span className="font-semibold">Monetaria Statului</span>
                            ) : (
                              <Link href={`/seller/${o.sellerId}`} className="font-semibold text-gold-300 hover:text-gold-200">
                                {sellerLabel}
                              </Link>
                            )}
                            {' • '}
                            <span className="font-semibold text-gold-300">{formatRON(o.price)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/orders/${o.id}`}
                            className="inline-flex items-center justify-center rounded-full border border-[#e7b73c]/50 px-3 py-1 text-[11px] font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10"
                          >
                            Detalii
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Auction wins */}
              {(() => {
                const wins = auctions
                  .filter((a) => a.status === 'ended' && a.winnerId === user.uid && a.didMeetMinimum)
                  .slice(0, 2);
                if (wins.length === 0) return null;
                return (
                  <div className="mt-4 pt-4 border-t border-gold-500/15">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gold-400 mb-2">Licitații câștigate</p>
                    <div className="space-y-2">
                      {wins.map((a) => {
                        const p = productById[a.productId];
                        const title = p?.name || `Licitație #${a.id.slice(-6)}`;
                        const sellerLabel = a.sellerName || (a.ownerId ? `Vânzător #${a.ownerId.slice(-6)}` : 'Vânzător');
                        return (
                          <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl border border-gold-500/15 bg-navy-900/40 p-3">
                            <div>
                              <p className="text-sm font-semibold text-white line-clamp-1">{title}</p>
                              <p className="text-xs text-slate-300">
                                Câștigată de la <span className="font-semibold">{sellerLabel}</span>
                                {' • '}
                                <span className="font-semibold text-gold-300">{formatRON(a.currentBid ?? 0)}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link href={`/auctions/${a.id}`} className="text-[11px] font-semibold text-gold-300 hover:text-gold-200">
                                Vezi
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Sales */}
            <div className="rounded-2xl border border-gold-500/20 bg-navy-950/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-white">Vânzări recente</h3>
                <span className="text-xs text-slate-300">{transactionsLoading ? '—' : recentSales.length}</span>
              </div>

              {transactionsLoading ? (
                <p className="text-sm text-slate-300">Se încarcă...</p>
              ) : recentSales.length === 0 ? (
                <p className="text-sm text-slate-300">Nu ai încă vânzări înregistrate.</p>
              ) : (
                <div className="space-y-2">
                  {recentSales.slice(0, 3).map((o: any) => {
                    const p = productById[o.productId];
                    const title = p?.name || `Piesă ${o.productId}`;
                    const buyerLabel = o.buyerName || `Cumpărător #${o.buyerId.slice(-6)}`;
                    return (
                      <div
                        key={o.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-gold-500/15 bg-navy-900/40 p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white line-clamp-1">{title}</p>
                          <p className="text-xs text-slate-300">
                            Ai vândut către{' '}
                            <Link href={`/seller/${o.buyerId}`} className="font-semibold text-gold-300 hover:text-gold-200">
                              {buyerLabel}
                            </Link>
                            {' • '}
                            <span className="font-semibold text-gold-300">{formatRON(o.price)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/orders/${o.id}`}
                            className="inline-flex items-center justify-center rounded-full border border-[#e7b73c]/50 px-3 py-1 text-[11px] font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10"
                          >
                            Detalii
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Auction sales */}
              {(() => {
                const sold = auctions
                  .filter((a) => a.status === 'ended' && a.ownerId === user.uid && !!a.winnerId && a.didMeetMinimum)
                  .slice(0, 2);
                if (sold.length === 0) return null;
                return (
                  <div className="mt-4 pt-4 border-t border-gold-500/15">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gold-400 mb-2">Licitații vândute</p>
                    <div className="space-y-2">
                      {sold.map((a) => {
                        const p = productById[a.productId];
                        const title = p?.name || `Licitație #${a.id.slice(-6)}`;
                        const buyerLabel = a.winnerName || (a.winnerId ? `Cumpărător #${a.winnerId.slice(-6)}` : 'Cumpărător');
                        return (
                          <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl border border-gold-500/15 bg-navy-900/40 p-3">
                            <div>
                              <p className="text-sm font-semibold text-white line-clamp-1">{title}</p>
                              <p className="text-xs text-slate-300">
                                Vândut către <span className="font-semibold">{buyerLabel}</span>
                                {' • '}
                                <span className="font-semibold text-gold-300">{formatRON(a.currentBid ?? 0)}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link href={`/auctions/${a.id}`} className="text-[11px] font-semibold text-gold-300 hover:text-gold-200">
                                Vezi
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Details */}
          {/* ID Verification Section */}
          <div className="bg-gradient-to-br from-navy-600 to-navy-800 backdrop-blur-sm p-6 rounded-2xl border border-gold-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Verificare Identitate</h2>
              </div>
              {user.idDocumentNumber && (
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                    user.idVerificationStatus === 'verified'
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                      : user.idVerificationStatus === 'pending'
                      ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/40'
                      : 'bg-red-500/20 text-red-200 border border-red-500/40'
                  }`}>
                    {user.idVerificationStatus === 'verified' ? 'VERIFICAT' :
                     user.idVerificationStatus === 'pending' ? 'ÎN AȘTEPTARE' : 'RESPINS'}
                  </span>
                </div>
              )}
            </div>
            
            {user.idDocumentNumber ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-300">
                    Tip document: <span className="font-semibold text-gold-300">{user.idDocumentType === 'passport' ? 'Pașaport' : 'Carte de identitate'}</span>
                  </p>
                  <p className="text-sm text-slate-300">
                    Număr document: <span className="font-mono text-gold-200">{String(user.idDocumentNumber).replace(/.(?=.{4})/g, '•')}</span>
                  </p>
                </div>
                
                {/* ID Document Photos */}
                {user.idDocumentPhotos && user.idDocumentPhotos.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-200">Documentele tale:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {user.idDocumentPhotos.map((photoUrl: string, index: number) => (
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
                    Nu ai încărcat fotografii ale documentului.
                  </p>
                )}
                
                <div className="text-xs text-slate-400 border-t border-gold-500/20 pt-3">
                  <p>Statusul verificării tale: {user.idVerificationStatus === 'verified' ? 'Contul tău este verificat' :
                    user.idVerificationStatus === 'pending' ? 'Documentul tău este în curs de verificare de către administratori' :
                    'Documentul tău a fost respins. Te rugăm să încarci documente valide.'}</p>
                </div>
                
                {/* Show resubmission option only if declined */}
                {user.idVerificationStatus === 'rejected' && (
                  <div className="bg-navy-900/40 rounded-lg border border-gold-500/20 p-4 mt-4">
                    <h3 className="text-base font-semibold text-white mb-3">Reîncarcă documentul de identitate</h3>
                    
                    {uploadError && (
                      <p className="text-sm text-red-200 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2 mb-3">
                        {uploadError}
                      </p>
                    )}
                    {uploadSuccess && (
                      <p className="text-sm text-emerald-200 border border-emerald-500/30 bg-emerald-500/10 rounded-lg px-3 py-2 mb-3">
                        Cererea de verificare a fost trimisă cu succes! Statusul tău este acum "În așteptare".
                      </p>
                    )}
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">Tip document</label>
                        <select
                          value={idDocumentType}
                          onChange={(e) => setIdDocumentType(e.target.value as 'ci' | 'passport')}
                          className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                        >
                          <option value="ci">Carte de identitate</option>
                          <option value="passport">Pașaport</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">CNP (Cod Numeric Personal)</label>
                        <input
                          type="text"
                          value={idDocumentNumber}
                          onChange={(e) => setIdDocumentNumber(e.target.value)}
                          placeholder="Introdu CNP-ul (13 cifre)"
                          className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">Față document</label>
                        <div className="border-2 border-dashed border-gold-500/30 rounded-lg p-6 text-center">
                          {frontPhotoPreview ? (
                            <div className="mb-3">
                              <img
                                src={frontPhotoPreview}
                                alt="Preview față document"
                                className="w-full h-32 object-contain rounded-lg mb-2"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setFrontPhoto(null);
                                  setFrontPhotoPreview(null);
                                }}
                                className="text-xs text-red-300 hover:text-red-200 underline"
                              >
                                Elimină
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-slate-400 mb-2">Apasă pentru a încărca</p>
                              <input type="file" accept="image/*" id="front-upload" className="hidden" onChange={handleFrontPhotoChange} />
                              <label htmlFor="front-upload" className="bg-gold-500 hover:bg-gold-600 text-navy-900 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer">
                                Selectează imagine
                              </label>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">Spate document</label>
                        <div className="border-2 border-dashed border-gold-500/30 rounded-lg p-6 text-center">
                          {backPhotoPreview ? (
                            <div className="mb-3">
                              <img
                                src={backPhotoPreview}
                                alt="Preview spate document"
                                className="w-full h-32 object-contain rounded-lg mb-2"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setBackPhoto(null);
                                  setBackPhotoPreview(null);
                                }}
                                className="text-xs text-red-300 hover:text-red-200 underline"
                              >
                                Elimină
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-slate-400 mb-2">Apasă pentru a încărca</p>
                              <input type="file" accept="image/*" id="back-upload" className="hidden" onChange={handleBackPhotoChange} />
                              <label htmlFor="back-upload" className="bg-gold-500 hover:bg-gold-600 text-navy-900 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer">
                                Selectează imagine
                              </label>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={handleSubmitVerification}
                        disabled={uploading}
                        className="w-full bg-gold-500 hover:bg-gold-600 text-navy-900 px-4 py-3 rounded-lg font-semibold mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {uploading ? 'Se încarcă...' : 'Trimite pentru verificare'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Verifică-ți identitatea pentru a beneficia de funcționalități avansate și pentru a câștiga încrederea cumpărătorilor.
                </p>
                
                <div className="bg-navy-900/40 rounded-lg border border-gold-500/20 p-4">
                  <h3 className="text-base font-semibold text-white mb-3">Încarcă documentul de identitate</h3>
                  
                  {uploadError && (
                    <p className="text-sm text-red-200 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2 mb-3">
                      {uploadError}
                    </p>
                  )}
                  {uploadSuccess && (
                    <p className="text-sm text-emerald-200 border border-emerald-500/30 bg-emerald-500/10 rounded-lg px-3 py-2 mb-3">
                      Cererea de verificare a fost trimisă cu succes! Statusul tău este acum "În așteptare".
                    </p>
                  )}
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-1">Tip document</label>
                      <select
                        value={idDocumentType}
                        onChange={(e) => setIdDocumentType(e.target.value as 'ci' | 'passport')}
                        className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                      >
                        <option value="ci">Carte de identitate</option>
                        <option value="passport">Pașaport</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-1">CNP (Cod Numeric Personal)</label>
                      <input
                        type="text"
                        value={idDocumentNumber}
                        onChange={(e) => setIdDocumentNumber(e.target.value)}
                        placeholder="Introdu CNP-ul (13 cifre)"
                        className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-1">Față document</label>
                      <div className="border-2 border-dashed border-gold-500/30 rounded-lg p-6 text-center">
                        {frontPhotoPreview ? (
                          <div className="mb-3">
                            <img
                              src={frontPhotoPreview}
                              alt="Preview față document"
                              className="w-full h-32 object-contain rounded-lg mb-2"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFrontPhoto(null);
                                setFrontPhotoPreview(null);
                              }}
                              className="text-xs text-red-300 hover:text-red-200 underline"
                            >
                              Elimină
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-slate-400 mb-2">Apasă pentru a încărca</p>
                            <input type="file" accept="image/*" id="front-upload" className="hidden" onChange={handleFrontPhotoChange} />
                            <label htmlFor="front-upload" className="bg-gold-500 hover:bg-gold-600 text-navy-900 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer">
                              Selectează imagine
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                     
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-1">Spate document</label>
                      <div className="border-2 border-dashed border-gold-500/30 rounded-lg p-6 text-center">
                        {backPhotoPreview ? (
                          <div className="mb-3">
                            <img
                              src={backPhotoPreview}
                              alt="Preview spate document"
                              className="w-full h-32 object-contain rounded-lg mb-2"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setBackPhoto(null);
                                setBackPhotoPreview(null);
                              }}
                              className="text-xs text-red-300 hover:text-red-200 underline"
                            >
                              Elimină
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-slate-400 mb-2">Apasă pentru a încărca</p>
                            <input type="file" accept="image/*" id="back-upload" className="hidden" onChange={handleBackPhotoChange} />
                            <label htmlFor="back-upload" className="bg-gold-500 hover:bg-gold-600 text-navy-900 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer">
                              Selectează imagine
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={handleSubmitVerification}
                      disabled={uploading}
                      className="w-full bg-gold-500 hover:bg-gold-600 text-navy-900 px-4 py-3 rounded-lg font-semibold mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {uploading ? 'Se încarcă...' : 'Trimite pentru verificare'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-navy-600 to-navy-800 backdrop-blur-sm p-6 rounded-2xl border border-gold-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Date personale</h2>
              </div>
            </div>

            {personalDetailsLoading ? (
              <div className="flex items-center gap-2 text-slate-200 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gold-500"></div>
                <span>Se încarcă datele personale...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">Nume *</label>
                    <input
                      value={personalDetails.lastName}
                      onChange={(e) => setPersonalDetails((p) => ({ ...p, lastName: e.target.value }))}
                      className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                      placeholder="Ex: Popescu"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">Prenume *</label>
                    <input
                      value={personalDetails.firstName}
                      onChange={(e) => setPersonalDetails((p) => ({ ...p, firstName: e.target.value }))}
                      className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                      placeholder="Ex: Andrei"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">Telefon *</label>
                  <input
                    value={personalDetails.phone}
                    onChange={(e) => setPersonalDetails((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                    placeholder="Ex: +40 7xx xxx xxx"
                  />
                </div>

                <div className="border-t border-gold-500/20 pt-4 mt-2">
                  <h3 className="text-base font-semibold text-white mb-3">Adresă de livrare</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-1">Adresă *</label>
                      <input
                        value={personalDetails.address}
                        onChange={(e) => setPersonalDetails((p) => ({ ...p, address: e.target.value }))}
                        className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                        placeholder="Stradă, număr, bloc, scară, apartament"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">Județ *</label>
                        <input
                          value={personalDetails.county}
                          onChange={(e) => setPersonalDetails((p) => ({ ...p, county: e.target.value }))}
                          className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                          placeholder="Ex: Ilfov"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">Cod poștal *</label>
                        <input
                          value={personalDetails.postalCode}
                          onChange={(e) => setPersonalDetails((p) => ({ ...p, postalCode: e.target.value }))}
                          className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                          placeholder="Ex: 010101"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">Țară *</label>
                        <input
                          value={personalDetails.country}
                          onChange={(e) => setPersonalDetails((p) => ({ ...p, country: e.target.value }))}
                          className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                          placeholder="România"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gold-500/20 pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-white">Adresă de facturare</h3>
                    <button
                      type="button"
                      onClick={copyDeliveryToBilling}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#e7b73c]/50 bg-[#e7b73c]/10 px-3 py-1.5 text-xs font-medium text-[#e7b73c] hover:bg-[#e7b73c]/20 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copiază din livrare
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-1">Adresă</label>
                      <input
                        value={personalDetails.billingAddress}
                        onChange={(e) => setPersonalDetails((p) => ({ ...p, billingAddress: e.target.value }))}
                        className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                        placeholder="Stradă, număr, bloc, scară, apartament"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">Județ</label>
                        <input
                          value={personalDetails.billingCounty}
                          onChange={(e) => setPersonalDetails((p) => ({ ...p, billingCounty: e.target.value }))}
                          className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                          placeholder="Ex: Ilfov"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">Cod poștal</label>
                        <input
                          value={personalDetails.billingPostalCode}
                          onChange={(e) => setPersonalDetails((p) => ({ ...p, billingPostalCode: e.target.value }))}
                          className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                          placeholder="Ex: 010101"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">Țară</label>
                        <input
                          value={personalDetails.billingCountry}
                          onChange={(e) => setPersonalDetails((p) => ({ ...p, billingCountry: e.target.value }))}
                          className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                          placeholder="România"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">Cont bancar (IBAN)</label>
                  <input
                    value={personalDetails.bankAccount}
                    onChange={(e) => setPersonalDetails((p) => ({ ...p, bankAccount: e.target.value }))}
                    className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                    placeholder="Ex: RO49AAAA1B31007593840000"
                  />
                </div>

                {personalDetailsError && (
                  <p className="text-sm text-red-200 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
                    {personalDetailsError}
                  </p>
                )}
                {personalDetailsSaved && (
                  <p className="text-sm text-emerald-200 border border-emerald-500/30 bg-emerald-500/10 rounded-lg px-3 py-2">
                    Datele au fost salvate.
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSavePersonalDetails}
                    disabled={personalDetailsSaving}
                    className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-6 py-2 text-sm font-semibold text-navy-900 shadow-lg shadow-[0_0_25px_rgba(231,183,60,0.7)] transition hover:bg-[#f0c955] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {personalDetailsSaving ? 'Se salvează...' : 'Salvează'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* My Products */}
          <div className="bg-gradient-to-br from-navy-600 to-navy-800 backdrop-blur-sm p-6 rounded-2xl border border-gold-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:border-gold-400 transition-all">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Produsele mele</h2>
              <Link
                href="/products/new"
                className="bg-[#e7b73c] hover:bg-[#f0c955] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-[0_0_25px_rgba(231,183,60,0.6)] transition-colors"
              >
                Adaugă piesă
              </Link>
            </div>

            {products.length === 0 ? (
              <p className="text-slate-200">Nicio piesă listată încă.</p>
            ) : (
              <div className="space-y-3">
                {(showAllMyProducts ? products : products.slice(0, 5)).map((product) => {
                  const isBoostActive =
                    product.boostExpiresAt instanceof Date
                      ? product.boostExpiresAt.getTime() > Date.now()
                      : false;

                  return (
                    <div key={product.id} className="flex justify-between items-center p-3 bg-navy-900/40 rounded-xl border border-gold-500/20">
                      <div>
                        <p className="font-medium text-white">{product.name}</p>
                        <p className="text-sm text-gold-300 font-semibold">{formatRON(product.price)}</p>
                        {isBoostActive && (
                          <p className="mt-1 text-xs font-semibold text-emerald-300">
                            Boost activ – piesa ta este evidențiată în listări
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <button
                          onClick={() => handleBoostProduct(product.id)}
                          disabled={isBoostActive}
                          className="text-xs font-semibold px-3 py-1 rounded-full border border-gold-500 text-gold-300 hover:bg-gold-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isBoostActive ? 'Boost activ' : 'Boost vizibilitate'}
                        </button>
                        <Link
                          href={`/products/${product.id}`}
                          className="text-gold-300 hover:text-gold-200 text-sm font-semibold"
                        >
                          Vezi
                        </Link>
                      </div>
                    </div>
                  );
                })}
                {!showAllMyProducts && products.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllMyProducts(true)}
                    className="w-full text-sm text-slate-200 text-center underline decoration-gold-500/50 underline-offset-4 hover:text-gold-200"
                  >
                    Și încă {products.length - 5}...
                  </button>
                )}
                {showAllMyProducts && products.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllMyProducts(false)}
                    className="w-full text-xs text-slate-300 text-center hover:text-slate-100"
                  >
                    Afișează mai puțin
                  </button>
                )}
              </div>
            )}
          </div>

          {/* My Auction Activity */}
          <div className="bg-gradient-to-br from-navy-600 to-navy-800 backdrop-blur-sm p-6 rounded-2xl border border-gold-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:border-gold-400 transition-all">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Activitatea mea la licitații</h2>
              <Link
                href="/my-auctions"
                className="text-gold-300 hover:text-gold-200 text-sm font-semibold"
              >
                Vezi toate
              </Link>
            </div>

            {/* Owned Auctions */}
            {ownedAuctions.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gold-400 mb-2">Licitațiile mele</h3>
                <div className="space-y-2">
                  {ownedAuctions.slice(0, 3).map((auction) => (
                    <div
                      key={auction.id}
                      className="flex justify-between items-center p-3 bg-navy-900/40 rounded-xl border border-gold-500/20"
                    >
                      <div>
                        <p className="font-medium text-white">Licitație #{auction.id.slice(-6)}</p>
                        <p className="text-sm text-gold-300 font-semibold">
                          Licitație curentă:{' '}
                          {formatRON(auction.currentBid ?? auction.reservePrice)}
                        </p>
                        <p className="text-xs text-slate-400">
                          Status: {auction.status === 'active' ? 'Activă' : auction.status === 'ended' ? 'Încheiată' : auction.status}
                        </p>
                      </div>
                      <Link
                        href={`/auctions/${auction.id}`}
                        className="text-gold-300 hover:text-gold-200 text-sm font-semibold"
                      >
                        Vezi
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bidding Auctions */}
            {biddingAuctions.length === 0 && ownedAuctions.length === 0 ? (
              <p className="text-slate-200">Nicio licitație activă.</p>
            ) : biddingAuctions.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-gold-400 mb-2">Licitații la care participi</h3>
                <div className="space-y-2">
                  {biddingAuctions.slice(0, 3).map((auction) => (
                    <div
                      key={auction.id}
                      className="flex justify-between items-center p-3 bg-navy-900/40 rounded-xl border border-gold-500/20"
                    >
                      <div>
                        <p className="font-medium text-white">Licitație #{auction.id.slice(-6)}</p>
                        <p className="text-sm text-gold-300 font-semibold">
                          Licitație curentă:{' '}
                          {formatRON(auction.currentBid ?? auction.reservePrice)}
                        </p>
                      </div>
                      <Link
                        href={`/auctions/${auction.id}`}
                        className="text-gold-300 hover:text-gold-200 text-sm font-semibold"
                      >
                        Vezi
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-4 border-t border-gold-500/30 pt-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Licitările mele automate
              </h3>
              {autoBidsLoading ? (
                <div className="flex items-center gap-2 text-slate-200 text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gold-500"></div>
                  <span>Se încarcă licitările automate...</span>
                </div>
              ) : autoBids.length === 0 ? (
                <p className="text-slate-200 text-sm">
                  Nu ai setat încă nicio licitare automată.
                </p>
              ) : (
                <div className="space-y-3">
                  {autoBids.slice(0, 5).map(({ autoBid, auction }) => (
                    <div
                      key={`${autoBid.auctionId}-${autoBid.id}`}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 bg-navy-900/40 rounded-xl border border-gold-500/20"
                    >
                      <div>
                        <p className="font-medium text-white">
                          Licitație #{auction ? auction.id.slice(-6) : autoBid.auctionId.slice(-6)}
                        </p>
                        <p className="text-sm text-gold-300 font-semibold">
                          Până la: {formatRON(autoBid.maxAmount)}
                        </p>
                        {auction && (
                          <p className="text-xs text-slate-300">
                            Status:{' '}
                            <span className="font-semibold">
                              {auction.status.toUpperCase()}
                            </span>{' '}
                            &mdash; se încheie la {auction.endTime.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {auction && (
                          <Link
                            href={`/auctions/${auction.id}`}
                            className="text-gold-300 hover:text-gold-200 text-xs font-semibold"
                          >
                            Vezi licitația
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCancelAutoBidFromDashboard(autoBid.auctionId)}
                          className="inline-flex items-center justify-center rounded-full border border-red-500/70 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/10 transition-colors"
                        >
                          Anulează
                        </button>
                      </div>
                    </div>
                  ))}
                  {autoBids.length > 5 && (
                    <p className="text-xs text-slate-300">
                      Și încă {autoBids.length - 5} licitări automate active...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
