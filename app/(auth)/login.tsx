import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { signIn } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Fyll i e-post och lösenord');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await signIn(email.trim(), password);
      if (result.mfaRequired && result.factorId) {
        router.push({ pathname: '/(auth)/verify-mfa', params: { factorId: result.factorId } });
      }
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials'
        ? 'Felaktig e-post eller lösenord'
        : err.message || 'Något gick fel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text variant="headlineLarge" style={styles.title}>Rocket Forms Pro</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Logga in på ditt konto</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="E-postadress"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            mode="outlined"
            left={<TextInput.Icon icon="email-outline" />}
          />

          <TextInput
            label="Lösenord"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            textContentType="password"
            mode="outlined"
            left={<TextInput.Icon icon="lock-outline" />}
            right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
          />

          {error ? <HelperText type="error" visible>{error}</HelperText> : null}

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Logga in
          </Button>

          <Button
            mode="text"
            onPress={() => router.push('/(auth)/reset-password')}
            style={styles.link}
          >
            Glömt lösenord?
          </Button>

          <Button
            mode="text"
            onPress={() => router.push('/(auth)/register')}
            style={styles.link}
          >
            Skapa konto
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#a0a0b0',
  },
  form: {
    gap: 12,
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#e8622c',
  },
  buttonContent: {
    paddingVertical: 6,
  },
  link: {
    marginTop: 4,
  },
});
