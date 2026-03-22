import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { LanguageProvider } from '@/src/contexts/LanguageContext';
import { CompanyProvider } from '@/src/contexts/CompanyContext';
import { queryClient } from '@/src/lib/queryClient';
import { lightTheme, darkTheme } from '@/src/constants/theme';

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
                  <Stack>
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="form/[id]/index"
                      options={{ title: 'Formulär', headerBackTitle: 'Tillbaka' }}
                    />
                    <Stack.Screen
                      name="form/[id]/submissions"
                      options={{ title: 'Inskickade', headerBackTitle: 'Tillbaka' }}
                    />
                    <Stack.Screen
                      name="form/[id]/submission/[submissionId]"
                      options={{ title: 'Inskickning', headerBackTitle: 'Tillbaka' }}
                    />
                    <Stack.Screen
                      name="settings/profile"
                      options={{ title: 'Profil', headerBackTitle: 'Tillbaka' }}
                    />
                    <Stack.Screen
                      name="settings/company"
                      options={{ title: 'Företag', headerBackTitle: 'Tillbaka' }}
                    />
                    <Stack.Screen
                      name="settings/language"
                      options={{ title: 'Språk', headerBackTitle: 'Tillbaka' }}
                    />
                    <Stack.Screen
                      name="settings/notifications-preferences"
                      options={{ title: 'Notis-inställningar', headerBackTitle: 'Tillbaka' }}
                    />
                    <Stack.Screen
                      name="settings/subscription"
                      options={{ title: 'Prenumeration', headerBackTitle: 'Tillbaka' }}
                    />
                    <Stack.Screen
                      name="settings/api-keys"
                      options={{ title: 'API-nycklar', headerBackTitle: 'Tillbaka' }}
                    />
                    <Stack.Screen
                      name="settings/domains"
                      options={{ title: 'Domäner', headerBackTitle: 'Tillbaka' }}
                    />
                    <Stack.Screen
                      name="settings/email-setup"
                      options={{ title: 'E-postkonfiguration', headerBackTitle: 'Tillbaka' }}
                    />
                  </Stack>
                </AuthGuard>
              </CompanyProvider>
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
