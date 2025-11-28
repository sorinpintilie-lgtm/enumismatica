'use client';

import { useState, useMemo } from 'react';
import { useAuctions } from '../hooks/useAuctions';
import { useProducts } from '../hooks/useProducts';
import AuctionCard from '../components/AuctionCard';
import FilterBar, { FilterOptions } from '../components/FilterBar';

export default function AuctionsPage() {
  const { auctions, loading: auctionsLoading, error: auctionsError } = useAuctions('active');
  // Fetch all fields needed for filtering and display
  const { products, loading: productsLoading } = useProducts(
    undefined, // ownerId
    20, // pageSize
    ['name', 'images', 'price', 'description', 'country', 'year', 'metal', 'rarity', 'grade', 'denomination', 'createdAt', 'updatedAt']
  );
  
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

  const [statusFilter, setStatusFilter] = useState<'active' | 'ended' | 'all'>('active');

  // Create a map of products for quick lookup
  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      map.set(product.id, product);
    });
    return map;
  }, [products]);

  const filteredAuctions = useMemo(() => {
    console.log('[AuctionsPage] Starting filter with', auctions.length, 'auctions');
    console.log('[AuctionsPage] ProductMap size:', productMap.size);
    console.log('[AuctionsPage] Current filters:', filters);
    console.log('[AuctionsPage] Status filter:', statusFilter);
    let filtered = [...auctions];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((auction) => auction.status === statusFilter);
    }

    // Apply filters based on associated product data
    filtered = filtered.filter((auction) => {
      const product = productMap.get(auction.productId);
      if (!product) {
        console.log('[AuctionsPage] No product found for auction:', auction.id, 'productId:', auction.productId);
        return false;
      }
      

      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch =
          product.name.toLowerCase().includes(searchLower) ||
          product.description.toLowerCase().includes(searchLower) ||
          product.country?.toLowerCase().includes(searchLower) ||
          product.denomination?.toLowerCase().includes(searchLower) ||
          auction.id.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Country filter
      if (filters.country && filters.country !== 'Toate Țările') {
        if (product.country !== filters.country) return false;
      }

      // Price range filter (using current bid or reserve price)
      const auctionPrice = auction.currentBid || auction.reservePrice;
      if (auctionPrice < filters.minPrice || auctionPrice > filters.maxPrice) {
        return false;
      }

      // Year range filter
      if (filters.minYear || filters.maxYear) {
        if (!product.year) return false;
        if (product.year < filters.minYear || product.year > filters.maxYear) {
          return false;
        }
      }

      // Metal filter
      if (filters.metal && filters.metal !== 'Toate Metalele') {
        if (product.metal !== filters.metal) return false;
      }

      // Rarity filter
      if (filters.rarity && filters.rarity !== 'Toate Raritățile') {
        if (product.rarity !== filters.rarity) return false;
      }

      // Grade filter
      if (filters.grade && filters.grade !== 'Toate Gradele') {
        if (product.grade !== filters.grade) return false;
      }

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      const productA = productMap.get(a.productId);
      const productB = productMap.get(b.productId);

      switch (filters.sortBy) {
        case 'best-match':
          // For now, sort by relevance (ending soonest as default)
          return a.endTime.getTime() - b.endTime.getTime();
        case 'price-asc':
          return (a.currentBid || a.reservePrice) - (b.currentBid || b.reservePrice);
        case 'price-desc':
          return (b.currentBid || b.reservePrice) - (a.currentBid || a.reservePrice);
        case 'ending-soonest':
          return a.endTime.getTime() - b.endTime.getTime();
        case 'newly-listed':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'distance-nearest':
          // For now, sort by ending soonest (distance not implemented)
          return a.endTime.getTime() - b.endTime.getTime();
        default:
          return a.endTime.getTime() - b.endTime.getTime();
      }
    });

    console.log('[AuctionsPage] Filtered auctions:', filtered.length);
    return filtered;
  }, [auctions, productMap, filters, statusFilter]);

  const loading = auctionsLoading || productsLoading;
  const error = auctionsError;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
          <p className="ml-4 text-slate-300">Se încarcă licitațiile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/50 border border-red-500/50 rounded-2xl p-6 text-center backdrop-blur-sm">
          <svg
            className="w-12 h-12 text-red-400 mx-auto mb-4"
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
          <h3 className="text-lg font-semibold text-red-200 mb-2">Eroare la încărcarea licitațiilor</h3>
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Licitații Active</h1>
        <p className="text-slate-300">
          Licitează pentru {auctions.length} articole numismatice
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gold-500/20">
        <button
          onClick={() => setStatusFilter('active')}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            statusFilter === 'active'
              ? 'border-gold-500 text-gold-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Licitații Active
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            statusFilter === 'all'
              ? 'border-gold-500 text-gold-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Toate Licitațiile
        </button>
        <button
          onClick={() => setStatusFilter('ended')}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            statusFilter === 'ended'
              ? 'border-gold-500 text-gold-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Licitații Încheiate
        </button>
      </div>

      {/* Filter Bar */}
      <FilterBar filters={filters} onFilterChange={setFilters} showAuctionFilters={true} />

      {/* Results Summary */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-slate-300">
          Se afișează <span className="font-semibold text-gold-400">{filteredAuctions.length}</span> din{' '}
          <span className="font-semibold text-gold-400">{auctions.length}</span> licitații
        </p>
        
        {/* View Toggle */}
        <div className="flex gap-2">
          <button className="p-2 bg-[#e7b73c] text-white rounded-md hover:bg-[#f0c955] transition-colors shadow-[0_0_20px_rgba(231,183,60,0.6)]">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button className="p-2 bg-navy-400/50 text-slate-300 rounded-md hover:bg-navy-400 transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Auctions Grid */}
      {filteredAuctions.length === 0 ? (
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-xl font-semibold text-white mb-2">Nu s-au găsit licitații</h3>
          <p className="text-slate-300 mb-6">
            {filters.searchTerm
              ? 'Încearcă să ajustezi căutarea sau filtrele'
              : statusFilter === 'active'
              ? 'Nu există licitații active momentan'
              : 'Nu există licitații care să corespundă criteriilor'}
          </p>
          {filters.searchTerm && (
            <button
              onClick={() =>
                setFilters({
                  ...filters,
                  searchTerm: '',
                  country: 'Toate Țările',
                  metal: 'Toate Metalele',
                  rarity: 'Toate Raritățile',
                  grade: 'Toate Gradele',
                })
              }
              className="bg-[#e7b73c] hover:bg-[#f0c955] text-white px-6 py-2 rounded-xl font-semibold transition-colors shadow-lg shadow-[0_0_20px_rgba(231,183,60,0.6)]"
            >
              Șterge Filtrele
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {filteredAuctions.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      )}
    </div>
  );
}
