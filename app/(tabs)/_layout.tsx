import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { useTranslation } from '@/src/translations';
import HeaderLogo from '@/src/components/HeaderLogo';
import { useUnreadCount } from '@/src/hooks/useUnreadCount';

export default function TabLayout() {
  const { t } = useTranslation();
  const unreadCount = useUnreadCount();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#e8622c',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#1a1a2e',
          borderTopColor: '#2d2d44',
        },
        headerStyle: {
          backgroundColor: '#1a1a2e',
        },
        headerTintColor: '#ffffff',
        headerRight: () => <HeaderLogo />,
        headerRightContainerStyle: { paddingRight: 16 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav', 'forms'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="file-document-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="submissions"
        options={{
          title: t('nav', 'submissions'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="inbox-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('nav', 'notificationsTab'),
          tabBarIcon: ({ color, size }) => (
            <View>
              <MaterialCommunityIcons name="bell-outline" size={size} color={color} />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute', top: -4, right: -8,
                  backgroundColor: '#e8622c', borderRadius: 9,
                  minWidth: 18, height: 18,
                  alignItems: 'center', justifyContent: 'center',
                  paddingHorizontal: 4,
                }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('nav', 'settingsTab'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
