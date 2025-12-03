import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigationTypes';
import { useAuth } from '../context/AuthContext';

const CartScreen: React.FC = () => {
  const { user, loading } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text className="mt-4 text-gray-600">Se încarcă coșul...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-4">
        <Text className="text-center text-lg text-gray-700 mb-4">
          Autentifică-te pentru a accesa coșul tău de cumpărături.
        </Text>
        <TouchableOpacity
          className="bg-amber-500 px-6 py-3 rounded-md"
          onPress={() => navigation.navigate('Login')}
        >
          <Text className="text-white font-medium">Autentificare</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        <View className="bg-white p-4 rounded-lg shadow-sm mb-4">
          <Text className="text-2xl font-bold text-gray-900 mb-2">Coșul meu</Text>
          <Text className="text-sm text-gray-600">
            Funcționalitatea completă de coș și checkout este disponibilă în versiunea web. Aici vei putea
            în viitor să vezi și să gestionezi coșul tău direct din aplicație.
          </Text>
        </View>

        <View className="bg-white p-4 rounded-lg shadow-sm">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Continuă cumpărăturile</Text>
          <View className="space-y-3">
            <TouchableOpacity
              className="w-full bg-amber-500 py-3 rounded-lg"
              onPress={() => navigation.navigate('MainTabs', { screen: 'ProductCatalog' })}
            >
              <Text className="text-white text-center font-semibold">
                Mergi la magazin
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="w-full bg-gray-800 py-3 rounded-lg"
              onPress={() => navigation.navigate('MainTabs', { screen: 'AuctionList' })}
            >
              <Text className="text-white text-center font-semibold">
                Vezi licitațiile
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default CartScreen;