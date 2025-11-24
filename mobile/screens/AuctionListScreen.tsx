import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuctions } from '../hooks/useAuctions';
import { useProducts } from '../hooks/useProducts';
import { Auction } from '../../shared/types';
import { RootStackParamList } from '../navigationTypes';

interface FilterOptions {
  searchTerm: string;
  country: string;
  minPrice: number;
  maxPrice: number;
  minYear: number;
  maxYear: number;
  metal: string;
  rarity: string;
  grade: string;
  sortBy: 'ending-soon' | 'price-asc' | 'price-desc' | 'year-asc' | 'year-desc';
}

const countries = ['All', 'Russia', 'USA', 'Germany', 'Italy', 'France', 'Finland', 'Spain', 'Denmark', 'Mexico', 'Romania', 'Austria'];
const metals = ['All', 'Gold', 'Silver', 'Bronze', 'Copper', 'Nickel', 'Platinum'];
const rarities = ['All', 'common', 'uncommon', 'rare', 'very-rare', 'extremely-rare'];

const CountdownTimer: React.FC<{ endTime: Date }> = ({ endTime }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endTime.getTime() - now;

      if (distance < 0) {
        setTimeLeft('ENDED');
        clearInterval(timer);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  return (
    <Text className={`text-sm font-medium ${timeLeft === 'ENDED' ? 'text-gray-500' : 'text-red-600'}`}>
      {timeLeft}
    </Text>
  );
};

const AuctionCard: React.FC<{ auction: Auction }> = ({ auction }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const isEnded = new Date() > auction.endTime;
  const currentBid = auction.currentBid || auction.reservePrice;

  return (
    <TouchableOpacity
      className="bg-white rounded-lg shadow-md p-4 mb-4 mx-4"
      onPress={() => navigation.navigate('AuctionDetails', { auctionId: auction.id })}
    >
      <View className="aspect-w-1 aspect-h-1 bg-gray-200 mb-3 rounded">
        <View className="w-full h-32 bg-gray-300 rounded flex items-center justify-center">
          <Text className="text-gray-500 text-sm">Auction Item</Text>
        </View>
      </View>

      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-semibold text-gray-900 flex-1">
          Auction #{auction.id.slice(-6)}
        </Text>
        <View className={`px-2 py-1 rounded-full ${
          auction.status === 'active' ? 'bg-green-100' : 'bg-red-100'
        }`}>
          <Text className={`text-xs font-medium ${
            auction.status === 'active' ? 'text-green-800' : 'text-red-800'
          }`}>
            {auction.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View className="mb-3">
        <Text className="text-sm text-gray-600">Current Bid:</Text>
        <Text className="text-xl font-bold text-blue-600">${currentBid.toFixed(2)}</Text>
      </View>

      <View className="mb-3">
        <Text className="text-sm text-gray-600">Time Left:</Text>
        <CountdownTimer endTime={auction.endTime} />
      </View>

      <Text className="text-blue-600 text-sm font-medium">View Details & Bid</Text>
    </TouchableOpacity>
  );
};

const AuctionListScreen: React.FC = () => {
  const { auctions, loading: auctionsLoading, error: auctionsError } = useAuctions('active');
  const { products, loading: productsLoading } = useProducts();
  const [statusFilter, setStatusFilter] = useState<'active' | 'ended' | 'all'>('active');
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    country: 'All',
    minPrice: 0,
    maxPrice: 10000,
    minYear: 1800,
    maxYear: new Date().getFullYear(),
    metal: 'All',
    rarity: 'All',
    grade: 'All',
    sortBy: 'ending-soon',
  });

  // Create a map of products for quick lookup
  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      map.set(product.id, product);
    });
    return map;
  }, [products]);

  const filteredAuctions = useMemo(() => {
    let filtered = [...auctions];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((auction) => auction.status === statusFilter);
    }

    // Apply filters based on associated product data
    filtered = filtered.filter((auction) => {
      const product = productMap.get(auction.productId);
      if (!product) return false;

      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch =
          product.name.toLowerCase().includes(searchLower) ||
          product.description.toLowerCase().includes(searchLower) ||
          product.country?.toLowerCase().includes(searchLower) ||
          auction.id.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Country filter
      if (filters.country && filters.country !== 'All') {
        if (product.country !== filters.country) return false;
      }

      // Price range filter
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
      if (filters.metal && filters.metal !== 'All') {
        if (product.metal !== filters.metal) return false;
      }

      // Rarity filter
      if (filters.rarity && filters.rarity !== 'All') {
        if (product.rarity !== filters.rarity) return false;
      }

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      const productA = productMap.get(a.productId);
      const productB = productMap.get(b.productId);

      switch (filters.sortBy) {
        case 'price-asc':
          return (a.currentBid || a.reservePrice) - (b.currentBid || b.reservePrice);
        case 'price-desc':
          return (b.currentBid || b.reservePrice) - (a.currentBid || a.reservePrice);
        case 'year-asc':
          return (productA?.year || 0) - (productB?.year || 0);
        case 'year-desc':
          return (productB?.year || 0) - (productA?.year || 0);
        case 'ending-soon':
        default:
          return a.endTime.getTime() - b.endTime.getTime();
      }
    });

    return filtered;
  }, [auctions, productMap, filters, statusFilter]);

  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      country: 'All',
      minPrice: 0,
      maxPrice: 10000,
      minYear: 1800,
      maxYear: new Date().getFullYear(),
      metal: 'All',
      rarity: 'All',
      grade: 'All',
      sortBy: 'ending-soon',
    });
  };

  const loading = auctionsLoading || productsLoading;
  const error = auctionsError;

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text className="mt-4 text-gray-600">Loading auctions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-4">
        <Text className="text-center text-red-600 text-lg">
          Error loading auctions: {error}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white p-4 shadow-sm">
        <Text className="text-2xl font-bold text-gray-900 mb-4">Live Auctions</Text>

        {/* Search Bar */}
        <TextInput
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white mb-3"
          placeholder="Search auctions..."
          value={filters.searchTerm}
          onChangeText={(text) => setFilters({ ...filters, searchTerm: text })}
        />

        {/* Status Filter Tabs */}
        <View className="flex-row space-x-2 mb-3">
          <TouchableOpacity
            className={`flex-1 py-2 px-3 rounded-md ${statusFilter === 'active' ? 'bg-amber-500' : 'bg-gray-200'}`}
            onPress={() => setStatusFilter('active')}
          >
            <Text className={`text-center text-sm font-medium ${statusFilter === 'active' ? 'text-white' : 'text-gray-700'}`}>
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 px-3 rounded-md ${statusFilter === 'all' ? 'bg-amber-500' : 'bg-gray-200'}`}
            onPress={() => setStatusFilter('all')}
          >
            <Text className={`text-center text-sm font-medium ${statusFilter === 'all' ? 'text-white' : 'text-gray-700'}`}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 px-3 rounded-md ${statusFilter === 'ended' ? 'bg-amber-500' : 'bg-gray-200'}`}
            onPress={() => setStatusFilter('ended')}
          >
            <Text className={`text-center text-sm font-medium ${statusFilter === 'ended' ? 'text-white' : 'text-gray-700'}`}>
              Ended
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Sort Buttons */}
        <View className="flex-row space-x-2 mb-3">
          <TouchableOpacity
            className={`flex-1 py-2 px-3 rounded-md ${filters.sortBy === 'ending-soon' ? 'bg-amber-500' : 'bg-gray-200'}`}
            onPress={() => setFilters({ ...filters, sortBy: 'ending-soon' })}
          >
            <Text className={`text-center text-xs font-medium ${filters.sortBy === 'ending-soon' ? 'text-white' : 'text-gray-700'}`}>
              Ending Soon
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 px-3 rounded-md ${filters.sortBy === 'price-asc' ? 'bg-amber-500' : 'bg-gray-200'}`}
            onPress={() => setFilters({ ...filters, sortBy: 'price-asc' })}
          >
            <Text className={`text-center text-xs font-medium ${filters.sortBy === 'price-asc' ? 'text-white' : 'text-gray-700'}`}>
              Price ↑
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 px-3 rounded-md ${filters.sortBy === 'price-desc' ? 'bg-amber-500' : 'bg-gray-200'}`}
            onPress={() => setFilters({ ...filters, sortBy: 'price-desc' })}
          >
            <Text className={`text-center text-xs font-medium ${filters.sortBy === 'price-desc' ? 'text-white' : 'text-gray-700'}`}>
              Price ↓
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Button */}
        <TouchableOpacity
          className="bg-gray-800 py-3 rounded-md"
          onPress={() => setShowFilters(true)}
        >
          <Text className="text-white text-center font-medium">
            Advanced Filters ({filteredAuctions.length} of {auctions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Auctions List */}
      {filteredAuctions.length === 0 ? (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-gray-500 text-lg text-center mb-4">
            {filters.searchTerm
              ? 'No auctions match your search.'
              : statusFilter === 'active'
              ? 'No active auctions at the moment.'
              : 'No auctions available.'}
          </Text>
          {filters.searchTerm && (
            <TouchableOpacity
              className="bg-amber-500 px-6 py-2 rounded-md"
              onPress={resetFilters}
            >
              <Text className="text-white font-medium">Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredAuctions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AuctionCard auction={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 16 }}
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowFilters(false)}
      >
        <View className="flex-1 bg-white">
          <View className="bg-amber-500 p-4 flex-row justify-between items-center">
            <Text className="text-white text-xl font-bold">Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text className="text-white text-lg font-bold">✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-4">
            {/* Country Filter */}
            <Text className="text-lg font-semibold mb-2">Country</Text>
            <View className="flex-row flex-wrap mb-4">
              {countries.map((country) => (
                <TouchableOpacity
                  key={country}
                  className={`px-3 py-2 rounded-md mr-2 mb-2 ${
                    filters.country === country ? 'bg-amber-500' : 'bg-gray-200'
                  }`}
                  onPress={() => setFilters({ ...filters, country })}
                >
                  <Text className={filters.country === country ? 'text-white' : 'text-gray-700'}>
                    {country}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Metal Filter */}
            <Text className="text-lg font-semibold mb-2">Metal</Text>
            <View className="flex-row flex-wrap mb-4">
              {metals.map((metal) => (
                <TouchableOpacity
                  key={metal}
                  className={`px-3 py-2 rounded-md mr-2 mb-2 ${
                    filters.metal === metal ? 'bg-amber-500' : 'bg-gray-200'
                  }`}
                  onPress={() => setFilters({ ...filters, metal })}
                >
                  <Text className={filters.metal === metal ? 'text-white' : 'text-gray-700'}>
                    {metal}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Rarity Filter */}
            <Text className="text-lg font-semibold mb-2">Rarity</Text>
            <View className="flex-row flex-wrap mb-4">
              {rarities.map((rarity) => (
                <TouchableOpacity
                  key={rarity}
                  className={`px-3 py-2 rounded-md mr-2 mb-2 ${
                    filters.rarity === rarity ? 'bg-amber-500' : 'bg-gray-200'
                  }`}
                  onPress={() => setFilters({ ...filters, rarity })}
                >
                  <Text className={filters.rarity === rarity ? 'text-white' : 'text-gray-700'}>
                    {rarity.charAt(0).toUpperCase() + rarity.slice(1).replace('-', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Price Range */}
            <Text className="text-lg font-semibold mb-2">
              Price Range: ${filters.minPrice} - ${filters.maxPrice}
            </Text>
            <View className="flex-row space-x-2 mb-4">
              <TextInput
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Min"
                keyboardType="numeric"
                value={filters.minPrice.toString()}
                onChangeText={(text) => setFilters({ ...filters, minPrice: parseInt(text) || 0 })}
              />
              <TextInput
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Max"
                keyboardType="numeric"
                value={filters.maxPrice.toString()}
                onChangeText={(text) => setFilters({ ...filters, maxPrice: parseInt(text) || 10000 })}
              />
            </View>

            {/* Year Range */}
            <Text className="text-lg font-semibold mb-2">
              Year Range: {filters.minYear} - {filters.maxYear}
            </Text>
            <View className="flex-row space-x-2 mb-6">
              <TextInput
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Min Year"
                keyboardType="numeric"
                value={filters.minYear.toString()}
                onChangeText={(text) => setFilters({ ...filters, minYear: parseInt(text) || 1800 })}
              />
              <TextInput
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Max Year"
                keyboardType="numeric"
                value={filters.maxYear.toString()}
                onChangeText={(text) => setFilters({ ...filters, maxYear: parseInt(text) || new Date().getFullYear() })}
              />
            </View>

            {/* Action Buttons */}
            <View className="flex-row space-x-2 mb-4">
              <TouchableOpacity
                className="flex-1 bg-gray-300 py-3 rounded-md"
                onPress={resetFilters}
              >
                <Text className="text-gray-800 text-center font-medium">Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-amber-500 py-3 rounded-md"
                onPress={() => setShowFilters(false)}
              >
                <Text className="text-white text-center font-medium">Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

export default AuctionListScreen;