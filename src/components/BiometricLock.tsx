import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Image, AppState, AppStateStatus } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from '@/src/translations';

const BIOMETRIC_ENABLED_KEY = 'biometric_lock_enabled';

export async function isBiometricEnabled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return val === 'true';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function hasBiometricHardware(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

interface BiometricLockProps {
  children: React.ReactNode;
}

export default function BiometricLock({ children }: BiometricLockProps) {
  const { t } = useTranslation();
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(true);

  const authenticate = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('biometric', 'unlockApp'),
        fallbackLabel: t('biometric', 'usePasscode'),
        cancelLabel: t('settings', 'cancel'),
        disableDeviceFallback: false,
      });
      if (result.success) {
        setLocked(false);
      }
    } catch {
      // Auth failed or cancelled
    }
  }, [t]);

  useEffect(() => {
    (async () => {
      const enabled = await isBiometricEnabled();
      if (enabled) {
        setLocked(true);
        setChecking(false);
        authenticate();
      } else {
        setLocked(false);
        setChecking(false);
      }
    })();
  }, []);

  // Re-lock when app comes back from background
  useEffect(() => {
    const handleAppState = async (state: AppStateStatus) => {
      if (state === 'active') {
        const enabled = await isBiometricEnabled();
        if (enabled) {
          setLocked(true);
          authenticate();
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [authenticate]);

  if (checking) return null;

  if (locked) {
    return (
      <View style={styles.container}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Rocket Forms Pro</Text>
        <MaterialCommunityIcons name="lock-outline" size={48} color="#e8622c" style={styles.lockIcon} />
        <Text style={styles.message}>{t('biometric', 'lockedMessage')}</Text>
        <Button
          mode="contained"
          onPress={authenticate}
          style={styles.unlockBtn}
          buttonColor="#e8622c"
          icon="fingerprint"
        >
          {t('biometric', 'unlock')}
        </Button>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121220',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  logo: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 40 },
  lockIcon: { marginBottom: 16 },
  message: { color: '#888', fontSize: 15, textAlign: 'center', marginBottom: 30 },
  unlockBtn: { borderRadius: 12, paddingHorizontal: 24 },
});
