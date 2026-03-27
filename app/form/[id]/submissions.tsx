import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable, Alert, Share, Platform } from 'react-native';
import { Text, Card, ActivityIndicator, Searchbar, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSubmissions } from '@/src/hooks/useSubmissions';
import { useTranslation } from '@/src/translations';
import { useLanguage, type LanguageCode } from '@/src/contexts/LanguageContext';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const DATE_LOCALE_MAP: Record<LanguageCode, string> = {
  sv: 'sv-SE', en: 'en-GB', no: 'nb-NO', da: 'da-DK',
  fi: 'fi-FI', de: 'de-DE', fr: 'fr-FR', es: 'es-ES',
};

function collectText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(collectText).join(' ');
  if (typeof value === 'object') return Object.values(value).map(collectText).join(' ');
  return String(value);
}

export default function FormSubmissionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: submissions, isLoading, refetch, isRefetching } = useSubmissions(id);
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = DATE_LOCALE_MAP[language] || 'en-GB';
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  const filteredSubmissions = useMemo(() => {
    if (!submissions || !searchQuery.trim()) return submissions;
    const q = searchQuery.toLowerCase();
    return submissions.filter(s => {
      const text = collectText(s.form_data).toLowerCase();
      return text.includes(q);
    });
  }, [submissions, searchQuery]);

  const getPreview = (formData: Record<string, any>): string => {
    const values = Object.values(formData || {})
      .filter(v => typeof v === 'string' && v.trim().length > 0)
      .slice(0, 3);
    return values.join(' | ') || t('forms', 'noValues');
  };

  const handleExportCSV = useCallback(async () => {
    if (!submissions || submissions.length === 0) return;
    setExporting(true);
    try {
      // Collect all unique field keys
      const allKeys = new Set<string>();
      submissions.forEach(s => {
        Object.keys(s.form_data || {}).forEach(k => allKeys.add(k));
      });
      const keys = Array.from(allKeys);

      // Build CSV
      const header = ['#', t('forms', 'submittedAt'), ...keys].map(k => `"${k}"`).join(',');
      const rows = submissions.map((s, i) => {
        const date = new Date(s.submitted_at).toLocaleString(dateLocale);
        const values = keys.map(k => {
          const val = s.form_data?.[k];
          if (val === undefined || val === null) return '""';
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        });
        return [submissions.length - i, `"${date}"`, ...values].join(',');
      });

      const csv = [header, ...rows].join('\n');

      if (Platform.OS === 'web') {
        // Web: trigger browser download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `submissions_${id}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // Native: write to file and share
        const filePath = `${FileSystem.cacheDirectory}submissions_${id}.csv`;
        await FileSystem.writeAsStringAsync(filePath, csv, { encoding: FileSystem.EncodingType.UTF8 });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
        } else {
          Alert.alert(t('settings', 'error'), t('forms', 'sharingNotAvailable'));
        }
      }
    } catch (err: any) {
      Alert.alert(t('settings', 'error'), err.message || t('forms', 'exportFailed'));
    } finally {
      setExporting(false);
    }
  }, [submissions, id, dateLocale, t]);

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#e8622c" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Search + count */}
      {submissions && submissions.length > 0 && (
        <View style={styles.headerRow}>
          <Searchbar
            placeholder={t('forms', 'searchSubmissions')}
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
            inputStyle={styles.searchInput}
          />
          <Text style={styles.countText}>{filteredSubmissions?.length || 0} / {submissions.length}</Text>
        </View>
      )}

      <FlatList
        data={filteredSubmissions}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Pressable onPress={() => router.push(`/form/${id}/submission/${item.id}`)}>
            <Card style={styles.card} mode="outlined">
              <Card.Content style={styles.cardContent}>
                <View style={styles.numberBadge}>
                  <Text style={styles.number}>#{(submissions?.length || 0) - index}</Text>
                </View>
                <View style={styles.details}>
                  <Text variant="bodySmall" style={styles.date}>
                    {new Date(item.submitted_at).toLocaleDateString(dateLocale)}{' '}
                    {new Date(item.submitted_at).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text variant="bodySmall" style={styles.preview} numberOfLines={1}>
                    {getPreview(item.form_data)}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
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
            <Text style={styles.emptyText}>{t('forms', 'noSubmissions')}</Text>
          </View>
        }
      />

      {submissions && submissions.length > 0 && (
        <FAB
          icon="download"
          label={t('forms', 'exportCSV')}
          onPress={handleExportCSV}
          loading={exporting}
          disabled={exporting}
          style={styles.fab}
          color="#fff"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  list: { padding: 16 },
  card: { marginBottom: 8, backgroundColor: '#1e1e2e', borderColor: '#2d2d44', borderRadius: 12 },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numberBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2d2d44', justifyContent: 'center', alignItems: 'center' },
  number: { color: '#e8622c', fontWeight: 'bold', fontSize: 12 },
  details: { flex: 1 },
  date: { color: '#aaa' },
  preview: { color: '#888', marginTop: 4 },
  emptyText: { color: '#888', marginTop: 16 },
  headerRow: { paddingHorizontal: 16, paddingTop: 8 },
  searchbar: { backgroundColor: '#1e1e2e', borderRadius: 12, marginBottom: 4 },
  searchInput: { color: '#fff' },
  countText: { color: '#666', fontSize: 12, textAlign: 'right', paddingRight: 4, paddingBottom: 4 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#e8622c', borderRadius: 16 },
});
