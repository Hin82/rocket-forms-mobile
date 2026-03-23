import React, { useCallback, useMemo, forwardRef } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { FieldType } from '../../hooks/useFormEditor';
import { useTranslation } from '../../translations';

interface FieldPaletteProps {
  onAddField: (type: FieldType) => void;
  onClose: () => void;
}

interface PaletteItem {
  type: FieldType;
  labelKey: string;
  icon: string;
}

interface PaletteCategory {
  titleKey: string;
  items: PaletteItem[];
}

const CATEGORIES: PaletteCategory[] = [
  {
    titleKey: 'basic',
    items: [
      { type: 'text', labelKey: 'text', icon: 'form-textbox' },
      { type: 'email', labelKey: 'email', icon: 'email-outline' },
      { type: 'phone', labelKey: 'phone', icon: 'phone-outline' },
      { type: 'name', labelKey: 'name', icon: 'account-outline' },
      { type: 'number', labelKey: 'number', icon: 'numeric' },
      { type: 'textarea', labelKey: 'textarea', icon: 'text-box-outline' },
      { type: 'select', labelKey: 'select', icon: 'form-dropdown' },
      { type: 'radio', labelKey: 'radio', icon: 'radiobox-marked' },
      { type: 'checkbox', labelKey: 'checkbox', icon: 'checkbox-marked-outline' },
      { type: 'yesno', labelKey: 'yesno', icon: 'toggle-switch-outline' },
    ],
  },
  {
    titleKey: 'advanced',
    items: [
      { type: 'date', labelKey: 'date', icon: 'calendar' },
      { type: 'time', labelKey: 'time', icon: 'clock-outline' },
      { type: 'datetime', labelKey: 'datetime', icon: 'calendar-clock' },
      { type: 'file', labelKey: 'file', icon: 'file-upload-outline' },
      { type: 'image', labelKey: 'image', icon: 'image-outline' },
      { type: 'signature', labelKey: 'signature', icon: 'draw' },
      { type: 'rating', labelKey: 'rating', icon: 'star-outline' },
      { type: 'nps', labelKey: 'nps', icon: 'chart-bar' },
      { type: 'likert', labelKey: 'likert', icon: 'format-list-numbered' },
      { type: 'ranking', labelKey: 'ranking', icon: 'sort-numeric-ascending' },
      { type: 'slider', labelKey: 'slider', icon: 'tune-vertical' },
      { type: 'currency', labelKey: 'currency', icon: 'currency-usd' },
      { type: 'address', labelKey: 'address', icon: 'map-marker-outline' },
      { type: 'color', labelKey: 'color', icon: 'palette-outline' },
      { type: 'url', labelKey: 'url', icon: 'link-variant' },
      { type: 'hidden', labelKey: 'hidden', icon: 'eye-off-outline' },
      { type: 'matrix', labelKey: 'matrix', icon: 'grid' },
      { type: 'multi-text-row', labelKey: 'multiTextRow', icon: 'table-row' },
    ],
  },
  {
    titleKey: 'layout',
    items: [
      { type: 'separator', labelKey: 'separator', icon: 'minus' },
      { type: 'page-break', labelKey: 'pageBreak', icon: 'book-open-page-variant-outline' },
      { type: 'html-block', labelKey: 'htmlBlock', icon: 'code-tags' },
      { type: 'text-display', labelKey: 'textDisplay', icon: 'format-text' },
      { type: 'document', labelKey: 'document', icon: 'file-document-outline' },
    ],
  },
  {
    titleKey: 'swedish',
    items: [
      { type: 'personnummer', labelKey: 'personnummer', icon: 'card-account-details-outline' },
      { type: 'organisationsnummer', labelKey: 'organisationsnummer', icon: 'domain' },
    ],
  },
];

const FieldPalette = forwardRef<BottomSheet, FieldPaletteProps>(({ onAddField, onClose }, ref) => {
  const snapPoints = useMemo(() => ['70%', '90%'], []);
  const { t } = useTranslation();

  const handleAdd = useCallback((type: FieldType) => {
    onAddField(type);
    onClose();
  }, [onAddField, onClose]);

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.headerText}>{t('fieldPalette', 'addField')}</Text>
      </View>
      <BottomSheetScrollView contentContainerStyle={styles.scroll}>
        {CATEGORIES.map(cat => (
          <View key={cat.titleKey} style={styles.category}>
            <Text variant="labelLarge" style={styles.categoryTitle}>{t('fieldPalette', cat.titleKey)}</Text>
            <View style={styles.grid}>
              {cat.items.map(item => (
                <TouchableOpacity
                  key={item.type}
                  style={styles.tile}
                  onPress={() => handleAdd(item.type)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={26}
                    color="#e8622c"
                  />
                  <Text style={styles.tileLabel} numberOfLines={2}>{t('fieldTypes', item.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

FieldPalette.displayName = 'FieldPalette';
export default FieldPalette;

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: '#1e1e2e' },
  handle: { backgroundColor: '#555' },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerText: { color: '#fff', fontWeight: 'bold' },
  scroll: { paddingHorizontal: 16 },
  category: { marginBottom: 20 },
  categoryTitle: { color: '#999', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '30%',
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  tileLabel: { color: '#ccc', fontSize: 11, marginTop: 6, textAlign: 'center' },
});
