'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '../../components/LoadingSpinner';
import MintProductCard from '../../components/MintProductCard';

interface RawProduct {
  title: string;
  product_url: string;
  product_id: string;
  price: string;
  price_without_vat: string;
  category: string;
  category_slug: string;
  stock: string;
  model: string;
  sku: string;
  price_full: string;
  full_description: string;
  specifications: string;
  images_downloaded: number;
  image_files: string;
}

export default function MintProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [product, setProduct] = useState<RawProduct | null>(null);
  const [similarProducts, setSimilarProducts] = useState<RawProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const response = await fetch('/monetaria-data.json');
        if (!response.ok) throw new Error('Failed to load data');
        const data = await response.json();

        const foundProduct = data.products.find((p: RawProduct) => p.product_id === id);
        if (!foundProduct) throw new Error('Product not found');

        setProduct(foundProduct);

        // Load similar products from same category
        const similar = data.products
          .filter((p: RawProduct) => p.category === foundProduct.category && p.product_id !== id)
          .slice(0, 6); // Limit to 6
        setSimilarProducts(similar);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [id]);

  if (loading) return <LoadingSpinner />;
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
            href="/monetaria-statului"
            className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-6 py-2 text-sm font-semibold text-[#000940] shadow-[0_0_24px_rgba(231,183,60,0.75)] hover:bg-[#f0c955] transition-colors"
          >
            Înapoi la Monetaria Statului
          </Link>
        </div>
      </div>
    );
  }

  const imageUrl = `/Monetaria_statului/romanian_mint_products/${product.category_slug}/${product.image_files}`;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-navy-900 via-navy-950 to-black py-12">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <Link
              href="/monetaria-statului"
              className="inline-flex items-center text-sm font-medium text-gold-400 hover:text-gold-300 transition-colors"
            >
              ← Înapoi la Monetaria Statului
            </Link>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Product Image */}
              <div className="space-y-4">
                <div
                  className="aspect-w-1 aspect-h-1 bg-navy-900/60 rounded-2xl overflow-hidden border border-gold-500/20 cursor-zoom-in"
                  onClick={() => setLightboxOpen(true)}
                >
                  <img
                    src={imageUrl}
                    alt={product.title}
                    className="w-full h-96 object-contain bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Product Details - Right Side */}
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {product.title || 'Produs fără titlu'}
                  </h1>
                  <p className="text-slate-300 mb-4">
                    Categorie: {product.category}
                  </p>
                </div>

                <div>
                  <p className="text-4xl font-bold text-[#e7b73c] mb-2">
                    {product.price}
                  </p>
                  <p className="text-sm text-slate-300 mb-6">
                    Preț fără TVA: {product.price_without_vat}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      className="flex-1 bg-[#e7b73c] hover:bg-[#f0c955] text-[#000940] px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition-colors shadow-[0_0_24px_rgba(231,183,60,0.8)]"
                    >
                      Cumpără acum
                    </button>
                    <button
                      type="button"
                      className="flex-1 bg-navy-900/80 hover:bg-navy-800 text-gold-200 px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition-colors border border-gold-500/60 shadow-[0_0_18px_rgba(15,23,42,0.9)]"
                    >
                      Adaugă în coș
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Full Width Content Below */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-3">
                  Descriere
                </h2>
                <div className="text-slate-200 leading-relaxed whitespace-pre-line">
                  {product.full_description}
                </div>
              </div>

              {product.specifications && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-3">
                    Specificații
                  </h2>
                  <div className="text-slate-200 leading-relaxed whitespace-pre-line">
                    {product.specifications}
                  </div>
                </div>
              )}

              <div className="border-t border-gold-500/20 pt-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Detalii suplimentare
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-300">ID Produs:</span>
                      <span className="font-mono text-slate-100">{product.product_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Model:</span>
                      <span className="text-slate-100">{product.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">SKU:</span>
                      <span className="text-slate-100">{product.sku}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Stoc:</span>
                      <span className="text-slate-100">{product.stock}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Similar Products Carousel */}
          {similarProducts.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-white mb-6">
                Produse similare din aceeași categorie
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {similarProducts.map((similarProduct) => {
                  const transformedProduct = {
                    id: similarProduct.product_id,
                    title: similarProduct.title,
                    description: similarProduct.full_description,
                    price: similarProduct.price,
                    category: similarProduct.category,
                    image: `/Monetaria_statului/romanian_mint_products/${similarProduct.category_slug}/${similarProduct.image_files}`,
                    link: `/monetaria-statului/${similarProduct.product_id}`,
                  };
                  return (
                    <MintProductCard key={similarProduct.product_id} product={transformedProduct} />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 rounded-full bg-black/60 p-2 text-slate-200 hover:bg-black/80"
            aria-label="Închide imaginea"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" stroke="currentColor" fill="none">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="max-w-3xl max-h-[80vh] flex items-center justify-center">
            <img
              src={imageUrl}
              alt={product.title || 'Imagine produs'}
              className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.9)]"
            />
          </div>
        </div>
      )}
    </>
  );
}