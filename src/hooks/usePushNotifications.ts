import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push notifications don't work on simulators
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

async function savePushToken(userId: string, token: string): Promise<void> {
  // Check if token already exists
  const { data: existing } = await supabase
    .from('notification_channels')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'push')
    .eq('endpoint', token)
    .maybeSingle();

  if (existing) return; // Already registered

  // Upsert: deactivate old push tokens, add new one
  await supabase
    .from('notification_channels')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('type', 'push');

  await supabase
    .from('notification_channels')
    .insert({
      user_id: userId,
      type: 'push',
      endpoint: token,
      is_active: true,
      metadata: { platform: Platform.OS, device: Device.modelName },
    });
}

export function usePushNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    if (!user) return;

    // Register push token
    registerForPushNotifications().then(token => {
      if (token) {
        savePushToken(user.id, token).catch(err => {
          if (__DEV__) console.warn('Failed to save push token:', err);
        });
      }
    });

    // Listen for notifications while app is open
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      if (__DEV__) console.log('Notification received:', notification);
    });

    // Handle notification tap (navigate to relevant screen)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.formId) {
        router.push(`/form/${data.formId}`);
      } else if (data?.submissionId && data?.formId) {
        router.push(`/form/${data.formId}/submission/${data.submissionId}`);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user?.id]);
}
