'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useProduct } from '../../hooks/useProducts';
import PriceEvolutionChart from '../../components/PriceEvolutionChart';
import { useToast } from '../../components/ToastProvider';

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { product, loading, error } = useProduct(id);
  const { showToast } = useToast();

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
            {product.images.length > 0 ? (
              <div className="aspect-w-1 aspect-h-1 bg-navy-900/60 rounded-2xl overflow-hidden border border-gold-500/20">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-96 object-contain bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950"
                />
              </div>
            ) : (
              <div className="aspect-w-1 aspect-h-1 bg-navy-900/60 rounded-2xl flex items-center justify-center border border-gold-500/20">
                <span className="text-slate-400 text-lg">Imagine indisponibilă</span>
              </div>
            )}

            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.slice(1).map((image, index) => (
                  <div key={index} className="aspect-w-1 aspect-h-1 bg-navy-900/60 rounded-xl overflow-hidden border border-gold-500/10">
                    <img
                      src={image}
                      alt={`${product.name} ${index + 2}`}
                      className="w-full h-20 object-contain bg-navy-950"
                    />
                  </div>
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
              <p className="text-4xl font-bold text-[#e7b73c] mb-4">
                {product.price.toFixed(2)} RON
              </p>
              <button
                type="button"
                onClick={() =>
                  showToast({
                    type: 'success',
                    title: 'Adăugat în coș',
                    message: `${product.name} a fost adăugat în coșul tău (simulare vizuală).`,
                  })
                }
                className="w-full bg-[#e7b73c] hover:bg-[#f0c955] text-[#000940] px-6 py-3 rounded-xl font-semibold text-lg transition-colors duration-200 shadow-[0_0_24px_rgba(231,183,60,0.8)]"
              >
                Adaugă în coș
              </button>
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
  );
}