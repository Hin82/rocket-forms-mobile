import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, Switch, List, Divider, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTranslation } from '@/src/translations';

// Match web app's notification_preferences table exactly
interface NotificationPrefs {
  email_notifications: boolean;
  push_notifications: boolean;
  in_app_notifications: boolean;
  form_submissions: boolean;
  system_alerts: boolean;
  webhook_failures: boolean;  // web app uses "webhook_failures", not "webhook_errors"
  daily_digest: boolean;      // web app uses "daily_digest", not "daily_summary"
  weekly_report: boolean;
  team_announcements: boolean;
  form_activities: boolean;
  mentions: boolean;
  team_invitations: boolean;
}

const defaultPrefs: NotificationPrefs = {
  email_notifications: true,
  push_notifications: true,
  in_app_notifications: true,
  form_submissions: true,
  system_alerts: true,
  webhook_failures: true,
  daily_digest: false,
  weekly_report: false,
  team_announcements: true,
  form_activities: true,
  mentions: true,
  team_invitations: true,
};

export default function NotificationsPreferencesScreen() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      if (!user) return;

      // Read from notification_preferences table (same as web app)
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPrefs({
          email_notifications: data.email_notifications ?? defaultPrefs.email_notifications,
          push_notifications: data.push_notifications ?? defaultPrefs.push_notifications,
          in_app_notifications: data.in_app_notifications ?? defaultPrefs.in_app_notifications,
          form_submissions: data.form_submissions ?? defaultPrefs.form_submissions,
          system_alerts: data.system_alerts ?? defaultPrefs.system_alerts,
          webhook_failures: data.webhook_failures ?? defaultPrefs.webhook_failures,
          daily_digest: data.daily_digest ?? defaultPrefs.daily_digest,
          weekly_report: data.weekly_report ?? defaultPrefs.weekly_report,
          team_announcements: data.team_announcements ?? defaultPrefs.team_announcements,
          form_activities: data.form_activities ?? defaultPrefs.form_activities,
          mentions: data.mentions ?? defaultPrefs.mentions,
          team_invitations: data.team_invitations ?? defaultPrefs.team_invitations,
        });
      }
    } catch (err: any) {
      Alert.alert(t('settings', 'error'), err.message ?? t('settings', 'couldNotLoadSettings'));
    } finally {
      setLoading(false);
    }
  };

  const updatePref = async (key: keyof NotificationPrefs, value: boolean) => {
    if (key === 'push_notifications' && value) {
      const granted = await requestPushPermission();
      if (!granted) return;
    }

    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    await savePreferences(updated);
  };

  const requestPushPermission = async (): Promise<boolean> => {
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing === 'granted') return true;

      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('settings', 'permissionRequired'), t('settings', 'enablePushInSettings'));
        return false;
      }
      return true;
    } catch {
      Alert.alert(t('settings', 'error'), t('settings', 'couldNotRequestPermission'));
      return false;
    }
  };

  const savePreferences = async (prefsToSave: NotificationPrefs) => {
    setSaving(true);
    try {
      if (!user) return;

      // Upsert to notification_preferences table (same as web app)
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...prefsToSave,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;
    } catch (err: any) {
      Alert.alert(t('settings', 'error'), err.message ?? t('settings', 'couldNotSaveSettings'));
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert(t('settings', 'test'), t('settings', 'pushNotSupported'));
        return;
      }

      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('settings', 'permissionMissing'), t('settings', 'enablePushFirst'));
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Rocket Forms Pro',
          body: t('settings', 'testNotificationBody'),
        },
        trigger: null,
      });
    } catch (err: any) {
      Alert.alert(t('settings', 'error'), err.message ?? t('settings', 'couldNotSendTest'));
    }
  };

  const renderToggle = (
    key: keyof NotificationPrefs,
    title: string,
    description?: string,
  ) => (
    <List.Item
      title={title}
      description={description}
      titleStyle={styles.itemTitle}
      descriptionStyle={styles.itemDesc}
      right={() => (
        <Switch
          value={prefs[key]}
          onValueChange={(value) => updatePref(key, value)}
          color="#e8622c"
        />
      )}
      style={styles.toggleItem}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: t('settings', 'notifications'), headerBackTitle: t('auth', 'back') }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e8622c" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: t('settings', 'notifications'), headerBackTitle: t('auth', 'back') }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Channels */}
        <List.Section>
          <List.Subheader style={styles.subheader}>{t('settings', 'channels')}</List.Subheader>
          {renderToggle('email_notifications', t('settings', 'emailNotifications'), t('settings', 'receiveViaEmail'))}
          {renderToggle('push_notifications', t('settings', 'pushNotifications'), t('settings', 'pushToDevice'))}
          {renderToggle('in_app_notifications', t('settings', 'inAppNotifications'), t('settings', 'showInApp'))}
        </List.Section>

        <Divider style={styles.divider} />

        {/* Events */}
        <List.Section>
          <List.Subheader style={styles.subheader}>{t('settings', 'events')}</List.Subheader>
          {renderToggle('form_submissions', t('settings', 'formSubmissions'), t('settings', 'whenFormSubmitted'))}
          {renderToggle('system_alerts', t('settings', 'systemAlerts'), t('settings', 'importantMessages'))}
          {renderToggle('webhook_failures', t('settings', 'webhookErrors'), t('settings', 'whenWebhookFails'))}
          {renderToggle('form_activities', t('settings', 'formActivities'), t('settings', 'formActivitiesDesc'))}
          {renderToggle('mentions', t('settings', 'mentionsTitle'), t('settings', 'mentionsDesc'))}
        </List.Section>

        <Divider style={styles.divider} />

        {/* Team */}
        <List.Section>
          <List.Subheader style={styles.subheader}>{t('settings', 'teamSection')}</List.Subheader>
          {renderToggle('team_announcements', t('settings', 'teamAnnouncements'), t('settings', 'teamAnnouncementsDesc'))}
          {renderToggle('team_invitations', t('settings', 'teamInvitations'), t('settings', 'teamInvitationsDesc'))}
        </List.Section>

        <Divider style={styles.divider} />

        {/* Summaries */}
        <List.Section>
          <List.Subheader style={styles.subheader}>{t('settings', 'summaries')}</List.Subheader>
          {renderToggle('daily_digest', t('settings', 'dailySummary'), t('settings', 'dailyOverview'))}
          {renderToggle('weekly_report', t('settings', 'weeklyReport'), t('settings', 'weeklySummary'))}
        </List.Section>

        <Divider style={styles.divider} />

        <Button
          mode="outlined"
          icon="bell-ring"
          onPress={handleTestNotification}
          style={styles.testButton}
          textColor="#e8622c"
        >
          {t('settings', 'testNotification')}
        </Button>

        {saving && (
          <Text style={styles.savingText}>{t('settings', 'saving')}</Text>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 16 },
  subheader: { color: '#888' },
  toggleItem: { paddingVertical: 4 },
  itemTitle: { color: '#fff' },
  itemDesc: { color: '#888' },
  divider: { backgroundColor: '#2d2d44' },
  testButton: {
    marginHorizontal: 16,
    marginTop: 24,
    borderColor: '#e8622c',
    borderRadius: 12,
  },
  savingText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 13,
  },
});
