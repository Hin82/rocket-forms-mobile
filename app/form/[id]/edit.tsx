import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { Text, ActivityIndicator, FAB, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';

import { useFormEditor, FormField, FieldType } from '@/src/hooks/useFormEditor';
import { useFormGroups } from '@/src/hooks/useForms';
import FieldPalette from '@/src/components/editor/FieldPalette';
import FieldEditorSheet from '@/src/components/editor/FieldEditorSheet';
import FormSettingsSheet from '@/src/components/editor/FormSettingsSheet';
import FormPreviewSheet from '@/src/components/editor/FormPreviewSheet';
import ShareSheet from '@/src/components/editor/ShareSheet';
import VersionHistorySheet from '@/src/components/editor/VersionHistorySheet';
import BottomSheet from '@gorhom/bottom-sheet';
import { useTranslation } from '@/src/translations';
import { useAppTheme } from '@/src/contexts/ThemeContext';

// Map field type identifiers (with hyphens) to translation keys (camelCase)
const FIELD_TYPE_KEYS: Record<string, string> = {
  'text-display': 'textDisplay', 'page-break': 'pageBreak',
  'html-block': 'htmlBlock', 'multi-text-row': 'multiTextRow',
};

const FIELD_ICONS: Record<string, string> = {
  text: 'form-textbox',
  email: 'email-outline',
  phone: 'phone-outline',
  name: 'account-outline',
  number: 'numeric',
  textarea: 'text-box-outline',
  select: 'form-dropdown',
  radio: 'radiobox-marked',
  checkbox: 'checkbox-marked-outline',
  yesno: 'toggle-switch-outline',
  date: 'calendar',
  time: 'clock-outline',
  datetime: 'calendar-clock',
  file: 'file-upload-outline',
  image: 'image-outline',
  document: 'file-document-outline',
  signature: 'draw',
  rating: 'star-outline',
  nps: 'chart-bar',
  likert: 'format-list-numbered',
  ranking: 'sort-numeric-ascending',
  hidden: 'eye-off-outline',
  'html-block': 'code-tags',
  'page-break': 'book-open-page-variant-outline',
  'text-display': 'format-text',
  slider: 'tune-vertical',
  color: 'palette-outline',
  currency: 'currency-usd',
  personnummer: 'card-account-details-outline',
  organisationsnummer: 'domain',
  address: 'map-marker-outline',
  matrix: 'grid',
  drawing: 'draw',
  url: 'link-variant',
  separator: 'minus',
  'multi-text-row': 'table-row',
};

function generateId(): string {
  return 'f' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export default function FormEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    form,
    loading,
    saving,
    dirty,
    error,
    saveForm,
    updateForm,
    updateSettings,
    addField,
    updateField,
    removeField,
    reorderFields,
  } = useFormEditor(id!);

  const { data: groups = [] } = useFormGroups();
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  // Sheet refs
  const paletteRef = useRef<BottomSheet>(null);
  const fieldEditorRef = useRef<BottomSheet>(null);
  const settingsRef = useRef<BottomSheet>(null);

  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  // ---- Handlers ----
  const handleOpenPalette = useCallback(() => {
    paletteRef.current?.snapToIndex(0);
  }, []);

  const handleAddField = useCallback((type: FieldType) => {
    addField(type);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [addField]);

  const handleOpenFieldEditor = useCallback((field: FormField) => {
    setEditingField(field);
    fieldEditorRef.current?.snapToIndex(0);
  }, []);

  const handleCloseFieldEditor = useCallback(() => {
    fieldEditorRef.current?.close();
    setEditingField(null);
  }, []);

  const handleOpenSettings = useCallback(() => {
    settingsRef.current?.snapToIndex(0);
  }, []);

  const handleDeleteField = useCallback((fieldId: string) => {
    removeField(fieldId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [removeField]);

  const handleSwipeDelete = useCallback((fieldId: string, label: string) => {
    Alert.alert(t('editor', 'deleteField'), t('editor', 'deleteFieldConfirm', { label }), [
      { text: t('editor', 'cancel'), style: 'cancel' },
      { text: t('editor', 'delete'), style: 'destructive', onPress: () => handleDeleteField(fieldId) },
    ]);
  }, [handleDeleteField]);

  const handleDuplicateField = useCallback((field: FormField) => {
    if (!form) return;
    const duplicated: FormField = {
      ...JSON.parse(JSON.stringify(field)),
      id: generateId(),
      label: field.label + ' ' + t('editor', 'copyLabel'),
    };
    // Insert after the original field
    updateForm({
      fields: [...form.fields.slice(0, form.fields.indexOf(field) + 1), duplicated, ...form.fields.slice(form.fields.indexOf(field) + 1)],
    } as any);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [form, updateForm]);

  const handleDragEnd = useCallback(({ from, to }: { from: number; to: number }) => {
    if (from !== to) {
      reorderFields(from, to);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [reorderFields]);

  const handleSave = useCallback(async () => {
    await saveForm();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [saveForm]);

  const handlePreview = useCallback(() => {
    setShowPreview(true);
  }, []);

  const handleShare = useCallback(() => {
    setShowShare(true);
  }, []);

  const handleVersionHistory = useCallback(() => {
    setShowVersions(true);
  }, []);

  const handleRestoreVersion = useCallback((fields: any[], settings: any) => {
    updateForm({ fields, settings } as any);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [updateForm]);

  // ---- Render ----
  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('editor', 'loadingForm')}</Text>
      </View>
    );
  }

  if (error || !form) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.error }]}>{error || t('editor', 'couldNotLoadForm')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.backBtnText, { color: colors.text }]}>{t('editor', 'goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderItem = ({ item, drag, isActive }: RenderItemParams<FormField>) => {
    return (
      <ScaleDecorator>
        <SwipeableFieldRow
          field={item}
          isActive={isActive}
          onPress={() => handleOpenFieldEditor(item)}
          onLongPress={drag}
          onDelete={() => handleSwipeDelete(item.id, item.label)}
          onDuplicate={() => handleDuplicateField(item)}
        />
      </ScaleDecorator>
    );
  };

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{form.name}</Text>
          <View style={styles.headerMeta}>
            <Text style={[styles.fieldCount, { color: colors.textTertiary }]}>{form.fields.length} {t('editor', 'fieldsCount')}</Text>
            {dirty && <Text style={[styles.unsavedBadge, { color: colors.accent }]}>{t('editor', 'unsaved')}</Text>}
          </View>
        </View>
        <View style={styles.headerRight}>
          <IconButton
            icon="eye-outline"
            iconColor={colors.text}
            size={22}
            onPress={handlePreview}
            style={styles.headerIconBtn}
          />
          <IconButton
            icon="share-variant-outline"
            iconColor={colors.text}
            size={22}
            onPress={handleShare}
            style={styles.headerIconBtn}
          />
          <IconButton
            icon="history"
            iconColor={colors.text}
            size={22}
            onPress={handleVersionHistory}
            style={styles.headerIconBtn}
          />
          <IconButton
            icon="cog-outline"
            iconColor={colors.text}
            size={24}
            onPress={handleOpenSettings}
            style={styles.headerIconBtn}
          />
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size={16} color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{t('editor', 'save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Fields list */}
      {form.fields.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="form-textbox" size={64} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>{t('editor', 'noFields')}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>{t('editor', 'tapToAddFields')}</Text>

          <View style={styles.tipsList}>
            <View style={styles.tipRow}>
              <MaterialCommunityIcons name="plus-circle-outline" size={18} color={colors.accent} />
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>{t('editor', 'tipAdd')}</Text>
            </View>
            <View style={styles.tipRow}>
              <MaterialCommunityIcons name="drag" size={18} color={colors.accent} />
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>{t('editor', 'tipDrag')}</Text>
            </View>
            <View style={styles.tipRow}>
              <MaterialCommunityIcons name="gesture-swipe-left" size={18} color={colors.accent} />
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>{t('editor', 'tipSwipe')}</Text>
            </View>
          </View>

          <TouchableOpacity onPress={handleOpenPalette} style={styles.emptyAddBtn}>
            <MaterialCommunityIcons name="plus" size={22} color="#fff" />
            <Text style={styles.emptyAddBtnText}>{t('editor', 'addFirstField')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <DraggableFlatList
          data={form.fields}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          containerStyle={styles.list}
          contentContainerStyle={styles.listContent}
          activationDistance={10}
        />
      )}

      {/* FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        color="#fff"
        onPress={handleOpenPalette}
      />

      {/* Bottom sheets */}
      <FieldPalette
        ref={paletteRef}
        onAddField={handleAddField}
        onClose={() => paletteRef.current?.close()}
      />

      <FieldEditorSheet
        ref={fieldEditorRef}
        field={editingField}
        allFields={form.fields}
        onUpdate={updateField}
        onDelete={handleDeleteField}
        onClose={handleCloseFieldEditor}
      />

      <FormSettingsSheet
        ref={settingsRef}
        formName={form.name}
        settings={form.settings}
        formGroupId={form.form_group_id}
        notificationEmail={form.notification_email}
        senderName={form.sender_name}
        groups={groups}
        onUpdateName={(name) => updateForm({ name })}
        onUpdateSettings={updateSettings}
        onUpdateFormMeta={(meta) => updateForm(meta as any)}
        onClose={() => settingsRef.current?.close()}
      />

      {/* Preview, Share, Version History */}
      <FormPreviewSheet
        visible={showPreview}
        onClose={() => setShowPreview(false)}
        fields={form.fields}
        settings={form.settings}
        formName={form.name}
      />

      <ShareSheet
        visible={showShare}
        onClose={() => setShowShare(false)}
        formId={id!}
        formName={form.name}
      />

      <VersionHistorySheet
        visible={showVersions}
        onClose={() => setShowVersions(false)}
        formId={id!}
        onRestore={handleRestoreVersion}
      />
    </GestureHandlerRootView>
  );
}

// ---- Swipeable field row ----

function SwipeableFieldRow({
  field,
  isActive,
  onPress,
  onLongPress,
  onDelete,
  onDuplicate,
}: {
  field: FormField;
  isActive: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const translateX = dragX.interpolate({
      inputRange: [-160, 0],
      outputRange: [0, 160],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View style={[styles.swipeActions, { transform: [{ translateX }] }]}>
        <TouchableOpacity onPress={onDuplicate} style={styles.swipeDuplicateBtn}>
          <MaterialCommunityIcons name="content-copy" size={22} color="#fff" />
          <Text style={styles.swipeDuplicateText}>{t('editor', 'copy')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={[styles.swipeDeleteBtn, { backgroundColor: colors.error }]}>
          <MaterialCommunityIcons name="delete-outline" size={22} color="#fff" />
          <Text style={styles.swipeDeleteText}>{t('editor', 'delete')}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={200}
        activeOpacity={0.7}
        style={[styles.fieldCard, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && { borderColor: colors.accent, backgroundColor: colors.surfaceSecondary }]}
      >
        <View style={styles.dragHandle}>
          <MaterialCommunityIcons name="drag-horizontal-variant" size={20} color={colors.textTertiary} />
        </View>
        <View style={styles.fieldIcon}>
          <MaterialCommunityIcons
            name={(FIELD_ICONS[field.type] || 'form-textbox') as any}
            size={22}
            color={colors.accent}
          />
        </View>
        <View style={styles.fieldInfo}>
          <Text style={[styles.fieldLabel, { color: colors.text }]} numberOfLines={1}>{field.label}</Text>
          <Text style={[styles.fieldType, { color: colors.textTertiary }]}>{t('fieldTypes', FIELD_TYPE_KEYS[field.type] || field.type)}</Text>
        </View>
        {field.required && (
          <View style={[styles.requiredDot, { backgroundColor: colors.accent }]} />
        )}
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12 },
  errorText: { marginTop: 12, fontSize: 16 },
  backBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backBtnText: {},

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  headerBackBtn: { padding: 4 },
  headerCenter: { flex: 1, marginHorizontal: 4 },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  fieldCount: { fontSize: 11 },
  unsavedBadge: { fontSize: 11 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  headerIconBtn: { margin: 0, width: 36, height: 36 },
  saveBtn: {
    backgroundColor: '#e8622c',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // List
  list: { flex: 1 },
  listContent: { padding: 12, paddingBottom: 100 },

  // Empty state
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  tipsList: { marginTop: 24, gap: 10, alignSelf: 'stretch' },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  tipText: { fontSize: 13 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#e8622c', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 14, marginTop: 28,
  },
  emptyAddBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Field card
  fieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  dragHandle: { marginRight: 8 },
  fieldIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(232, 98, 44, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fieldInfo: { flex: 1 },
  fieldLabel: { fontSize: 15, fontWeight: '500' },
  fieldType: { fontSize: 12, marginTop: 2 },
  requiredDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },

  // Swipe
  swipeActions: { flexDirection: 'row', width: 160 },
  swipeDuplicateBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    backgroundColor: '#3b82f6',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  swipeDuplicateText: { color: '#fff', fontSize: 11, marginTop: 2 },
  swipeDeleteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  swipeDeleteText: { color: '#fff', fontSize: 11, marginTop: 2 },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: '#e8622c',
    borderRadius: 16,
  },
});
