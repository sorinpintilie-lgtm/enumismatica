'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProduct, useProducts } from '../../hooks/useProducts';
import PriceEvolutionChart from '../../components/PriceEvolutionChart';
import { useToast } from '../../components/ToastProvider';
import { useAuth } from '../../context/AuthContext';
import { createDirectOrderForProduct } from 'shared/orderService';
import { createOrGetConversation } from 'shared/chatService';
import { useCart } from '../../hooks/useCart';
import { logEvent } from '../../hooks/useActivityLogger';
import OfferModal from '../../components/OfferModal';
import OfferManagement from '../../components/OfferManagement';
import ProductCard from '../../components/ProductCard';
import { formatRON } from '../../utils/currency';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Helper to safely format numeric/string values with units (avoids duplicated units like "gg" / "mmmm")
function formatWithUnit(value: string | number | null | undefined, unit: string): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value === 'number') {
    return `${value} ${unit}`;
  }

  const trimmed = String(value).trim();
  const lower = trimmed.toLowerCase();

  // If the value already ends with the unit (e.g. "10 g" or "10mm"), don't append it again
  if (lower.endsWith(unit.toLowerCase())) {
    return trimmed;
  }

  return `${trimmed} ${unit}`;
}

// Ensure product images get a width parameter without breaking existing query strings
function buildImageUrlWithWidth(url: string | undefined, width: number): string {
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}width=${width}`;
}

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { product, loading, error } = useProduct(id);
  const { showToast } = useToast();
  const { user } = useAuth();
  const { addToCart } = useCart(user?.uid);

  // Get other products by the same seller
  const { products: otherProducts } = useProducts(
    product?.ownerId,
    20,
    ['name', 'images', 'price', 'createdAt'],
    !!product?.ownerId,
    'direct',
    false
  );

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [buying, setBuying] = useState(false);
  const [showBuyConfirm, setShowBuyConfirm] = useState(false);
  const [viewMode, setViewMode] = useState<'owner' | 'preview'>('preview');
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showOfferManagement, setShowOfferManagement] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

  const images = product?.images ?? [];
  const isOwner = user && product && user.uid === product.ownerId;
  
  // Seller information state
  const [sellerName, setSellerName] = useState<string | null>(null);
  const [sellerVerified, setSellerVerified] = useState(false);
  const [sellerUsername, setSellerUsername] = useState<string | null>(null);

  // Set default view mode for owners
  useEffect(() => {
    if (isOwner && viewMode === 'preview') {
      setViewMode('owner');
    }
  }, [isOwner, viewMode]);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const { isAdmin } = require('shared/adminService');
        const adminStatus = await isAdmin(user.uid);
        setIsAdminUser(adminStatus);
      }
    };
    checkAdmin();
  }, [user]);

  // Fetch seller information
  useEffect(() => {
    let cancelled = false;
    const loadSeller = async () => {
      if (!db || !product?.ownerId) return;
      try {
        const snap = await getDoc(doc(db, 'users', product.ownerId));
        if (!snap.exists()) return;
        const data = snap.data() as any;
        if (cancelled) return;
        setSellerName(data.displayName || data.name || data.email || `Vânzător #${product.ownerId.slice(-6)}`);
        setSellerUsername(data.username || data.displayName || data.name || `utilizator${product.ownerId.slice(-4)}`);
        setSellerVerified(data.idVerificationStatus === 'verified');
      } catch (err) {
        console.error('Failed to load seller', err);
      }
    };

    setSellerName(null);
    setSellerUsername(null);
    setSellerVerified(false);
    loadSeller();
    return () => {
      cancelled = true;
    };
  }, [product?.ownerId]);

  const openLightboxAt = (index: number) => {
    if (!images.length) return;
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  useEffect(() => {
    // Reset hero image when navigating to a different product.
    setHeroIndex(0);
  }, [id]);

  const closeLightbox = () => setLightboxOpen(false);

  const showPrevImage = () => {
    if (!images.length) return;
    setLightboxIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const showNextImage = () => {
    if (!images.length) return;
    setLightboxIndex((prev) => (prev + 1) % images.length);
  };

  const handleBuyClick = () => {
    if (!product) return;

    if (!user) {
      showToast({
        type: 'error',
        title: 'Autentificare necesară',
        message: 'Trebuie să te autentifici pentru a cumpăra această piesă.',
      });
      return;
    }

    if (product.ownerId === user.uid) {
      showToast({
        type: 'error',
        title: 'Nu poți cumpăra propria piesă',
        message: 'Ești deja proprietarul acestei piese.',
      });
      return;
    }

    if ((product as any).isSold) {
      showToast({
        type: 'error',
        title: 'Piesă indisponibilă',
        message: 'Această piesă a fost deja vândută.',
      });
      return;
    }

    setShowBuyConfirm(true);
  };

  const handleBuy = async () => {
    if (!product || !user) return;

    try {
      setBuying(true);
      const orderId = await createDirectOrderForProduct(product.id, user.uid);

      // Admin activity log: direct shop purchase from product detail page
      await logEvent(user, 'product_buy', {
        productId: product.id,
        productName: product.name,
        price: product.price,
        orderId,
        source: 'product_detail',
      });

      // Ensure a private conversation exists between buyer and seller and redirect to it
      if (product.ownerId && product.ownerId !== user.uid) {
        try {
          const conversationId = await createOrGetConversation(
            user.uid,
            product.ownerId,
            undefined,
            product.id,
            false,
          );
          router.push(`/messages?conversation=${conversationId}`);
        } catch (convError) {
          console.error('Failed to open conversation after direct product purchase:', convError);
        }
      }

      showToast({
        type: 'success',
        title: 'Cumpărare reușită',
        message: `Ai cumpărat această piesă. Comanda ta a fost înregistrată (ID: ${orderId}).`,
      });
    } catch (error) {
      console.error('Failed to buy product:', error);
      const message =
        error instanceof Error ? error.message : 'A apărut o eroare la cumpărarea piesei.';
      showToast({
        type: 'error',
        title: 'Eroare la cumpărare',
        message,
      });
    } finally {
      setBuying(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    if (!user) {
      showToast({
        type: 'error',
        title: 'Autentificare necesară',
        message: 'Trebuie să te autentifici pentru a adăuga piese în coș.',
      });
      return;
    }

    try {
      await addToCart(product.id, 1);
      showToast({
        type: 'success',
        title: 'Adăugat în coș',
        message: `${product.name} a fost adăugat în coșul tău.`,
      });
    } catch (error) {
      console.error('Failed to add to cart:', error);
      const message =
        error instanceof Error ? error.message : 'A apărut o eroare la adăugarea piesei în coș.';
      showToast({
        type: 'error',
        title: 'Eroare la coș',
        message,
      });
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

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto panel-dark p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            {error ? 'Eroare la încărcarea piesei' : 'Piesă negăsită'}
          </h1>
          <p className="text-slate-300 mb-4">
            {error || 'Piesa pe care o cauți nu există.'}
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-6 py-2 text-sm font-semibold text-[#000940] shadow-[0_0_24px_rgba(231,183,60,0.75)] hover:bg-[#f0c955] transition-colors"
          >
            Înapoi la piese
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {showBuyConfirm && product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="mx-4 max-w-md w-full rounded-2xl bg-navy-900/95 border border-gold-500/40 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.95)]">
            <h3 className="text-lg font-semibold text-white mb-2">
              Confirmă cumpărarea piesei
            </h3>
            <p className="text-sm text-slate-200 mb-4">
              Ești sigur că vrei să cumperi această piesă pentru{' '}
              <span className="font-semibold text-[#e7b73c]">
                {formatRON(product.price)}
              </span>
              ?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBuyConfirm(false)}
                className="inline-flex items-center justify-center rounded-full border border-slate-500/60 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-300 hover:bg-slate-800/60 transition-colors"
                disabled={buying}
              >
                Nu
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleBuy();
                  setShowBuyConfirm(false);
                }}
                disabled={buying}
                className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-4 py-2 text-sm font-semibold text-[#000940] shadow-[0_0_24px_rgba(231,183,60,0.85)] hover:bg-[#f0c955] disabled:bg-[#e7b73c]/60 disabled:text-slate-600 transition-colors"
              >
                {buying ? 'Se procesează...' : 'Da, cumpără acum'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => {
                console.log('[ProductDetail] Back button clicked, attempting to use window.history.back()');
                try {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    console.log('[ProductDetail] No history available, redirecting to /products');
                    window.location.href = '/products';
                  }
                } catch (error) {
                  console.error('[ProductDetail] Error with history navigation:', error);
                  window.location.href = '/products';
                }
              }}
              className="inline-flex items-center text-sm font-medium text-gold-400 hover:text-gold-300 transition-colors bg-transparent border-none cursor-pointer"
            >
              ← Înapoi la piese
            </button>
            {isOwner && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300">Vizualizare:</span>
                <div className="flex rounded-lg bg-navy-800/60 p-1 border border-gold-500/30">
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'preview'
                        ? 'bg-gold-500 text-navy-900'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => setViewMode('owner')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'owner'
                        ? 'bg-gold-500 text-navy-900'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Proprietar
                  </button>
                </div>
              </div>
            )}
            {isAdminUser && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const editUrl = `/products/new?edit=${product.id}`;
                    window.location.href = editUrl;
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Modifică Piesă
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Images */}
            <div className="space-y-4">
              {images.length > 0 ? (
                <div
                  className="w-full h-96 bg-navy-900/60 rounded-2xl overflow-hidden border border-gold-500/20 cursor-zoom-in flex items-center justify-center"
                  onClick={() => openLightboxAt(heroIndex)}
                >
                  <img
                    src={buildImageUrlWithWidth(images[heroIndex] || images[0], 800)}
                    alt={product.name}
                    className="w-full h-full object-contain bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950"
                  />
                </div>
              ) : (
                <div className="w-full h-96 bg-navy-900/60 rounded-2xl flex items-center justify-center border border-gold-500/20">
                  <span className="text-slate-400 text-lg">Imagine indisponibilă</span>
                </div>
              )}

              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.slice(1).map((image, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setHeroIndex(index + 1)}
                      className={`w-full h-20 bg-navy-900/60 rounded-xl overflow-hidden border transition-colors cursor-pointer ${
                        heroIndex === index + 1
                          ? 'border-gold-400/80'
                          : 'border-gold-500/10 hover:border-gold-500/30'
                      }`}
                    >
                      <img
                        src={buildImageUrlWithWidth(image, 200)}
                        alt={`${product.name} ${index + 2}`}
                        className="w-full h-full object-contain bg-navy-950"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {product.name}
                </h1>
                <p className="text-slate-300">
                  Adăugat în {product.createdAt.toLocaleDateString()}
                </p>
                {product.ownerId && (
                  <div className="mt-4 flex items-center gap-3">
                    <Link
                      href={`/seller/${product.ownerId}`}
                      className="flex items-center gap-2 text-sm text-slate-200 hover:text-white transition-colors"
                    >
                      <span className="font-medium">Vânzător:</span>
                      <span className="text-gold-300">@{sellerUsername}</span>
                      {sellerVerified && (
                        <span className="inline-flex items-center rounded-full border border-emerald-400/60 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                          VERIFICAT
                        </span>
                      )}
                    </Link>
                  </div>
                )}
              </div>

              <div>
                <p className="text-4xl font-bold text-[#e7b73c] mb-1">
                  {formatRON(product.price)}
                </p>
                <p className="text-[11px] text-slate-300 mb-2 max-w-md">
                  Prețul este afișat în EUR.
                </p>
                {product.isSold && (
                  <p className="text-sm font-semibold text-red-300 mb-2">
                    Această piesă a fost vândută și nu mai este disponibilă.
                  </p>
                )}
                {viewMode === 'preview' ? (
                  <div className="flex flex-col sm:flex-row gap-3 mt-1">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={product.isSold === true || (!!user && product.ownerId === user.uid)}
                      className="flex-1 bg-navy-900/80 hover:bg-navy-800 disabled:bg-navy-900/40 disabled:text-slate-500 text-gold-200 px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition-colors border border-gold-500/60 shadow-[0_0_18px_rgba(15,23,42,0.9)]"
                    >
                      {product.isSold
                        ? 'Deja vândut'
                        : !!user && product.ownerId === user.uid
                        ? 'Ești proprietarul acestei piese'
                        : 'Adaugă în coș'}
                    </button>
                    <button
                      type="button"
                      onClick={handleBuyClick}
                      disabled={
                        buying ||
                        product.isSold === true ||
                        (!!user && product.ownerId === user.uid)
                      }
                      className="flex-1 bg-[#e7b73c] hover:bg-[#f0c955] disabled:bg-[#e7b73c]/50 disabled:text-slate-700 text-[#000940] px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition-colors shadow-[0_0_24px_rgba(231,183,60,0.8)]"
                    >
                      {product.isSold
                        ? 'Deja vândut'
                        : !!user && product.ownerId === user.uid
                        ? 'Ești proprietarul acestei piese'
                        : buying
                        ? 'Se procesează cumpărarea...'
                        : 'Cumpără acum'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!user) {
                          showToast({
                            type: 'error',
                            title: 'Autentificare necesară',
                            message: 'Trebuie să te autentifici pentru a face o ofertă.',
                          });
                          return;
                        }
                        if (product.ownerId === user.uid) {
                          showToast({
                            type: 'error',
                            title: 'Nu poți face ofertă pe propria piesă',
                            message: 'Ești deja proprietarul acestei piese.',
                          });
                          return;
                        }
                        if (product.isSold) {
                          showToast({
                            type: 'error',
                            title: 'Piesă indisponibilă',
                            message: 'Această piesă a fost deja vândută.',
                          });
                          return;
                        }
                        if (product.acceptsOffers === false) {
                          showToast({
                            type: 'info',
                            title: 'Oferțiile nu sunt acceptate',
                            message: 'Vânzătorul nu acceptă oferte pentru această piesă.',
                          });
                          return;
                        }
                        setShowOfferModal(true);
                      }}
                      disabled={product.isSold === true || (!!user && product.ownerId === user.uid) || product.acceptsOffers === false}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 disabled:text-slate-300 text-white px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition-colors shadow-[0_0_24px_rgba(34,197,94,0.6)]"
                    >
                      {product.isSold
                        ? 'Deja vândut'
                        : !!user && product.ownerId === user.uid
                        ? 'Ești proprietarul acestei piese'
                        : product.acceptsOffers === false
                        ? 'Oferțiile nu sunt acceptate'
                        : 'Transmite o ofertă'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 mt-1">
                    <div className="text-sm text-slate-300">
                      <strong>Mod Proprietar:</strong> Gestionați-vă piesa și vizualizați ofertele primite.
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link
                        href={`/products/new?edit=${product.id}`}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition-colors text-center"
                      >
                        Editează Piesă
                      </Link>
                      <button
                        type="button"
                        onClick={() => setShowOfferManagement(true)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition-colors"
                      >
                        Gestionare Oferte
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-3">
                  Descriere
                </h2>
                <p className="text-slate-200 leading-relaxed">
                  {product.description}
                </p>
              </div>

              <div className="border-t border-gold-500/20 pt-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Detalii monedă
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-[#e7b73c] mb-3">Informații generale</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-300">ID piesă:</span>
                        <span className="font-mono text-slate-100">{product.id}</span>
                      </div>
                      {product.country && (
                        <div className="flex justify-between">
                          <span className="text-slate-300">Țară:</span>
                          <span className="text-slate-100">{product.country}</span>
                        </div>
                      )}
                      {product.year && (
                        <div className="flex justify-between">
                          <span className="text-slate-300">An:</span>
                          <span className="text-slate-100">{product.year}</span>
                        </div>
                      )}
                      {product.era && (
                        <div className="flex justify-between">
                          <span className="text-slate-300">Epocă:</span>
                          <span className="text-slate-100">{product.era}</span>
                        </div>
                      )}
                      {product.denomination && (
                        <div className="flex justify-between">
                          <span className="text-slate-300">Valoare nominală:</span>
                          <span className="text-slate-100">{product.denomination}</span>
                        </div>
                      )}
                      {product.category && (
                        <div className="flex justify-between">
                          <span className="text-slate-300">Categorie:</span>
                          <span className="text-slate-100">{product.category}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Physical Properties */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-[#e7b73c] mb-3">Proprietăți fizice</h3>
                    <div className="space-y-2 text-sm">
                      {product.metal && (
                        <div className="flex justify-between">
                          <span className="text-slate-300">Metal:</span>
                          <span className="text-slate-100">{product.metal}</span>
                        </div>
                      )}
                      {product.weight && (
                        <div className="flex justify-between">
                          <span className="text-slate-300">Greutate:</span>
                          <span className="text-slate-100">{formatWithUnit(product.weight as any, 'g')}</span>
                        </div>
                      )}
                      {product.diameter && (
                        <div className="flex justify-between">
                          <span className="text-slate-300">Diametru:</span>
                          <span className="text-slate-100">{formatWithUnit(product.diameter as any, 'mm')}</span>
                        </div>
                      )}
                      {product.grade && (
                        <div className="flex justify-between">
                          <span className="text-slate-300">Grad:</span>
                          <span className="text-slate-100">{product.grade}</span>
                        </div>
                      )}
                      {product.mintMark && (
                        <div className="flex justify-between">
                          <span className="text-slate-300">Marcă monetărie:</span>
                          <span className="text-slate-100">{product.mintMark}</span>
                        </div>
                      )}
                      {product.rarity && (
                        <div className="flex justify-between">
                          <span className="text-slate-300">Raritate:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            product.rarity === 'extremely-rare' ? 'bg-red-900/60 text-red-200' :
                            product.rarity === 'very-rare' ? 'bg-orange-900/60 text-orange-200' :
                            product.rarity === 'rare' ? 'bg-yellow-900/60 text-yellow-200' :
                            product.rarity === 'uncommon' ? 'bg-blue-900/60 text-blue-200' :
                            'bg-gray-900/60 text-gray-200'
                          }`}>
                            {product.rarity.replace('-', ' ').toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Certification Section */}
                {(product.hasCertification || product.hasNgcCertification || product.certificationCompany || product.ngcCode) && (
                  <div className="mt-6 pt-4 border-t border-gold-500/20">
                    <h3 className="text-lg font-medium text-[#e7b73c] mb-3">Certificare</h3>
                    <div className="space-y-3 text-sm">
                      {product.certificationCompany && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Companie certificare:</span>
                          <span className="text-slate-100 font-medium">
                            {product.certificationCompany === 'NGC' ? 'Numismatic Guaranty Corporation' : 'Professional Coin Grading Service'}
                          </span>
                        </div>
                      )}
                      {product.certificationCode && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Cod certificare:</span>
                          <span className="text-slate-100 font-mono">
                            {product.certificationCode}
                          </span>
                        </div>
                      )}
                      {product.ngcCode && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Cod NGC:</span>
                          <span className="text-slate-100 font-mono">
                            {product.ngcCode}
                          </span>
                        </div>
                      )}
                      {product.certificationGrade && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Grad certificare:</span>
                          <span className="text-slate-100">
                            {product.certificationGrade}
                          </span>
                        </div>
                      )}
                      {product.ngcGrade && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Grad NGC:</span>
                          <span className="text-slate-100">
                            {product.ngcGrade}
                          </span>
                        </div>
                      )}

                      {/* Certification Verification Links */}
                      <div className="mt-4 flex gap-2">
                        {product.certificationCompany === 'NGC' && product.certificationCode && (
                          <Link
                            href={`https://www.ngccoin.com/certlookup/${product.certificationCode}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 transition-colors text-xs"
                          >
                            <span className="font-semibold">NGC</span> Verificare
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                        )}
                        {product.certificationCompany === 'PCGS' && product.certificationCode && (
                          <Link
                            href={`https://www.pcgs.com/cert/${product.certificationCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-600/20 border border-green-500/40 text-green-300 hover:bg-green-600/30 transition-colors text-xs"
                          >
                            <span className="font-semibold">PCGS</span> Verificare
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                        )}
                        {product.ngcCode && (
                          <Link
                            href={`https://www.ngccoin.com/certlookup/${product.ngcCode}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 transition-colors text-xs"
                          >
                            <span className="font-semibold">NGC</span> Verificare
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Offers Section - Only for Owner */}
                {viewMode === 'owner' && (
                  <div className="mt-6 pt-4 border-t border-gold-500/20">
                    <h3 className="text-lg font-medium text-[#e7b73c] mb-3">Oferte Primite</h3>
                    <div className="text-sm text-slate-300">
                      Funcționalitatea de gestionare a ofertelor va fi implementată aici.
                      Veți putea vedea toate ofertele primite, accepta sau respinge ofertele.
                    </div>
                  </div>
                )}

                {/* Listing Information */}
                <div className="mt-6 pt-4 border-t border-gold-500/20">
                  <h3 className="text-lg font-medium text-[#e7b73c] mb-3">Informații listare</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Listat:</span>
                      <span className="text-slate-100">{product.createdAt.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Ultima actualizare:</span>
                      <span className="text-slate-100">{product.updatedAt.toLocaleDateString()}</span>
                    </div>
                    {product.listingExpiresAt && (
                      <div className="flex justify-between">
                        <span className="text-slate-300">Expiră listarea:</span>
                        <span className="text-slate-100">{product.listingExpiresAt.toLocaleDateString()}</span>
                      </div>
                    )}
                    {product.boostExpiresAt && (
                      <div className="flex justify-between">
                        <span className="text-slate-300">Promovat până la:</span>
                        <span className="text-emerald-300">
                          {product.boostExpiresAt instanceof Date
                            ? product.boostExpiresAt.toLocaleDateString()
                            : new Date(product.boostExpiresAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {product.promotionExpiresAt && (
                      <div className="flex justify-between">
                        <span className="text-slate-300">Promoție până la:</span>
                        <span className="text-emerald-300">
                          {product.promotionExpiresAt instanceof Date
                            ? product.promotionExpiresAt.toLocaleDateString()
                            : new Date(product.promotionExpiresAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Price Evolution Chart */}
          <div className="mt-8">
            <PriceEvolutionChart
              itemId={id}
              type="product"
              title="Evoluția Prețului"
            />
          </div>

          {/* Other Products by this Seller */}
          {otherProducts.filter(p => p.id !== id).length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-white mb-6">Alte Piese de la Acest Vânzător</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {otherProducts
                  .filter(p => p.id !== id)
                  .slice(0, 6)
                  .map((otherProduct) => (
                    <ProductCard
                      key={otherProduct.id}
                      product={otherProduct}
                      showOfferButton={false}
                    />
                  ))}
              </div>
              {product?.ownerId && (
                <div className="mt-6 text-center">
                  <Link
                    href={`/seller/${product.ownerId}?tab=products`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-navy-700 hover:bg-navy-600 text-gold-400 rounded-xl font-semibold transition-colors"
                  >
                    Vezi toate produsele acestui vânzător
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxOpen && images.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 rounded-full bg-black/60 p-2 text-slate-200 hover:bg-black/80"
            aria-label="Închide imaginea"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" stroke="currentColor" fill="none">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <button
            type="button"
            onClick={showPrevImage}
            className="absolute left-4 md:left-10 rounded-full bg-black/60 p-3 text-slate-200 hover:bg-black/80"
            aria-label="Imaginea anterioară"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" stroke="currentColor" fill="none">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="max-w-3xl max-h-[80vh] flex items-center justify-center">
            <img
              src={buildImageUrlWithWidth(images[lightboxIndex], 1200)}
              alt={product?.name || 'Imagine piesă'}
              className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.9)]"
            />
          </div>

          <button
            type="button"
            onClick={showNextImage}
            className="absolute right-4 md:right-10 rounded-full bg-black/60 p-3 text-slate-200 hover:bg-black/80"
            aria-label="Imaginea următoare"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" stroke="currentColor" fill="none">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Offer Modal */}
      <OfferModal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        itemType="product"
        itemId={product.id}
        itemName={product.name}
        currentPrice={product.price}
        buyerId={user?.uid || ''}
      />

      {/* Offer Management Modal */}
      {showOfferManagement && (
        <OfferManagement
          productId={product.id}
          productName={product.name}
          onClose={() => setShowOfferManagement(false)}
        />
      )}
    </>
  );
}
