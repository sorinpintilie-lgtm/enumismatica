import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { z } from 'zod';
import { signInWithEmail, signInWithGoogle } from '../../shared/auth';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigationTypes';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const handleEmailLogin = async () => {
    try {
      loginSchema.parse({ email, password });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        Alert.alert('Validation Error', validationError.issues[0].message);
      }
      return;
    }

    setLoading(true);
    const { user, error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) {
      Alert.alert('Error', error);
    } else if (user) {
      // AuthContext + AppNavigator will automatically switch to the authenticated stack.
      // No manual navigation needed here.
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { user, error } = await signInWithGoogle();
    setLoading(false);
    if (error) {
      Alert.alert('Error', error);
    } else if (user) {
      // AuthContext + AppNavigator will automatically switch to the authenticated stack.
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-gray-50 p-4">
      <View className="w-full max-w-sm">
        <Text className="text-3xl font-bold text-center mb-8 text-gray-900">
          Sign In
        </Text>

        <TextInput
          className="w-full px-3 py-2 mb-4 border border-gray-300 rounded-md bg-white"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          className="w-full px-3 py-2 mb-4 border border-gray-300 rounded-md bg-white"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          className="w-full bg-blue-600 py-2 rounded-md mb-4"
          onPress={handleEmailLogin}
          disabled={loading}
        >
          <Text className="text-white text-center font-semibold">
            {loading ? 'Signing In...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full bg-red-600 py-2 rounded-md mb-4"
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          <Text className="text-white text-center font-semibold">
            Sign In with Google
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register' as never)}>
          <Text className="text-center text-blue-600">
            Don't have an account? Sign Up
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default LoginScreen;