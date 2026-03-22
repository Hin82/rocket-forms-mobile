import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import {
  Text,
  Button,
  ActivityIndicator,
  TextInput,
  Chip,
  SegmentedButtons,
  IconButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { Stack } from 'expo-router';

type DomainStatus = 'pending' | 'verified' | 'failed';
type DomainType = 'email' | 'forms';

interface CustomDomain {
  id: string;
  domain: string;
  type: DomainType;
  status: DomainStatus;
  created_at: string;
}

const STATUS_CONFIG: Record<DomainStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'V\u00e4ntar', color: '#f59e0b', bgColor: '#3d3520' },
  verified: { label: 'Verifierad', color: '#22c55e', bgColor: '#16432a' },
  failed: { label: 'Misslyckades', color: '#ef4444', bgColor: '#442020' },
};

export default function DomainsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [domainType, setDomainType] = useState<DomainType>('forms');
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  // Check subscription tier
  const { data: tier, isLoading: tierLoading } = useQuery({
    queryKey: ['subscription-tier', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('subscription_tier')
        .eq('owner_id', user!.id)
        .single();
      if (error) throw error;
      return (data?.subscription_tier as string) || 'free';
    },
    enabled: !!user,
  });

  const isPremium = tier === 'premium' || tier === 'enterprise';

  const { data: domains, isLoading, error } = useQuery({
    queryKey: ['custom-domains', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_domains')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CustomDomain[];
    },
    enabled: !!user && isPremium,
  });

  const addMutation = useMutation({
    mutationFn: async ({ domain, type }: { domain: string; type: DomainType }) => {
      const { error } = await supabase.from('custom_domains').insert({
        user_id: user!.id,
        domain,
        type,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-domains'] });
      setNewDomain('');
      setShowAdd(false);
      Alert.alert('Dom\u00e4n tillagd', 'Konfigurera dina DNS-poster och verifiera dom\u00e4nen.');
    },
    onError: (err: Error) => {
      Alert.alert('Fel', err.message || 'Kunde inte l\u00e4gga till dom\u00e4n');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (domainId: string) => {
      // Trigger verification check
      const { error } = await supabase
        .from('custom_domains')
        .update({ status: 'pending' })
        .eq('id', domainId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-domains'] });
      Alert.alert('Verifiering startad', 'DNS-kontroll p\u00e5g\u00e5r. Det kan ta upp till 24 timmar.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const { error } = await supabase
        .from('custom_domains')
        .delete()
        .eq('id', domainId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-domains'] });
    },
  });

  const handleDelete = (domain: CustomDomain) => {
    Alert.alert(
      'Ta bort dom\u00e4n',
      `\u00c4r du s\u00e4ker p\u00e5 att du vill ta bort ${domain.domain}?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Ta bort', style: 'destructive', onPress: () => deleteMutation.mutate(domain.id) },
      ],
    );
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Kopierat', 'DNS-post kopierad till urklipp');
  };

  if (tierLoading || isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Egna dom\u00e4ner', headerBackTitle: 'Tillbaka', headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e8622c" />
        </View>
      </SafeAreaView>
    );
  }

  // Not premium - show upgrade prompt
  if (!isPremium) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Egna dom\u00e4ner', headerBackTitle: 'Tillbaka', headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="lock-outline" size={64} color="#2d2d44" />
          <Text style={styles.lockedTitle}>Premium kr\u00e4vs</Text>
          <Text style={styles.lockedDesc}>
            Egna dom\u00e4ner \u00e4r tillg\u00e4ngligt f\u00f6r Premium- och Enterprise-kunder. Uppgradera f\u00f6r att anv\u00e4nda anpassade dom\u00e4ner f\u00f6r e-post och formul\u00e4r.
          </Text>
          <Button
            mode="contained"
            onPress={() => Linking.openURL('https://rocketformspro.com/pricing')}
            style={styles.upgradeButton}
            buttonColor="#e8622c"
            icon="arrow-up-bold"
          >
            Uppgradera till Premium
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Egna dom\u00e4ner', headerBackTitle: 'Tillbaka', headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Kunde inte h\u00e4mta dom\u00e4ner</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Egna dom\u00e4ner', headerBackTitle: 'Tillbaka', headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.infoText}>
          Anslut egna dom\u00e4ner f\u00f6r att anpassa dina formul\u00e4rs URL:er och e-postadresser.
        </Text>

        {/* Add domain */}
        {!showAdd ? (
          <Button
            mode="contained"
            onPress={() => setShowAdd(true)}
            style={styles.addButton}
            buttonColor="#e8622c"
            icon="plus"
          >
            L\u00e4gg till dom\u00e4n
          </Button>
        ) : (
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>Ny dom\u00e4n</Text>
            <TextInput
              label="Dom\u00e4nnamn"
              placeholder="forms.mittf\u00f6retag.se"
              value={newDomain}
              onChangeText={setNewDomain}
              style={styles.input}
              textColor="#fff"
              theme={{ colors: { primary: '#e8622c', onSurfaceVariant: '#888' } }}
            />
            <Text style={styles.typeLabel}>Typ</Text>
            <SegmentedButtons
              value={domainType}
              onValueChange={(v) => setDomainType(v as DomainType)}
              buttons={[
                { value: 'forms', label: 'Formul\u00e4r', icon: 'form-select' },
                { value: 'email', label: 'E-post', icon: 'email-outline' },
              ]}
              style={styles.segmented}
              theme={{ colors: { secondaryContainer: '#e8622c', onSecondaryContainer: '#fff' } }}
            />
            <View style={styles.addActions}>
              <Button
                mode="outlined"
                onPress={() => { setShowAdd(false); setNewDomain(''); }}
                textColor="#888"
                style={styles.cancelButton}
              >
                Avbryt
              </Button>
              <Button
                mode="contained"
                onPress={() => addMutation.mutate({ domain: newDomain.trim(), type: domainType })}
                loading={addMutation.isPending}
                disabled={!newDomain.trim() || addMutation.isPending}
                buttonColor="#e8622c"
                style={styles.submitButton}
              >
                L\u00e4gg till
              </Button>
            </View>
          </View>
        )}

        {/* Domain list */}
        {(!domains || domains.length === 0) ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="web" size={64} color="#2d2d44" />
            <Text style={styles.emptyTitle}>Inga dom\u00e4ner</Text>
            <Text style={styles.emptyDesc}>
              L\u00e4gg till din f\u00f6rsta egna dom\u00e4n f\u00f6r att komma ig\u00e5ng.
            </Text>
          </View>
        ) : (
          <View style={styles.domainList}>
            {domains.map((domain) => {
              const status = STATUS_CONFIG[domain.status];
              const isExpanded = expandedDomain === domain.id;

              return (
                <View key={domain.id} style={styles.domainCard}>
                  <View style={styles.domainHeader}>
                    <View style={styles.domainInfo}>
                      <Text style={styles.domainName}>{domain.domain}</Text>
                      <View style={styles.domainMeta}>
                        <Chip
                          style={[styles.statusChip, { backgroundColor: status.bgColor }]}
                          textStyle={{ color: status.color, fontSize: 11 }}
                        >
                          {status.label}
                        </Chip>
                        <Chip style={styles.typeChip} textStyle={styles.typeChipText}>
                          {domain.type === 'email' ? 'E-post' : 'Formul\u00e4r'}
                        </Chip>
                      </View>
                    </View>
                    <IconButton
                      icon={isExpanded ? 'chevron-up' : 'chevron-down'}
                      iconColor="#888"
                      onPress={() => setExpandedDomain(isExpanded ? null : domain.id)}
                    />
                  </View>

                  {isExpanded && (
                    <View style={styles.dnsSection}>
                      <Text style={styles.dnsTitle}>DNS-konfiguration</Text>

                      {domain.type === 'email' ? (
                        <>
                          <View style={styles.dnsRecord}>
                            <Text style={styles.dnsLabel}>SPF-post (TXT)</Text>
                            <View style={styles.dnsValueRow}>
                              <Text style={styles.dnsValue} selectable>
                                v=spf1 include:spf.rocketformspro.com ~all
                              </Text>
                              <IconButton
                                icon="content-copy"
                                size={16}
                                iconColor="#e8622c"
                                onPress={() => copyToClipboard('v=spf1 include:spf.rocketformspro.com ~all')}
                              />
                            </View>
                          </View>
                          <View style={styles.dnsRecord}>
                            <Text style={styles.dnsLabel}>DMARC-post (TXT)</Text>
                            <View style={styles.dnsValueRow}>
                              <Text style={styles.dnsValue} selectable>
                                v=DMARC1; p=none; rua=mailto:dmarc@rocketformspro.com
                              </Text>
                              <IconButton
                                icon="content-copy"
                                size={16}
                                iconColor="#e8622c"
                                onPress={() => copyToClipboard('v=DMARC1; p=none; rua=mailto:dmarc@rocketformspro.com')}
                              />
                            </View>
                          </View>
                        </>
                      ) : (
                        <View style={styles.dnsRecord}>
                          <Text style={styles.dnsLabel}>CNAME-post</Text>
                          <View style={styles.dnsValueRow}>
                            <Text style={styles.dnsValue} selectable>
                              {domain.domain} CNAME forms.rocketformspro.com
                            </Text>
                            <IconButton
                              icon="content-copy"
                              size={16}
                              iconColor="#e8622c"
                              onPress={() => copyToClipboard(`${domain.domain} CNAME forms.rocketformspro.com`)}
                            />
                          </View>
                        </View>
                      )}

                      <View style={styles.domainActions}>
                        <Button
                          mode="outlined"
                          onPress={() => verifyMutation.mutate(domain.id)}
                          textColor="#e8622c"
                          style={styles.verifyButton}
                          icon="check-circle-outline"
                          loading={verifyMutation.isPending}
                        >
                          Verifiera
                        </Button>
                        <Button
                          mode="outlined"
                          onPress={() => handleDelete(domain)}
                          textColor="#ef4444"
                          style={styles.deleteButton}
                          icon="delete-outline"
                        >
                          Ta bort
                        </Button>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: '#ef4444', marginTop: 12, fontSize: 16 },
  lockedTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 16 },
  lockedDesc: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 22, paddingHorizontal: 16 },
  upgradeButton: { borderRadius: 12, marginTop: 24 },
  infoText: { color: '#888', fontSize: 13, marginBottom: 16, lineHeight: 20 },
  addButton: { borderRadius: 12, marginBottom: 24 },
  addCard: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  addTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  input: { backgroundColor: '#2d2d44', marginBottom: 12, borderRadius: 8 },
  typeLabel: { color: '#888', fontSize: 13, marginBottom: 8 },
  segmented: { marginBottom: 16 },
  addActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  cancelButton: { borderColor: '#2d2d44', borderRadius: 8 },
  submitButton: { borderRadius: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { color: '#888', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptyDesc: { color: '#666', fontSize: 14, marginTop: 8, textAlign: 'center' },
  domainList: { gap: 12 },
  domainCard: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 16,
  },
  domainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  domainInfo: { flex: 1 },
  domainName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  domainMeta: { flexDirection: 'row', gap: 8, marginTop: 6 },
  statusChip: { borderRadius: 8 },
  typeChip: { borderRadius: 8, backgroundColor: '#2d2d44' },
  typeChipText: { color: '#aaa', fontSize: 11 },
  dnsSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#2d2d44' },
  dnsTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 12 },
  dnsRecord: { marginBottom: 12 },
  dnsLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
  dnsValueRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2d2d44', borderRadius: 8, paddingLeft: 12 },
  dnsValue: { color: '#e8622c', fontSize: 12, flex: 1, fontFamily: 'monospace' },
  domainActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  verifyButton: { borderColor: '#e8622c', borderRadius: 8, flex: 1 },
  deleteButton: { borderColor: '#ef4444', borderRadius: 8, flex: 1 },
});
