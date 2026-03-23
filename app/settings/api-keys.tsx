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
import { sv, nb, da, fi, de, fr, es, enUS } from 'date-fns/locale';
import { useTranslation } from '@/src/translations';

const DATE_LOCALES: Record<string, Locale> = { sv, no: nb, da, fi, de, fr, es, en: enUS };

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
    throw new Error('Secure random number generator not available. Cannot generate API keys.');
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
  const { t, language } = useTranslation();
  const dateLocale = DATE_LOCALES[language] || enUS;

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
      const prefix = rawKey.substring(0, 12);
      const hash = await sha256(rawKey);

      const { error } = await supabase.from('wp_api_keys').insert({
        user_id: user!.id,
        key_hash: hash,
        key_prefix: prefix,
        name: name || 'WordPress Plugin',
        is_active: true,
      });
      if (error) throw error;
      return rawKey;
    },
    onSuccess: async (rawKey) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setKeyName('');
      setShowCreate(false);

      Alert.alert(
        t('settings', 'apiKeyCreated'),
        `${t('settings', 'keyShownOnce')}:\n\n${rawKey}`,
        [{ text: t('settings', 'copyAndClose'), onPress: () => Clipboard.setStringAsync(rawKey) }],
      );
    },
    onError: (err: Error) => {
      Alert.alert(t('settings', 'error'), err.message || t('settings', 'couldNotCreateKey'));
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
      Alert.alert(t('settings', 'error'), err.message || t('settings', 'couldNotRevokeKey'));
    },
  });

  const handleRevoke = (key: ApiKey) => {
    Alert.alert(
      t('settings', 'revokeKey'),
      t('settings', 'revokeKeyConfirm', { prefix: key.key_prefix }),
      [
        { text: t('settings', 'cancel'), style: 'cancel' },
        { text: t('settings', 'revoke'), style: 'destructive', onPress: () => revokeMutation.mutate(key.id) },
      ],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: t('settings', 'apiKeys'), headerBackTitle: t('auth', 'back'), headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e8622c" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: t('settings', 'apiKeys'), headerBackTitle: t('auth', 'back'), headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{t('settings', 'couldNotLoadApiKeys')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: t('settings', 'apiKeys'), headerBackTitle: t('auth', 'back'), headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.infoText}>{t('settings', 'apiKeysInfo')}</Text>

        {!showCreate ? (
          <Button
            mode="contained"
            onPress={() => setShowCreate(true)}
            style={styles.createButton}
            buttonColor="#e8622c"
            icon="plus"
          >
            {t('settings', 'generateNewKey')}
          </Button>
        ) : (
          <View style={styles.createCard}>
            <Text style={styles.createTitle}>{t('settings', 'newApiKey')}</Text>
            <TextInput
              label={t('settings', 'nameOptional')}
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
                {t('settings', 'cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={() => createMutation.mutate(keyName.trim())}
                loading={createMutation.isPending}
                disabled={createMutation.isPending}
                buttonColor="#e8622c"
                style={styles.generateButton}
              >
                {t('settings', 'generate')}
              </Button>
            </View>
          </View>
        )}

        {(!keys || keys.length === 0) ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="key-outline" size={64} color="#2d2d44" />
            <Text style={styles.emptyTitle}>{t('settings', 'noApiKeys')}</Text>
            <Text style={styles.emptyDesc}>{t('settings', 'createFirstKey')}</Text>
          </View>
        ) : (
          <View style={styles.keysList}>
            <Text style={styles.sectionLabel}>{t('settings', 'yourKeys')}</Text>
            {keys.map((key) => (
              <View key={key.id} style={styles.keyCard}>
                <View style={styles.keyHeader}>
                  <View style={styles.keyInfo}>
                    <Text style={styles.keyPrefix}>{key.key_prefix}…</Text>
                    {key.name && <Text style={styles.keyName}>{key.name}</Text>}
                  </View>
                  <Chip
                    style={[styles.statusChip, { backgroundColor: key.is_active ? '#16432a' : '#442020' }]}
                    textStyle={{ color: key.is_active ? '#22c55e' : '#ef4444', fontSize: 11 }}
                  >
                    {key.is_active ? t('settings', 'active') : t('settings', 'revoked')}
                  </Chip>
                </View>

                <View style={styles.keyMeta}>
                  <Text style={styles.keyMetaText}>
                    {t('settings', 'created')}: {format(new Date(key.created_at), 'd MMM yyyy', { locale: dateLocale })}
                  </Text>
                  <Text style={styles.keyMetaText}>
                    {t('settings', 'lastUsed')}:{' '}
                    {key.last_used_at
                      ? format(new Date(key.last_used_at), 'd MMM yyyy', { locale: dateLocale })
                      : t('settings', 'never')}
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
                    {t('settings', 'revoke')}
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
  createCard: { backgroundColor: '#1e1e2e', borderRadius: 16, padding: 16, marginBottom: 24 },
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
  keyCard: { backgroundColor: '#1e1e2e', borderRadius: 16, padding: 16 },
  keyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  keyInfo: { flex: 1 },
  keyPrefix: { color: '#fff', fontSize: 15, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  keyName: { color: '#aaa', fontSize: 13, marginTop: 2 },
  statusChip: { borderRadius: 8 },
  keyMeta: { gap: 2, marginBottom: 8 },
  keyMetaText: { color: '#666', fontSize: 12 },
  revokeButton: { borderColor: '#ef4444', borderRadius: 8, alignSelf: 'flex-start' },
});
