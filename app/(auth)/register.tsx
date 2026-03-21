import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { signUp } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Fyll i alla fält');
      return;
    }
    if (password !== confirmPassword) {
      setError('Lösenorden matchar inte');
      return;
    }
    if (password.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signUp(email.trim(), password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Något gick fel');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.successTitle}>Konto skapat!</Text>
          <Text variant="bodyLarge" style={styles.successText}>
            Kolla din e-post för att verifiera kontot.
          </Text>
          <Button mode="contained" onPress={() => router.replace('/(auth)/login')} style={styles.button}>
            Till inloggning
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <Text variant="headlineLarge" style={styles.title}>Skapa konto</Text>

        <View style={styles.form}>
          <TextInput label="E-postadress" value={email} onChangeText={setEmail}
            autoCapitalize="none" keyboardType="email-address" mode="outlined"
            left={<TextInput.Icon icon="email-outline" />} />
          <TextInput label="Lösenord" value={password} onChangeText={setPassword}
            secureTextEntry mode="outlined" left={<TextInput.Icon icon="lock-outline" />} />
          <TextInput label="Bekräfta lösenord" value={confirmPassword} onChangeText={setConfirmPassword}
            secureTextEntry mode="outlined" left={<TextInput.Icon icon="lock-check-outline" />} />

          {error ? <HelperText type="error" visible>{error}</HelperText> : null}

          <Button mode="contained" onPress={handleRegister} loading={loading} disabled={loading}
            style={styles.button} contentStyle={styles.buttonContent}>
            Skapa konto
          </Button>
          <Button mode="text" onPress={() => router.back()}>Har redan konto? Logga in</Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { color: '#ffffff', fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  form: { gap: 12 },
  button: { marginTop: 8, borderRadius: 12, backgroundColor: '#e8622c' },
  buttonContent: { paddingVertical: 6 },
  successTitle: { color: '#ffffff', fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  successText: { color: '#a0a0b0', textAlign: 'center', marginBottom: 24 },
});
