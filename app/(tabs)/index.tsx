import React, { useState, useCallback } from 'react';
import { View, StyleSheet, SectionList, RefreshControl, Pressable, Alert, Animated, TouchableOpacity } from 'react-native';
import { Text, FAB, Searchbar, Chip, ActivityIndicator, Card, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useForms, useFormGroups, Form } from '@/src/hooks/useForms';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useRefreshOnFocus } from '@/src/hooks/useRefreshOnFocus';
import { useTranslation } from '@/src/translations';
import { useLanguage, type LanguageCode } from '@/src/contexts/LanguageContext';
import FolderManager from '@/src/components/FolderManager';
import { FormListSkeleton } from '@/src/components/SkeletonLoader';
import AnimatedItem from '@/src/components/AnimatedItem';

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
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'submissions'>('date');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { data: forms, isLoading, refetch, isRefetching } = useForms();
  const { data: groups } = useFormGroups();
  useRefreshOnFocus(refetch);
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = getDateLocale(language);

  const sections = React.useMemo(() => {
    if (!forms) return [];

    let filtered = searchQuery
      ? forms.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : [...forms];

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'submissions') return (b.submission_count || 0) - (a.submission_count || 0);
      return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
    });

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
  }, [forms, searchQuery, sortBy, t]);

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleDeleteForm = useCallback((form: Form) => {
    Alert.alert(
      t('forms', 'deleteForm'),
      t('forms', 'deleteFormConfirm', { name: form.name }),
      [
        { text: t('settings', 'cancel'), style: 'cancel' },
        {
          text: t('settings', 'delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('forms').delete().eq('id', form.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              queryClient.invalidateQueries({ queryKey: ['forms'] });
            } catch {}
          },
        },
      ],
    );
  }, [t, queryClient]);

  const renderSwipeActions = useCallback((item: Form) => (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const translateX = dragX.interpolate({
      inputRange: [-180, 0],
      outputRange: [0, 180],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View style={[styles.swipeActions, { transform: [{ translateX }] }]}>
        <TouchableOpacity onPress={() => router.push(`/form/${item.id}/edit`)} style={styles.swipeEditBtn}>
          <MaterialCommunityIcons name="pencil-outline" size={20} color="#fff" />
          <Text style={styles.swipeText}>{t('forms', 'editForm')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteForm(item)} style={styles.swipeDeleteBtn}>
          <MaterialCommunityIcons name="delete-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  }, [router, t, handleDeleteForm]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      if (next.size === 0) setSelectMode(false);
      return next;
    });
    Haptics.selectionAsync();
  }, []);

  const handleLongPress = useCallback((id: string) => {
    if (!selectMode) {
      setSelectMode(true);
      setSelectedIds(new Set([id]));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [selectMode]);

  const handleBatchDelete = useCallback(() => {
    Alert.alert(
      t('forms', 'deleteForm'),
      t('forms', 'batchDeleteConfirm', { count: String(selectedIds.size) }),
      [
        { text: t('settings', 'cancel'), style: 'cancel' },
        {
          text: t('settings', 'delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const ids = Array.from(selectedIds);
              await supabase.from('forms').delete().in('id', ids);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              queryClient.invalidateQueries({ queryKey: ['forms'] });
              setSelectMode(false);
              setSelectedIds(new Set());
            } catch {}
          },
        },
      ],
    );
  }, [selectedIds, t, queryClient]);

  const cancelSelect = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const renderFormCard = useCallback(({ item, index }: { item: Form; index: number }) => {
    const fieldCount = item.fields?.length || 0;
    const subCount = item.submission_count || 0;
    const isSelected = selectedIds.has(item.id);

    const handlePress = () => {
      if (selectMode) {
        toggleSelect(item.id);
      } else {
        router.push(`/form/${item.id}`);
      }
    };

    const content = (
      <Pressable onPress={handlePress} onLongPress={() => handleLongPress(item.id)} delayLongPress={400}>
        <Card style={[styles.card, isSelected && styles.cardSelected]} mode="outlined">
          <Card.Content style={styles.cardContent}>
            {selectMode && (
              <MaterialCommunityIcons
                name={isSelected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                size={22}
                color={isSelected ? '#e8622c' : '#555'}
                style={{ marginRight: 8 }}
              />
            )}
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
            {!selectMode && <MaterialCommunityIcons name="chevron-right" size={20} color="#555" />}
          </Card.Content>
        </Card>
      </Pressable>
    );

    const wrapped = selectMode ? content : (
      <Swipeable renderRightActions={renderSwipeActions(item)} overshootRight={false}>
        {content}
      </Swipeable>
    );

    return <AnimatedItem index={index} refreshKey={refreshKey}>{wrapped}</AnimatedItem>;
  }, [router, dateLocale, renderSwipeActions, selectMode, selectedIds, toggleSelect, handleLongPress, refreshKey]);

  if (isLoading) {
    return <FormListSkeleton />;
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

      {/* Sort chips */}
      <View style={styles.sortRow}>
        {(['date', 'name', 'submissions'] as const).map(s => (
          <Pressable
            key={s}
            onPress={() => setSortBy(s)}
            style={[styles.sortChip, sortBy === s && styles.sortChipActive]}
            accessibilityRole="radio"
            accessibilityState={{ selected: sortBy === s }}
            accessibilityLabel={t('forms', `sort_${s}`)}
          >
            <MaterialCommunityIcons
              name={s === 'date' ? 'clock-outline' : s === 'name' ? 'sort-alphabetical-ascending' : 'chart-bar'}
              size={14}
              color={sortBy === s ? '#fff' : '#888'}
            />
            <Text style={[styles.sortChipText, sortBy === s && styles.sortChipTextActive]}>
              {t('forms', `sort_${s}`)}
            </Text>
          </Pressable>
        ))}
      </View>

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
          <RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); setRefreshKey(k => k + 1); }} tintColor="#e8622c" />
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

      {selectMode ? (
        <View style={styles.batchBar}>
          <Pressable onPress={cancelSelect} style={styles.batchCancelBtn}>
            <MaterialCommunityIcons name="close" size={20} color="#ccc" />
            <Text style={styles.batchCancelText}>{selectedIds.size} {t('forms', 'selected')}</Text>
          </Pressable>
          <Pressable onPress={handleBatchDelete} style={styles.batchDeleteBtn}>
            <MaterialCommunityIcons name="delete-outline" size={20} color="#fff" />
            <Text style={styles.batchDeleteText}>{t('settings', 'delete')}</Text>
          </Pressable>
        </View>
      ) : (
        <FAB
          icon="plus"
          label={t('forms', 'new')}
          onPress={() => router.push('/create')}
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
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  searchbar: {
    flex: 1,
    marginLeft: 16,
    marginVertical: 8,
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
  },
  folderBtn: { padding: 8 },
  sortRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  sortChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
    backgroundColor: '#1e1e2e',
  },
  sortChipActive: { backgroundColor: '#e8622c' },
  sortChipText: { color: '#888', fontSize: 12 },
  sortChipTextActive: { color: '#fff' },
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
  cardSelected: { borderColor: '#e8622c', backgroundColor: '#252538' },
  batchBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1e1e2e', borderTopWidth: 1, borderTopColor: '#2d2d44',
    paddingHorizontal: 20, paddingVertical: 12, paddingBottom: 28,
  },
  batchCancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  batchCancelText: { color: '#ccc', fontSize: 15 },
  batchDeleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#cc3333', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  batchDeleteText: { color: '#fff', fontWeight: '600' },
  swipeActions: { flexDirection: 'row', width: 130, marginBottom: 8 },
  swipeEditBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#3b82f6', borderTopLeftRadius: 12, borderBottomLeftRadius: 12,
  },
  swipeDeleteBtn: {
    width: 50, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#cc3333', borderTopRightRadius: 12, borderBottomRightRadius: 12,
  },
  swipeText: { color: '#fff', fontSize: 11, marginTop: 2 },
  fab: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    backgroundColor: '#e8622c',
    borderRadius: 16,
  },
});