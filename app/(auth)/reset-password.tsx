import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();
  const router = useRouter();

  const handleReset = async () => {
    if (!email.trim()) { setError('Ange din e-postadress'); return; }
    setLoading(true);
    setError('');
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Något gick fel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          {sent ? 'E-post skickad!' : 'Återställ lösenord'}
        </Text>
        {sent ? (
          <>
            <Text style={styles.text}>Kolla din inkorg för en återställningslänk.</Text>
            <Button mode="contained" onPress={() => router.replace('/(auth)/login')} style={styles.button}>
              Till inloggning
            </Button>
          </>
        ) : (
          <View style={styles.form}>
            <TextInput label="E-postadress" value={email} onChangeText={setEmail}
              autoCapitalize="none" keyboardType="email-address" mode="outlined" />
            {error ? <HelperText type="error" visible>{error}</HelperText> : null}
            <Button mode="contained" onPress={handleReset} loading={loading} style={styles.button}>
              Skicka återställningslänk
            </Button>
            <Button mode="text" onPress={() => router.back()}>Tillbaka</Button>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { color: '#ffffff', fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  text: { color: '#a0a0b0', textAlign: 'center', marginBottom: 24 },
  form: { gap: 12 },
  button: { marginTop: 8, borderRadius: 12, backgroundColor: '#e8622c' },
});
