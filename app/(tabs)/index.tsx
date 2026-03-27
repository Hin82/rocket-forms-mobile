import React, { useState, useCallback } from 'react';
import { View, StyleSheet, SectionList, RefreshControl, Pressable } from 'react-native';
import { Text, FAB, Searchbar, Chip, ActivityIndicator, Card, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useForms, useFormGroups, Form } from '@/src/hooks/useForms';
import { useTranslation } from '@/src/translations';
import { useLanguage, type LanguageCode } from '@/src/contexts/LanguageContext';
import FolderManager from '@/src/components/FolderManager';

function getDateLocale(languageCode: LanguageCode): string {
  const localeMap: Record<LanguageCode, string> = {
    'sv': 'sv-SE',
    'en': 'en-GB',
    'no': 'nb-NO',
    'da': 'da-DK',
    'fi': 'fi-FI',
    'de': 'de-DE',
    'fr': 'fr-FR',
    'es': 'es-ES',
  };
  return localeMap[languageCode] || 'en-GB';
}

export default function FormsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFolders, setShowFolders] = useState(false);
  const { data: forms, isLoading, refetch, isRefetching } = useForms();
  const { data: groups } = useFormGroups();
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = getDateLocale(language);

  const sections = React.useMemo(() => {
    if (!forms) return [];

    const filtered = searchQuery
      ? forms.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : forms;

    const grouped: Record<string, Form[]> = { ungrouped: [] };

    filtered.forEach(form => {
      const groupName = form.form_groups?.name || form.group_name;
      if (groupName) {
        if (!grouped[groupName]) grouped[groupName] = [];
        grouped[groupName].push(form);
      } else {
        grouped.ungrouped.push(form);
      }
    });

    const result = [];
    for (const [name, data] of Object.entries(grouped)) {
      if (name !== 'ungrouped' && data.length > 0) {
        result.push({ title: name, data, isGroup: true });
      }
    }
    if (grouped.ungrouped.length > 0) {
      result.push({ title: t('forms', 'allForms'), data: grouped.ungrouped, isGroup: false });
    }

    return result;
  }, [forms, searchQuery, t]);

  const renderFormCard = useCallback(({ item }: { item: Form }) => {
    const fieldCount = item.fields?.length || 0;
    const subCount = item.submission_count || 0;

    return (
      <Pressable onPress={() => router.push(`/form/${item.id}`)}>
        <Card style={styles.card} mode="outlined">
          <Card.Content style={styles.cardContent}>
            <View style={styles.cardLeft}>
              <Text variant="titleMedium" numberOfLines={1} style={styles.formName}>
                {item.name}
              </Text>
              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="format-list-bulleted" size={14} color="#666" />
                  <Text style={styles.metaText}>{fieldCount}</Text>
                </View>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="file-check-outline" size={14} color={subCount > 0 ? '#e8622c' : '#666'} />
                  <Text style={[styles.metaText, subCount > 0 && styles.metaTextActive]}>{subCount}</Text>
                </View>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>
                  {new Date(item.updated_at || item.created_at).toLocaleDateString(dateLocale)}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#555" />
          </Card.Content>
        </Card>
      </Pressable>
    );
  }, [router, dateLocale]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e8622c" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <Searchbar
          placeholder={t('forms', 'searchPlaceholder')}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        inputStyle={styles.searchInput}
      />
        <Pressable onPress={() => setShowFolders(true)} style={styles.folderBtn} accessibilityLabel={t('folders', 'manageFolders')} accessibilityRole="button">
          <MaterialCommunityIcons name="folder-cog-outline" size={22} color="#e8622c" />
        </Pressable>
      </View>

      <FolderManager visible={showFolders} onClose={() => setShowFolders(false)} />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderFormCard}
        renderSectionHeader={({ section: { title, isGroup, data } }) => (
          <View style={styles.sectionHeader}>
            {isGroup && <MaterialCommunityIcons name="folder-outline" size={18} color="#e8622c" />}
            <Text variant="titleSmall" style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionCount}>{data.length}</Text>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#e8622c" />
        }
        contentContainerStyle={sections.length === 0 ? styles.listEmpty : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="file-document-outline" size={64} color="#2d2d44" />
            <Text variant="titleMedium" style={styles.emptyTitle}>{t('forms', 'noForms')}</Text>
            <Text style={styles.emptySubtitle}>{t('forms', 'noFormsDesc')}</Text>
            <Pressable onPress={() => router.push('/create')} style={styles.emptyCreateBtn}>
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              <Text style={styles.emptyCreateBtnText}>{t('forms', 'createFirstForm')}</Text>
            </Pressable>
          </View>
        }
      />

      <FAB
        icon="plus"
        label={t('forms', 'new')}
        onPress={() => router.push('/create')}
        style={styles.fab}
        color="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  searchbar: {
    flex: 1,
    marginLeft: 16,
    marginVertical: 8,
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
  },
  folderBtn: { padding: 8 },
  searchInput: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 80 },
  listEmpty: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 80 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingTop: 20,
  },
  sectionTitle: { color: '#ccc', fontWeight: '600', flex: 1 },
  sectionCount: { color: '#666', fontSize: 13, backgroundColor: '#252540', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  card: {
    marginBottom: 8,
    backgroundColor: '#1e1e2e',
    borderColor: '#2d2d44',
    borderRadius: 12,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: { flex: 1, marginRight: 12 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  formName: { color: '#fff' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: '#666', fontSize: 12 },
  metaTextActive: { color: '#e8622c' },
  metaDot: { color: '#444', fontSize: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { color: '#888', marginTop: 16, fontWeight: '600' },
  emptySubtitle: { color: '#555', fontSize: 13, marginTop: 4, textAlign: 'center' },
  emptyCreateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#e8622c', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 12, marginTop: 20,
  },
  emptyCreateBtnText: { color: '#fff', fontWeight: '600' },
  fab: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    backgroundColor: '#e8622c',
    borderRadius: 16,
  },
});