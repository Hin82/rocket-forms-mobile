import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, Button, ActivityIndicator, TextInput, Chip, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { Stack } from 'expo-router';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string | null;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);

  if (typeof globalThis.crypto?.subtle?.digest === 'function') {
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback: use expo-crypto if available
  try {
    const ExpoCrypto = require('expo-crypto');
    return await ExpoCrypto.digestStringAsync(ExpoCrypto.CryptoDigestAlgorithm.SHA256, message);
  } catch {
    throw new Error('No crypto implementation available');
  }
}

function generateRandomHex(bytes: number): string {
  const array = new Uint8Array(bytes);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < bytes; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function ApiKeysScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [keyName, setKeyName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: keys, isLoading, error } = useQuery({
    queryKey: ['api-keys', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wp_api_keys')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ApiKey[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const rawKey = 'rfp_' + generateRandomHex(32);
      const prefix = rawKey.substring(0, 8);
      const hash = await sha256(rawKey);

      const { error } = await supabase.from('wp_api_keys').insert({
        user_id: user!.id,
        key_hash: hash,
        key_prefix: prefix,
        name: name || null,
        is_active: true,
      });
      if (error) throw error;
      return rawKey;
    },
    onSuccess: async (rawKey) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setKeyName('');
      setShowCreate(false);

      // Show the key once
      Alert.alert(
        'API-nyckel skapad',
        `Din nyckel (visas bara en g\u00e5ng):\n\n${rawKey}`,
        [
          {
            text: 'Kopiera & st\u00e4ng',
            onPress: () => Clipboard.setStringAsync(rawKey),
          },
        ],
      );
    },
    onError: (err: Error) => {
      Alert.alert('Fel', err.message || 'Kunde inte skapa nyckel');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await supabase
        .from('wp_api_keys')
        .update({ is_active: false })
        .eq('id', keyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err: Error) => {
      Alert.alert('Fel', err.message || 'Kunde inte revokera nyckel');
    },
  });

  const handleRevoke = (key: ApiKey) => {
    Alert.alert(
      'Revokera nyckel',
      `\u00c4r du s\u00e4ker p\u00e5 att du vill revokera nyckeln "${key.key_prefix}..."? Detta kan inte \u00e5ngras.`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Revokera',
          style: 'destructive',
          onPress: () => revokeMutation.mutate(key.id),
        },
      ],
    );
  };

  const handleCreate = () => {
    createMutation.mutate(keyName.trim());
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'API-nycklar', headerBackTitle: 'Tillbaka', headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e8622c" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'API-nycklar', headerBackTitle: 'Tillbaka', headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Kunde inte h\u00e4mta API-nycklar</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'API-nycklar', headerBackTitle: 'Tillbaka', headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.infoText}>
          API-nycklar anv\u00e4nds f\u00f6r att integrera Rocket Forms Pro med externa tj\u00e4nster och WordPress.
        </Text>

        {/* Create new key */}
        {!showCreate ? (
          <Button
            mode="contained"
            onPress={() => setShowCreate(true)}
            style={styles.createButton}
            buttonColor="#e8622c"
            icon="plus"
          >
            Generera ny nyckel
          </Button>
        ) : (
          <View style={styles.createCard}>
            <Text style={styles.createTitle}>Ny API-nyckel</Text>
            <TextInput
              label="Namn (valfritt)"
              value={keyName}
              onChangeText={setKeyName}
              style={styles.input}
              textColor="#fff"
              placeholderTextColor="#666"
              theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }}
            />
            <View style={styles.createActions}>
              <Button
                mode="outlined"
                onPress={() => { setShowCreate(false); setKeyName(''); }}
                textColor="#888"
                style={styles.cancelButton}
              >
                Avbryt
              </Button>
              <Button
                mode="contained"
                onPress={handleCreate}
                loading={createMutation.isPending}
                disabled={createMutation.isPending}
                buttonColor="#e8622c"
                style={styles.generateButton}
              >
                Generera
              </Button>
            </View>
          </View>
        )}

        {/* Key list */}
        {(!keys || keys.length === 0) ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="key-outline" size={64} color="#2d2d44" />
            <Text style={styles.emptyTitle}>Inga API-nycklar</Text>
            <Text style={styles.emptyDesc}>
              Skapa din f\u00f6rsta API-nyckel f\u00f6r att komma ig\u00e5ng med integrationer.
            </Text>
          </View>
        ) : (
          <View style={styles.keysList}>
            <Text style={styles.sectionLabel}>Dina nycklar</Text>
            {keys.map((key) => (
              <View key={key.id} style={styles.keyCard}>
                <View style={styles.keyHeader}>
                  <View style={styles.keyInfo}>
                    <Text style={styles.keyPrefix}>{key.key_prefix}...****</Text>
                    {key.name && <Text style={styles.keyName}>{key.name}</Text>}
                  </View>
                  <Chip
                    style={[
                      styles.statusChip,
                      { backgroundColor: key.is_active ? '#16432a' : '#442020' },
                    ]}
                    textStyle={{
                      color: key.is_active ? '#22c55e' : '#ef4444',
                      fontSize: 11,
                    }}
                  >
                    {key.is_active ? 'Aktiv' : 'Revokerad'}
                  </Chip>
                </View>

                <View style={styles.keyMeta}>
                  <Text style={styles.keyMetaText}>
                    Skapad: {format(new Date(key.created_at), 'd MMM yyyy', { locale: sv })}
                  </Text>
                  <Text style={styles.keyMetaText}>
                    Senast anv\u00e4nd:{' '}
                    {key.last_used_at
                      ? format(new Date(key.last_used_at), 'd MMM yyyy', { locale: sv })
                      : 'Aldrig'}
                  </Text>
                </View>

                {key.is_active && (
                  <Button
                    mode="outlined"
                    onPress={() => handleRevoke(key)}
                    textColor="#ef4444"
                    style={styles.revokeButton}
                    icon="close-circle-outline"
                    loading={revokeMutation.isPending}
                  >
                    Revokera
                  </Button>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#ef4444', marginTop: 12, fontSize: 16 },
  infoText: { color: '#888', fontSize: 13, marginBottom: 16, lineHeight: 20 },
  createButton: { borderRadius: 12, marginBottom: 24 },
  createCard: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  createTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  input: { backgroundColor: '#2d2d44', marginBottom: 12, borderRadius: 8 },
  createActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  cancelButton: { borderColor: '#2d2d44', borderRadius: 8 },
  generateButton: { borderRadius: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { color: '#888', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptyDesc: { color: '#666', fontSize: 14, marginTop: 8, textAlign: 'center' },
  keysList: { gap: 12 },
  sectionLabel: { color: '#888', fontSize: 13, marginBottom: 4 },
  keyCard: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 16,
  },
  keyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  keyInfo: { flex: 1 },
  keyPrefix: { color: '#fff', fontSize: 15, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  keyName: { color: '#aaa', fontSize: 13, marginTop: 2 },
  statusChip: { borderRadius: 8 },
  keyMeta: { gap: 2, marginBottom: 8 },
  keyMetaText: { color: '#666', fontSize: 12 },
  revokeButton: { borderColor: '#ef4444', borderRadius: 8, alignSelf: 'flex-start' },
});
