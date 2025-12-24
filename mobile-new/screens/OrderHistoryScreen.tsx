import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigationTypes';
import { useProducts } from '../hooks/useProducts';
import { getOrdersForBuyer } from '@shared/orderService';
import type { Order } from '@shared/types';

const OrderHistoryScreen: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const userId = user?.uid || null;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const {
    products,
    loading: productsLoading,
  } = useProducts(
    undefined,
    200,
  );

  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      if (!userId) {
        if (isMounted) {
          setOrders([]);
          setOrdersError(null);
        }
        return;
      }

      setLoadingOrders(true);
      setOrdersError(null);
      try {
        const data = await getOrdersForBuyer(userId);
        if (isMounted) {
          setOrders(data);
        }
      } catch (err: any) {
        console.error('Failed to load orders for buyer (mobile)', err);
        if (isMounted) {
          setOrdersError(err?.message || 'Nu s-au putut încărca comenzile tale.');
        }
      } finally {
        if (isMounted) {
          setLoadingOrders(false);
        }
      }
    };

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const loading = authLoading || loadingOrders || productsLoading;

  const lines = useMemo(
    () =>
      orders.map((order) => {
        const product = products.find((p) => p.id === order.productId) || null;
        return { order, product };
      }),
    [orders, products],
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text className="mt-4 text-gray-600">Se încarcă comenzile tale...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-4">
        <Text className="text-center text-lg text-gray-700 mb-4">
          Istoricul comenzilor este disponibil doar pentru utilizatori autentificați.
        </Text>
        <TouchableOpacity
          className="bg-amber-500 px-6 py-3 rounded-md mb-2"
          onPress={() => navigation.navigate('Login')}
        >
          <Text className="text-white font-medium">Autentificare</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (ordersError) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-4">
        <Text className="text-center text-red-600 text-lg mb-2">
          Eroare la încărcarea comenzilor
        </Text>
        <Text className="text-center text-red-500">{ordersError}</Text>
      </View>
    );
  }

  const isEmpty = lines.length === 0;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-2xl font-bold text-gray-900">Comenzile mele</Text>
            <Text className="text-sm text-gray-600 mt-1">
              {isEmpty
                ? 'Nu ai încă nicio comandă înregistrată.'
                : `Ai plasat ${lines.length} ${lines.length === 1 ? 'comandă' : 'comenzi'} în magazin.`}
            </Text>
          </View>
          <TouchableOpacity
            className="px-3 py-2 rounded-full border border-gray-300"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-xs text-gray-700">Înapoi</Text>
          </TouchableOpacity>
        </View>

        {isEmpty ? (
          <View className="bg-white p-4 rounded-lg shadow-sm">
            <Text className="text-gray-600 mb-3">
              Nu ai cumpărat încă niciun produs din magazin.
            </Text>
            <TouchableOpacity
              className="w-full bg-amber-500 py-3 rounded-lg"
              onPress={() => navigation.navigate('MainTabs', { screen: 'ProductCatalog' })}
            >
              <Text className="text-white text-center font-semibold">
                Mergi la magazin
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="space-y-3">
            {lines.map(({ order, product }) => {
              const createdAt =
                order.createdAt instanceof Date ? order.createdAt : new Date();
              const productName = product?.name || `Produs ${order.productId}`;

              return (
                <View
                  key={order.id}
                  className="bg-white p-4 rounded-lg shadow-sm"
                >
                  <View className="flex-row justify-between items-center mb-1">
                    <View className="flex-1 mr-2">
                      <Text className="text-base font-semibold text-gray-900" numberOfLines={2}>
                        {productName}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        Comandă ID: {order.id}
                      </Text>
                    </View>
                    <Text className="text-sm font-semibold text-green-600">
                      {order.price.toFixed(2)} EUR
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500 mb-2">
                    Plasată la {createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString()}
                  </Text>
                  <View className="flex-row space-x-2">
                    {product && (
                      <TouchableOpacity
                        className="flex-1 bg-blue-600 py-2 rounded-md"
                        onPress={() =>
                          navigation.navigate('ProductDetails', { productId: product.id })
                        }
                      >
                        <Text className="text-white text-center text-sm font-medium">
                          Vezi produsul
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default OrderHistoryScreen;