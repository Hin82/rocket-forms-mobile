import React, { useState, useRef } from 'react';
import {
  View, StyleSheet, FlatList, Dimensions, Animated, Pressable, Image,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from '@/src/translations';
import { useAppTheme } from '@/src/contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_KEY = 'onboarding_completed';

export async function hasSeenOnboarding(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(ONBOARDING_KEY);
  return val === 'true';
}

export async function markOnboardingSeen(): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

const SLIDES = [
  { icon: 'rocket-launch-outline', color: '#e8622c', titleKey: 'welcome', descKey: 'welcomeDesc' },
  { icon: 'form-textbox', color: '#4facfe', titleKey: 'createForms', descKey: 'createFormsDesc' },
  { icon: 'chart-line', color: '#43e97b', titleKey: 'trackResults', descKey: 'trackResultsDesc' },
];

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    await markOnboardingSeen();
    onComplete();
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.logoRow}>
        <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.appName, { color: colors.text }]}>Rocket Forms Pro</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <View style={[styles.iconCircle, { backgroundColor: item.color + '20' }]}>
              <MaterialCommunityIcons name={item.icon as any} size={64} color={item.color} />
            </View>
            <Text style={[styles.slideTitle, { color: colors.text }]}>{t('onboarding', item.titleKey)}</Text>
            <Text style={[styles.slideDesc, { color: colors.textSecondary }]}>{t('onboarding', item.descKey)}</Text>
          </View>
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={(e) => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
        scrollEventThrottle={16}
      />

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH];
          return (
            <Animated.View key={i} style={[styles.dot, {
              backgroundColor: colors.accent,
              width: scrollX.interpolate({ inputRange, outputRange: [8, 24, 8], extrapolate: 'clamp' }),
              opacity: scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' }),
            }]} />
          );
        })}
      </View>

      <View style={styles.buttonsRow}>
        {!isLast ? (
          <>
            <Pressable onPress={handleFinish} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>{t('onboarding', 'skip')}</Text>
            </Pressable>
            <Button mode="contained" onPress={handleNext} buttonColor={colors.accent} style={styles.nextBtn}>
              {t('onboarding', 'next')}
            </Button>
          </>
        ) : (
          <Button mode="contained" onPress={handleFinish} buttonColor={colors.accent} style={styles.getStartedBtn} icon="arrow-right">
            {t('onboarding', 'getStarted')}
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingBottom: 40 },
  logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 },
  logo: { width: 36, height: 36, borderRadius: 18 },
  appName: { fontSize: 18, fontWeight: '700' },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  slideTitle: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  slideDesc: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginVertical: 30 },
  dot: { height: 8, borderRadius: 4 },
  buttonsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30 },
  skipBtn: { padding: 12 },
  skipText: { fontSize: 16 },
  nextBtn: { borderRadius: 12, paddingHorizontal: 16 },
  getStartedBtn: { flex: 1, borderRadius: 12, paddingVertical: 4 },
});
