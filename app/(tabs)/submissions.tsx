import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSubmissions } from '@/src/hooks/useSubmissions';
import { useTranslation } from '@/src/translations';
import { useLanguage } from '@/src/contexts/LanguageContext';

export default function SubmissionsScreen() {
  const { data: submissions, isLoading, refetch, isRefetching } = useSubmissions();
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = language === 'sv' ? 'sv-SE' : 'en-US';

  const getPreview = (formData: Record<string, any>): string => {
    const values = Object.values(formData || {})
      .filter(v => typeof v === 'string' && v.trim().length > 0)
      .slice(0, 3);
    return values.join(' | ') || t('forms', 'noValues');
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e8622c" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/form/${item.form_id}/submission/${item.id}`)}>
            <Card style={styles.card} mode="outlined">
              <Card.Content>
                <View style={styles.header}>
                  <Text variant="titleSmall" style={styles.formName} numberOfLines={1}>
                    {item.form_name || t('nav', 'form')}
                  </Text>
                  <Text variant="bodySmall" style={styles.date}>
                    {new Date(item.submitted_at).toLocaleDateString(dateLocale)}{' '}
                    {new Date(item.submitted_at).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text variant="bodySmall" style={styles.preview} numberOfLines={1}>
                  {getPreview(item.form_data)}
                </Text>
              </Card.Content>
            </Card>
          </Pressable>
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#e8622c" />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.centered}>
            <MaterialCommunityIcons name="inbox-outline" size={64} color="#555" />
            <Text variant="bodyLarge" style={styles.emptyText}>{t('forms', 'noSubmissions')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  list: { padding: 16, paddingBottom: 24 },
  card: {
    marginBottom: 8,
    backgroundColor: '#1e1e2e',
    borderColor: '#2d2d44',
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  formName: { color: '#e8622c', flex: 1 },
  date: { color: '#888' },
  preview: { color: '#aaa' },
  emptyText: { color: '#888', marginTop: 16 },
});
