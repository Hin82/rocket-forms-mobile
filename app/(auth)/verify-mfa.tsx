import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';

export default function VerifyMfaScreen() {
  const { factorId } = useLocalSearchParams<{ factorId: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { completeMfa } = useAuth();

  const handleVerify = async () => {
    if (code.length !== 6) { setError('Ange en 6-siffrig kod'); return; }
    setLoading(true);
    setError('');
    try {
      await completeMfa(factorId!, code);
    } catch (err: any) {
      setError('Felaktig kod, försök igen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>Tvåfaktorsautentisering</Text>
        <Text style={styles.text}>Ange koden från din autentiseringsapp</Text>
        <TextInput label="6-siffrig kod" value={code} onChangeText={setCode}
          keyboardType="number-pad" maxLength={6} mode="outlined" style={styles.input}
          autoFocus />
        {error ? <HelperText type="error" visible>{error}</HelperText> : null}
        <Button mode="contained" onPress={handleVerify} loading={loading} style={styles.button}>
          Verifiera
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { color: '#ffffff', fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  text: { color: '#a0a0b0', textAlign: 'center', marginBottom: 24 },
  input: { fontSize: 24, textAlign: 'center', letterSpacing: 8 },
  button: { marginTop: 16, borderRadius: 12, backgroundColor: '#e8622c' },
});
