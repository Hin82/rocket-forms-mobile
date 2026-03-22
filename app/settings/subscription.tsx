import React from 'react';
import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import { Text, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { Stack } from 'expo-router';
import { useTranslation } from '@/src/translations';

type Tier = 'free' | 'pro' | 'premium' | 'enterprise';

const TIER_ORDER: Tier[] = ['free', 'pro', 'premium', 'enterprise'];

function useTierInfo(t: (section: string, key: string) => string) {
  return {
    free: {
      label: 'Free',
      color: '#6b7280',
      description: t('tiers', 'freeDesc'),
      features: [
        t('tiers', 'freeFeature1'),
        t('tiers', 'freeFeature2'),
        t('tiers', 'freeFeature3'),
        t('tiers', 'freeFeature4'),
      ],
    },
    pro: {
      label: 'Pro',
      color: '#3b82f6',
      description: t('tiers', 'proDesc'),
      features: [
        t('tiers', 'proFeature1'),
        t('tiers', 'proFeature2'),
        t('tiers', 'proFeature3'),
        t('tiers', 'proFeature4'),
        t('tiers', 'proFeature5'),
        t('tiers', 'proFeature6'),
      ],
    },
    premium: {
      label: 'Premium',
      color: '#e8622c',
      description: t('tiers', 'premiumDesc'),
      features: [
        t('tiers', 'premiumFeature1'),
        t('tiers', 'premiumFeature2'),
        t('tiers', 'premiumFeature3'),
        t('tiers', 'premiumFeature4'),
        t('tiers', 'premiumFeature5'),
        t('tiers', 'premiumFeature6'),
        t('tiers', 'premiumFeature7'),
      ],
    },
    enterprise: {
      label: 'Enterprise',
      color: '#a855f7',
      description: t('tiers', 'enterpriseDesc'),
      features: [
        t('tiers', 'enterpriseFeature1'),
        t('tiers', 'enterpriseFeature2'),
        t('tiers', 'enterpriseFeature3'),
        t('tiers', 'enterpriseFeature4'),
        t('tiers', 'enterpriseFeature5'),
        t('tiers', 'enterpriseFeature6'),
        t('tiers', 'enterpriseFeature7'),
        t('tiers', 'enterpriseFeature8'),
      ],
    },
  };
}

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const TIERS = useTierInfo(t);

  const { data: currentTier, isLoading, error } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      // Find user's company via membership
      const { data: membership } = await supabase
        .from('company_memberships')
        .select('company_id')
        .eq('user_id', user!.id)
        .limit(1)
        .single();

      if (!membership) return 'free' as Tier;

      const { data, error } = await supabase
        .from('companies')
        .select('subscription_tier')
        .eq('id', membership.company_id)
        .single();
      if (error) throw error;
      return (data?.subscription_tier as Tier) || 'free';
    },
    enabled: !!user,
  });

  const tier: Tier = (currentTier && currentTier in TIERS) ? currentTier : 'free';
  const tierInfo = TIERS[tier] ?? TIERS['free'];
  const currentIndex = TIER_ORDER.indexOf(tier);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: t('settings', 'subscription'), headerBackTitle: t('auth', 'back'), headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e8622c" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: t('settings', 'subscription'), headerBackTitle: t('auth', 'back'), headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{t('settings', 'couldNotLoadSubscription')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: t('settings', 'subscription'), headerBackTitle: t('auth', 'back'), headerStyle: { backgroundColor: '#1e1e2e' }, headerTintColor: '#fff' }} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Current plan */}
        <View style={styles.currentPlanCard}>
          <Text style={styles.sectionLabel}>{t('settings', 'yourCurrentPlan')}</Text>
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
        {TIER_ORDER.map((t2) => {
          const info = TIERS[t2];
          const isCurrent = t2 === tier;
          const tierIndex = TIER_ORDER.indexOf(t2);

          return (
            <View
              key={t2}
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
                  <Text style={styles.currentLabel}>{t('settings', 'active')}</Text>
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
            {t('settings', 'upgrade')}
          </Button>
          <Button
            mode="outlined"
            onPress={() => Linking.openURL('https://rocketformspro.com/billing')}
            style={styles.manageButton}
            textColor="#e8622c"
            icon="credit-card-outline"
          >
            {t('settings', 'managePayment')}
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
