import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useAppTheme } from '@/src/contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

function SkeletonBox({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;
  const { colors } = useAppTheme();

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: colors.border, opacity },
        style,
      ]}
    />
  );
}

export function FormListSkeleton() {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar skeleton */}
      <SkeletonBox height={48} borderRadius={12} style={styles.searchSkeleton} />

      {/* Section header */}
      <View style={styles.sectionSkeleton}>
        <SkeletonBox width={20} height={20} borderRadius={4} />
        <SkeletonBox width={120} height={16} />
      </View>

      {/* Form cards */}
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={[styles.cardSkeleton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SkeletonBox width="70%" height={18} />
          <View style={styles.metaSkeleton}>
            <SkeletonBox width={40} height={14} />
            <SkeletonBox width={40} height={14} />
            <SkeletonBox width={80} height={14} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function FormDetailSkeleton() {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header card */}
      <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
        <SkeletonBox width="60%" height={24} />
        <View style={styles.chipsSkeleton}>
          <SkeletonBox width={80} height={28} borderRadius={14} />
          <SkeletonBox width={100} height={28} borderRadius={14} />
        </View>
        <SkeletonBox width={120} height={14} />
      </View>

      {/* Action buttons */}
      <View style={styles.actionsSkeleton}>
        <SkeletonBox height={48} borderRadius={12} />
        <SkeletonBox height={44} borderRadius={12} />
        <SkeletonBox height={44} borderRadius={12} />
      </View>
    </View>
  );
}

export function SubmissionsSkeleton() {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <View key={i} style={[styles.submissionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SkeletonBox width={36} height={36} borderRadius={18} />
          <View style={styles.submissionDetails}>
            <SkeletonBox width={140} height={14} />
            <SkeletonBox width="90%" height={12} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function SettingsSkeleton() {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Avatar */}
      <View style={styles.avatarSkeleton}>
        <SkeletonBox width={80} height={80} borderRadius={40} />
        <SkeletonBox width={160} height={16} style={{ marginTop: 12 }} />
      </View>

      {/* Settings items */}
      {[1, 2, 3, 4, 5, 6].map(i => (
        <View key={i} style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <SkeletonBox width={24} height={24} borderRadius={12} />
          <View style={{ flex: 1, gap: 4 }}>
            <SkeletonBox width="50%" height={16} />
            <SkeletonBox width="70%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  searchSkeleton: { marginBottom: 16 },
  sectionSkeleton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 8 },
  cardSkeleton: {
    borderRadius: 12, padding: 16, marginBottom: 8, gap: 10,
    borderWidth: 1,
  },
  metaSkeleton: { flexDirection: 'row', gap: 12 },
  detailCard: {
    borderRadius: 16, padding: 20, marginBottom: 16, gap: 12,
  },
  chipsSkeleton: { flexDirection: 'row', gap: 8 },
  actionsSkeleton: { gap: 10 },
  submissionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1,
  },
  submissionDetails: { flex: 1 },
  avatarSkeleton: { alignItems: 'center', paddingVertical: 24 },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14,
    borderBottomWidth: 1,
  },
});
