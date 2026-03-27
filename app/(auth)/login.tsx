import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image, Pressable } from 'react-native';
import { TextInput, Button, Text, HelperText, Menu, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage, LANGUAGES } from '@/src/contexts/LanguageContext';
import { useTranslation } from '@/src/translations';

const SAVED_EMAIL_KEY = 'saved_login_email';
const REMEMBER_KEY = 'remember_login';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [langMenuVisible, setLangMenuVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { signIn } = useAuth();
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  const currentLang = LANGUAGES.find(l => l.code === language);

  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === 'web') {
          const saved = localStorage.getItem(REMEMBER_KEY);
          if (saved === 'true') {
            setEmail(localStorage.getItem(SAVED_EMAIL_KEY) || '');
            // Password not stored in localStorage for security
            setRememberMe(true);
          }
        } else {
          const saved = await SecureStore.getItemAsync(REMEMBER_KEY);
          if (saved === 'true') {
            const savedEmail = await SecureStore.getItemAsync(SAVED_EMAIL_KEY);
            if (savedEmail) setEmail(savedEmail);
            setRememberMe(true);
          }
        }
      } catch {
        // Credential load failed - user can type manually
      }
    })();
  }, []);

  const saveCredentials = async (emailToSave: string) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(SAVED_EMAIL_KEY, emailToSave);
        localStorage.setItem(REMEMBER_KEY, 'true');
      } else {
        await SecureStore.setItemAsync(SAVED_EMAIL_KEY, emailToSave);
        await SecureStore.setItemAsync(REMEMBER_KEY, 'true');
      }
    } catch {}
  };

  const clearCredentials = async () => {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(SAVED_EMAIL_KEY);
        localStorage.removeItem(REMEMBER_KEY);
      } else {
        await SecureStore.deleteItemAsync(SAVED_EMAIL_KEY);
        await SecureStore.deleteItemAsync(REMEMBER_KEY);
      }
    } catch {}
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError(t('auth', 'fillFields'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await signIn(email.trim(), password);

      if (result.mfaRequired && result.factorId) {
        // Defer credential save until MFA verification completes
        router.push({ pathname: '/(auth)/verify-mfa', params: { factorId: result.factorId } });
      } else {
        // Full auth success — save or clear credentials
        if (rememberMe) {
          await saveCredentials(email.trim());
        } else {
          await clearCredentials();
        }
      }
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials'
        ? t('auth', 'invalidCredentials')
        : err.message || t('auth', 'somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Language selector */}
      <View style={styles.langRow}>
        <Menu
          visible={langMenuVisible}
          onDismiss={() => setLangMenuVisible(false)}
          anchor={
            <Pressable onPress={() => setLangMenuVisible(true)} style={styles.langButton}>
              <Text style={styles.langButtonText}>
                {currentLang?.flag}  {currentLang?.name}
              </Text>
            </Pressable>
          }
          contentStyle={styles.langMenu}
        >
          {LANGUAGES.map(lang => (
            <Menu.Item
              key={lang.code}
              title={`${lang.flag}  ${lang.name}`}
              onPress={() => {
                setLanguage(lang.code);
                setLangMenuVisible(false);
              }}
              titleStyle={lang.code === language ? styles.langSelected : styles.langMenuItem}
            />
          ))}
        </Menu>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text variant="headlineLarge" style={styles.title}>Rocket Forms Pro</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>{t('auth', 'loginSubtitle')}</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label={t('auth', 'email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            mode="outlined"
            textColor="#fff"
            outlineColor="#2d2d44"
            activeOutlineColor="#e8622c"
            style={styles.input}
            theme={{ colors: { onSurfaceVariant: '#888' } }}
            left={<TextInput.Icon icon="email-outline" />}
          />

          <TextInput
            label={t('auth', 'password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            textContentType="password"
            mode="outlined"
            textColor="#fff"
            outlineColor="#2d2d44"
            activeOutlineColor="#e8622c"
            style={styles.input}
            theme={{ colors: { onSurfaceVariant: '#888' } }}
            left={<TextInput.Icon icon="lock-outline" />}
            right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
          />

          <Pressable onPress={() => setRememberMe(!rememberMe)} style={styles.rememberRow}>
            <Checkbox
              status={rememberMe ? 'checked' : 'unchecked'}
              color="#e8622c"
              uncheckedColor="#666"
            />
            <Text style={styles.rememberText}>{t('auth', 'rememberMe')}</Text>
          </Pressable>

          {error ? <HelperText type="error" visible>{error}</HelperText> : null}

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {t('auth', 'login')}
          </Button>

          <Button
            mode="text"
            onPress={() => router.push('/(auth)/reset-password')}
            style={styles.link}
          >
            {t('auth', 'forgotPassword')}
          </Button>

          <Button
            mode="text"
            onPress={() => router.push('/(auth)/register')}
            style={styles.link}
          >
            {t('auth', 'createAccount')}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  langRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
  langButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2d2d44', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  langButtonText: { color: '#fff', fontSize: 14 },
  langMenu: { backgroundColor: '#2d2d44' },
  langMenuItem: { color: '#ccc' },
  langSelected: { color: '#e8622c', fontWeight: '600' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 80, height: 80, borderRadius: 20, marginBottom: 16 },
  title: { color: '#ffffff', fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#a0a0b0' },
  form: { gap: 12 },
  input: { backgroundColor: '#1a1a2e' },
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginTop: -4 },
  rememberText: { color: '#aaa', fontSize: 14 },
  button: { marginTop: 8, borderRadius: 12, backgroundColor: '#e8622c' },
  buttonContent: { paddingVertical: 6 },
  link: { marginTop: 4 },
});
