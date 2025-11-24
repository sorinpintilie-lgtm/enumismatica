'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useProducts } from '../hooks/useProducts';
import ProductCard from '../components/ProductCard';
import FilterBar, { FilterOptions } from '../components/FilterBar';

export default function ProductsPage() {
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
    minPrice: 0,
    maxPrice: 10000,
    minYear: 1, // Ancient coins start from year 1 AD
    maxYear: new Date().getFullYear(),
    metal: 'Toate Metalele',
    rarity: 'Toate Raritățile',
    grade: 'Toate Gradele',
    sortBy: 'best-match',
  });

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

    // Apply price range filter
    filtered = filtered.filter(
      (product) => product.price >= filters.minPrice && product.price <= filters.maxPrice
    );

    // Apply year range filter
    if (filters.minYear || filters.maxYear) {
      filtered = filtered.filter((product) => {
        if (!product.year) return false;
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

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'best-match':
          // Sort by relevance (newest first as default)
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'ending-soonest':
          // For products, sort by newest (no ending time)
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'newly-listed':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'distance-nearest':
          // For now, sort by newest (distance not implemented)
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
          <p className="ml-4 text-gray-600">Se încarcă produsele...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <svg
            className="w-12 h-12 text-red-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Eroare la încărcarea produselor</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Catalog Produse</h1>
        <p className="text-gray-600">
          Explorează colecția noastră de {products.length} articole numismatice
        </p>
      </div>

      {/* Filter Bar */}
      <FilterBar filters={filters} onFilterChange={setFilters} />

      {/* Results Summary */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-gray-600">
          Se afișează <span className="font-semibold text-gray-900">{filteredProducts.length}</span> din{' '}
          <span className="font-semibold text-gray-900">{products.length}</span> produse
        </p>
        
        {/* View Toggle (Grid/List) - Optional */}
        <div className="flex gap-2">
          <button className="p-2 bg-amber-500 text-white rounded-md">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button className="p-2 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300">
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
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Nu s-au găsit produse</h3>
          <p className="text-gray-500 mb-6">
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
              className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              Șterge Filtrele
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Load More Button (if needed for pagination) */}
      {filteredProducts.length > 0 && filteredProducts.length < products.length && (
        <div className="mt-12 text-center">
          <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-8 py-3 rounded-md font-medium transition-colors">
            Încarcă Mai Multe Produse
          </button>
        </div>
      )}
    </div>
  );
}
