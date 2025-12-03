import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigationTypes';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../hooks/useCart';
import { useProducts } from '../hooks/useProducts';
import { createDirectOrderForProduct } from '../../shared/orderService';

const CartScreen: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [placingOrderFor, setPlacingOrderFor] = useState<string | null>(null);

  if (authLoading) {
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

  const { items, loading: cartLoading, error, removeItem, clearCart } = useCart(user.uid);
  const {
    products,
    loading: productsLoading,
  } = useProducts(
    undefined,
    200,
  );

  const loading = cartLoading || productsLoading;

  const lines = useMemo(
    () =>
      items.map((item) => {
        const product = products.find((p) => p.id === item.productId) || null;
        return { item, product };
      }),
    [items, products],
  );

  const totalValue = useMemo(
    () =>
      lines.reduce((sum, { product }) => {
        if (!product || typeof product.price !== 'number') return sum;
        return sum + product.price;
      }, 0),
    [lines],
  );

  const handleCheckoutItem = async (productId: string, cartItemId: string) => {
    if (!user) {
      Alert.alert('Autentificare necesară', 'Trebuie să fii autentificat pentru a cumpăra.');
      return;
    }

    try {
      setPlacingOrderFor(productId);
      await createDirectOrderForProduct(productId, user.uid);
      await removeItem(cartItemId);

      Alert.alert(
        'Comandă creată',
        'Comanda ta a fost înregistrată. O poți vedea în istoricul comenzilor pe web.',
      );
    } catch (err: any) {
      console.error('Failed to create order from cart', err);
      Alert.alert(
        'Eroare la cumpărare',
        err?.message || 'Nu am putut finaliza cumpărarea acestui produs.',
      );
    } finally {
      setPlacingOrderFor(null);
    }
  };

  const handleClearCart = () => {
    if (!items.length) return;
    Alert.alert(
      'Golește coșul',
      'Ești sigur că vrei să golești întregul coș?',
      [
        { text: 'Anulează', style: 'cancel' },
        {
          text: 'Da, golește',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCart();
            } catch (err: any) {
              console.error('Failed to clear cart', err);
              Alert.alert(
                'Eroare',
                err?.message || 'Nu am putut goli coșul. Încearcă din nou.',
              );
            }
          },
        },
      ],
    );
  };

  const isEmpty = !loading && lines.length === 0;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        <View className="bg-white p-4 rounded-lg shadow-sm mb-4">
          <Text className="text-2xl font-bold text-gray-900 mb-2">Coșul meu</Text>
          {loading ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="#F59E0B" />
              <Text className="ml-2 text-sm text-gray-600">Se încarcă produsele din coș...</Text>
            </View>
          ) : isEmpty ? (
            <Text className="text-sm text-gray-600">
              Coșul tău este gol. Adaugă monede din magazin pentru a le cumpăra direct.
            </Text>
          ) : (
            <View>
              <Text className="text-sm text-gray-600 mb-1">
                Ai {lines.length} {lines.length === 1 ? 'produs' : 'produse'} în coș.
              </Text>
              <Text className="text-sm font-semibold text-gray-900">
                Total estimat:{' '}
                <Text className="text-green-600">
                  {totalValue.toFixed(2)} RON
                </Text>
              </Text>
            </View>
          )}
          {error && (
            <Text className="mt-2 text-sm text-red-500">
              Eroare la încărcarea coșului: {error}
            </Text>
          )}
        </View>

        {!isEmpty && !loading && (
          <View className="bg-white p-4 rounded-lg shadow-sm mb-4">
            {lines.map(({ item, product }) => {
              const label = product?.name || `Produs ${item.productId}`;
              const price =
                product && typeof product.price === 'number'
                  ? `${product.price.toFixed(2)} RON`
                  : 'Preț indisponibil';

              return (
                <View
                  key={item.id}
                  className="mb-4 border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
                >
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-base font-semibold text-gray-900 flex-1 mr-2" numberOfLines={2}>
                      {label}
                    </Text>
                    <Text className="text-sm font-semibold text-green-600">
                      {price}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500 mb-2">
                    ID produs: {item.productId}
                  </Text>
                  <View className="flex-row space-x-2">
                    <TouchableOpacity
                      className="flex-1 bg-blue-600 py-2 rounded-md"
                      onPress={() =>
                        navigation.navigate('ProductDetails', { productId: item.productId })
                      }
                    >
                      <Text className="text-white text-center text-sm font-medium">
                        Vezi produsul
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 bg-amber-500 py-2 rounded-md"
                      disabled={placingOrderFor === item.productId}
                      onPress={() => handleCheckoutItem(item.productId, item.id)}
                    >
                      {placingOrderFor === item.productId ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text className="text-white text-center text-sm font-medium">
                          Cumpără acum
                        </Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="w-10 bg-gray-200 py-2 rounded-md items-center justify-center"
                      onPress={() => removeItem(item.id)}
                    >
                      <Text className="text-gray-700 text-base font-bold">×</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity
              className="mt-2 w-full bg-gray-800 py-3 rounded-lg"
              onPress={handleClearCart}
            >
              <Text className="text-white text-center font-semibold">
                Golește coșul
              </Text>
            </TouchableOpacity>
          </View>
        )}

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