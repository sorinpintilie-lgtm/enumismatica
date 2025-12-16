import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigationTypes';
import { WatchlistItem } from '@shared/types';
import { getUserWatchlist, removeFromWatchlist, clearWatchlist } from '@shared/watchlistService';

const WatchlistItemCard: React.FC<{ item: WatchlistItem; onRemove: (itemId: string) => void }> = ({ item, onRemove }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const handlePress = () => {
    if (item.itemType === 'product') {
      navigation.navigate('ProductDetails', { productId: item.itemId });
    } else {
      navigation.navigate('AuctionDetails', { auctionId: item.itemId });
    }
  };

  return (
    <TouchableOpacity
      className="bg-white rounded-lg shadow-md p-4 mb-4 mx-4"
      onPress={handlePress}
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-semibold text-gray-900">
          {item.itemType === 'product' ? 'Product' : 'Auction'} - {item.itemId.slice(-6)}
        </Text>
        <TouchableOpacity
          className="p-1"
          onPress={() => onRemove(item.itemId)}
        >
          <Text className="text-red-500 text-xl">×</Text>
        </TouchableOpacity>
      </View>

      {item.notes && (
        <Text className="text-sm text-gray-600 mb-2">
          Notes: {item.notes}
        </Text>
      )}

      <Text className="text-xs text-gray-500">
        Added: {new Date(item.addedAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );
};

const WatchlistScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'auctions'>('products');

  const fetchWatchlist = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const result = await getUserWatchlist(user.uid);
      if (result.success && result.items) {
        setWatchlist(result.items);
      } else {
        setError(result.error || 'Failed to fetch watchlist');
      }
    } catch (err) {
      console.error('Error fetching watchlist:', err);
      setError('Failed to fetch watchlist');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!user) return;

    try {
      const result = await removeFromWatchlist(user.uid, itemId);
      if (result.success) {
        await fetchWatchlist();
      } else {
        Alert.alert('Error', result.error || 'Failed to remove from watchlist');
      }
    } catch (err) {
      console.error('Error removing from watchlist:', err);
      Alert.alert('Error', 'Failed to remove from watchlist');
    }
  };

  const handleClearWatchlist = async () => {
    if (!user) return;

    Alert.alert(
      'Clear Watchlist',
      'Are you sure you want to clear your entire watchlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await clearWatchlist(user.uid);
              if (result.success) {
                await fetchWatchlist();
              } else {
                Alert.alert('Error', result.error || 'Failed to clear watchlist');
              }
            } catch (err) {
              console.error('Error clearing watchlist:', err);
              Alert.alert('Error', 'Failed to clear watchlist');
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWatchlist();
  };

  useEffect(() => {
    fetchWatchlist();
  }, [user]);

  if (!user) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-4">
        <Text className="text-center text-lg text-gray-700 mb-4">
          Please authenticate to access your watchlist
        </Text>
        <TouchableOpacity
          className="bg-amber-500 px-6 py-3 rounded-md"
          onPress={() => navigation.navigate('Login')}
        >
          <Text className="text-white font-medium">Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const productsInWatchlist = watchlist.filter(item => item.itemType === 'product');
  const auctionsInWatchlist = watchlist.filter(item => item.itemType === 'auction');

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white p-4 shadow-sm">
        <Text className="text-2xl font-bold text-gray-900 mb-2">My Watchlist</Text>
        <Text className="text-sm text-gray-600 mb-4">
          {watchlist.length} items • {productsInWatchlist.length} products • {auctionsInWatchlist.length} auctions
        </Text>

        {/* Tabs */}
        <View className="flex-row mb-4 bg-gray-100 rounded-lg p-1">
          <TouchableOpacity
            className={`flex-1 py-2 px-3 rounded-md ${activeTab === 'products' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setActiveTab('products')}
          >
            <Text className={`text-center text-sm font-medium ${activeTab === 'products' ? 'text-gray-900' : 'text-gray-600'}`}>
              Products ({productsInWatchlist.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 px-3 rounded-md ${activeTab === 'auctions' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setActiveTab('auctions')}
          >
            <Text className={`text-center text-sm font-medium ${activeTab === 'auctions' ? 'text-gray-900' : 'text-gray-600'}`}>
              Auctions ({auctionsInWatchlist.length})
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row space-x-2">
          <TouchableOpacity
            className="flex-1 py-2 px-3 rounded-md bg-gray-800"
            onPress={handleClearWatchlist}
          >
            <Text className="text-white text-center text-sm font-medium">Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 py-2 px-3 rounded-md bg-amber-500"
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Text className="text-white text-center text-sm font-medium">
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text className="mt-4 text-gray-600">Loading watchlist...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-center text-red-600 text-lg mb-4">
            Error: {error}
          </Text>
          <TouchableOpacity
            className="bg-amber-500 px-6 py-3 rounded-md"
            onPress={fetchWatchlist}
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : watchlist.length === 0 ? (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-center text-gray-500 text-lg mb-4">
            Your watchlist is empty
          </Text>
          <Text className="text-center text-gray-400 mb-6">
            Add products and auctions to your watchlist to monitor them easily
          </Text>
          <View className="flex-row space-x-2">
            <TouchableOpacity
              className="bg-amber-500 px-6 py-3 rounded-md"
              onPress={() => navigation.navigate('MainTabs', { screen: 'ProductCatalog' })}
            >
              <Text className="text-white font-medium">Browse Products</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-gray-800 px-6 py-3 rounded-md"
              onPress={() => navigation.navigate('MainTabs', { screen: 'AuctionList' })}
            >
              <Text className="text-white font-medium">View Auctions</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={activeTab === 'products' ? productsInWatchlist : auctionsInWatchlist}
          renderItem={({ item }) => (
            <WatchlistItemCard
              item={item}
              onRemove={handleRemoveItem}
            />
          )}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 16 }}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center p-8">
              <Text className="text-center text-gray-500 text-lg mb-4">
                No {activeTab === 'products' ? 'products' : 'auctions'} in your watchlist
              </Text>
              <TouchableOpacity
                className="bg-amber-500 px-6 py-3 rounded-md"
                onPress={() => navigation.navigate('MainTabs', {
                  screen: activeTab === 'products' ? 'ProductCatalog' : 'AuctionList'
                })}
              >
                <Text className="text-white font-medium">
                  Browse {activeTab === 'products' ? 'Products' : 'Auctions'}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
};

export default WatchlistScreen;