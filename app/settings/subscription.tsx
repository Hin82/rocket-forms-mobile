import React from 'react';
import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import { Text, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { Stack } from 'expo-router';

type Tier = 'free' | 'pro' | 'premium' | 'enterprise';

interface TierInfo {
  label: string;
  color: string;
  description: string;
  features: string[];
}

const TIERS: Record<Tier, TierInfo> = {
  free: {
    label: 'Free',
    color: '#6b7280',
    description: '2 formul\u00e4r, grundf\u00e4lt, begr\u00e4nsad lagring',
    features: [
      '2 formul\u00e4r',
      'Grundl\u00e4ggande f\u00e4lttyper',
      'Begr\u00e4nsad lagring (100 MB)',
      'Rocketforms-branding',
    ],
  },
  pro: {
    label: 'Pro',
    color: '#3b82f6',
    description: '10 formul\u00e4r, alla f\u00e4lt, e-postnotiser',
    features: [
      '10 formul\u00e4r',
      'Alla f\u00e4lttyper',
      'E-postnotiser',
      '1 GB lagring',
      'Exportera till CSV/PDF',
      'Ingen branding',
    ],
  },
  premium: {
    label: 'Premium',
    color: '#e8622c',
    description: 'Obegr\u00e4nsat, custom domains, avancerad analys',
    features: [
      'Obegr\u00e4nsat antal formul\u00e4r',
      'Alla f\u00e4lttyper',
      'Custom domains',
      'Avancerad analys & statistik',
      '10 GB lagring',
      'Webhook-integrationer',
      'Prioriterad e-postsupport',
    ],
  },
  enterprise: {
    label: 'Enterprise',
    color: '#a855f7',
    description: 'Allt i Premium + SLA, prioriterad support',
    features: [
      'Allt i Premium',
      'SLA-garanti (99.9% uptime)',
      'Prioriterad support dygnet runt',
      'Dedikerad kontaktperson',
      'Anpassade integrationer',
      'Obegr\u00e4nsad lagring',
      'SSO / SAML',
      'Avancerad anv\u00e4ndarhantering',
    ],
  },
};

const TIER_ORDER: Tier[] = ['free', 'pro', 'premium', 'enterprise'];

export default function SubscriptionScreen() {
  const { user } = useAuth();

  const { data: currentTier, isLoading, error } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('subscription_tier')
        .eq('owner_id', user!.id)
        .single();
      if (error) throw error;
      return (data?.subscription_tier as Tier) || 'free';
    },
    enabled: !!user,
  });

  const tier = currentTier || 'free';
  const tierInfo = TIERS[tier];
  const currentIndex = TIER_ORDER.indexOf(tier);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Prenumeration', headerBackTitle: 'Tillbaka', headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e8622c" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Prenumeration', headerBackTitle: 'Tillbaka', headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Kunde inte h\u00e4mta prenumerationsinfo</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Prenumeration', headerBackTitle: 'Tillbaka', headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Current plan */}
        <View style={styles.currentPlanCard}>
          <Text style={styles.sectionLabel}>Din nuvarande plan</Text>
          <View style={styles.tierRow}>
            <Chip
              style={[styles.tierBadge, { backgroundColor: tierInfo.color }]}
              textStyle={styles.tierBadgeText}
            >
              {tierInfo.label}
            </Chip>
          </View>
          <Text style={styles.tierDescription}>{tierInfo.description}</Text>
        </View>

        {/* All tiers */}
        {TIER_ORDER.map((t) => {
          const info = TIERS[t];
          const isCurrent = t === tier;
          const tierIndex = TIER_ORDER.indexOf(t);

          return (
            <View
              key={t}
              style={[
                styles.tierCard,
                isCurrent && { borderColor: info.color, borderWidth: 2 },
              ]}
            >
              <View style={styles.tierHeader}>
                <Chip
                  style={[styles.tierChip, { backgroundColor: info.color }]}
                  textStyle={styles.tierChipText}
                >
                  {info.label}
                </Chip>
                {isCurrent && (
                  <Text style={styles.currentLabel}>Aktiv</Text>
                )}
              </View>

              <Text style={styles.tierCardDesc}>{info.description}</Text>

              <View style={styles.featureList}>
                {info.features.map((feature, idx) => {
                  const included = tierIndex <= currentIndex || isCurrent;
                  return (
                    <View key={idx} style={styles.featureRow}>
                      <MaterialCommunityIcons
                        name={included ? 'check-circle' : 'circle-outline'}
                        size={18}
                        color={included ? '#22c55e' : '#555'}
                      />
                      <Text style={[styles.featureText, !included && styles.featureDisabled]}>
                        {feature}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={() => Linking.openURL('https://rocketformspro.com/pricing')}
            style={styles.upgradeButton}
            buttonColor="#e8622c"
            icon="arrow-up-bold"
          >
            Uppgradera
          </Button>
          <Button
            mode="outlined"
            onPress={() => Linking.openURL('https://rocketformspro.com/billing')}
            style={styles.manageButton}
            textColor="#e8622c"
            icon="credit-card-outline"
          >
            Hantera betalning
          </Button>
        </View>
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
  currentPlanCard: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  sectionLabel: { color: '#888', fontSize: 13, marginBottom: 8 },
  tierRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tierBadge: { borderRadius: 8 },
  tierBadgeText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  tierDescription: { color: '#ccc', fontSize: 14 },
  tierCard: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tierChip: { borderRadius: 8 },
  tierChipText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  currentLabel: { color: '#22c55e', fontSize: 13, fontWeight: '600' },
  tierCardDesc: { color: '#aaa', fontSize: 13, marginBottom: 12 },
  featureList: { gap: 6 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { color: '#ddd', fontSize: 13 },
  featureDisabled: { color: '#555' },
  actions: { marginTop: 16, gap: 12 },
  upgradeButton: { borderRadius: 12 },
  manageButton: { borderRadius: 12, borderColor: '#e8622c' },
});
