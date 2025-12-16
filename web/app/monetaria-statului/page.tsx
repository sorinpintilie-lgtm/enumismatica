'use client';

import { useState, useEffect } from 'react';
import MintProductCard from '../components/MintProductCard';
import LoadingSpinner from '../components/LoadingSpinner';

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

interface TransformedProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  category: string;
  image: string;
  link: string;
}

export default function MonetariaStatuluiPage() {
  const [products, setProducts] = useState<TransformedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/monetaria-data.json');
        if (!response.ok) throw new Error('Failed to load data');
        const data = await response.json();
        
        // Validate data structure
        if (!data || !data.products || !Array.isArray(data.products)) {
          throw new Error('Invalid data format: missing products array');
        }
        
        const transformedProducts = data.products.map((p: RawProduct) => ({
          ...p,
          id: p.product_id,
          title: p.title || 'Produs fără titlu',
          description: p.full_description,
          price: p.price,
          category: p.category,
          image: `/Monetaria_statului/romanian_mint_products/${p.category_slug}/${p.image_files}`,
          link: p.product_url,
        }));
        setProducts(transformedProducts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const categories = ['all', ...new Set(products.map(p => p.category))];
  const filteredProducts = selectedCategory === 'all' ? products : products.filter(p => p.category === selectedCategory);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-center py-12 text-red-500">Error loading products: {error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-900 via-navy-950 to-black py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Monetaria Statului</h1>
          <p className="text-lg text-slate-200 max-w-2xl mx-auto">
            Colecția oficială a Monetăriei Statului Române.
          </p>
        </div>

        {/* Category Selection */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-gold-500 text-navy-900'
                  : 'bg-navy-800 text-white hover:bg-navy-700'
              }`}
            >
              {category === 'all' ? 'Toate categoriile' : category}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {currentProducts.map((product) => (
            <MintProductCard key={product.id} product={product} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-navy-800 text-white rounded disabled:opacity-50"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded ${page === currentPage ? 'bg-gold-500 text-navy-900' : 'bg-navy-800 text-white'}`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-navy-800 text-white rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}