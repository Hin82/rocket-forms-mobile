import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { Text, TextInput, Button, Portal, Modal, SegmentedButtons } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTranslation } from '@/src/translations';
import { useAppTheme } from '@/src/contexts/ThemeContext';

const SHAKE_THRESHOLD = 1.8;
const SHAKE_COOLDOWN = 3000; // 3 seconds between shakes

export default function ShakeFeedback() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'bug' | 'feature' | 'general'>('general');
  const [sending, setSending] = useState(false);
  const lastShake = React.useRef(0);

  useEffect(() => {
    Accelerometer.setUpdateInterval(100);

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      if (magnitude > SHAKE_THRESHOLD && now - lastShake.current > SHAKE_COOLDOWN) {
        lastShake.current = now;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setVisible(true);
      }
    });

    return () => subscription.remove();
  }, []);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);

    try {
      const { error } = await supabase.from('support_tasks').insert({
        user_id: user?.id,
        title: `[${type.toUpperCase()}] ${message.trim().slice(0, 60)}`,
        description: message.trim(),
        category: type === 'bug' ? 'bug' : type === 'feature' ? 'feature_request' : 'general',
        priority: type === 'bug' ? 'high' : 'medium',
        status: 'open',
        user_email: user?.email,
        user_name: user?.email?.split('@')[0],
        metadata: {
          created_via: 'shake_feedback',
          platform: Platform.OS,
          app_version: Constants.expoConfig?.version,
        },
      });
      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('feedback', 'thankYou'), t('feedback', 'feedbackSent'));
      setMessage('');
      setVisible(false);
    } catch (err: any) {
      Alert.alert(t('settings', 'error'), err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={[styles.modal, { backgroundColor: colors.headerBg }]}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="message-alert-outline" size={24} color={colors.accent} />
          <Text style={[styles.title, { color: colors.text }]}>{t('feedback', 'title')}</Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('feedback', 'subtitle')}</Text>

        <SegmentedButtons
          value={type}
          onValueChange={v => setType(v as any)}
          buttons={[
            { value: 'bug', label: t('feedback', 'bug'), icon: 'bug-outline' },
            { value: 'feature', label: t('feedback', 'feature'), icon: 'lightbulb-outline' },
            { value: 'general', label: t('feedback', 'general'), icon: 'chat-outline' },
          ]}
          style={styles.segmented}
          theme={{ colors: { secondaryContainer: colors.accent, onSecondaryContainer: '#fff' } }}
        />

        <TextInput
          label={t('feedback', 'message')}
          value={message}
          onChangeText={setMessage}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={[styles.input, { backgroundColor: colors.headerBg }]}
          textColor={colors.text}
          outlineColor={colors.border}
          activeOutlineColor={colors.accent}
          theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
        />

        <View style={styles.actions}>
          <Button mode="text" onPress={() => setVisible(false)} textColor={colors.textSecondary}>{t('settings', 'cancel')}</Button>
          <Button mode="contained" onPress={handleSend} loading={sending} disabled={!message.trim() || sending} buttonColor={colors.accent}>
            {t('feedback', 'send')}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { margin: 20, borderRadius: 16, padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13, marginBottom: 16 },
  segmented: { marginBottom: 16 },
  input: { marginBottom: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
