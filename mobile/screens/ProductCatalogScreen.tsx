import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useProducts } from '../hooks/useProducts';
import { Product } from '../../shared/types';
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
  sortBy: 'name' | 'price-asc' | 'price-desc' | 'year-asc' | 'year-desc' | 'createdAt';
}

const countries = ['All', 'Russia', 'USA', 'Germany', 'Italy', 'France', 'Finland', 'Spain', 'Denmark', 'Mexico', 'Romania', 'Austria'];
const metals = ['All', 'Gold', 'Silver', 'Bronze', 'Copper', 'Nickel', 'Platinum'];
const rarities = ['All', 'common', 'uncommon', 'rare', 'very-rare', 'extremely-rare'];
const grades = ['All', 'Poor', 'Fair', 'Good', 'VG', 'Fine', 'VF', 'XF', 'AU', 'MS-60', 'MS-65', 'MS-70'];

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  return (
    <TouchableOpacity
      className="bg-white rounded-lg shadow-md p-4 mb-4 mx-4"
      onPress={() => navigation.navigate('ProductDetails', { productId: product.id })}
    >
      <View className="aspect-w-1 aspect-h-1 bg-gray-200 mb-3 rounded">
        {product.images.length > 0 ? (
          <View className="w-full h-32 bg-gray-300 rounded flex items-center justify-center">
            <Text className="text-gray-500 text-sm">Image</Text>
          </View>
        ) : (
          <View className="w-full h-32 bg-gray-300 rounded flex items-center justify-center">
            <Text className="text-gray-500 text-sm">No Image</Text>
          </View>
        )}
      </View>
      <Text className="text-lg font-semibold text-gray-900 mb-1" numberOfLines={1}>
        {product.name}
      </Text>
      {product.country && (
        <Text className="text-xs text-gray-500 mb-2">
          {product.country} {product.year ? `• ${product.year}` : ''}
        </Text>
      )}
      <Text className="text-gray-600 text-sm mb-3" numberOfLines={2}>
        {product.description}
      </Text>
      <View className="flex-row justify-between items-center">
        <Text className="text-xl font-bold text-green-600">
          ${product.price.toFixed(2)}
        </Text>
        {product.rarity && (
          <View className="bg-amber-100 px-2 py-1 rounded">
            <Text className="text-xs text-amber-800 font-medium capitalize">
              {product.rarity.replace('-', ' ')}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const ProductCatalogScreen: React.FC = () => {
  const { products, loading, error } = useProducts();
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
    sortBy: 'createdAt',
  });

  const filteredProducts = useMemo(() => {
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
    if (filters.country && filters.country !== 'All') {
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
    if (filters.metal && filters.metal !== 'All') {
      filtered = filtered.filter((product) => product.metal === filters.metal);
    }

    // Apply rarity filter
    if (filters.rarity && filters.rarity !== 'All') {
      filtered = filtered.filter((product) => product.rarity === filters.rarity);
    }

    // Apply grade filter
    if (filters.grade && filters.grade !== 'All') {
      filtered = filtered.filter((product) => product.grade === filters.grade);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'year-asc':
          return (a.year || 0) - (b.year || 0);
        case 'year-desc':
          return (b.year || 0) - (a.year || 0);
        case 'createdAt':
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

    return filtered;
  }, [products, filters]);

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
      sortBy: 'createdAt',
    });
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text className="mt-4 text-gray-600">Loading products...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-4">
        <Text className="text-center text-red-600 text-lg">
          Error loading products: {error}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white p-4 shadow-sm">
        <Text className="text-2xl font-bold text-gray-900 mb-4">Product Catalog</Text>

        {/* Search Bar */}
        <TextInput
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white mb-3"
          placeholder="Search products..."
          value={filters.searchTerm}
          onChangeText={(text) => setFilters({ ...filters, searchTerm: text })}
        />

        {/* Quick Sort Buttons */}
        <View className="flex-row space-x-2 mb-3">
          <TouchableOpacity
            className={`flex-1 py-2 px-3 rounded-md ${filters.sortBy === 'createdAt' ? 'bg-amber-500' : 'bg-gray-200'}`}
            onPress={() => setFilters({ ...filters, sortBy: 'createdAt' })}
          >
            <Text className={`text-center text-xs font-medium ${filters.sortBy === 'createdAt' ? 'text-white' : 'text-gray-700'}`}>
              Newest
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
            Advanced Filters ({filteredProducts.length} of {products.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-gray-500 text-lg text-center mb-4">
            {filters.searchTerm ? 'No products match your search.' : 'No products available.'}
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
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProductCard product={item} />}
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

export default ProductCatalogScreen;