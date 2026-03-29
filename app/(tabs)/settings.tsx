import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking, Image } from 'react-native';
import { Text, List, Divider, Button, Avatar, Switch } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage, LANGUAGES } from '@/src/contexts/LanguageContext';
import { useTranslation } from '@/src/translations';
import { supabase } from '@/src/lib/supabase';
import { isBiometricEnabled, setBiometricEnabled, hasBiometricHardware } from '@/src/components/BiometricLock';
import { useAppTheme, type ThemeMode } from '@/src/contexts/ThemeContext';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { language } = useLanguage();
  const { t } = useTranslation();
  const { mode: themeMode, setMode: setThemeMode, colors } = useAppTheme();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);

  useEffect(() => {
    (async () => {
      const available = await hasBiometricHardware();
      setBiometricAvailable(available);
      if (available) {
        const enabled = await isBiometricEnabled();
        setBiometricOn(enabled);
      }
    })();
  }, []);

  const currentLang = LANGUAGES.find(l => l.code === language);

  const { data: avatarSeed } = useQuery({
    queryKey: ['avatar-seed', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_seed')
        .eq('id', user!.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data?.avatar_seed || 'default';
    },
    enabled: !!user,
  });

  const handleSignOut = () => {
    Alert.alert(t('settings', 'signOut'), t('settings', 'signOutConfirm'), [
      { text: t('settings', 'cancel'), style: 'cancel' },
      { text: t('settings', 'signOut'), style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Profile section */}
      <View style={styles.profileSection}>
        {avatarSeed && avatarSeed !== 'default' ? (
          <Image
            source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${avatarSeed}` }}
            style={styles.avatarImage}
          />
        ) : (
          <Avatar.Icon size={80} icon="account" style={styles.avatar} />
        )}
        <Text variant="titleMedium" style={styles.email}>{user?.email}</Text>
      </View>

      <Divider style={styles.divider} />

      {/* Konto */}
      <List.Section>
        <List.Subheader style={styles.subheader}>{t('settings', 'account')}</List.Subheader>
        <List.Item
          title={t('settings', 'profile')}
          description={t('settings', 'manageProfile')}
          left={props => <List.Icon {...props} icon="account-outline" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => router.push('/settings/profile')}
        />
        <List.Item
          title={t('settings', 'company')}
          description={t('settings', 'manageCompanyTeam')}
          left={props => <List.Icon {...props} icon="domain" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => router.push('/settings/company')}
        />
        <List.Item
          title={t('settings', 'language')}
          description={currentLang?.name ?? 'English'}
          left={props => <List.Icon {...props} icon="translate" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => router.push('/settings/language')}
        />
        <List.Item
          title={t('settings', 'appearance')}
          description={themeMode === 'light' ? t('settings', 'lightMode') : themeMode === 'dark' ? t('settings', 'darkMode') : t('settings', 'systemMode')}
          left={props => <List.Icon {...props} icon={themeMode === 'light' ? 'white-balance-sunny' : themeMode === 'dark' ? 'moon-waning-crescent' : 'theme-light-dark'} color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => {
            const modes: ThemeMode[] = ['system', 'light', 'dark'];
            const next = modes[(modes.indexOf(themeMode) + 1) % modes.length];
            setThemeMode(next);
          }}
        />
      </List.Section>

      {/* Security */}
      {biometricAvailable && (
        <>
          <Divider style={styles.divider} />
          <List.Section>
            <List.Subheader style={styles.subheader}>{t('settings', 'security')}</List.Subheader>
            <List.Item
              title={t('biometric', 'appLock')}
              description={t('biometric', 'appLockDesc')}
              left={props => <List.Icon {...props} icon="fingerprint" color="#e8622c" />}
              right={() => (
                <Switch
                  value={biometricOn}
                  onValueChange={async (val) => {
                    await setBiometricEnabled(val);
                    setBiometricOn(val);
                  }}
                  color="#e8622c"
                />
              )}
              titleStyle={styles.itemTitle}
              descriptionStyle={styles.itemDesc}
            />
          </List.Section>
        </>
      )}

      <Divider style={styles.divider} />

      {/* Notiser */}
      <List.Section>
        <List.Subheader style={styles.subheader}>{t('settings', 'notifications')}</List.Subheader>
        <List.Item
          title={t('settings', 'notificationSettings')}
          description={t('settings', 'managePushNotifications')}
          left={props => <List.Icon {...props} icon="bell-outline" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => router.push('/settings/notifications-preferences')}
        />
      </List.Section>

      <Divider style={styles.divider} />

      {/* Prenumeration */}
      <List.Section>
        <List.Subheader style={styles.subheader}>{t('settings', 'subscription')}</List.Subheader>
        <List.Item
          title={t('settings', 'mySubscription')}
          description={t('settings', 'managePlan')}
          left={props => <List.Icon {...props} icon="credit-card-outline" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => router.push('/settings/subscription')}
        />
      </List.Section>

      <Divider style={styles.divider} />

      {/* Integrationer */}
      <List.Section>
        <List.Subheader style={styles.subheader}>{t('settings', 'integrations')}</List.Subheader>
        <List.Item
          title={t('settings', 'apiKeys')}
          description={t('settings', 'manageApiAccess')}
          left={props => <List.Icon {...props} icon="key-outline" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => router.push('/settings/api-keys')}
        />
        <List.Item
          title={t('settings', 'emailConfig')}
          description={t('settings', 'smtpAndTemplates')}
          left={props => <List.Icon {...props} icon="email-outline" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => router.push('/settings/email-setup')}
        />
        <List.Item
          title={t('settings', 'domains')}
          description={t('settings', 'customDomains')}
          left={props => <List.Icon {...props} icon="web" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => router.push('/settings/domains')}
        />
      </List.Section>

      <Divider style={styles.divider} />

      {/* Om */}
      <List.Section>
        <List.Subheader style={styles.subheader}>{t('settings', 'about')}</List.Subheader>
        <List.Item
          title={t('settings', 'openWebApp')}
          description="rocketformspro.com"
          left={props => <List.Icon {...props} icon="open-in-new" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => Linking.openURL('https://rocketformspro.com')}
        />
        <List.Item
          title={t('settings', 'version')}
          description={Constants.expoConfig?.version ?? '1.0.0'}
          left={props => <List.Icon {...props} icon="information-outline" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
        />
      </List.Section>

      <Button
        mode="outlined"
        onPress={handleSignOut}
        style={styles.signOutButton}
        textColor="#ef4444"
        icon="logout"
      >
        {t('settings', 'signOut')}
      </Button>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  profileSection: { alignItems: 'center', paddingVertical: 32 },
  avatar: { backgroundColor: '#2d2d44' },
  avatarImage: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2d2d44' },
  email: { color: '#fff', marginTop: 12 },
  divider: { backgroundColor: '#2d2d44' },
  subheader: { color: '#888' },
  itemTitle: { color: '#fff' },
  itemDesc: { color: '#888' },
  signOutButton: {
    marginHorizontal: 16,
    marginTop: 24,
    borderColor: '#ef4444',
    borderRadius: 12,
  },
});
