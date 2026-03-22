import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, Switch, List, Divider, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/src/lib/supabase';

interface NotificationPrefs {
  email_notifications: boolean;
  push_notifications: boolean;
  in_app_notifications: boolean;
  form_submissions: boolean;
  system_alerts: boolean;
  webhook_errors: boolean;
  daily_summary: boolean;
  weekly_report: boolean;
}

const defaultPrefs: NotificationPrefs = {
  email_notifications: true,
  push_notifications: false,
  in_app_notifications: true,
  form_submissions: true,
  system_alerts: true,
  webhook_errors: false,
  daily_summary: false,
  weekly_report: false,
};

export default function NotificationsPreferencesScreen() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;

      const saved = user?.user_metadata?.notification_preferences;
      if (saved) {
        setPrefs({ ...defaultPrefs, ...saved });
      }
    } catch (err: any) {
      Alert.alert('Fel', err.message ?? 'Kunde inte ladda inställningar');
    } finally {
      setLoading(false);
    }
  };

  const updatePref = async (key: keyof NotificationPrefs, value: boolean) => {
    // If enabling push notifications, request permission first
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
        Alert.alert(
          'Behörighet krävs',
          'Du behöver aktivera push-notiser i enhetens inställningar för att använda denna funktion.',
        );
        return false;
      }
      return true;
    } catch {
      Alert.alert('Fel', 'Kunde inte begära behörighet för push-notiser');
      return false;
    }
  };

  const savePreferences = async (prefsToSave: NotificationPrefs) => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          notification_preferences: prefsToSave,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      Alert.alert('Fel', err.message ?? 'Kunde inte spara inställningar');
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Test', 'Push-notiser stöds inte på webben.');
        return;
      }

      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Behörighet saknas', 'Aktivera push-notiser först.');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Rocket Forms Pro',
          body: 'Detta är en testnotis! Allt fungerar korrekt.',
        },
        trigger: null,
      });
    } catch (err: any) {
      Alert.alert('Fel', err.message ?? 'Kunde inte skicka testnotis');
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
        <Stack.Screen options={{ title: 'Notiser', headerBackTitle: 'Tillbaka' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e8622c" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Notiser', headerBackTitle: 'Tillbaka' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Channels */}
        <List.Section>
          <List.Subheader style={styles.subheader}>Kanaler</List.Subheader>
          {renderToggle('email_notifications', 'E-postnotiser', 'Få notiser via e-post')}
          {renderToggle('push_notifications', 'Push-notiser', 'Notiser direkt till enheten')}
          {renderToggle('in_app_notifications', 'In-app-notiser', 'Visa notiser i appen')}
        </List.Section>

        <Divider style={styles.divider} />

        {/* Events */}
        <List.Section>
          <List.Subheader style={styles.subheader}>Händelser</List.Subheader>
          {renderToggle('form_submissions', 'Formulärinskickningar', 'När ett formulär skickas in')}
          {renderToggle('system_alerts', 'Systemaviseringar', 'Viktiga systemmeddelanden')}
          {renderToggle('webhook_errors', 'Webhook-fel', 'När en webhook misslyckas')}
        </List.Section>

        <Divider style={styles.divider} />

        {/* Summaries */}
        <List.Section>
          <List.Subheader style={styles.subheader}>Sammanfattningar</List.Subheader>
          {renderToggle('daily_summary', 'Daglig sammanfattning', 'Daglig översikt via e-post')}
          {renderToggle('weekly_report', 'Veckorapport', 'Veckovis sammanfattning')}
        </List.Section>

        <Divider style={styles.divider} />

        <Button
          mode="outlined"
          icon="bell-ring"
          onPress={handleTestNotification}
          style={styles.testButton}
          textColor="#e8622c"
        >
          Testa notis
        </Button>

        {saving && (
          <Text style={styles.savingText}>Sparar...</Text>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121220',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingBottom: 16,
  },
  subheader: {
    color: '#888',
  },
  toggleItem: {
    paddingVertical: 4,
  },
  itemTitle: {
    color: '#fff',
  },
  itemDesc: {
    color: '#888',
  },
  divider: {
    backgroundColor: '#2d2d44',
  },
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
