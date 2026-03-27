import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, Image, FlatList, Pressable, TextInput, Dimensions, Alert,
} from 'react-native';
import { Text, SegmentedButtons, ActivityIndicator, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '@/src/translations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMB_SIZE = (SCREEN_WIDTH - 60) / 3;

// Same categories as web app
const PHOTO_CATEGORIES = ['nature', 'abstract', 'business', 'technology', 'minimal', 'textures'];

// Pre-designed gradients (same as web app)
const GRADIENTS = [
  { id: 'sunset', css: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', colors: ['#f093fb', '#f5576c'] },
  { id: 'ocean', css: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', colors: ['#4facfe', '#00f2fe'] },
  { id: 'forest', css: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', colors: ['#43e97b', '#38f9d7'] },
  { id: 'purple', css: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', colors: ['#667eea', '#764ba2'] },
  { id: 'warm', css: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', colors: ['#f6d365', '#fda085'] },
  { id: 'night', css: 'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)', colors: ['#0c3483', '#a2b6df'] },
  { id: 'rose', css: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', colors: ['#ffecd2', '#fcb69f'] },
  { id: 'sky', css: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', colors: ['#a1c4fd', '#c2e9fb'] },
  { id: 'fire', css: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', colors: ['#ff9a9e', '#fecfef'] },
  { id: 'midnight', css: 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)', colors: ['#2b5876', '#4e4376'] },
  { id: 'emerald', css: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', colors: ['#11998e', '#38ef7d'] },
  { id: 'peach', css: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', colors: ['#fbc2eb', '#a6c1ee'] },
  { id: 'coral', css: 'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)', colors: ['#ff758c', '#ff7eb3'] },
  { id: 'arctic', css: 'linear-gradient(135deg, #74ebd5 0%, #9face6 100%)', colors: ['#74ebd5', '#9face6'] },
  { id: 'dusk', css: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', colors: ['#a18cd1', '#fbc2eb'] },
  { id: 'lemon', css: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)', colors: ['#d4fc79', '#96e6a1'] },
  { id: 'grape', css: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)', colors: ['#6a11cb', '#2575fc'] },
  { id: 'candy', css: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', colors: ['#fa709a', '#fee140'] },
  { id: 'steel', css: 'linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)', colors: ['#bdc3c7', '#2c3e50'] },
  { id: 'aurora', css: 'linear-gradient(135deg, #00c6fb 0%, #005bea 100%)', colors: ['#00c6fb', '#005bea'] },
];

interface UnsplashPhoto {
  id: string;
  urls: { small: string; regular: string };
  user: { name: string };
}

interface BackgroundLibraryProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (backgroundImage: string) => void;
  currentBackground?: string;
}

export default function BackgroundLibrary({ visible, onClose, onSelect, currentBackground }: BackgroundLibraryProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('photos');
  const [query, setQuery] = useState('');
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const searchPhotos = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-unsplash', {
        body: { query: searchQuery, per_page: 24, orientation: 'landscape' },
      });
      if (error) throw error;
      setPhotos(data?.results || []);
    } catch (err: any) {
      console.warn('Unsplash search failed:', err);
      Alert.alert(t('settings', 'error'), t('backgroundLib', 'searchFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleCategoryPress = useCallback((category: string) => {
    setSelectedCategory(category);
    searchPhotos(category);
  }, [searchPhotos]);

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      setSelectedCategory(null);
      searchPhotos(query.trim());
    }
  }, [query, searchPhotos]);

  const handleSelectPhoto = useCallback((photo: UnsplashPhoto) => {
    onSelect(photo.urls.regular);
    onClose();
  }, [onSelect, onClose]);

  const handleSelectGradient = useCallback((gradient: typeof GRADIENTS[0]) => {
    onSelect(gradient.css);
    onClose();
  }, [onSelect, onClose]);

  const handleRemoveBackground = useCallback(() => {
    onSelect('');
    onClose();
  }, [onSelect, onClose]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('backgroundLib', 'title')}</Text>
          <IconButton icon="close" iconColor="#888" size={20} onPress={onClose} />
        </View>

        {/* Tabs */}
        <SegmentedButtons
          value={tab}
          onValueChange={setTab}
          buttons={[
            { value: 'photos', label: t('backgroundLib', 'photos'), icon: 'image-outline' },
            { value: 'gradients', label: t('backgroundLib', 'gradients'), icon: 'gradient-vertical' },
          ]}
          style={styles.tabs}
          theme={{ colors: { secondaryContainer: '#e8622c', onSecondaryContainer: '#fff' } }}
        />

        {tab === 'photos' ? (
          <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
            {/* Search */}
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder={t('backgroundLib', 'searchPlaceholder')}
                placeholderTextColor="#666"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <Pressable onPress={handleSearch} style={styles.searchBtn}>
                <MaterialCommunityIcons name="magnify" size={22} color="#fff" />
              </Pressable>
            </View>

            {/* Categories */}
            <View style={styles.categoryRow}>
              {PHOTO_CATEGORIES.map(cat => (
                <Pressable
                  key={cat}
                  onPress={() => handleCategoryPress(cat)}
                  style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                >
                  <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>
                    {t('backgroundLib', `cat_${cat}`)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Results */}
            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#e8622c" />
              </View>
            ) : photos.length > 0 ? (
              <View style={styles.photoGrid}>
                {photos.map(photo => (
                  <Pressable key={photo.id} onPress={() => handleSelectPhoto(photo)} style={styles.photoThumb}>
                    <Image source={{ uri: photo.urls.small }} style={styles.photoImage} />
                    <Text style={styles.photoCredit} numberOfLines={1}>{photo.user.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.centered}>
                <MaterialCommunityIcons name="image-search-outline" size={48} color="#2d2d44" />
                <Text style={styles.emptyText}>{t('backgroundLib', 'searchHint')}</Text>
              </View>
            )}
          </BottomSheetScrollView>
        ) : (
          <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.gradientGrid}>
              {GRADIENTS.map(g => (
                <Pressable key={g.id} onPress={() => handleSelectGradient(g)} style={styles.gradientThumb}>
                  <View style={[styles.gradientPreview, { backgroundColor: g.colors[0] }]}>
                    <View style={[styles.gradientOverlay, { backgroundColor: g.colors[1], opacity: 0.6 }]} />
                  </View>
                </Pressable>
              ))}
            </View>
          </BottomSheetScrollView>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable onPress={handleRemoveBackground} style={styles.removeBtn}>
            <MaterialCommunityIcons name="image-off-outline" size={18} color="#cc3333" />
            <Text style={styles.removeBtnText}>{t('backgroundLib', 'removeBackground')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    zIndex: 100,
  },
  container: {
    flex: 1,
    marginTop: 60,
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  tabs: { marginHorizontal: 16, marginBottom: 12 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput: {
    flex: 1,
    backgroundColor: '#252540',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  searchBtn: {
    width: 44, height: 44,
    borderRadius: 10,
    backgroundColor: '#e8622c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#252540',
  },
  categoryChipActive: { backgroundColor: '#e8622c' },
  categoryChipText: { color: '#aaa', fontSize: 13 },
  categoryChipTextActive: { color: '#fff' },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: '#666', marginTop: 12, fontSize: 14 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: {
    width: THUMB_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#252540',
  },
  photoImage: { width: '100%', height: THUMB_SIZE * 0.65, borderRadius: 10 },
  photoCredit: { color: '#888', fontSize: 10, paddingHorizontal: 6, paddingVertical: 4 },
  gradientGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gradientThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE * 0.65,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientPreview: {
    flex: 1,
    borderRadius: 12,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0, left: '50%', right: 0, bottom: 0,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
    alignItems: 'center',
  },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  removeBtnText: { color: '#cc3333', fontSize: 14 },
});
