import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { z } from 'zod';
import { signUpWithEmail, signInWithGoogle } from '../../shared/auth';
import { useNavigation } from '@react-navigation/native';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const RegisterScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleEmailRegister = async () => {
    try {
      registerSchema.parse({ email, password, confirmPassword });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        Alert.alert('Validation Error', validationError.issues[0].message);
      }
      return;
    }

    setLoading(true);
    const { user, error } = await signUpWithEmail(email, password);
    setLoading(false);
    if (error) {
      Alert.alert('Error', error);
    } else if (user) {
      navigation.navigate('Dashboard' as never);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { user, error } = await signInWithGoogle();
    setLoading(false);
    if (error) {
      Alert.alert('Error', error);
    } else if (user) {
      navigation.navigate('Dashboard' as never);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-gray-50 p-4">
      <View className="w-full max-w-sm">
        <Text className="text-3xl font-bold text-center mb-8 text-gray-900">
          Sign Up
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

        <TextInput
          className="w-full px-3 py-2 mb-4 border border-gray-300 rounded-md bg-white"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity
          className="w-full bg-blue-600 py-2 rounded-md mb-4"
          onPress={handleEmailRegister}
          disabled={loading}
        >
          <Text className="text-white text-center font-semibold">
            {loading ? 'Signing Up...' : 'Sign Up'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full bg-red-600 py-2 rounded-md mb-4"
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          <Text className="text-white text-center font-semibold">
            Sign Up with Google
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
          <Text className="text-center text-blue-600">
            Already have an account? Sign In
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RegisterScreen;