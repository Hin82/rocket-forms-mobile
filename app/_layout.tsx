import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { Image } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { LanguageProvider } from '@/src/contexts/LanguageContext';
import { useTranslation } from '@/src/translations';
import { CompanyProvider } from '@/src/contexts/CompanyContext';
import { queryClient } from '@/src/lib/queryClient';
import { lightTheme, darkTheme } from '@/src/constants/theme';
import SupportChat from '@/src/components/SupportChat';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return <RootLayoutNav />;
}

const StackHeaderLogo = () => (
  <Image
    source={require('../assets/images/logo.png')}
    style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8 }}
    resizeMode="contain"
  />
);

function TranslatedStack() {
  const { t } = useTranslation();
  const back = t('nav', 'back');

  return (
    <Stack screenOptions={{ headerRight: () => <StackHeaderLogo />, headerRightContainerStyle: { paddingRight: 16 } }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="create" options={{ title: t('create', 'newForm'), headerBackTitle: back }} />
      <Stack.Screen name="form/[id]/index" options={{ title: t('nav', 'form'), headerBackTitle: back }} />
      <Stack.Screen name="form/[id]/submissions" options={{ title: t('nav', 'submissions'), headerBackTitle: back }} />
      <Stack.Screen name="form/[id]/submission/[submissionId]" options={{ title: t('nav', 'submissionDetail'), headerBackTitle: back }} />
      <Stack.Screen name="settings/profile" options={{ title: t('settings', 'profile'), headerBackTitle: back }} />
      <Stack.Screen name="settings/company" options={{ title: t('settings', 'company'), headerBackTitle: back }} />
      <Stack.Screen name="settings/language" options={{ title: t('settings', 'language'), headerBackTitle: back }} />
      <Stack.Screen name="settings/notifications-preferences" options={{ title: t('settings', 'notificationSettings'), headerBackTitle: back }} />
      <Stack.Screen name="settings/subscription" options={{ title: t('settings', 'subscription'), headerBackTitle: back }} />
      <Stack.Screen name="settings/api-keys" options={{ title: t('settings', 'apiKeys'), headerBackTitle: back }} />
      <Stack.Screen name="settings/domains" options={{ title: t('settings', 'domains'), headerBackTitle: back }} />
      <Stack.Screen name="settings/email-setup" options={{ title: t('settings', 'emailConfig'), headerBackTitle: back }} />
    </Stack>
  );
}

const ChatWrapper = () => {
  const { user } = useAuth();
  const segments = useSegments();
  if (!user || segments[0] === '(auth)') return null;
  return <SupportChat />;
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const paperTheme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={paperTheme}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AuthProvider>
            <LanguageProvider>
              <CompanyProvider>
                <AuthGuard>
                  <TranslatedStack />
                  <ChatWrapper />
                </AuthGuard>
              </CompanyProvider>
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
