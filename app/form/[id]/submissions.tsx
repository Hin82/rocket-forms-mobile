import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSubmissions } from '@/src/hooks/useSubmissions';
import { useTranslation } from '@/src/translations';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { SubmissionsSkeleton } from '@/src/components/SkeletonLoader';
import { useAppTheme } from '@/src/contexts/ThemeContext';

export default function FormSubmissionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: submissions, isLoading, refetch, isRefetching } = useSubmissions(id);
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
    return <SubmissionsSkeleton />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Pressable onPress={() => router.push(`/form/${id}/submission/${item.id}`)}>
            <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} mode="outlined">
              <Card.Content style={styles.cardContent}>
                <View style={[styles.numberBadge, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[styles.number, { color: colors.accent }]}>#{(submissions?.length || 0) - index}</Text>
                </View>
                <View style={styles.details}>
                  <Text variant="bodySmall" style={[styles.date, { color: colors.textSecondary }]}>
                    {new Date(item.submitted_at).toLocaleDateString(dateLocale)}{' '}
                    {new Date(item.submitted_at).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text variant="bodySmall" style={[styles.preview, { color: colors.textSecondary }]} numberOfLines={1}>
                    {getPreview(item.form_data)}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
              </Card.Content>
            </Card>
          </Pressable>
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.centered}>
            <MaterialCommunityIcons name="inbox-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('forms', 'noSubmissions')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  list: { padding: 16 },
  card: { marginBottom: 8, borderRadius: 12 },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numberBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  number: { fontWeight: 'bold', fontSize: 12 },
  details: { flex: 1 },
  date: {},
  preview: { marginTop: 4 },
  emptyText: { marginTop: 16 },
});
