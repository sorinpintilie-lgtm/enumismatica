'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useProduct } from '../../hooks/useProducts';
import PriceEvolutionChart from '../../components/PriceEvolutionChart';

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { product, loading, error } = useProduct(id);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error ? 'Eroare la încărcarea produsului' : 'Produs negăsit'}
          </h1>
          <p className="text-gray-600 mb-4">
            {error || 'Produsul pe care îl cauți nu există.'}
          </p>
          <Link
            href="/products"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
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
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Înapoi la produse
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            {product.images.length > 0 ? (
              <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-96 object-cover"
                />
              </div>
            ) : (
              <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500 text-lg">Imagine indisponibilă</span>
              </div>
            )}

            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.slice(1).map((image, index) => (
                  <div key={index} className="aspect-w-1 aspect-h-1 bg-gray-200 rounded">
                    <img
                      src={image}
                      alt={`${product.name} ${index + 2}`}
                      className="w-full h-20 object-cover rounded"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {product.name}
              </h1>
              <p className="text-gray-600">
                Listat pe {product.createdAt.toLocaleDateString()}
              </p>
            </div>

            <div>
              <p className="text-4xl font-bold text-green-600 mb-4">
                ${product.price.toFixed(2)}
              </p>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium text-lg transition-colors duration-200">
                Adaugă în coș
              </button>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Descriere
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {product.description}
              </p>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Detalii produs
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">ID Produs:</span>
                  <span className="font-mono">{product.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Listat:</span>
                  <span>{product.createdAt.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ultima actualizare:</span>
                  <span>{product.updatedAt.toLocaleDateString()}</span>
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