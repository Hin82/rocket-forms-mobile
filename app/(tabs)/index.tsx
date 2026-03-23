import React, { useState, useCallback } from 'react';
import { View, StyleSheet, SectionList, RefreshControl, Pressable } from 'react-native';
import { Text, FAB, Searchbar, Chip, ActivityIndicator, Card, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useForms, useFormGroups, Form } from '@/src/hooks/useForms';
import { useTranslation } from '@/src/translations';
import { useLanguage } from '@/src/contexts/LanguageContext';

export default function FormsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: forms, isLoading, refetch, isRefetching } = useForms();
  const { data: groups } = useFormGroups();
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = language === 'sv' ? 'sv-SE' : 'en-US';

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

  const renderFormCard = useCallback(({ item }: { item: Form }) => (
    <Pressable onPress={() => router.push(`/form/${item.id}`)}>
      <Card style={styles.card} mode="outlined">
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardLeft}>
            <Text variant="titleMedium" numberOfLines={1} style={styles.formName}>
              {item.name}
            </Text>
            <Text variant="bodySmall" style={styles.formDate}>
              {new Date(item.updated_at || item.created_at).toLocaleDateString(dateLocale)}
            </Text>
          </View>
          <View style={styles.cardRight}>
            {(item.submission_count || 0) > 0 && (
              <Badge style={styles.badge}>{item.submission_count}</Badge>
            )}
            <MaterialCommunityIcons name="chevron-right" size={20} color="#888" />
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  ), [router, dateLocale]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e8622c" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder={t('forms', 'searchPlaceholder')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        inputStyle={styles.searchInput}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderFormCard}
        renderSectionHeader={({ section: { title, isGroup } }) => (
          <View style={styles.sectionHeader}>
            {isGroup && <MaterialCommunityIcons name="folder-outline" size={18} color="#e8622c" />}
            <Text variant="titleSmall" style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#e8622c" />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.centered}>
            <MaterialCommunityIcons name="file-document-outline" size={64} color="#555" />
            <Text variant="bodyLarge" style={styles.emptyText}>{t('forms', 'noForms')}</Text>
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
  searchbar: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
  },
  searchInput: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 80 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingTop: 20,
  },
  sectionTitle: { color: '#ccc', fontWeight: '600' },
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
  formDate: { color: '#888', marginTop: 4 },
  badge: { backgroundColor: '#e8622c' },
  emptyText: { color: '#888', marginTop: 16 },
  fab: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    backgroundColor: '#e8622c',
    borderRadius: 16,
  },
});
