import React, { useCallback, useMemo, forwardRef } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { FieldType } from '../../hooks/useFormEditor';

interface FieldPaletteProps {
  onAddField: (type: FieldType) => void;
  onClose: () => void;
}

interface PaletteItem {
  type: FieldType;
  label: string;
  icon: string;
}

interface PaletteCategory {
  title: string;
  items: PaletteItem[];
}

const CATEGORIES: PaletteCategory[] = [
  {
    title: 'Grundlaggande',
    items: [
      { type: 'text', label: 'Textfalt', icon: 'form-textbox' },
      { type: 'email', label: 'E-post', icon: 'email-outline' },
      { type: 'phone', label: 'Telefon', icon: 'phone-outline' },
      { type: 'name', label: 'Namn', icon: 'account-outline' },
      { type: 'number', label: 'Nummer', icon: 'numeric' },
      { type: 'textarea', label: 'Textruta', icon: 'text-box-outline' },
      { type: 'select', label: 'Rullgardinsmeny', icon: 'form-dropdown' },
      { type: 'radio', label: 'Radioknapp', icon: 'radiobox-marked' },
      { type: 'checkbox', label: 'Kryssruta', icon: 'checkbox-marked-outline' },
      { type: 'yesno', label: 'Ja / Nej', icon: 'toggle-switch-outline' },
    ],
  },
  {
    title: 'Avancerade',
    items: [
      { type: 'date', label: 'Datum', icon: 'calendar' },
      { type: 'time', label: 'Tid', icon: 'clock-outline' },
      { type: 'datetime', label: 'Datum & tid', icon: 'calendar-clock' },
      { type: 'file', label: 'Filuppladdning', icon: 'file-upload-outline' },
      { type: 'image', label: 'Bild', icon: 'image-outline' },
      { type: 'signature', label: 'Signatur', icon: 'draw' },
      { type: 'rating', label: 'Betyg', icon: 'star-outline' },
      { type: 'nps', label: 'NPS', icon: 'chart-bar' },
      { type: 'likert', label: 'Likert-skala', icon: 'format-list-numbered' },
      { type: 'ranking', label: 'Rangordning', icon: 'sort-numeric-ascending' },
      { type: 'slider', label: 'Slider', icon: 'tune-vertical' },
      { type: 'currency', label: 'Valuta', icon: 'currency-usd' },
      { type: 'address', label: 'Adress', icon: 'map-marker-outline' },
      { type: 'color', label: 'Fargvaljare', icon: 'palette-outline' },
      { type: 'url', label: 'URL', icon: 'link-variant' },
      { type: 'hidden', label: 'Dolt falt', icon: 'eye-off-outline' },
      { type: 'matrix', label: 'Matris', icon: 'grid' },
      { type: 'multi-text-row', label: 'Flerradigt textfalt', icon: 'table-row' },
    ],
  },
  {
    title: 'Layout',
    items: [
      { type: 'separator', label: 'Avdelare', icon: 'minus' },
      { type: 'page-break', label: 'Sidbrytning', icon: 'book-open-page-variant-outline' },
      { type: 'html-block', label: 'HTML-block', icon: 'code-tags' },
      { type: 'text-display', label: 'Textvisning', icon: 'format-text' },
      { type: 'document', label: 'Dokument', icon: 'file-document-outline' },
    ],
  },
  {
    title: 'Svenska',
    items: [
      { type: 'personnummer', label: 'Personnummer', icon: 'card-account-details-outline' },
      { type: 'organisationsnummer', label: 'Org.nummer', icon: 'domain' },
    ],
  },
];

const FieldPalette = forwardRef<BottomSheet, FieldPaletteProps>(({ onAddField, onClose }, ref) => {
  const snapPoints = useMemo(() => ['70%', '90%'], []);

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
        <Text variant="titleMedium" style={styles.headerText}>Lagg till falt</Text>
      </View>
      <BottomSheetScrollView contentContainerStyle={styles.scroll}>
        {CATEGORIES.map(cat => (
          <View key={cat.title} style={styles.category}>
            <Text variant="labelLarge" style={styles.categoryTitle}>{cat.title}</Text>
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
                  <Text style={styles.tileLabel} numberOfLines={2}>{item.label}</Text>
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
