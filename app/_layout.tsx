import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState, useCallback } from 'react';
import * as Linking from 'expo-linking';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { LanguageProvider } from '@/src/contexts/LanguageContext';
import { useTranslation } from '@/src/translations';
import { CompanyProvider } from '@/src/contexts/CompanyContext';
import { queryClient } from '@/src/lib/queryClient';
import { lightTheme, darkTheme } from '@/src/constants/theme';
import SupportChat from '@/src/components/SupportChat';
import HeaderLogo from '@/src/components/HeaderLogo';
import BiometricLock from '@/src/components/BiometricLock';
import OnboardingScreen, { hasSeenOnboarding } from '@/src/components/OnboardingScreen';
import OfflineBanner from '@/src/components/OfflineBanner';
import ShakeFeedback from '@/src/components/ShakeFeedback';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function extractFormId(url: string): string | null {
  // Handle: rocketforms://form/UUID, https://rocketformspro.com/form/UUID
  const patterns = [
    /form\/([0-9a-f-]{36})/i,
    /form_id=([0-9a-f-]{36})/i,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Handle deep links
  const handleDeepLink = useCallback((event: { url: string }) => {
    if (!user) return;
    const formId = extractFormId(event.url);
    if (formId) {
      router.push(`/form/${formId}`);
    }
  }, [user, router]);

  useEffect(() => {
    // Handle URL that opened the app
    Linking.getInitialURL().then(url => {
      if (url && user) {
        const formId = extractFormId(url);
        if (formId) router.push(`/form/${formId}`);
      }
    });

    // Handle URLs while app is open
    const sub = Linking.addEventListener('url', handleDeepLink);
    return () => sub.remove();
  }, [user, handleDeepLink]);

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

function TranslatedStack() {
  const { t } = useTranslation();
  const back = t('nav', 'back');

  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: '#1a1a2e' },
      headerTintColor: '#ffffff',
      headerRight: () => <HeaderLogo />,
      headerRightContainerStyle: { paddingRight: 16 },
    }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="create" options={{ title: t('create', 'newForm'), headerBackTitle: back }} />
      <Stack.Screen name="form/[id]/index" options={{ title: t('nav', 'form'), headerBackTitle: back }} />
      <Stack.Screen name="form/[id]/edit" options={{ title: t('nav', 'editForm'), headerBackTitle: back }} />
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

const OnboardingWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setShowOnboarding(false); return; }
    hasSeenOnboarding().then(seen => setShowOnboarding(!seen));
  }, [user]);

  if (showOnboarding === null) return null;
  if (showOnboarding) return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  return <>{children}</>;
};

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
    <GestureHandlerRootView style={{ flex: 1 }}>
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={paperTheme}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AuthProvider>
            <LanguageProvider>
              <OfflineBanner />
              <BiometricLock>
                <CompanyProvider>
                  <AuthGuard>
                    <OnboardingWrapper>
                      <TranslatedStack />
                      <ChatWrapper />
                      <ShakeFeedback />
                    </OnboardingWrapper>
                  </AuthGuard>
                </CompanyProvider>
              </BiometricLock>
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </PaperProvider>
    </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
