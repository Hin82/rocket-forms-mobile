import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTranslation } from '@/src/translations';
import { useAppTheme } from '@/src/contexts/ThemeContext';

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const handleReset = async () => {
    if (!email.trim()) { setError(t('auth', 'enterEmail')); return; }
    setLoading(true);
    setError('');
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      setError(err.message || t('auth', 'somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.headerBg }]}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={[styles.title, { color: colors.text }]}>
          {sent ? t('auth', 'emailSent') : t('auth', 'resetPassword')}
        </Text>
        {sent ? (
          <>
            <Text style={[styles.text, { color: colors.textSecondary }]}>{t('auth', 'checkInbox')}</Text>
            <Button mode="contained" onPress={() => router.replace('/(auth)/login')} style={styles.button}>
              {t('auth', 'toLogin')}
            </Button>
          </>
        ) : (
          <View style={styles.form}>
            <TextInput label={t('auth', 'email')} value={email} onChangeText={setEmail}
              autoCapitalize="none" keyboardType="email-address" mode="outlined"
              textColor={colors.text} outlineColor={colors.border} activeOutlineColor={colors.accent}
              style={[styles.input, { backgroundColor: colors.headerBg }]}
              theme={{ colors: { onSurfaceVariant: colors.textSecondary } }} />
            {error ? <HelperText type="error" visible>{error}</HelperText> : null}
            <Button mode="contained" onPress={handleReset} loading={loading} style={styles.button}>
              {t('auth', 'sendResetLink')}
            </Button>
            <Button mode="text" onPress={() => router.back()}>{t('auth', 'back')}</Button>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  text: { textAlign: 'center', marginBottom: 24 },
  form: { gap: 12 },
  input: {},
  button: { marginTop: 8, borderRadius: 12, backgroundColor: '#e8622c' },
});
