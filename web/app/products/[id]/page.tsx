'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useProduct, useProducts } from '../../hooks/useProducts';
import PriceEvolutionChart from '../../components/PriceEvolutionChart';
import { useToast } from '../../components/ToastProvider';
import { useAuth } from '../../context/AuthContext';
import { createDirectOrderForProduct } from 'shared/orderService';
import { useCart } from '../../hooks/useCart';
import { logEvent } from '../../hooks/useActivityLogger';
import OfferModal from '../../components/OfferModal';
import OfferManagement from '../../components/OfferManagement';
import ProductCard from '../../components/ProductCard';

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
  const { product, loading, error } = useProduct(id);
  const { showToast } = useToast();
  const { user } = useAuth();
  const { addToCart } = useCart(user?.uid);

  // Get other products by the same seller
  const { products: otherProducts } = useProducts(
    product?.ownerId,
    6,
    ['name', 'images', 'price', 'createdAt'],
    !!product?.ownerId,
    'direct',
    false
  );

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [buying, setBuying] = useState(false);
  const [showBuyConfirm, setShowBuyConfirm] = useState(false);
  const [viewMode, setViewMode] = useState<'owner' | 'preview'>('preview');
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showOfferManagement, setShowOfferManagement] = useState(false);

  const images = product?.images ?? [];
  const isOwner = user && product && user.uid === product.ownerId;

  // Set default view mode for owners
  useEffect(() => {
    if (isOwner && viewMode === 'preview') {
      setViewMode('owner');
    }
  }, [isOwner, viewMode]);

  const openLightboxAt = (index: number) => {
    if (!images.length) return;
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

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
        message: 'Trebuie să te autentifici pentru a cumpăra acest produs.',
      });
      return;
    }

    if (product.ownerId === user.uid) {
      showToast({
        type: 'error',
        title: 'Nu poți cumpăra propriul produs',
        message: 'Ești deja proprietarul acestui produs.',
      });
      return;
    }

    if ((product as any).isSold) {
      showToast({
        type: 'error',
        title: 'Produs indisponibil',
        message: 'Acest produs a fost deja vândut.',
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

      showToast({
        type: 'success',
        title: 'Cumpărare reușită',
        message: `Ai cumpărat acest produs. Comanda ta a fost înregistrată (ID: ${orderId}).`,
      });
    } catch (error) {
      console.error('Failed to buy product:', error);
      const message =
        error instanceof Error ? error.message : 'A apărut o eroare la cumpărarea produsului.';
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
        message: 'Trebuie să te autentifici pentru a adăuga produse în coș.',
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
        error instanceof Error ? error.message : 'A apărut o eroare la adăugarea produsului în coș.';
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
            {error ? 'Eroare la încărcarea produsului' : 'Produs negăsit'}
          </h1>
          <p className="text-slate-300 mb-4">
            {error || 'Produsul pe care îl cauți nu există.'}
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-6 py-2 text-sm font-semibold text-[#000940] shadow-[0_0_24px_rgba(231,183,60,0.75)] hover:bg-[#f0c955] transition-colors"
          >
            Înapoi la produse
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
              Confirmă cumpărarea produsului
            </h3>
            <p className="text-sm text-slate-200 mb-4">
              Ești sigur că vrei să cumperi acest produs pentru{' '}
              <span className="font-semibold text-[#e7b73c]">
                {Math.round(product.price)} EUR
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
            <Link
              href="/products"
              className="inline-flex items-center text-sm font-medium text-gold-400 hover:text-gold-300 transition-colors"
            >
              ← Înapoi la produse
            </Link>
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Images */}
            <div className="space-y-4">
              {images.length > 0 ? (
                <div
                  className="aspect-w-1 aspect-h-1 bg-navy-900/60 rounded-2xl overflow-hidden border border-gold-500/20 cursor-zoom-in"
                  onClick={() => openLightboxAt(0)}
                >
                  <img
                    src={buildImageUrlWithWidth(images[0], 800)}
                    alt={product.name}
                    className="w-full h-96 object-contain bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950"
                  />
                </div>
              ) : (
                <div className="aspect-w-1 aspect-h-1 bg-navy-900/60 rounded-2xl flex items-center justify-center border border-gold-500/20">
                  <span className="text-slate-400 text-lg">Imagine indisponibilă</span>
                </div>
              )}

              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.slice(1).map((image, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => openLightboxAt(index + 1)}
                      className="aspect-w-1 aspect-h-1 bg-navy-900/60 rounded-xl overflow-hidden border border-gold-500/10 cursor-zoom-in"
                    >
                      <img
                        src={buildImageUrlWithWidth(image, 200)}
                        alt={`${product.name} ${index + 2}`}
                        className="w-full h-20 object-contain bg-navy-950"
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
              </div>

              <div>
                <p className="text-4xl font-bold text-[#e7b73c] mb-1">
                  {Math.round(product.price)} EUR
                </p>
                <p className="text-[11px] text-slate-300 mb-2 max-w-md">
                  Prețul este afișat în EUR și poate fi achitat fie în EUR, fie în RON, la cursul BNR din data
                  tranzacției.
                </p>
                {product.isSold && (
                  <p className="text-sm font-semibold text-red-300 mb-2">
                    Acest produs a fost vândut și nu mai este disponibil.
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
                        ? 'Ești proprietarul acestui produs'
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
                        ? 'Ești proprietarul acestui produs'
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
                            title: 'Nu poți face ofertă pe propriul produs',
                            message: 'Ești deja proprietarul acestui produs.',
                          });
                          return;
                        }
                        if (product.isSold) {
                          showToast({
                            type: 'error',
                            title: 'Produs indisponibil',
                            message: 'Acest produs a fost deja vândut.',
                          });
                          return;
                        }
                        if (product.acceptsOffers === false) {
                          showToast({
                            type: 'info',
                            title: 'Oferțiile nu sunt acceptate',
                            message: 'Vânzătorul nu acceptă oferte pentru acest produs.',
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
                        ? 'Ești proprietarul acestui produs'
                        : product.acceptsOffers === false
                        ? 'Oferțiile nu sunt acceptate'
                        : 'Transmite o ofertă'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 mt-1">
                    <div className="text-sm text-slate-300">
                      <strong>Mod Proprietar:</strong> Gestionați-vă produsul și vizualizați ofertele primite.
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link
                        href={`/products/new?edit=${product.id}`}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition-colors text-center"
                      >
                        Editează Produs
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
                        <span className="text-slate-300">ID Produs:</span>
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
              <h2 className="text-2xl font-bold text-white mb-6">Alte Produse de la Acest Vânzător</h2>
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
              alt={product?.name || 'Imagine produs'}
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
