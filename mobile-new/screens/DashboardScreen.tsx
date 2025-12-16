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
      <View className="flex-1 justify-center items-center bg-gradient-to-b from-navy-500 via-navy-600 to-navy-900">
        <ActivityIndicator size="large" color="#e7b73c" />
        <Text className="mt-4 text-slate-300">Se încarcă...</Text>
      </View>
    );
  }

  // Filter auctions where user is the current bidder
  const userAuctions = auctions.filter(auction => auction.currentBidderId === user.uid);

  return (
    <ScrollView className="flex-1 bg-gradient-to-b from-navy-500 via-navy-600 to-navy-900">
      <View className="p-6">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-3xl font-bold text-white">Contul meu</Text>
            <Text className="text-slate-300 mt-2">Bine ai venit, {user.displayName || user.email}</Text>
          </View>
          <TouchableOpacity
            className="border border-gold-500 py-2 px-4 rounded-xl"
            onPress={handleLogout}
          >
            <Text className="text-gold-400 font-semibold">Deconectare</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View className="mb-8 space-y-4">
          <View className="rounded-2xl border border-gold-500/30 bg-white/10 backdrop-blur-sm p-6 shadow-xl">
            <Text className="text-lg font-semibold text-white mb-2">Produsele mele</Text>
            <Text className="text-3xl font-bold text-gold-400">{products.length}</Text>
            <Text className="text-sm text-slate-300">Listate pentru vânzare</Text>
          </View>

          <View className="rounded-2xl border border-gold-500/30 bg-white/10 backdrop-blur-sm p-6 shadow-xl">
            <Text className="text-lg font-semibold text-white mb-2">Oferte active</Text>
            <Text className="text-3xl font-bold text-gold-400">{userAuctions.length}</Text>
            <Text className="text-sm text-slate-300">Licitații în desfășurare</Text>
          </View>

          <View className="rounded-2xl border border-gold-500/30 bg-white/10 backdrop-blur-sm p-6 shadow-xl">
            <Text className="text-lg font-semibold text-white mb-4">Acțiuni rapide</Text>
            <View className="space-y-3">
              <TouchableOpacity
                className="bg-gold-500 py-3 px-4 rounded-xl shadow-lg shadow-gold-500/40"
                onPress={() => navigation.navigate('MainTabs', { screen: 'ProductCatalog' })}
              >
                <Text className="text-navy-900 text-center font-semibold">Explorează produse</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="border-2 border-gold-500 py-3 px-4 rounded-xl"
                onPress={() => navigation.navigate('MainTabs', { screen: 'AuctionList' })}
              >
                <Text className="text-gold-400 text-center font-semibold">Vezi licitații</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="border-2 border-gold-500 py-3 px-4 rounded-xl"
                onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' })}
              >
                <Text className="text-gold-400 text-center font-semibold">Coșul meu</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="border-2 border-gold-500 py-3 px-4 rounded-xl"
                onPress={() => navigation.navigate('MainTabs', { screen: 'Watchlist' })}
              >
                <Text className="text-gold-400 text-center font-semibold">Lista de urmărite</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* My Products Section */}
        <View className="rounded-2xl border border-gold-500/30 bg-white/10 backdrop-blur-sm p-6 shadow-xl mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-semibold text-white">Produsele mele</Text>
            <TouchableOpacity className="bg-gold-500 py-2 px-4 rounded-xl shadow-lg shadow-gold-500/40">
              <Text className="text-navy-900 text-sm font-semibold">Adaugă produs</Text>
            </TouchableOpacity>
          </View>

          {productsLoading ? (
            <ActivityIndicator size="small" color="#e7b73c" />
          ) : products.length === 0 ? (
            <Text className="text-slate-300">Niciun produs listat încă.</Text>
          ) : (
            <View className="space-y-3">
              {products.slice(0, 5).map((product) => (
                <View key={product.id} className="flex-row justify-between items-center p-3 bg-navy-700/50 rounded-xl border border-gold-500/20">
                  <View>
                    <Text className="font-medium text-white">{product.name}</Text>
                    <Text className="text-sm text-gold-400">{product.price} RON</Text>
                  </View>
                  <TouchableOpacity
                    className="border border-gold-500 py-1 px-3 rounded-lg"
                    onPress={() => navigation.navigate('ProductDetails', { productId: product.id })}
                  >
                    <Text className="text-gold-400 text-sm">Vezi</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {products.length > 5 && (
                <Text className="text-sm text-slate-300 text-center">
                  Și încă {products.length - 5}...
                </Text>
              )}
            </View>
          )}
        </View>

        {/* My Auction Activity Section */}
        <View className="rounded-2xl border border-gold-500/30 bg-white/10 backdrop-blur-sm p-6 shadow-xl">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-semibold text-white">Activitatea mea în licitații</Text>
            <TouchableOpacity
              className="bg-gold-500 py-2 px-4 rounded-xl shadow-lg shadow-gold-500/40"
              onPress={() => navigation.navigate('MainTabs', { screen: 'AuctionList' })}
            >
              <Text className="text-navy-900 text-sm font-semibold">Vezi toate</Text>
            </TouchableOpacity>
          </View>

          {auctionsLoading ? (
            <ActivityIndicator size="small" color="#e7b73c" />
          ) : userAuctions.length === 0 ? (
            <Text className="text-slate-300">Nicio ofertă activă.</Text>
          ) : (
            <View className="space-y-3">
              {userAuctions.slice(0, 5).map((auction) => (
                <View key={auction.id} className="flex-row justify-between items-center p-3 bg-navy-700/50 rounded-xl border border-gold-500/20">
                  <View>
                    <Text className="font-medium text-white">Licitație #{auction.id.slice(-6)}</Text>
                    <Text className="text-sm text-gold-400">
                      Ofertă curentă: {auction.currentBid?.toFixed(2) || auction.reservePrice.toFixed(2)} RON
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="border border-gold-500 py-1 px-3 rounded-lg"
                    onPress={() => navigation.navigate('AuctionDetails', { auctionId: auction.id })}
                  >
                    <Text className="text-gold-400 text-sm">Vezi</Text>
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