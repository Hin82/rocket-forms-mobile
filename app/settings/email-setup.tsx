import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text, Button, ActivityIndicator, TextInput, Chip, SegmentedButtons, IconButton, RadioButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { Stack } from 'expo-router';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import { useTranslation } from '@/src/translations';

type Provider = 'brevo' | 'smtp' | 'o365';
type Encryption = 'tls' | 'ssl' | 'none';

interface EmailConfig {
  id: string;
  provider: Provider;
  from_email: string;
  from_name: string;
  is_active: boolean;
  created_at: string;
  config: Record<string, string>;
}

interface RecentEmail {
  id: string;
  to_email: string;
  subject: string;
  status: 'sent' | 'failed';
  created_at: string;
}

const PROVIDER_LABELS: Record<Provider, string> = {
  brevo: 'Brevo',
  smtp: 'Custom SMTP',
  o365: 'Microsoft 365',
};

export default function EmailSetupScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t, language } = useTranslation();
  const dateLocale = language === 'sv' ? sv : enUS;

  const [showAdd, setShowAdd] = useState(false);
  const [provider, setProvider] = useState<Provider>('brevo');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');

  const [brevoApiKey, setBrevoApiKey] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpEncryption, setSmtpEncryption] = useState<Encryption>('tls');
  const [o365TenantId, setO365TenantId] = useState('');
  const [o365ClientId, setO365ClientId] = useState('');

  const { data: configs, isLoading, error } = useQuery({
    queryKey: ['email-configs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_configurations')
        .select('*')
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
      let config: Record<string, string> = {};
      if (provider === 'brevo') config = { api_key: brevoApiKey };
      else if (provider === 'smtp') config = { host: smtpHost, port: smtpPort, username: smtpUsername, password: smtpPassword, encryption: smtpEncryption };
      else if (provider === 'o365') config = { tenant_id: o365TenantId, client_id: o365ClientId };

      const { error } = await supabase.from('email_configurations').insert({
        user_id: user!.id, provider, from_email: fromEmail, from_name: fromName, config, is_active: true,
      });
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
      Alert.alert(t('settings', 'testSent'), t('settings', 'testEmailSent'));
    },
    onError: (err: Error) => {
      Alert.alert(t('settings', 'testFailed'), err.message || t('settings', 'couldNotSendTest2'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (configId: string) => {
      const { error } = await supabase.from('email_configurations').delete().eq('id', configId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-configs'] });
    },
  });

  const handleDelete = (config: EmailConfig) => {
    Alert.alert(
      t('settings', 'removeConfigTitle'),
      t('settings', 'removeConfigConfirm', { provider: PROVIDER_LABELS[config.provider], email: config.from_email }),
      [
        { text: t('settings', 'cancel'), style: 'cancel' },
        { text: t('settings', 'remove'), style: 'destructive', onPress: () => deleteMutation.mutate(config.id) },
      ],
    );
  };

  const resetForm = () => {
    setShowAdd(false); setProvider('brevo'); setFromEmail(''); setFromName('');
    setBrevoApiKey(''); setSmtpHost(''); setSmtpPort('587'); setSmtpUsername('');
    setSmtpPassword(''); setSmtpEncryption('tls'); setO365TenantId(''); setO365ClientId('');
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
        {configs && configs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('settings', 'configurations')}</Text>
            {configs.map((config) => (
              <View key={config.id} style={styles.configCard}>
                <View style={styles.configHeader}>
                  <View style={styles.configInfo}>
                    <Text style={styles.configProvider}>{PROVIDER_LABELS[config.provider]}</Text>
                    <Text style={styles.configEmail}>{config.from_email}</Text>
                    {config.from_name && <Text style={styles.configName}>{config.from_name}</Text>}
                  </View>
                  <Chip
                    style={[styles.statusChip, { backgroundColor: config.is_active ? '#16432a' : '#442020' }]}
                    textStyle={{ color: config.is_active ? '#22c55e' : '#ef4444', fontSize: 11 }}
                  >
                    {config.is_active ? t('settings', 'active') : t('settings', 'inactive')}
                  </Chip>
                </View>
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

        {!showAdd ? (
          <Button mode="contained" onPress={() => setShowAdd(true)} style={styles.addButton} buttonColor="#e8622c" icon="plus">
            {t('settings', 'addConfiguration')}
          </Button>
        ) : (
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>{t('settings', 'newEmailConfig')}</Text>

            <Text style={styles.fieldLabel}>{t('settings', 'provider')}</Text>
            <SegmentedButtons
              value={provider}
              onValueChange={(v) => setProvider(v as Provider)}
              buttons={[
                { value: 'brevo', label: 'Brevo' },
                { value: 'smtp', label: 'SMTP' },
                { value: 'o365', label: 'O365' },
              ]}
              style={styles.segmented}
              theme={{ colors: { secondaryContainer: '#e8622c', onSecondaryContainer: '#fff' } }}
            />

            {provider === 'brevo' && (
              <TextInput label={t('settings', 'brevoApiKey')} value={brevoApiKey} onChangeText={setBrevoApiKey}
                style={styles.input} textColor="#fff" secureTextEntry theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }} />
            )}

            {provider === 'smtp' && (
              <>
                <TextInput label={t('settings', 'smtpHost')} value={smtpHost} onChangeText={setSmtpHost}
                  placeholder="smtp.example.com" style={styles.input} textColor="#fff" theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }} />
                <TextInput label={t('settings', 'port')} value={smtpPort} onChangeText={setSmtpPort}
                  keyboardType="numeric" style={styles.input} textColor="#fff" theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }} />
                <TextInput label={t('settings', 'username')} value={smtpUsername} onChangeText={setSmtpUsername}
                  style={styles.input} textColor="#fff" autoCapitalize="none" theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }} />
                <TextInput label={t('settings', 'smtpPassword')} value={smtpPassword} onChangeText={setSmtpPassword}
                  secureTextEntry style={styles.input} textColor="#fff" theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }} />
                <Text style={styles.fieldLabel}>{t('settings', 'encryption')}</Text>
                <RadioButton.Group onValueChange={(v) => setSmtpEncryption(v as Encryption)} value={smtpEncryption}>
                  <View style={styles.radioRow}>
                    <View style={styles.radioOption}>
                      <RadioButton value="tls" color="#e8622c" uncheckedColor="#666" />
                      <Text style={styles.radioLabel}>TLS</Text>
                    </View>
                    <View style={styles.radioOption}>
                      <RadioButton value="ssl" color="#e8622c" uncheckedColor="#666" />
                      <Text style={styles.radioLabel}>SSL</Text>
                    </View>
                    <View style={styles.radioOption}>
                      <RadioButton value="none" color="#e8622c" uncheckedColor="#666" />
                      <Text style={styles.radioLabel}>{t('settings', 'none')}</Text>
                    </View>
                  </View>
                </RadioButton.Group>
              </>
            )}

            {provider === 'o365' && (
              <>
                <TextInput label="Tenant ID" value={o365TenantId} onChangeText={setO365TenantId}
                  style={styles.input} textColor="#fff" autoCapitalize="none" theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }} />
                <TextInput label="Client ID" value={o365ClientId} onChangeText={setO365ClientId}
                  style={styles.input} textColor="#fff" autoCapitalize="none" theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }} />
              </>
            )}

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
              <Button mode="contained" onPress={() => createMutation.mutate()} loading={createMutation.isPending}
                disabled={!fromEmail.trim() || createMutation.isPending} buttonColor="#e8622c" style={styles.submitButton}>
                {t('settings', 'save')}
              </Button>
            </View>
          </View>
        )}

        {recentEmails && recentEmails.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('settings', 'recentEmails')}</Text>
            {recentEmails.map((email) => (
              <View key={email.id} style={styles.emailRow}>
                <MaterialCommunityIcons
                  name={email.status === 'sent' ? 'check-circle' : 'close-circle'}
                  size={18}
                  color={email.status === 'sent' ? '#22c55e' : '#ef4444'}
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
  configHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  configInfo: { flex: 1 },
  configProvider: { color: '#fff', fontSize: 16, fontWeight: '600' },
  configEmail: { color: '#e8622c', fontSize: 14, marginTop: 2 },
  configName: { color: '#888', fontSize: 13, marginTop: 2 },
  statusChip: { borderRadius: 8 },
  configActions: { flexDirection: 'row', gap: 8 },
  testButton: { borderColor: '#e8622c', borderRadius: 8, flex: 1 },
  deleteConfigButton: { borderColor: '#ef4444', borderRadius: 8, flex: 1 },
  addButton: { borderRadius: 12, marginBottom: 24 },
  addCard: { backgroundColor: '#1e1e2e', borderRadius: 16, padding: 16, marginBottom: 24 },
  addTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  fieldLabel: { color: '#888', fontSize: 13, marginBottom: 8, marginTop: 4 },
  segmented: { marginBottom: 16 },
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
