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

// Match web app tiers exactly
const STANDARD_PRICES: Record<string, number> = {
  free: 0,
  pro: 14.99,
  premium: 29.99,
  enterprise: 99.99,
  complimentary: 0,
  superadmin: 0,
};

const TIER_COLORS: Record<string, string> = {
  free: '#6b7280',
  pro: '#3b82f6',
  premium: '#e8622c',
  enterprise: '#a855f7',
  complimentary: '#22c55e',
  superadmin: '#f59e0b',
};

// Tier display names use translation keys
function getTierDisplayName(t: (section: string, key: string) => string, tier: string): string {
  const key = `tier_${tier}`;
  return t('tiers', key) || tier;
}

// Features per tier use translation keys
function getFeatures(t: (section: string, key: string) => string, tier: string): string[] {
  const featureKeys: Record<string, string[]> = {
    free: ['upTo2Forms', 'basicFieldTypes', 'limitedStorage'],
    pro: ['upTo10Forms', 'allFieldTypes', 'standardStorage', 'emailNotifications'],
    premium: ['unlimitedForms', 'allPremiumFieldTypes', 'extendedStorage', 'emailNotifications', 'customDomains', 'advancedAnalytics'],
    enterprise: ['unlimitedForms', 'allPremiumFieldTypes', 'unlimitedStorage', 'emailNotifications', 'customDomains', 'advancedAnalytics', 'prioritySupport', 'slaGuarantee'],
    complimentary: ['unlimitedForms', 'allPremiumFieldTypes', 'extendedStorage', 'emailNotifications', 'customDomains', 'advancedAnalytics', 'freeAccessAdmin'],
    superadmin: ['unlimitedForms', 'allPremiumFieldTypes', 'unlimitedStorage', 'emailNotifications', 'customDomains', 'advancedAnalytics', 'prioritySupport', 'slaGuarantee', 'superAdminAccess'],
  };
  const keys = featureKeys[tier] || featureKeys.free;
  return keys.map(k => t('tiers', k));
}

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: subscription, isLoading, error } = useQuery({
    queryKey: ['subscription-full', user?.id],
    queryFn: async () => {
      // Match web app: first check user_subscription_tiers (new system)
      const { data: tierData, error: tierError } = await supabase
        .from('user_subscription_tiers')
        .select('tier, custom_monthly_price, billing_override_reason')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (tierError && tierError.code !== 'PGRST116') {
        throw tierError;
      }

      let tier = 'free';
      let customPrice: number | null = null;
      let overrideReason: string | null = null;
      let effectivePrice = 0;

      if (tierData) {
        tier = tierData.tier;
        customPrice = tierData.custom_monthly_price;
        overrideReason = tierData.billing_override_reason;
        effectivePrice = customPrice !== null ? customPrice : (STANDARD_PRICES[tier] ?? 0);
      } else {
        // Fallback: check subscribers table (legacy)
        const { data: subData, error: subError } = await supabase
          .from('subscribers')
          .select('subscription_tier, custom_monthly_price, billing_override_reason')
          .eq('email', user!.email)
          .maybeSingle();

        if (subError && subError.code !== 'PGRST116') throw subError;

        if (subData) {
          tier = subData.subscription_tier || 'free';
          customPrice = subData.custom_monthly_price;
          overrideReason = subData.billing_override_reason;
          effectivePrice = customPrice !== null ? customPrice : (STANDARD_PRICES[tier] ?? 0);
        }
      }

      return { tier, customPrice, overrideReason, effectivePrice };
    },
    enabled: !!user,
  });

  const tier = subscription?.tier || 'free';
  const tierColor = TIER_COLORS[tier] || '#6b7280';

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
        {/* Current plan card - matches web app */}
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planLabel}>{t('tiers', 'currentPlan')}</Text>
              <Text style={styles.planSublabel}>{t('tiers', 'currentPlanDesc')}</Text>
            </View>
            <Chip style={[styles.tierBadge, { backgroundColor: tierColor }]} textStyle={styles.tierBadgeText}>
              {getTierDisplayName(t, tier)}
            </Chip>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('tiers', 'monthlyCost')}</Text>
            <Text style={styles.priceValue}>
              {subscription?.effectivePrice !== undefined
                ? `${subscription.effectivePrice.toFixed(2)} SEK`
                : t('tiers', 'tier_free')}
            </Text>
          </View>

          {/* Override reason - matches web app blue info box */}
          {subscription?.overrideReason && (
            <View style={styles.infoBox}>
              <MaterialCommunityIcons name="information-outline" size={20} color="#3b82f6" />
              <View style={styles.infoBoxText}>
                <Text style={styles.infoBoxTitle}>{t('tiers', 'specialSubscription')}</Text>
                <Text style={styles.infoBoxDesc}>{subscription.overrideReason}</Text>
              </View>
            </View>
          )}

          {/* Complimentary access - matches web app green box */}
          {tier === 'complimentary' && (
            <View style={styles.complimentaryBox}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#22c55e" />
              <View style={styles.infoBoxText}>
                <Text style={styles.complimentaryTitle}>{t('tiers', 'complimentaryAccess')}</Text>
                <Text style={styles.complimentaryDesc}>
                  {t('tiers', 'complimentaryDesc')}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Features card - matches web app */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>{t('tiers', 'includedFeatures')}</Text>
          <Text style={styles.featuresSublabel}>{t('tiers', 'includedFeaturesDesc')}</Text>
          <View style={styles.featuresList}>
            {getFeatures(t, tier).map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#22c55e" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Upgrade card - only show if not enterprise/complimentary (same as web app) */}
        {tier !== 'enterprise' && tier !== 'complimentary' && tier !== 'superadmin' && (
          <View style={styles.upgradeCard}>
            <Text style={styles.upgradeTitle}>{t('subscription', 'wantToUpgrade')}</Text>
            <Text style={styles.upgradeDesc}>
              {t('subscription', 'upgradeDesc')}
            </Text>
            <Button
              mode="contained"
              onPress={() => Linking.openURL('https://rocketformspro.com/pricing')}
              style={styles.upgradeButton}
              buttonColor="#e8622c"
              icon="arrow-right"
              contentStyle={{ flexDirection: 'row-reverse' }}
            >
              {t('subscription', 'viewPricing')}
            </Button>
          </View>
        )}

        {/* Manage payment - only for paid tiers without custom pricing (same as web app) */}
        {tier && !['complimentary', 'free', 'superadmin'].includes(tier) && subscription?.customPrice === null && (
          <View style={styles.paymentCard}>
            <Text style={styles.paymentTitle}>{t('subscription', 'managePaymentTitle')}</Text>
            <Text style={styles.paymentDesc}>
              {t('subscription', 'managePaymentDesc')}
            </Text>
            <Button
              mode="outlined"
              onPress={() => Linking.openURL('https://rocketformspro.com/billing')}
              style={styles.paymentButton}
              textColor="#e8622c"
              icon="credit-card-outline"
            >
              {t('subscription', 'openStripePortal')}
            </Button>
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

  // Plan card
  planCard: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planLabel: { color: '#fff', fontSize: 18, fontWeight: '700' },
  planSublabel: { color: '#888', fontSize: 13, marginTop: 4 },
  tierBadge: { borderRadius: 8 },
  tierBadgeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
  },
  priceLabel: { color: '#ccc', fontSize: 14, fontWeight: '500' },
  priceValue: { color: '#fff', fontSize: 22, fontWeight: '700' },

  // Info box (blue)
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#1a2744',
    borderWidth: 1,
    borderColor: '#2d4a7a',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoBoxText: { flex: 1 },
  infoBoxTitle: { color: '#93c5fd', fontSize: 14, fontWeight: '600' },
  infoBoxDesc: { color: '#7db8f0', fontSize: 13, marginTop: 4, lineHeight: 20 },

  // Complimentary box (green)
  complimentaryBox: {
    flexDirection: 'row',
    backgroundColor: '#14332a',
    borderWidth: 1,
    borderColor: '#22664a',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  complimentaryTitle: { color: '#86efac', fontSize: 14, fontWeight: '600' },
  complimentaryDesc: { color: '#6ee7a0', fontSize: 13, marginTop: 4, lineHeight: 20 },

  // Features card
  featuresCard: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  featuresTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  featuresSublabel: { color: '#888', fontSize: 13, marginTop: 4, marginBottom: 16 },
  featuresList: { gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { color: '#ddd', fontSize: 14 },

  // Upgrade card
  upgradeCard: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  upgradeTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  upgradeDesc: { color: '#888', fontSize: 13, lineHeight: 20, marginBottom: 16 },
  upgradeButton: { borderRadius: 12 },

  // Payment card
  paymentCard: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  paymentTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  paymentDesc: { color: '#888', fontSize: 13, lineHeight: 20, marginBottom: 16 },
  paymentButton: { borderRadius: 12, borderColor: '#e8622c' },
});
