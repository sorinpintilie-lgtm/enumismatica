import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useProduct } from '../hooks/useProducts';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigationTypes';

const ProductDetailsScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'ProductDetails'>>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { productId } = route.params;
  const { product, loading, error } = useProduct(productId);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-600">Loading product...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-4">
        <Text className="text-center text-red-600 text-lg mb-4">
          {error || 'Product not found'}
        </Text>
        <TouchableOpacity
          className="bg-blue-600 py-2 px-4 rounded-md"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwner = user?.uid === product.ownerId;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-white p-4">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-4">
          <TouchableOpacity
            className="bg-gray-200 py-2 px-4 rounded-md"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-gray-700 font-semibold">← Back</Text>
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity className="bg-blue-600 py-2 px-4 rounded-md">
              <Text className="text-white font-semibold">Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Product Images */}
        <View className="mb-6">
          {product.images.length > 0 ? (
            <View className="w-full h-64 bg-gray-300 rounded-lg flex items-center justify-center">
              <Text className="text-gray-500 text-lg">Product Image</Text>
            </View>
          ) : (
            <View className="w-full h-64 bg-gray-300 rounded-lg flex items-center justify-center">
              <Text className="text-gray-500 text-lg">No Image Available</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-gray-900 mb-2">{product.name}</Text>
          <Text className="text-2xl font-bold text-green-600 mb-4">${product.price.toFixed(2)}</Text>
          <Text className="text-gray-600 text-lg leading-6">{product.description}</Text>
        </View>

        {/* Product Details */}
        <View className="bg-gray-50 p-4 rounded-lg mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Product Details</Text>
          <View className="space-y-2">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Listed by:</Text>
              <Text className="text-gray-900 font-medium">
                {isOwner ? 'You' : 'Another User'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Listed on:</Text>
              <Text className="text-gray-900 font-medium">
                {product.createdAt.toLocaleDateString()}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Last updated:</Text>
              <Text className="text-gray-900 font-medium">
                {product.updatedAt.toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        {!isOwner && (
          <View className="space-y-3">
            <TouchableOpacity className="w-full bg-blue-600 py-3 rounded-lg">
              <Text className="text-white text-center font-semibold text-lg">
                Contact Seller
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="w-full bg-green-600 py-3 rounded-lg">
              <Text className="text-white text-center font-semibold text-lg">
                Make Offer
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isOwner && (
          <View className="space-y-3">
            <TouchableOpacity className="w-full bg-purple-600 py-3 rounded-lg">
              <Text className="text-white text-center font-semibold text-lg">
                Create Auction
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="w-full bg-red-600 py-3 rounded-lg">
              <Text className="text-white text-center font-semibold text-lg">
                Remove Listing
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default ProductDetailsScreen;