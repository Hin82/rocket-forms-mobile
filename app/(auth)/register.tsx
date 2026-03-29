import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTranslation } from '@/src/translations';
import { useAppTheme } from '@/src/contexts/ThemeContext';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { signUp } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      setError(t('auth', 'fillAllFields'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth', 'passwordsMismatch'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth', 'passwordTooShort'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signUp(email.trim(), password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || t('auth', 'somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.headerBg }]}>
        <View style={styles.content}>
          <Text variant="headlineMedium" style={[styles.successTitle, { color: colors.text }]}>{t('auth', 'accountCreated')}</Text>
          <Text variant="bodyLarge" style={[styles.successText, { color: colors.textSecondary }]}>
            {t('auth', 'checkEmail')}
          </Text>
          <Button mode="contained" onPress={() => router.replace('/(auth)/login')} style={styles.button}>
            {t('auth', 'toLogin')}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.headerBg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <Text variant="headlineLarge" style={[styles.title, { color: colors.text }]}>{t('auth', 'createAccountTitle')}</Text>

        <View style={styles.form}>
          <TextInput label={t('auth', 'email')} value={email} onChangeText={setEmail}
            autoCapitalize="none" keyboardType="email-address" mode="outlined"
            textColor={colors.text} outlineColor={colors.border} activeOutlineColor={colors.accent}
            style={[styles.input, { backgroundColor: colors.headerBg }]}
            theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
            left={<TextInput.Icon icon="email-outline" />} />
          <TextInput label={t('auth', 'password')} value={password} onChangeText={setPassword}
            secureTextEntry mode="outlined"
            textColor={colors.text} outlineColor={colors.border} activeOutlineColor={colors.accent}
            style={[styles.input, { backgroundColor: colors.headerBg }]}
            theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
            left={<TextInput.Icon icon="lock-outline" />} />
          <TextInput label={t('auth', 'confirmPassword')} value={confirmPassword} onChangeText={setConfirmPassword}
            secureTextEntry mode="outlined"
            textColor={colors.text} outlineColor={colors.border} activeOutlineColor={colors.accent}
            style={[styles.input, { backgroundColor: colors.headerBg }]}
            theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
            left={<TextInput.Icon icon="lock-check-outline" />} />

          {error ? <HelperText type="error" visible>{error}</HelperText> : null}

          <Button mode="contained" onPress={handleRegister} loading={loading} disabled={loading}
            style={styles.button} contentStyle={styles.buttonContent}>
            {t('auth', 'createAccount')}
          </Button>
          <Button mode="text" onPress={() => router.back()}>{t('auth', 'alreadyHaveAccount')}</Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  form: { gap: 12 },
  input: {},
  button: { marginTop: 8, borderRadius: 12, backgroundColor: '#e8622c' },
  buttonContent: { paddingVertical: 6 },
  successTitle: { fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  successText: { textAlign: 'center', marginBottom: 24 },
});
