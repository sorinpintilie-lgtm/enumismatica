import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { logout } from '@shared/auth';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigationTypes';
import { useProducts } from '../hooks/useProducts';
import { useAuctions } from '../hooks/useAuctions';

const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { products, loading: productsLoading } = useProducts(user?.uid);
  const { auctions, loading: auctionsLoading } = useAuctions();

  const handleLogout = async () => {
    await logout();
    navigation.navigate('Login');
  };

  if (!user) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-600">Loading...</Text>
      </View>
    );
  }

  // Filter auctions where user is the current bidder
  const userAuctions = auctions.filter(auction => auction.currentBidderId === user.uid);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-3xl font-bold text-gray-900">Dashboard</Text>
            <Text className="text-gray-600 mt-2">Welcome back, {user.email}</Text>
          </View>
          <TouchableOpacity
            className="bg-red-600 py-2 px-4 rounded-md"
            onPress={handleLogout}
          >
            <Text className="text-white font-semibold">Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View className="mb-8">
          <View className="bg-white p-6 rounded-lg shadow-md">
            <Text className="text-lg font-semibold text-gray-900 mb-2">My Products</Text>
            <Text className="text-3xl font-bold text-blue-600">{products.length}</Text>
            <Text className="text-sm text-gray-600">Listed for sale</Text>
          </View>

          <View className="bg-white p-6 rounded-lg shadow-md">
            <Text className="text-lg font-semibold text-gray-900 mb-2">Active Bids</Text>
            <Text className="text-3xl font-bold text-green-600">{userAuctions.length}</Text>
            <Text className="text-sm text-gray-600">Auctions you're bidding on</Text>
          </View>

          <View className="bg-white p-6 rounded-lg shadow-md">
            <Text className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</Text>
            <View className="space-y-2" style={{ gap: 8 }}>
              <TouchableOpacity
                className="bg-blue-600 py-2 px-4 rounded-md"
                onPress={() => navigation.navigate('MainTabs', { screen: 'ProductCatalog' })}
              >
                <Text className="text-white text-center text-sm">Browse Products</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-green-600 py-2 px-4 rounded-md"
                onPress={() => navigation.navigate('MainTabs', { screen: 'AuctionList' })}
              >
                <Text className="text-white text-center text-sm">View Auctions</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-amber-500 py-2 px-4 rounded-md"
                onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' })}
              >
                <Text className="text-white text-center text-sm">My Cart</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-purple-600 py-2 px-4 rounded-md"
                onPress={() => navigation.navigate('MainTabs', { screen: 'Watchlist' })}
              >
                <Text className="text-white text-center text-sm">Watchlist</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-gray-800 py-2 px-4 rounded-md"
                onPress={() => navigation.navigate('OrderHistory')}
              >
                <Text className="text-white text-center text-sm">Order History</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-gray-700 py-2 px-4 rounded-md"
                onPress={() => navigation.navigate('SalesHistory')}
              >
                <Text className="text-white text-center text-sm">Sales History</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* My Products Section */}
        <View className="bg-white p-6 rounded-lg shadow-md mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-semibold text-gray-900">My Products</Text>
            <TouchableOpacity className="bg-blue-600 py-2 px-4 rounded-md">
              <Text className="text-white text-sm font-medium">Add Product</Text>
            </TouchableOpacity>
          </View>

          {productsLoading ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : products.length === 0 ? (
            <Text className="text-gray-500">No products listed yet.</Text>
          ) : (
            <View className="space-y-3">
              {products.slice(0, 5).map((product) => (
                <View key={product.id} className="flex-row justify-between items-center p-3 bg-gray-50 rounded">
                  <View>
                    <Text className="font-medium text-gray-900">{product.name}</Text>
                    <Text className="text-sm text-gray-600">${product.price.toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity
                    className="bg-gray-600 py-1 px-3 rounded"
                    onPress={() => navigation.navigate('ProductDetails', { productId: product.id })}
                  >
                    <Text className="text-white text-sm">View</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {products.length > 5 && (
                <Text className="text-sm text-gray-600 text-center">
                  And {products.length - 5} more...
                </Text>
              )}
            </View>
          )}
        </View>

        {/* My Auction Activity Section */}
        <View className="bg-white p-6 rounded-lg shadow-md">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-semibold text-gray-900">My Auction Activity</Text>
            <TouchableOpacity
              className="bg-green-600 py-2 px-4 rounded-md"
              onPress={() => navigation.navigate('MainTabs', { screen: 'AuctionList' })}
            >
              <Text className="text-white text-sm font-medium">View All</Text>
            </TouchableOpacity>
          </View>

          {auctionsLoading ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : userAuctions.length === 0 ? (
            <Text className="text-gray-500">No active bids.</Text>
          ) : (
            <View className="space-y-3">
              {userAuctions.slice(0, 5).map((auction) => (
                <View key={auction.id} className="flex-row justify-between items-center p-3 bg-gray-50 rounded">
                  <View>
                    <Text className="font-medium text-gray-900">Auction #{auction.id.slice(-6)}</Text>
                    <Text className="text-sm text-gray-600">
                      Current bid: ${auction.currentBid?.toFixed(2) || auction.reservePrice.toFixed(2)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="bg-blue-600 py-1 px-3 rounded"
                    onPress={() => navigation.navigate('AuctionDetails', { auctionId: auction.id })}
                  >
                    <Text className="text-white text-sm">View</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default DashboardScreen;