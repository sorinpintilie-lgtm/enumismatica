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

  // Romanian coin filters
  const [faceValue, setFaceValue] = useState<string>('Toate Valorile');
  const [diameter, setDiameter] = useState<string>('Toate Diametrele');
  const [weight, setWeight] = useState<string>('Toate Greutățile');
  const [mint, setMint] = useState<string>('Toate Monetăriile');
  const [era, setEra] = useState<string>('Toate Epocile');
  const [romanianOptions, setRomanianOptions] = useState({
    faceValues: ['Toate Valorile'],
    diameters: ['Toate Diametrele'],
    weights: ['Toate Greutățile'],
    mints: ['Toate Monetăriile'],
    eras: ['Toate Epocile'],
  });
  const [romanianOptionsLoaded, setRomanianOptionsLoaded] = useState(false);

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
          link: `/monetaria-statului/${p.product_id}`,
        }));
        setProducts(transformedProducts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    const loadRomanianOptions = async () => {
      try {
        const response = await fetch('/data/products.json');
        if (!response.ok) throw new Error('Failed to load products.json');
        const data = await response.json();

        const faceValues = ['Toate Valorile', ...new Set(data.map((item: any) => item.face_value))];
        const diameters = ['Toate Diametrele', ...new Set(data.map((item: any) => item.diameter))];
        const weights = ['Toate Greutățile', ...new Set(data.map((item: any) => item.weight))];
        const mints = ['Toate Monetăriile', ...new Set(data.map((item: any) => item.mint))];
        const eras = ['Toate Epocile', ...new Set(data.map((item: any) => item.era))];

        setRomanianOptions({
          faceValues: faceValues as string[],
          diameters: diameters as string[],
          weights: weights as string[],
          mints: mints as string[],
          eras: eras as string[],
        });
        setRomanianOptionsLoaded(true);
      } catch (error) {
        console.error('Error loading Romanian coin options:', error);
      }
    };

    loadData();
    loadRomanianOptions();
  }, []);

  const categories = ['all', ...new Set(products.map(p => p.category))];
  let filteredProducts = selectedCategory === 'all' ? products : products.filter(p => p.category === selectedCategory);

  // Apply Romanian coin filters
  if (faceValue !== 'Toate Valorile') {
    filteredProducts = filteredProducts.filter(p => (p as any).faceValue === faceValue);
  }
  if (diameter !== 'Toate Diametrele') {
    filteredProducts = filteredProducts.filter(p => (p as any).diameter === diameter);
  }
  if (weight !== 'Toate Greutățile') {
    filteredProducts = filteredProducts.filter(p => (p as any).weight === weight);
  }
  if (mint !== 'Toate Monetăriile') {
    filteredProducts = filteredProducts.filter(p => (p as any).mint === mint);
  }
  if (era !== 'Toate Epocile') {
    filteredProducts = filteredProducts.filter(p => (p as any).era === era);
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

        {/* Romanian Coin Filters */}
        {romanianOptionsLoaded && (
          <div className="bg-navy-800/50 rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 text-center">Filtre Monede Românești</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Valoare Nominală</label>
              <select
                value={faceValue}
                onChange={(e) => setFaceValue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gold-500/30 bg-navy-900/70 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                {romanianOptions.faceValues.map((value) => (
                  <option key={value} value={value}>{value}</option>
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
                {romanianOptions.diameters.map((d) => (
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
                {romanianOptions.weights.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Monetărie</label>
              <select
                value={mint}
                onChange={(e) => setMint(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gold-500/30 bg-navy-900/70 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                {romanianOptions.mints.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Epocă</label>
              <select
                value={era}
                onChange={(e) => setEra(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gold-500/30 bg-navy-900/70 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                {romanianOptions.eras.map((e) => (
                  <option key={e} value={e}>{e}</option>
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