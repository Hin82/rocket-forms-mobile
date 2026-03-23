import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '@/src/translations';
import HeaderLogo from '@/src/components/HeaderLogo';

export default function TabLayout() {
  const { t } = useTranslation();

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
            <MaterialCommunityIcons name="bell-outline" size={size} color={color} />
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
