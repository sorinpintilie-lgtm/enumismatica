import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { z } from 'zod';
import { signInWithEmail, signInWithGoogle } from '@shared/auth';
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
    <View
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#00020d' }}
    >
      <View style={{ width: '100%', maxWidth: 400 }}>
        {/* Header */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 30, fontWeight: 'bold', textAlign: 'center', color: 'white', marginBottom: 8 }}>
            Autentificare
          </Text>
          <Text style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
            Conectează-te la contul tău
          </Text>
        </View>

        {/* Login Form */}
        <View style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(231, 183, 60, 0.3)',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          padding: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.5,
          shadowRadius: 20,
          elevation: 10
        }}>
          <TextInput
            style={{
              width: '100%',
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: 'rgba(231, 183, 60, 0.3)',
              borderRadius: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'white'
            }}
            placeholder="Email"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={{
              width: '100%',
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: 'rgba(231, 183, 60, 0.3)',
              borderRadius: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'white'
            }}
            placeholder="Parolă"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={{
              width: '100%',
              backgroundColor: '#e7b73c',
              paddingVertical: 12,
              borderRadius: 12,
              marginBottom: 16,
              shadowColor: '#e7b73c',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 5
            }}
            onPress={handleEmailLogin}
            disabled={loading}
          >
            <Text style={{ color: '#000940', textAlign: 'center', fontWeight: '600' }}>
              {loading ? 'Se conectează...' : 'Conectare'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              width: '100%',
              borderWidth: 2,
              borderColor: '#e7b73c',
              paddingVertical: 12,
              borderRadius: 12,
              marginBottom: 24
            }}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <Text style={{ color: '#e7b73c', textAlign: 'center', fontWeight: '600' }}>
              Continuă cu Google
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register' as never)}>
            <Text style={{ textAlign: 'center', color: '#e7b73c', fontSize: 14 }}>
              Nu ai cont? <Text style={{ fontWeight: '600' }}>Înregistrează-te</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default LoginScreen;
