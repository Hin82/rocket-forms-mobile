import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import {
  Text, Button, ActivityIndicator, TextInput, Chip, SegmentedButtons, IconButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { Stack } from 'expo-router';
import { useTranslation } from '@/src/translations';
import { useAppTheme } from '@/src/contexts/ThemeContext';

type DomainStatus = 'pending' | 'verified' | 'failed';
type DomainType = 'email' | 'forms';

interface CustomDomain {
  id: string;
  domain: string;
  type: DomainType;
  status: DomainStatus;
  created_at: string;
}

export default function DomainsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [showAdd, setShowAdd] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [domainType, setDomainType] = useState<DomainType>('forms');
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  const statusConfig: Record<DomainStatus, { label: string; color: string; bgColor: string }> = {
    pending: { label: t('settings', 'pending'), color: '#f59e0b', bgColor: '#3d3520' },
    verified: { label: t('settings', 'verified'), color: '#22c55e', bgColor: '#16432a' },
    failed: { label: t('settings', 'failed'), color: '#ef4444', bgColor: '#442020' },
  };

  const { data: tier, isLoading: tierLoading } = useQuery({
    queryKey: ['subscription-tier', user?.id],
    queryFn: async () => {
      // Same query as web app: check user_subscription_tiers first
      const { data: tierData, error: tierError } = await supabase
        .from('user_subscription_tiers')
        .select('tier')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (tierError && tierError.code !== 'PGRST116') throw tierError;
      if (tierData) return tierData.tier;

      // Fallback to subscribers table
      const { data: subData, error: subError } = await supabase
        .from('subscribers')
        .select('subscription_tier')
        .eq('email', user!.email)
        .maybeSingle();

      if (subError && subError.code !== 'PGRST116') throw subError;
      return subData?.subscription_tier || 'free';
    },
    enabled: !!user,
  });

  const isPremium = tier === 'premium' || tier === 'enterprise' || tier === 'complimentary' || tier === 'superadmin';

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
        user_id: user!.id, domain, type, status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-domains'] });
      setNewDomain('');
      setShowAdd(false);
      Alert.alert(t('settings', 'domainAdded'), t('settings', 'configureDns'));
    },
    onError: (err: Error) => {
      Alert.alert(t('settings', 'error'), err.message || t('settings', 'couldNotAddDomain'));
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const { error } = await supabase
        .from('custom_domains')
        .update({ status: 'pending' })
        .eq('id', domainId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-domains'] });
      Alert.alert(t('settings', 'verificationStarted'), t('settings', 'dnsCheckInProgress'));
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
      t('settings', 'removeDomainTitle'),
      t('settings', 'removeDomainConfirm', { domain: domain.domain }),
      [
        { text: t('settings', 'cancel'), style: 'cancel' },
        { text: t('settings', 'remove'), style: 'destructive', onPress: () => deleteMutation.mutate(domain.id) },
      ],
    );
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert(t('settings', 'copied'), t('settings', 'dnsCopied'));
  };

  if (tierLoading || isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <Stack.Screen options={{ title: t('settings', 'ownDomains'), headerBackTitle: t('auth', 'back'), headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!isPremium) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <Stack.Screen options={{ title: t('settings', 'ownDomains'), headerBackTitle: t('auth', 'back'), headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="lock-outline" size={64} color={colors.border} />
          <Text style={[styles.lockedTitle, { color: colors.text }]}>{t('settings', 'premiumRequired')}</Text>
          <Text style={[styles.lockedDesc, { color: colors.textSecondary }]}>{t('settings', 'domainsForPremium')}</Text>
          <Button
            mode="contained"
            onPress={() => Linking.openURL('https://rocketformspro.com/pricing')}
            style={styles.upgradeButton}
            buttonColor={colors.accent}
            icon="arrow-up-bold"
          >
            {t('settings', 'upgradeToPremium')}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <Stack.Screen options={{ title: t('settings', 'ownDomains'), headerBackTitle: t('auth', 'back'), headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={[styles.errorText, { color: colors.error }]}>{t('settings', 'couldNotLoadDomains')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: t('settings', 'ownDomains'), headerBackTitle: t('auth', 'back'), headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>{t('settings', 'connectDomains')}</Text>

        {!showAdd ? (
          <Button mode="contained" onPress={() => setShowAdd(true)} style={styles.addButton} buttonColor={colors.accent} icon="plus">
            {t('settings', 'addDomain')}
          </Button>
        ) : (
          <View style={[styles.addCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.addTitle, { color: colors.text }]}>{t('settings', 'newDomain')}</Text>
            <TextInput
              label={t('settings', 'domainName')}
              placeholder={t('settings', 'domainPlaceholder')}
              value={newDomain}
              onChangeText={setNewDomain}
              style={[styles.input, { backgroundColor: colors.surfaceSecondary }]}
              textColor={colors.text}
              theme={{ colors: { primary: colors.accent, onSurfaceVariant: colors.textSecondary } }}
            />
            <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>{t('settings', 'type')}</Text>
            <SegmentedButtons
              value={domainType}
              onValueChange={(v) => setDomainType(v as DomainType)}
              buttons={[
                { value: 'forms', label: t('settings', 'forms'), icon: 'form-select' },
                { value: 'email', label: t('settings', 'emailType'), icon: 'email-outline' },
              ]}
              style={styles.segmented}
              theme={{ colors: { secondaryContainer: colors.accent, onSecondaryContainer: '#fff' } }}
            />
            <View style={styles.addActions}>
              <Button mode="outlined" onPress={() => { setShowAdd(false); setNewDomain(''); }} textColor={colors.textSecondary} style={[styles.cancelButton, { borderColor: colors.border }]}>
                {t('settings', 'cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={() => addMutation.mutate({ domain: newDomain.trim(), type: domainType })}
                loading={addMutation.isPending}
                disabled={!newDomain.trim() || addMutation.isPending}
                buttonColor={colors.accent}
                style={styles.submitButton}
              >
                {t('settings', 'add')}
              </Button>
            </View>
          </View>
        )}

        {(!domains || domains.length === 0) ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="web" size={64} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>{t('settings', 'noDomains')}</Text>
            <Text style={[styles.emptyDesc, { color: colors.textTertiary }]}>{t('settings', 'addFirstDomain')}</Text>
          </View>
        ) : (
          <View style={styles.domainList}>
            {domains.map((domain) => {
              const status = statusConfig[domain.status];
              const isExpanded = expandedDomain === domain.id;

              return (
                <View key={domain.id} style={[styles.domainCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.domainHeader}>
                    <View style={styles.domainInfo}>
                      <Text style={[styles.domainName, { color: colors.text }]}>{domain.domain}</Text>
                      <View style={styles.domainMeta}>
                        <Chip style={[styles.statusChip, { backgroundColor: status.bgColor }]} textStyle={{ color: status.color, fontSize: 11 }}>
                          {status.label}
                        </Chip>
                        <Chip style={[styles.typeChip, { backgroundColor: colors.border }]} textStyle={[styles.typeChipText, { color: colors.textSecondary }]}>
                          {domain.type === 'email' ? t('settings', 'emailType') : t('settings', 'forms')}
                        </Chip>
                      </View>
                    </View>
                    <IconButton icon={isExpanded ? 'chevron-up' : 'chevron-down'} iconColor={colors.textSecondary} onPress={() => setExpandedDomain(isExpanded ? null : domain.id)} />
                  </View>

                  {isExpanded && (
                    <View style={[styles.dnsSection, { borderTopColor: colors.border }]}>
                      <Text style={[styles.dnsTitle, { color: colors.text }]}>{t('settings', 'dnsConfig')}</Text>

                      {domain.type === 'email' ? (
                        <>
                          <View style={styles.dnsRecord}>
                            <Text style={[styles.dnsLabel, { color: colors.textSecondary }]}>{t('settings', 'spfRecord')}</Text>
                            <View style={[styles.dnsValueRow, { backgroundColor: colors.surfaceSecondary }]}>
                              <Text style={[styles.dnsValue, { color: colors.accent }]} selectable>v=spf1 include:spf.rocketformspro.com ~all</Text>
                              <IconButton icon="content-copy" size={16} iconColor={colors.accent} onPress={() => copyToClipboard('v=spf1 include:spf.rocketformspro.com ~all')} />
                            </View>
                          </View>
                          <View style={styles.dnsRecord}>
                            <Text style={[styles.dnsLabel, { color: colors.textSecondary }]}>{t('settings', 'dmarcRecord')}</Text>
                            <View style={[styles.dnsValueRow, { backgroundColor: colors.surfaceSecondary }]}>
                              <Text style={[styles.dnsValue, { color: colors.accent }]} selectable>v=DMARC1; p=none; rua=mailto:dmarc@rocketformspro.com</Text>
                              <IconButton icon="content-copy" size={16} iconColor={colors.accent} onPress={() => copyToClipboard('v=DMARC1; p=none; rua=mailto:dmarc@rocketformspro.com')} />
                            </View>
                          </View>
                        </>
                      ) : (
                        <View style={styles.dnsRecord}>
                          <Text style={[styles.dnsLabel, { color: colors.textSecondary }]}>{t('settings', 'cnameRecord')}</Text>
                          <View style={[styles.dnsValueRow, { backgroundColor: colors.surfaceSecondary }]}>
                            <Text style={[styles.dnsValue, { color: colors.accent }]} selectable>{domain.domain} CNAME forms.rocketformspro.com</Text>
                            <IconButton icon="content-copy" size={16} iconColor={colors.accent} onPress={() => copyToClipboard(`${domain.domain} CNAME forms.rocketformspro.com`)} />
                          </View>
                        </View>
                      )}

                      <View style={styles.domainActions}>
                        <Button mode="outlined" onPress={() => verifyMutation.mutate(domain.id)} textColor={colors.accent} style={[styles.verifyButton, { borderColor: colors.accent }]} icon="check-circle-outline" loading={verifyMutation.isPending}>
                          {t('settings', 'verifyDomain')}
                        </Button>
                        <Button mode="outlined" onPress={() => handleDelete(domain)} textColor="#ef4444" style={styles.deleteButton} icon="delete-outline">
                          {t('settings', 'removeDomain')}
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
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { marginTop: 12, fontSize: 16 },
  lockedTitle: { fontSize: 22, fontWeight: '700', marginTop: 16 },
  lockedDesc: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 22, paddingHorizontal: 16 },
  upgradeButton: { borderRadius: 12, marginTop: 24 },
  infoText: { fontSize: 13, marginBottom: 16, lineHeight: 20 },
  addButton: { borderRadius: 12, marginBottom: 24 },
  addCard: { borderRadius: 16, padding: 16, marginBottom: 24 },
  addTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  input: { marginBottom: 12, borderRadius: 8 },
  typeLabel: { fontSize: 13, marginBottom: 8 },
  segmented: { marginBottom: 16 },
  addActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  cancelButton: { borderRadius: 8 },
  submitButton: { borderRadius: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptyDesc: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  domainList: { gap: 12 },
  domainCard: { borderRadius: 16, padding: 16 },
  domainHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  domainInfo: { flex: 1 },
  domainName: { fontSize: 15, fontWeight: '600' },
  domainMeta: { flexDirection: 'row', gap: 8, marginTop: 6 },
  statusChip: { borderRadius: 8 },
  typeChip: { borderRadius: 8 },
  typeChipText: { fontSize: 11 },
  dnsSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  dnsTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  dnsRecord: { marginBottom: 12 },
  dnsLabel: { fontSize: 12, marginBottom: 4 },
  dnsValueRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingLeft: 12 },
  dnsValue: { fontSize: 12, flex: 1, fontFamily: 'monospace' },
  domainActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  verifyButton: { borderRadius: 8, flex: 1 },
  deleteButton: { borderColor: '#ef4444', borderRadius: 8, flex: 1 },
});
