'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useProducts } from '../hooks/useProducts';
import ProductCard from '../components/ProductCard';
import FilterBar, { FilterOptions } from '../components/FilterBar';
import { useAuth } from '../context/AuthContext';

function ProductsListContent() {
  // Fetch all fields needed for filtering and display
  const { products, loading, error } = useProducts(
    undefined, // ownerId
    20, // pageSize
    ['name', 'images', 'price', 'description', 'country', 'year', 'metal', 'rarity', 'grade', 'denomination', 'createdAt', 'updatedAt']
  );
  const searchParams = useSearchParams();
  
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    country: 'Toate Țările',
    // 0 / 0 = fără filtru de preț în mod implicit. Utilizatorul setează limitele doar dacă dorește.
    minPrice: 0,
    maxPrice: 0,
    // 0 / 0 = fără filtru pe ani în mod implicit. Utilizatorul setează anii doar dacă dorește.
    minYear: 0,
    maxYear: 0,
    metal: 'Toate Metalele',
    rarity: 'Toate Raritățile',
    grade: 'Toate Gradele',
    faceValue: 'Toate Valorile',
    diameter: 'Toate Diametrele',
    weight: 'Toate Greutățile',
    mint: 'Toate Monetăriile',
    era: 'Toate Epocile',
    sortBy: 'best-match',
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Handle URL parameters on mount
  useEffect(() => {
    const countryParam = searchParams.get('country');
    if (countryParam) {
      setFilters(prev => ({
        ...prev,
        country: countryParam
      }));
    }
  }, [searchParams]);

  const filteredProducts = useMemo(() => {
    console.log('[ProductsPage] Starting filter with', products.length, 'products');
    console.log('[ProductsPage] Current filters:', filters);
    let filtered = [...products];

    // Apply search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchLower) ||
          product.description.toLowerCase().includes(searchLower) ||
          product.country?.toLowerCase().includes(searchLower) ||
          product.denomination?.toLowerCase().includes(searchLower)
      );
    }

    // Apply country filter
    if (filters.country && filters.country !== 'Toate Țările') {
      filtered = filtered.filter((product) => product.country === filters.country);
    }

    // Apply price range filter only if user has set at least one bound.
    // Implicit (0 / 0) = fără filtru de preț.
    if (filters.minPrice || filters.maxPrice) {
      filtered = filtered.filter((product) => {
        if (filters.minPrice && product.price < filters.minPrice) return false;
        if (filters.maxPrice && product.price > filters.maxPrice) return false;
        return true;
      });
    }

    // Apply year range filter
    // Notă: dacă un produs nu are anul setat, îl păstrăm în listă,
    // altfel filtrul ar ascunde produsele fără an chiar și când gama este default.
    if (filters.minYear || filters.maxYear) {
      filtered = filtered.filter((product) => {
        if (!product.year) return true;
        return product.year >= filters.minYear && product.year <= filters.maxYear;
      });
    }

    // Apply metal filter
    if (filters.metal && filters.metal !== 'Toate Metalele') {
      filtered = filtered.filter((product) => product.metal === filters.metal);
    }

    // Apply rarity filter
    if (filters.rarity && filters.rarity !== 'Toate Raritățile') {
      filtered = filtered.filter((product) => product.rarity === filters.rarity);
    }

    // Apply grade filter
    if (filters.grade && filters.grade !== 'Toate Gradele') {
      filtered = filtered.filter((product) => product.grade === filters.grade);
    }

    // Apply Romanian coin filters (only when country is Romania)
    if (filters.country === 'România') {
      if (filters.faceValue && filters.faceValue !== 'Toate Valorile') {
        filtered = filtered.filter((product) => (product as any).faceValue === filters.faceValue);
      }
      if (filters.diameter && filters.diameter !== 'Toate Diametrele') {
        filtered = filtered.filter((product) => (product as any).diameter === filters.diameter);
      }
      if (filters.weight && filters.weight !== 'Toate Greutățile') {
        filtered = filtered.filter((product) => (product as any).weight === filters.weight);
      }
      if (filters.mint && filters.mint !== 'Toate Monetăriile') {
        filtered = filtered.filter((product) => (product as any).mint === filters.mint);
      }
      if (filters.era && filters.era !== 'Toate Epocile') {
        filtered = filtered.filter((product) => (product as any).era === filters.era);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'best-match':
          // Relevanță: implicit cele mai noi produse primele
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'newly-listed':
          // Adăugate recent: identic cu cele mai noi primele
          return b.createdAt.getTime() - a.createdAt.getTime();
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

    console.log('[ProductsPage] Filtered products:', filtered.length);
    return filtered;
  }, [products, filters]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
          <p className="ml-4 text-slate-300">Se încarcă produsele...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#e7b73c] mb-2">E-shop</h1>
        <p className="text-slate-200">
          Explorează colecția noastră de {products.length} articole
        </p>
      </div>

      {/* Filter Bar */}
      <FilterBar filters={filters} onFilterChange={setFilters} />

      {/* Results Summary */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-slate-300">
          Se afișează <span className="font-semibold text-gold-400">{filteredProducts.length}</span> din{' '}
          <span className="font-semibold text-gold-400">{products.length}</span> produse
        </p>

        {/* View Toggle (Grid/List) */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'grid'
                ? 'bg-[#e7b73c] text-white shadow-[0_0_20px_rgba(231,183,60,0.6)]'
                : 'bg-navy-400/50 text-slate-300 hover:bg-navy-400'
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-[#e7b73c] text-white shadow-[0_0_20px_rgba(231,183,60,0.6)]'
                : 'bg-navy-400/50 text-slate-300 hover:bg-navy-400'
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16">
          <svg
            className="w-24 h-24 text-gray-300 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-xl font-semibold text-white mb-2">Nu s-au găsit produse</h3>
          <p className="text-slate-300 mb-6">
            {filters.searchTerm
              ? 'Încearcă să ajustezi căutarea sau filtrele'
              : 'Nu există produse disponibile momentan'}
          </p>
          {filters.searchTerm && (
            <button
              onClick={() =>
                setFilters({
                  ...filters,
                  searchTerm: '',
                  country: 'All Countries',
                  metal: 'All Metals',
                  rarity: 'All Rarities',
                  grade: 'All Grades',
                })
              }
              className="bg-gold-500 hover:bg-gold-600 text-white px-6 py-2 rounded-xl font-semibold transition-colors shadow-lg shadow-gold-500/30"
            >
              Șterge Filtrele
            </button>
          )}
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? "grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
            : "space-y-4"
        }>
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} variant={viewMode} />
          ))}
        </div>
      )}

      {/* Load More Button (if needed for pagination) */}
      {filteredProducts.length > 0 && filteredProducts.length < products.length && (
        <div className="mt-12 text-center">
          <button className="bg-gold-500 hover:bg-gold-600 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg shadow-gold-500/30">
            Încarcă Mai Multe Produse
          </button>
        </div>
      )}
    </div>
  );
}

function ProductsPageContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
          <p className="ml-4 text-slate-300">Se verifică sesiunea de utilizator...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-xl rounded-2xl border border-[#e7b73c]/40 bg-navy-900/80 p-8 text-center shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
          <h1 className="text-2xl font-bold text-white mb-3">
            Catalogul este disponibil doar pentru utilizatori autentificați
          </h1>
          <p className="text-sm text-slate-300 mb-5">
            Pentru a vedea produsele, licitațiile și detaliile pieselor, trebuie să te autentifici în contul tău. Fără
            autentificare poți accesa doar pagina principală și informațiile generale.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-5 py-2.5 text-sm font-semibold text-[#000940] shadow-lg shadow-[#e7b73c]/50 hover:bg-[#f0c955] transition"
            >
              Autentificare
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full border border-[#e7b73c] px-5 py-2.5 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition"
            >
              Creează cont
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <ProductsListContent />;
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
            <p className="ml-4 text-slate-300">Se încarcă produsele...</p>
          </div>
        </div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}
