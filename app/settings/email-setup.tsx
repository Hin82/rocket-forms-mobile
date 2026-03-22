import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text,
  Button,
  ActivityIndicator,
  TextInput,
  Chip,
  SegmentedButtons,
  IconButton,
  RadioButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { Stack } from 'expo-router';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

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

  const [showAdd, setShowAdd] = useState(false);
  const [provider, setProvider] = useState<Provider>('brevo');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');

  // Provider-specific fields
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

      if (provider === 'brevo') {
        config = { api_key: brevoApiKey };
      } else if (provider === 'smtp') {
        config = {
          host: smtpHost,
          port: smtpPort,
          username: smtpUsername,
          password: smtpPassword,
          encryption: smtpEncryption,
        };
      } else if (provider === 'o365') {
        config = { tenant_id: o365TenantId, client_id: o365ClientId };
      }

      const { error } = await supabase.from('email_configurations').insert({
        user_id: user!.id,
        provider,
        from_email: fromEmail,
        from_name: fromName,
        config,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-configs'] });
      resetForm();
      Alert.alert('Konfiguration sparad', 'E-postkonfigurationen har lagts till.');
    },
    onError: (err: Error) => {
      Alert.alert('Fel', err.message || 'Kunde inte spara konfiguration');
    },
  });

  const testMutation = useMutation({
    mutationFn: async (configId: string) => {
      const { data, error } = await supabase.functions.invoke('test-email', {
        body: { config_id: configId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      Alert.alert('Test skickat', 'Ett testmail har skickats till din e-post.');
    },
    onError: (err: Error) => {
      Alert.alert('Test misslyckades', err.message || 'Kunde inte skicka testmail');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (configId: string) => {
      const { error } = await supabase
        .from('email_configurations')
        .delete()
        .eq('id', configId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-configs'] });
    },
  });

  const handleDelete = (config: EmailConfig) => {
    Alert.alert(
      'Ta bort konfiguration',
      `\u00c4r du s\u00e4ker p\u00e5 att du vill ta bort ${PROVIDER_LABELS[config.provider]}-konfigurationen f\u00f6r ${config.from_email}?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Ta bort', style: 'destructive', onPress: () => deleteMutation.mutate(config.id) },
      ],
    );
  };

  const resetForm = () => {
    setShowAdd(false);
    setProvider('brevo');
    setFromEmail('');
    setFromName('');
    setBrevoApiKey('');
    setSmtpHost('');
    setSmtpPort('587');
    setSmtpUsername('');
    setSmtpPassword('');
    setSmtpEncryption('tls');
    setO365TenantId('');
    setO365ClientId('');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'E-postkonfiguration', headerBackTitle: 'Tillbaka', headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e8622c" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'E-postkonfiguration', headerBackTitle: 'Tillbaka', headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Kunde inte h\u00e4mta e-postkonfigurationer</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'E-postkonfiguration', headerBackTitle: 'Tillbaka', headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Existing configurations */}
        {configs && configs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Konfigurationer</Text>
            {configs.map((config) => (
              <View key={config.id} style={styles.configCard}>
                <View style={styles.configHeader}>
                  <View style={styles.configInfo}>
                    <Text style={styles.configProvider}>{PROVIDER_LABELS[config.provider]}</Text>
                    <Text style={styles.configEmail}>{config.from_email}</Text>
                    {config.from_name && (
                      <Text style={styles.configName}>{config.from_name}</Text>
                    )}
                  </View>
                  <Chip
                    style={[
                      styles.statusChip,
                      { backgroundColor: config.is_active ? '#16432a' : '#442020' },
                    ]}
                    textStyle={{ color: config.is_active ? '#22c55e' : '#ef4444', fontSize: 11 }}
                  >
                    {config.is_active ? 'Aktiv' : 'Inaktiv'}
                  </Chip>
                </View>
                <View style={styles.configActions}>
                  <Button
                    mode="outlined"
                    onPress={() => testMutation.mutate(config.id)}
                    textColor="#e8622c"
                    style={styles.testButton}
                    icon="email-send-outline"
                    loading={testMutation.isPending}
                    compact
                  >
                    Testa
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => handleDelete(config)}
                    textColor="#ef4444"
                    style={styles.deleteConfigButton}
                    icon="delete-outline"
                    compact
                  >
                    Ta bort
                  </Button>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Add configuration */}
        {!showAdd ? (
          <Button
            mode="contained"
            onPress={() => setShowAdd(true)}
            style={styles.addButton}
            buttonColor="#e8622c"
            icon="plus"
          >
            L\u00e4gg till konfiguration
          </Button>
        ) : (
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>Ny e-postkonfiguration</Text>

            {/* Provider selector */}
            <Text style={styles.fieldLabel}>Leverant\u00f6r</Text>
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

            {/* Provider-specific fields */}
            {provider === 'brevo' && (
              <TextInput
                label="Brevo API-nyckel"
                value={brevoApiKey}
                onChangeText={setBrevoApiKey}
                style={styles.input}
                textColor="#fff"
                secureTextEntry
                theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }}
              />
            )}

            {provider === 'smtp' && (
              <>
                <TextInput
                  label="SMTP-v\u00e4rd"
                  value={smtpHost}
                  onChangeText={setSmtpHost}
                  placeholder="smtp.example.com"
                  style={styles.input}
                  textColor="#fff"
                  theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }}
                />
                <TextInput
                  label="Port"
                  value={smtpPort}
                  onChangeText={setSmtpPort}
                  keyboardType="numeric"
                  style={styles.input}
                  textColor="#fff"
                  theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }}
                />
                <TextInput
                  label="Anv\u00e4ndarnamn"
                  value={smtpUsername}
                  onChangeText={setSmtpUsername}
                  style={styles.input}
                  textColor="#fff"
                  autoCapitalize="none"
                  theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }}
                />
                <TextInput
                  label="L\u00f6senord"
                  value={smtpPassword}
                  onChangeText={setSmtpPassword}
                  secureTextEntry
                  style={styles.input}
                  textColor="#fff"
                  theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }}
                />
                <Text style={styles.fieldLabel}>Kryptering</Text>
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
                      <Text style={styles.radioLabel}>Ingen</Text>
                    </View>
                  </View>
                </RadioButton.Group>
              </>
            )}

            {provider === 'o365' && (
              <>
                <TextInput
                  label="Tenant ID"
                  value={o365TenantId}
                  onChangeText={setO365TenantId}
                  style={styles.input}
                  textColor="#fff"
                  autoCapitalize="none"
                  theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }}
                />
                <TextInput
                  label="Client ID"
                  value={o365ClientId}
                  onChangeText={setO365ClientId}
                  style={styles.input}
                  textColor="#fff"
                  autoCapitalize="none"
                  theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }}
                />
              </>
            )}

            {/* Common fields */}
            <TextInput
              label="Fr\u00e5n e-post"
              value={fromEmail}
              onChangeText={setFromEmail}
              placeholder="noreply@mittf\u00f6retag.se"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              textColor="#fff"
              theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }}
            />
            <TextInput
              label="Fr\u00e5n namn"
              value={fromName}
              onChangeText={setFromName}
              placeholder="Mitt F\u00f6retag"
              style={styles.input}
              textColor="#fff"
              theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }}
            />

            <View style={styles.addActions}>
              <Button
                mode="outlined"
                onPress={resetForm}
                textColor="#888"
                style={styles.cancelButton}
              >
                Avbryt
              </Button>
              <Button
                mode="contained"
                onPress={() => createMutation.mutate()}
                loading={createMutation.isPending}
                disabled={!fromEmail.trim() || createMutation.isPending}
                buttonColor="#e8622c"
                style={styles.submitButton}
              >
                Spara
              </Button>
            </View>
          </View>
        )}

        {/* Recent emails */}
        {recentEmails && recentEmails.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Senaste e-post</Text>
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
                  {format(new Date(email.created_at), 'd MMM', { locale: sv })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Empty state if no configs */}
        {(!configs || configs.length === 0) && !showAdd && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="email-outline" size={64} color="#2d2d44" />
            <Text style={styles.emptyTitle}>Ingen e-postkonfiguration</Text>
            <Text style={styles.emptyDesc}>
              Konfigurera e-post f\u00f6r att skicka notiser och bekr\u00e4ftelser fr\u00e5n dina formul\u00e4r.
            </Text>
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
  configCard: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  configInfo: { flex: 1 },
  configProvider: { color: '#fff', fontSize: 16, fontWeight: '600' },
  configEmail: { color: '#e8622c', fontSize: 14, marginTop: 2 },
  configName: { color: '#888', fontSize: 13, marginTop: 2 },
  statusChip: { borderRadius: 8 },
  configActions: { flexDirection: 'row', gap: 8 },
  testButton: { borderColor: '#e8622c', borderRadius: 8, flex: 1 },
  deleteConfigButton: { borderColor: '#ef4444', borderRadius: 8, flex: 1 },
  addButton: { borderRadius: 12, marginBottom: 24 },
  addCard: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
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
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    gap: 10,
  },
  emailInfo: { flex: 1 },
  emailTo: { color: '#fff', fontSize: 13 },
  emailSubject: { color: '#888', fontSize: 12 },
  emailDate: { color: '#666', fontSize: 11 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { color: '#888', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptyDesc: { color: '#666', fontSize: 14, marginTop: 8, textAlign: 'center' },
});
