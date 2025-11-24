'use client';

import { useState } from 'react';

export interface FilterOptions {
  searchTerm: string;
  country: string;
  minPrice: number;
  maxPrice: number;
  minYear: number;
  maxYear: number;
  metal: string;
  rarity: string;
  grade: string;
  sortBy: 'best-match' | 'price-asc' | 'price-desc' | 'ending-soonest' | 'newly-listed' | 'distance-nearest';
}

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  showAuctionFilters?: boolean;
}

const countries = [
  'Toate Țările',
  'Rusia',
  'SUA',
  'Germania',
  'Italia',
  'Franța',
  'Finlanda',
  'Spania',
  'Danemarca',
  'Mexic',
  'România',
  'Austria',
];

const metals = [
  'Toate Metalele',
  'Aur',
  'Argint',
  'Bronz',
  'Cupru',
  'Nichel',
  'Platină',
];

const rarities = [
  'Toate Raritățile',
  'comună',
  'neobișnuită',
  'rară',
  'foarte rară',
  'extrem de rară',
];

const grades = [
  'Toate Gradele',
  'Slabă',
  'Acceptabilă',
  'Bună',
  'VG',
  'Fină',
  'VF',
  'XF',
  'AU',
  'MS-60',
  'MS-65',
  'MS-70',
];

export default function FilterBar({ filters, onFilterChange, showAuctionFilters = false }: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterUpdate = (key: keyof FilterOptions, value: any) => {
    const updatedFilters = { ...localFilters, [key]: value };
    setLocalFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    if (!isNaN(numValue)) {
      handleFilterUpdate(type === 'min' ? 'minPrice' : 'maxPrice', numValue);
    }
  };

  const handleYearChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? 0 : parseInt(value);
    if (!isNaN(numValue)) {
      handleFilterUpdate(type === 'min' ? 'minYear' : 'maxYear', numValue);
    }
  };

  const resetFilters = () => {
    const defaultFilters: FilterOptions = {
      searchTerm: '',
      country: 'Toate Țările',
      minPrice: 0,
      maxPrice: 10000,
      minYear: 1800,
      maxYear: new Date().getFullYear(),
      metal: 'Toate Metalele',
      rarity: 'Toate Raritățile',
      grade: 'Toate Gradele',
      sortBy: 'best-match',
    };
    setLocalFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      {/* Search and Quick Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        {/* Search Bar */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Caută monede după nume, descriere..."
            value={localFilters.searchTerm}
            onChange={(e) => handleFilterUpdate('searchTerm', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        {/* Sort By */}
        <div className="lg:w-64">
          <select
            value={localFilters.sortBy}
            onChange={(e) => handleFilterUpdate('sortBy', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="best-match">Cea Mai Bună Potrivire</option>
            <option value="price-asc">Preț: Crescător + Transport</option>
            <option value="price-desc">Preț: Descrescător + Transport</option>
            <option value="ending-soonest">Se Terminã Cel Mai Repede</option>
            <option value="newly-listed">Listate Recent</option>
            <option value="distance-nearest">Distanță: Cel Mai Apropiat</option>
          </select>
        </div>

        {/* Toggle Advanced Filters */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="lg:w-auto px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Filtre
        </button>
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="border-t pt-6 space-y-6">
          {/* Country and Metal */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Țară</label>
              <select
                value={localFilters.country}
                onChange={(e) => handleFilterUpdate('country', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Metal</label>
              <select
                value={localFilters.metal}
                onChange={(e) => handleFilterUpdate('metal', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {metals.map((metal) => (
                  <option key={metal} value={metal}>
                    {metal}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Raritate</label>
              <select
                value={localFilters.rarity}
                onChange={(e) => handleFilterUpdate('rarity', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {rarities.map((rarity) => (
                  <option key={rarity} value={rarity}>
                    {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grade */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grad</label>
              <select
                value={localFilters.grade}
                onChange={(e) => handleFilterUpdate('grade', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {grades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interval Preț: {localFilters.minPrice} RON - {localFilters.maxPrice} RON
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="number"
                  placeholder="Preț Minim"
                  value={localFilters.minPrice || ''}
                  onChange={(e) => handlePriceChange('min', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Preț Maxim"
                  value={localFilters.maxPrice || ''}
                  onChange={(e) => handlePriceChange('max', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="10000"
              step="50"
              value={localFilters.maxPrice}
              onChange={(e) => handleFilterUpdate('maxPrice', parseFloat(e.target.value))}
              className="w-full mt-3 accent-amber-500"
            />
          </div>

          {/* Year Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interval An: {localFilters.minYear} - {localFilters.maxYear}
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="number"
                  placeholder="An Minim"
                  value={localFilters.minYear || ''}
                  onChange={(e) => handleYearChange('min', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="An Maxim"
                  value={localFilters.maxYear || ''}
                  onChange={(e) => handleYearChange('max', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex justify-end">
            <button
              onClick={resetFilters}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md font-medium transition-colors"
            >
              Resetează Filtrele
            </button>
          </div>
        </div>
      )}
    </div>
  );
}