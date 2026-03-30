import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSubmissions } from '@/src/hooks/useSubmissions';
import { useTranslation } from '@/src/translations';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useRefreshOnFocus } from '@/src/hooks/useRefreshOnFocus';
import AnimatedItem from '@/src/components/AnimatedItem';
import { useAppTheme } from '@/src/contexts/ThemeContext';

export default function SubmissionsScreen() {
  const { data: submissions, isLoading, refetch, isRefetching } = useSubmissions();
  const [refreshKey, setRefreshKey] = useState(0);
  useRefreshOnFocus(refetch);
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = language === 'sv' ? 'sv-SE' : 'en-US';
  const { colors } = useAppTheme();

  const getPreview = (formData: Record<string, any>): string => {
    const values = Object.values(formData || {})
      .filter(v => typeof v === 'string' && v.trim().length > 0)
      .slice(0, 3);
    return values.join(' | ') || t('forms', 'noValues');
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <AnimatedItem index={index} refreshKey={refreshKey}>
            <Pressable onPress={() => router.push(`/form/${item.form_id}/submission/${item.id}`)}>
              <Card style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]} mode="outlined">
                <Card.Content>
                  <View style={styles.header}>
                    <Text variant="titleSmall" style={[styles.formName, { color: colors.accent }]} numberOfLines={1}>
                      {item.form_name || t('nav', 'form')}
                    </Text>
                    <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                      {new Date(item.submitted_at).toLocaleDateString(dateLocale)}{' '}
                      {new Date(item.submitted_at).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={{ color: colors.textSecondary }} numberOfLines={1}>
                    {getPreview(item.form_data)}
                  </Text>
                </Card.Content>
              </Card>
            </Pressable>
          </AnimatedItem>
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); setRefreshKey(k => k + 1); }} tintColor={colors.accent} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.centered}>
            <MaterialCommunityIcons name="inbox-outline" size={64} color={colors.textTertiary} />
            <Text variant="bodyLarge" style={{ color: colors.textSecondary, marginTop: 16 }}>{t('forms', 'noSubmissions')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  list: { padding: 16, paddingBottom: 24 },
  card: {
    marginBottom: 8,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  formName: { flex: 1 },
});
