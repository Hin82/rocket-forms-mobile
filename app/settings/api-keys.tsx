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
import { sv, nb, da, fi, de, fr, es, enUS, type Locale } from 'date-fns/locale';
import { useTranslation } from '@/src/translations';
import { useAppTheme } from '@/src/contexts/ThemeContext';

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
  const { colors } = useAppTheme();
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
        name: name || t('settings', 'defaultApiKeyName'),
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <Stack.Screen options={{ title: t('settings', 'apiKeys'), headerBackTitle: t('auth', 'back'), headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <Stack.Screen options={{ title: t('settings', 'apiKeys'), headerBackTitle: t('auth', 'back'), headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={[styles.errorText, { color: colors.error }]}>{t('settings', 'couldNotLoadApiKeys')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: t('settings', 'apiKeys'), headerBackTitle: t('auth', 'back'), headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>{t('settings', 'apiKeysInfo')}</Text>

        {!showCreate ? (
          <Button
            mode="contained"
            onPress={() => setShowCreate(true)}
            style={styles.createButton}
            buttonColor={colors.accent}
            icon="plus"
          >
            {t('settings', 'generateNewKey')}
          </Button>
        ) : (
          <View style={[styles.createCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.createTitle, { color: colors.text }]}>{t('settings', 'newApiKey')}</Text>
            <TextInput
              label={t('settings', 'nameOptional')}
              value={keyName}
              onChangeText={setKeyName}
              style={[styles.input, { backgroundColor: colors.surfaceSecondary }]}
              textColor={colors.text}
              placeholderTextColor={colors.textTertiary}
              theme={{ colors: { primary: colors.accent, onSurfaceVariant: colors.textSecondary } }}
            />
            <View style={styles.createActions}>
              <Button
                mode="outlined"
                onPress={() => { setShowCreate(false); setKeyName(''); }}
                textColor={colors.textSecondary}
                style={[styles.cancelButton, { borderColor: colors.border }]}
              >
                {t('settings', 'cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={() => createMutation.mutate(keyName.trim())}
                loading={createMutation.isPending}
                disabled={createMutation.isPending}
                buttonColor={colors.accent}
                style={styles.generateButton}
              >
                {t('settings', 'generate')}
              </Button>
            </View>
          </View>
        )}

        {(!keys || keys.length === 0) ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="key-outline" size={64} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>{t('settings', 'noApiKeys')}</Text>
            <Text style={[styles.emptyDesc, { color: colors.textTertiary }]}>{t('settings', 'createFirstKey')}</Text>
          </View>
        ) : (
          <View style={styles.keysList}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('settings', 'yourKeys')}</Text>
            {keys.map((key) => (
              <View key={key.id} style={[styles.keyCard, { backgroundColor: colors.surface }]}>
                <View style={styles.keyHeader}>
                  <View style={styles.keyInfo}>
                    <Text style={[styles.keyPrefix, { color: colors.text }]}>{key.key_prefix}…</Text>
                    {key.name && <Text style={[styles.keyName, { color: colors.textSecondary }]}>{key.name}</Text>}
                  </View>
                  <Chip
                    style={[styles.statusChip, { backgroundColor: key.is_active ? '#16432a' : '#442020' }]}
                    textStyle={{ color: key.is_active ? '#22c55e' : '#ef4444', fontSize: 11 }}
                  >
                    {key.is_active ? t('settings', 'active') : t('settings', 'revoked')}
                  </Chip>
                </View>

                <View style={styles.keyMeta}>
                  <Text style={[styles.keyMetaText, { color: colors.textTertiary }]}>
                    {t('settings', 'created')}: {format(new Date(key.created_at), 'd MMM yyyy', { locale: dateLocale })}
                  </Text>
                  <Text style={[styles.keyMetaText, { color: colors.textTertiary }]}>
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
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { marginTop: 12, fontSize: 16 },
  infoText: { fontSize: 13, marginBottom: 16, lineHeight: 20 },
  createButton: { borderRadius: 12, marginBottom: 24 },
  createCard: { borderRadius: 16, padding: 16, marginBottom: 24 },
  createTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  input: { marginBottom: 12, borderRadius: 8 },
  createActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  cancelButton: { borderRadius: 8 },
  generateButton: { borderRadius: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptyDesc: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  keysList: { gap: 12 },
  sectionLabel: { fontSize: 13, marginBottom: 4 },
  keyCard: { borderRadius: 16, padding: 16 },
  keyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  keyInfo: { flex: 1 },
  keyPrefix: { fontSize: 15, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  keyName: { fontSize: 13, marginTop: 2 },
  statusChip: { borderRadius: 8 },
  keyMeta: { gap: 2, marginBottom: 8 },
  keyMetaText: { fontSize: 12 },
  revokeButton: { borderColor: '#ef4444', borderRadius: 8, alignSelf: 'flex-start' },
});
