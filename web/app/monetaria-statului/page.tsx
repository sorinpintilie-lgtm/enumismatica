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

  // Monetaria Statului filters
  const [material, setMaterial] = useState<string>('Toate Materialele');
  const [diameter, setDiameter] = useState<string>('Toate Diametrele');
  const [weight, setWeight] = useState<string>('Toate Greutățile');
  const [quality, setQuality] = useState<string>('Toate Calitățile');

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

        const transformedProducts = data.products.map((p: RawProduct) => {
          // Extract properties from specifications
          const specs = p.specifications || '';
          const lines = specs.split('|').map(line => line.trim());

          let diameter = '';
          let weight = '';
          let material = '';
          let quality = '';

          lines.forEach(line => {
            if (line.includes('Diametru:')) {
              diameter = line.split('Diametru:')[1]?.trim() || '';
            }
            if (line.includes('Greutate:')) {
              weight = line.split('Greutate:')[1]?.trim() || '';
            }
            if (line.includes('Material:')) {
              material = line.split('Material:')[1]?.trim() || '';
            }
            if (line.includes('Calitate:')) {
              quality = line.split('Calitate:')[1]?.trim() || '';
            }
          });

          return {
            ...p,
            id: p.product_id,
            title: p.title || 'Piesă fără titlu',
            description: p.full_description,
            price: p.price,
            category: p.category,
            image: `/Monetaria_statului/romanian_mint_products/${p.category_slug}/${p.image_files}`,
            link: `/monetaria-statului/${p.product_id}`,
            diameter,
            weight,
            mint: material,
            era: quality,
          };
        });
        setProducts(transformedProducts);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate dynamic filter options based on current selections
  const getFilteredProductsExcluding = (excludeFilter: string) => {
    let baseProducts = selectedCategory === 'all' ? products : products.filter(p => p.category === selectedCategory);

    // Apply current filters EXCEPT the one we're calculating options for
    if (excludeFilter !== 'material' && material !== 'Toate Materialele') {
      baseProducts = baseProducts.filter(p => (p as any).mint === material);
    }
    if (excludeFilter !== 'diameter' && diameter !== 'Toate Diametrele') {
      baseProducts = baseProducts.filter(p => (p as any).diameter === diameter);
    }
    if (excludeFilter !== 'weight' && weight !== 'Toate Greutățile') {
      baseProducts = baseProducts.filter(p => (p as any).weight === weight);
    }
    if (excludeFilter !== 'quality' && quality !== 'Toate Calitățile') {
      baseProducts = baseProducts.filter(p => (p as any).era === quality);
    }

    return baseProducts;
  };

  // Calculate available options for each filter based on other filters
  const availableMaterials = ['Toate Materialele', ...new Set(getFilteredProductsExcluding('material').map(p => (p as any).mint).filter(Boolean))];
  const availableDiameters = ['Toate Diametrele', ...new Set(getFilteredProductsExcluding('diameter').map(p => (p as any).diameter).filter(Boolean))];
  const availableWeights = ['Toate Greutățile', ...new Set(getFilteredProductsExcluding('weight').map(p => (p as any).weight).filter(Boolean))];
  const availableQualities = ['Toate Calitățile', ...new Set(getFilteredProductsExcluding('quality').map(p => (p as any).era).filter(Boolean))];

  const categories = ['all', ...new Set(products.map(p => p.category))];
  let filteredProducts = selectedCategory === 'all' ? products : products.filter(p => p.category === selectedCategory);

  // Apply Monetaria Statului filters
  if (material !== 'Toate Materialele') {
    filteredProducts = filteredProducts.filter(p => (p as any).mint === material);
  }
  if (diameter !== 'Toate Diametrele') {
    filteredProducts = filteredProducts.filter(p => (p as any).diameter === diameter);
  }
  if (weight !== 'Toate Greutățile') {
    filteredProducts = filteredProducts.filter(p => (p as any).weight === weight);
  }
  if (quality !== 'Toate Calitățile') {
    filteredProducts = filteredProducts.filter(p => (p as any).era === quality);
  }

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
          <h1 className="text-4xl font-bold text-white mb-4">Monetăria Statului</h1>
          <p className="text-lg text-slate-200 max-w-2xl mx-auto">
            Traditie si Excelenta Fondata in 1870, Monetaria Statului este standardul pentru moneda si artefacte pretioase in Romania.
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

        {/* Monetaria Statului Filters */}
        {products.length > 0 && (
          <div className="bg-navy-800/50 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">Filtre Piese Monetaria Statului</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Material</label>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gold-500/30 bg-navy-900/70 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  {availableMaterials.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Diametru</label>
                <select
                  value={diameter}
                  onChange={(e) => setDiameter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gold-500/30 bg-navy-900/70 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  {availableDiameters.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Greutate</label>
                <select
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gold-500/30 bg-navy-900/70 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  {availableWeights.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Calitate</label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gold-500/30 bg-navy-900/70 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  {availableQualities.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

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
