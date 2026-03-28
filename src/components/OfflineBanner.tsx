import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { useTranslation } from '@/src/translations';

export function useIsOffline() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  return offline;
}

export default function OfflineBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const offline = useIsOffline();
  const [isVisible, setIsVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    if (offline) {
      setIsVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else if (isVisible) {
      Animated.timing(slideAnim, {
        toValue: -60 - insets.top,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsVisible(false));
    }
  }, [offline]);

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.banner, { paddingTop: insets.top + 6, transform: [{ translateY: slideAnim }] }]}>
      <MaterialCommunityIcons name="wifi-off" size={16} color="#fff" />
      <Text style={styles.text}>{t('settings', 'offlineMessage')}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#cc3333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 6,
    zIndex: 1000,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
