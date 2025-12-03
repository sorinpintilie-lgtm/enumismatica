'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useProduct } from '../../hooks/useProducts';
import PriceEvolutionChart from '../../components/PriceEvolutionChart';
import { useToast } from '../../components/ToastProvider';
import { useAuth } from '../../context/AuthContext';
import { createDirectOrderForProduct } from 'shared/orderService';
import { useCart } from '../../hooks/useCart';

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { product, loading, error } = useProduct(id);
  const { showToast } = useToast();
  const { user } = useAuth();
  const { addToCart } = useCart(user?.uid);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [buying, setBuying] = useState(false);

  const images = product?.images ?? [];

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

  const handleBuy = async () => {
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

    try {
      setBuying(true);
      const orderId = await createDirectOrderForProduct(product.id, user.uid);

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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link
              href="/products"
              className="inline-flex items-center text-sm font-medium text-gold-400 hover:text-gold-300 transition-colors"
            >
              ← Înapoi la produse
            </Link>
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
                    src={images[0]}
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
                        src={image}
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
                  Listat pe {product.createdAt.toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-4xl font-bold text-[#e7b73c] mb-2">
                  {product.price.toFixed(2)} RON
                </p>
                {product.isSold && (
                  <p className="text-sm font-semibold text-red-300 mb-2">
                    Acest produs a fost vândut și nu mai este disponibil.
                  </p>
                )}
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
                    onClick={handleBuy}
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
                </div>
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
                <h2 className="text-xl font-semibold text-white mb-3">
                  Detalii produs
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-300">ID Produs:</span>
                    <span className="font-mono text-slate-100">{product.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Listat:</span>
                    <span className="text-slate-100">{product.createdAt.toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Ultima actualizare:</span>
                    <span className="text-slate-100">{product.updatedAt.toLocaleDateString()}</span>
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
              src={images[lightboxIndex]}
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
    </>
  );
}