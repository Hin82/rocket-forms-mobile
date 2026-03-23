import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text, Button, ActivityIndicator, TextInput, Chip, IconButton, RadioButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { Stack } from 'expo-router';
import { format } from 'date-fns';
import { sv, nb, da, fi, de, fr, es, enUS } from 'date-fns/locale';
import { useTranslation } from '@/src/translations';

const DATE_LOCALES: Record<string, Locale> = { sv, no: nb, da, fi, de, fr, es, en: enUS };

// Match web app provider types exactly
type ProviderType = 'brevo' | 'smtp' | 'microsoft365' | 'google';
type Encryption = 'tls' | 'ssl' | 'none';

interface EmailConfig {
  id: string;
  provider_type: ProviderType;
  from_email: string;
  from_name: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_encryption: string | null;
  is_active: boolean;
  is_verified: boolean;
  last_test_at: string | null;
  last_test_success: boolean | null;
  created_at: string;
}

interface RecentEmail {
  id: string;
  to_email: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending' | 'processing';
  created_at: string;
}

// Provider labels are brand names - not translated

const PROVIDER_ICONS: Record<ProviderType, string> = {
  brevo: 'email-fast-outline',
  smtp: 'server-network',
  microsoft365: 'microsoft-outlook',
  google: 'google',
};

export default function EmailSetupScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t, language } = useTranslation();
  const dateLocale = DATE_LOCALES[language] || enUS;

  const PROVIDER_LABELS: Record<ProviderType, string> = {
    brevo: 'Brevo',
    smtp: 'Custom SMTP',
    microsoft365: 'Microsoft 365',
    google: 'Google / Gmail',
  };

  const [showAdd, setShowAdd] = useState(false);
  const [provider, setProvider] = useState<ProviderType>('brevo');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');

  // SMTP fields
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpEncryption, setSmtpEncryption] = useState<Encryption>('tls');

  // Microsoft 365 fields
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  // Query using exact same table structure as web app
  const { data: configs, isLoading, error } = useQuery({
    queryKey: ['email-configs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_configurations')
        .select('id, provider_type, from_email, from_name, smtp_host, smtp_port, smtp_encryption, is_active, is_verified, last_test_at, last_test_success, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EmailConfig[];
    },
    enabled: !!user,
  });

  const { data: recentEmails } = useQuery({
    queryKey: ['recent-emails', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('id, to_email, subject, status, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as RecentEmail[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Validate provider-specific fields
      const req = (label: string) => t('settings', 'fieldRequired', { field: label });
      if (provider === 'smtp' || provider === 'google') {
        if (!smtpHost.trim()) throw new Error(req(t('settings', 'smtpHost')));
        const port = parseInt(smtpPort);
        if (isNaN(port) || port < 1 || port > 65535) throw new Error(t('settings', 'invalidPort'));
        if (!smtpUsername.trim()) throw new Error(req(t('settings', 'username')));
        if (!smtpPassword.trim()) throw new Error(req(t('settings', 'smtpPassword')));
      } else if (provider === 'microsoft365') {
        if (!tenantId.trim()) throw new Error(req(t('settings', 'tenantId')));
        if (!clientId.trim()) throw new Error(req(t('settings', 'clientId')));
        if (!clientSecret.trim()) throw new Error(req(t('settings', 'clientSecret')));
      }

      const normalizedEmail = fromEmail.trim().toLowerCase();

      const insertData: Record<string, any> = {
        user_id: user!.id,
        provider_type: provider,
        from_email: normalizedEmail,
        from_name: fromName || null,
        is_active: true,
      };

      if (provider === 'smtp' || provider === 'google') {
        insertData.smtp_host = smtpHost.trim();
        insertData.smtp_port = parseInt(smtpPort);
        insertData.smtp_username = smtpUsername.trim();
        insertData.smtp_password_encrypted = smtpPassword;
        insertData.smtp_encryption = smtpEncryption;
      } else if (provider === 'microsoft365') {
        insertData.oauth_tenant_id = tenantId.trim();
        insertData.oauth_client_id = clientId.trim();
        insertData.oauth_client_secret_encrypted = clientSecret;
        insertData.graph_user_principal_name = normalizedEmail;
      }

      const { error } = await supabase.from('email_configurations').insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-configs'] });
      resetForm();
      Alert.alert(t('settings', 'configSaved'), t('settings', 'emailConfigAdded'));
    },
    onError: (err: Error) => {
      Alert.alert(t('settings', 'error'), err.message || t('settings', 'couldNotSaveConfig'));
    },
  });

  const testMutation = useMutation({
    mutationFn: async (configId: string) => {
      const { data, error } = await supabase.functions.invoke('test-email', { body: { config_id: configId } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-configs'] });
      queryClient.invalidateQueries({ queryKey: ['recent-emails'] });
      Alert.alert(t('settings', 'testSent'), t('settings', 'testEmailSent'));
    },
    onError: (err: Error) => Alert.alert(t('settings', 'testFailed'), err.message || t('settings', 'couldNotSendTest2')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (configId: string) => {
      const { error } = await supabase.from('email_configurations').delete().eq('id', configId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email-configs'] }),
  });

  const handleDelete = (config: EmailConfig) => {
    Alert.alert(
      t('settings', 'removeConfigTitle'),
      t('settings', 'removeConfigConfirm', { provider: PROVIDER_LABELS[config.provider_type], email: config.from_email }),
      [
        { text: t('settings', 'cancel'), style: 'cancel' },
        { text: t('settings', 'remove'), style: 'destructive', onPress: () => deleteMutation.mutate(config.id) },
      ],
    );
  };

  const resetForm = () => {
    setShowAdd(false); setProvider('brevo'); setFromEmail(''); setFromName('');
    setSmtpHost(''); setSmtpPort('587'); setSmtpUsername(''); setSmtpPassword('');
    setSmtpEncryption('tls'); setTenantId(''); setClientId(''); setClientSecret('');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: t('settings', 'emailConfig'), headerBackTitle: t('auth', 'back'), headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e8622c" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: t('settings', 'emailConfig'), headerBackTitle: t('auth', 'back'), headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{t('settings', 'couldNotLoadEmailConfigs')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: t('settings', 'emailConfig'), headerBackTitle: t('auth', 'back'), headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Existing configurations */}
        {configs && configs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('settings', 'configurations')}</Text>
            {configs.map((config) => (
              <View key={config.id} style={styles.configCard}>
                <View style={styles.configHeader}>
                  <View style={styles.configInfo}>
                    <View style={styles.providerRow}>
                      <MaterialCommunityIcons
                        name={PROVIDER_ICONS[config.provider_type] as any || 'email-outline'}
                        size={20}
                        color="#e8622c"
                      />
                      <Text style={styles.configProvider}>{PROVIDER_LABELS[config.provider_type] || config.provider_type}</Text>
                    </View>
                    <Text style={styles.configEmail}>{config.from_email}</Text>
                    {config.from_name && <Text style={styles.configName}>{config.from_name}</Text>}
                    {config.smtp_host && (
                      <Text style={styles.configDetail}>{config.smtp_host}:{config.smtp_port} ({config.smtp_encryption?.toUpperCase()})</Text>
                    )}
                  </View>
                  <View style={styles.configBadges}>
                    <Chip
                      style={[styles.statusChip, { backgroundColor: config.is_active ? '#16432a' : '#442020' }]}
                      textStyle={{ color: config.is_active ? '#22c55e' : '#ef4444', fontSize: 11 }}
                    >
                      {config.is_active ? t('settings', 'active') : t('settings', 'inactive')}
                    </Chip>
                    {config.is_verified && (
                      <MaterialCommunityIcons name="check-decagram" size={18} color="#22c55e" style={{ marginTop: 4 }} />
                    )}
                  </View>
                </View>
                {config.last_test_at && (
                  <Text style={styles.lastTest}>
                    {config.last_test_success ? '✓' : '✗'} {t('settings', 'tested')} {format(new Date(config.last_test_at), 'd MMM HH:mm', { locale: dateLocale })}
                  </Text>
                )}
                <View style={styles.configActions}>
                  <Button mode="outlined" onPress={() => testMutation.mutate(config.id)} textColor="#e8622c" style={styles.testButton} icon="email-send-outline" loading={testMutation.isPending} compact>
                    {t('settings', 'testEmail')}
                  </Button>
                  <Button mode="outlined" onPress={() => handleDelete(config)} textColor="#ef4444" style={styles.deleteConfigButton} icon="delete-outline" compact>
                    {t('settings', 'removeConfig')}
                  </Button>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Add configuration */}
        {!showAdd ? (
          <Button mode="contained" onPress={() => setShowAdd(true)} style={styles.addButton} buttonColor="#e8622c" icon="plus">
            {t('settings', 'addConfiguration')}
          </Button>
        ) : (
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>{t('settings', 'newEmailConfig')}</Text>

            {/* Provider selector - use individual chips instead of SegmentedButtons for better visibility */}
            <Text style={styles.fieldLabel}>{t('settings', 'provider')}</Text>
            <View style={styles.providerGrid}>
              {(['brevo', 'microsoft365', 'google', 'smtp'] as ProviderType[]).map((p) => (
                <Chip
                  key={p}
                  selected={provider === p}
                  onPress={() => setProvider(p)}
                  icon={PROVIDER_ICONS[p]}
                  style={[styles.providerChip, provider === p && styles.providerChipActive]}
                  textStyle={[styles.providerChipText, provider === p && styles.providerChipTextActive]}
                  showSelectedOverlay={false}
                >
                  {PROVIDER_LABELS[p]}
                </Chip>
              ))}
            </View>

            {/* Provider-specific fields */}
            {provider === 'brevo' && (
              <View style={styles.providerNote}>
                <MaterialCommunityIcons name="information-outline" size={18} color="#3b82f6" />
                <Text style={styles.providerNoteText}>{t('settings', 'brevoNote')}</Text>
              </View>
            )}

            {(provider === 'smtp' || provider === 'google') && (
              <>
                <TextInput label={t('settings', 'smtpHost')} value={smtpHost} onChangeText={setSmtpHost}
                  placeholder={provider === 'google' ? 'smtp.gmail.com' : 'smtp.example.com'}
                  style={styles.input} textColor="#fff" theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }} />
                <TextInput label={t('settings', 'port')} value={smtpPort} onChangeText={setSmtpPort}
                  keyboardType="numeric" style={styles.input} textColor="#fff" theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }} />
                <TextInput label={t('settings', 'username')} value={smtpUsername} onChangeText={setSmtpUsername}
                  style={styles.input} textColor="#fff" autoCapitalize="none" theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }} />
                <TextInput label={t('settings', 'smtpPassword')} value={smtpPassword} onChangeText={setSmtpPassword}
                  secureTextEntry style={styles.input} textColor="#fff" theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }} />
                <Text style={styles.fieldLabel}>{t('settings', 'encryption')}</Text>
                <RadioButton.Group onValueChange={(v) => setSmtpEncryption(v as Encryption)} value={smtpEncryption}>
                  <View style={styles.radioRow}>
                    <View style={styles.radioOption}><RadioButton value="tls" color="#e8622c" uncheckedColor="#666" /><Text style={styles.radioLabel}>TLS</Text></View>
                    <View style={styles.radioOption}><RadioButton value="ssl" color="#e8622c" uncheckedColor="#666" /><Text style={styles.radioLabel}>SSL</Text></View>
                    <View style={styles.radioOption}><RadioButton value="none" color="#e8622c" uncheckedColor="#666" /><Text style={styles.radioLabel}>{t('settings', 'none')}</Text></View>
                  </View>
                </RadioButton.Group>
              </>
            )}

            {provider === 'microsoft365' && (
              <>
                <TextInput label={t('settings', 'tenantId')} value={tenantId} onChangeText={setTenantId}
                  style={styles.input} textColor="#fff" autoCapitalize="none" theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }} />
                <TextInput label={t('settings', 'clientId')} value={clientId} onChangeText={setClientId}
                  style={styles.input} textColor="#fff" autoCapitalize="none" theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }} />
                <TextInput label={t('settings', 'clientSecret')} value={clientSecret} onChangeText={setClientSecret}
                  secureTextEntry style={styles.input} textColor="#fff" theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }} />
              </>
            )}

            {/* Common fields */}
            <TextInput label={t('settings', 'fromEmail')} value={fromEmail} onChangeText={setFromEmail}
              placeholder={t('settings', 'fromEmailPlaceholder')} keyboardType="email-address" autoCapitalize="none"
              style={styles.input} textColor="#fff" theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }} />
            <TextInput label={t('settings', 'fromName')} value={fromName} onChangeText={setFromName}
              placeholder={t('settings', 'fromNamePlaceholder')}
              style={styles.input} textColor="#fff" theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }} />

            <View style={styles.addActions}>
              <Button mode="outlined" onPress={resetForm} textColor="#888" style={styles.cancelButton}>
                {t('settings', 'cancel')}
              </Button>
              <Button mode="contained" onPress={() => {
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail.trim())) {
                    Alert.alert(t('settings', 'error'), t('settings', 'invalidEmail'));
                    return;
                  }
                  createMutation.mutate();
                }} loading={createMutation.isPending}
                disabled={!fromEmail.trim() || createMutation.isPending} buttonColor="#e8622c" style={styles.submitButton}>
                {t('settings', 'save')}
              </Button>
            </View>
          </View>
        )}

        {/* Recent emails */}
        {recentEmails && recentEmails.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('settings', 'recentEmails')}</Text>
            {recentEmails.map((email) => (
              <View key={email.id} style={styles.emailRow}>
                <MaterialCommunityIcons
                  name={email.status === 'sent' ? 'check-circle' : email.status === 'failed' ? 'close-circle' : 'clock-outline'}
                  size={18}
                  color={email.status === 'sent' ? '#22c55e' : email.status === 'failed' ? '#ef4444' : '#f59e0b'}
                />
                <View style={styles.emailInfo}>
                  <Text style={styles.emailTo} numberOfLines={1}>{email.to_email}</Text>
                  <Text style={styles.emailSubject} numberOfLines={1}>{email.subject}</Text>
                </View>
                <Text style={styles.emailDate}>
                  {format(new Date(email.created_at), 'd MMM', { locale: dateLocale })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Empty state */}
        {(!configs || configs.length === 0) && !showAdd && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="email-outline" size={64} color="#2d2d44" />
            <Text style={styles.emptyTitle}>{t('settings', 'noEmailConfig')}</Text>
            <Text style={styles.emptyDesc}>{t('settings', 'configureEmail')}</Text>
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
  section: { marginBottom: 24 },
  sectionLabel: { color: '#888', fontSize: 13, marginBottom: 8 },
  configCard: { backgroundColor: '#1e1e2e', borderRadius: 16, padding: 16, marginBottom: 8 },
  configHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  configInfo: { flex: 1 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  configProvider: { color: '#fff', fontSize: 16, fontWeight: '600' },
  configEmail: { color: '#e8622c', fontSize: 14, marginTop: 2 },
  configName: { color: '#888', fontSize: 13, marginTop: 2 },
  configDetail: { color: '#666', fontSize: 12, marginTop: 4, fontFamily: 'monospace' },
  configBadges: { alignItems: 'flex-end' },
  statusChip: { borderRadius: 8 },
  lastTest: { color: '#666', fontSize: 12, marginBottom: 8 },
  configActions: { flexDirection: 'row', gap: 8 },
  testButton: { borderColor: '#e8622c', borderRadius: 8, flex: 1 },
  deleteConfigButton: { borderColor: '#ef4444', borderRadius: 8, flex: 1 },
  addButton: { borderRadius: 12, marginBottom: 24 },
  addCard: { backgroundColor: '#1e1e2e', borderRadius: 16, padding: 16, marginBottom: 24 },
  addTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  fieldLabel: { color: '#888', fontSize: 13, marginBottom: 8, marginTop: 4 },
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  providerChip: { backgroundColor: '#2d2d44' },
  providerChipActive: { backgroundColor: '#e8622c' },
  providerChipText: { color: '#ccc' },
  providerChipTextActive: { color: '#fff' },
  providerNote: { flexDirection: 'row', gap: 8, backgroundColor: '#1a2744', borderRadius: 8, padding: 12, marginBottom: 12, alignItems: 'center' },
  providerNoteText: { color: '#7db8f0', fontSize: 13, flex: 1 },
  input: { backgroundColor: '#2d2d44', marginBottom: 12, borderRadius: 8 },
  radioRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  radioOption: { flexDirection: 'row', alignItems: 'center' },
  radioLabel: { color: '#ddd', fontSize: 14 },
  addActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  cancelButton: { borderColor: '#2d2d44', borderRadius: 8 },
  submitButton: { borderRadius: 8 },
  emailRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e2e', borderRadius: 12, padding: 12, marginBottom: 6, gap: 10 },
  emailInfo: { flex: 1 },
  emailTo: { color: '#fff', fontSize: 13 },
  emailSubject: { color: '#888', fontSize: 12 },
  emailDate: { color: '#666', fontSize: 11 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { color: '#888', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptyDesc: { color: '#666', fontSize: 14, marginTop: 8, textAlign: 'center' },
});
