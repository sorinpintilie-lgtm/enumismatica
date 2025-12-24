import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Modal, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useProducts } from '../hooks/useProducts';
import { Product } from '@shared/types';
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
      className="bg-navy-700/80 border border-gold-500/30 rounded-2xl p-4 mb-4 mx-4 shadow-xl"
      onPress={() => navigation.navigate('ProductDetails', { productId: product.id })}
    >
      <View className="w-full h-40 rounded-xl overflow-hidden bg-white/5 mb-3 border border-gold-500/40">
        {product.images && product.images.length > 0 ? (
          <Image
            source={{ uri: product.images[0] }}
            resizeMode="contain"
            className="w-full h-full"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-xs text-slate-400">Fără imagine</Text>
          </View>
        )}
      </View>
      <Text className="text-lg font-semibold text-white mb-1" numberOfLines={1}>
        {product.name}
      </Text>
      {product.country && (
        <Text className="text-xs text-slate-300 mb-2">
          {product.country} {product.year ? `• ${product.year}` : ''}
        </Text>
      )}
      <Text className="text-slate-300 text-sm mb-3" numberOfLines={2}>
        {product.description}
      </Text>
      <View className="flex-row justify-between items-center">
        <Text className="text-xl font-bold text-gold-400">
          {product.price.toFixed(2)} EUR
        </Text>
        {product.rarity && (
          <View className="bg-gold-500/10 px-2 py-1 rounded-full border border-gold-500/40">
            <Text className="text-xs text-gold-400 font-medium capitalize">
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
      <View className="flex-1 justify-center items-center bg-gradient-to-b from-navy-500 via-navy-600 to-navy-900">
        <ActivityIndicator size="large" color="#e7b73c" />
        <Text className="mt-4 text-slate-200">Se încarcă produsele...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-gradient-to-b from-navy-500 via-navy-600 to-navy-900 p-4">
        <Text className="text-center text-red-400 text-lg">
          Eroare la încărcarea produselor: {error}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gradient-to-b from-navy-500 via-navy-600 to-navy-900">
      {/* Header */}
      <View className="bg-navy-700/80 border-b border-gold-500/40 p-4 shadow-xl">
        <Text className="text-2xl font-bold text-white mb-2">Magazin</Text>
        <Text className="text-sm text-slate-300 mb-4">
          Explorează monedele disponibile în E-shop.
        </Text>

        {/* Search Bar */}
        <TextInput
          className="w-full px-3 py-2 border border-gold-500/40 rounded-xl bg-navy-700/80 text-white mb-3"
          placeholder="Caută produse..."
          placeholderTextColor="#9ca3af"
          value={filters.searchTerm}
          onChangeText={(text) => setFilters({ ...filters, searchTerm: text })}
        />

        {/* Quick Sort Buttons */}
        <View className="flex-row space-x-2 mb-3">
          <TouchableOpacity
            className={`flex-1 py-2 px-3 rounded-xl ${filters.sortBy === 'createdAt' ? 'bg-gold-500' : 'bg-navy-600'}`}
            onPress={() => setFilters({ ...filters, sortBy: 'createdAt' })}
          >
            <Text className={`text-center text-xs font-medium ${filters.sortBy === 'createdAt' ? 'text-navy-900' : 'text-slate-200'}`}>
              Cele mai noi
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 px-3 rounded-xl ${filters.sortBy === 'price-asc' ? 'bg-gold-500' : 'bg-navy-600'}`}
            onPress={() => setFilters({ ...filters, sortBy: 'price-asc' })}
          >
            <Text className={`text-center text-xs font-medium ${filters.sortBy === 'price-asc' ? 'text-navy-900' : 'text-slate-200'}`}>
              Preț ↑
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 px-3 rounded-xl ${filters.sortBy === 'price-desc' ? 'bg-gold-500' : 'bg-navy-600'}`}
            onPress={() => setFilters({ ...filters, sortBy: 'price-desc' })}
          >
            <Text className={`text-center text-xs font-medium ${filters.sortBy === 'price-desc' ? 'text-navy-900' : 'text-slate-200'}`}>
              Preț ↓
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Button */}
        <TouchableOpacity
          className="bg-gold-500 py-3 rounded-xl mt-1 shadow-lg shadow-gold-500/40"
          onPress={() => setShowFilters(true)}
        >
          <Text className="text-navy-900 text-center font-semibold">
            Filtre avansate ({filteredProducts.length} din {products.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-slate-200 text-lg text-center mb-4">
            {filters.searchTerm ? 'Niciun produs nu se potrivește căutării.' : 'Nu există produse disponibile.'}
          </Text>
          {filters.searchTerm && (
            <TouchableOpacity
              className="bg-gold-500 px-6 py-2 rounded-xl shadow-lg shadow-gold-500/40"
              onPress={resetFilters}
            >
              <Text className="text-navy-900 font-semibold">Resetează filtrele</Text>
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
