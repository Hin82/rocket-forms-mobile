import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { Text, Card, ActivityIndicator, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTranslation } from '@/src/translations';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useRefreshOnFocus } from '@/src/hooks/useRefreshOnFocus';
import { useAppTheme } from '@/src/contexts/ThemeContext';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  form_id: string | null;
  created_at: string;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = language === 'sv' ? 'sv-SE' : 'en-US';
  const { colors } = useAppTheme();

  const { data: notifications, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  useRefreshOnFocus(refetch);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user!.id)
        .eq('read', false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  if (isLoading) {
    return <View style={[styles.centered, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {unreadCount > 0 && (
        <Pressable onPress={() => markAllRead.mutate()} style={styles.markAll}>
          <Text style={[styles.markAllText, { color: colors.accent }]}>{t('notifications', 'markAllRead')} ({unreadCount})</Text>
        </Pressable>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => !item.read && markRead.mutate(item.id)}>
            <Card style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }, !item.read && { borderLeftWidth: 3, borderLeftColor: colors.accent }]} mode="outlined">
              <Card.Content style={styles.cardContent}>
                <MaterialCommunityIcons
                  name={item.type === 'submission' ? 'file-check-outline' : 'bell-outline'}
                  size={24}
                  color={item.read ? colors.textTertiary : colors.accent}
                />
                <View style={styles.textContainer}>
                  <Text variant="titleSmall" style={[{ color: colors.textSecondary }, !item.read && { color: colors.text, fontWeight: '600' }]}>
                    {item.title}
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 4 }} numberOfLines={2}>
                    {item.message}
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.textTertiary, marginTop: 6 }}>
                    {new Date(item.created_at).toLocaleDateString(dateLocale)}{' '}
                    {new Date(item.created_at).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </Pressable>
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.centered}>
            <MaterialCommunityIcons name="bell-off-outline" size={64} color={colors.textTertiary} />
            <Text variant="bodyLarge" style={{ color: colors.textSecondary, marginTop: 16 }}>{t('notifications', 'noNotifications')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  list: { padding: 16, paddingBottom: 24 },
  markAll: { paddingHorizontal: 16, paddingTop: 12 },
  markAllText: { fontWeight: '600' },
  card: {
    marginBottom: 8,
    borderRadius: 12,
  },
  cardContent: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  textContainer: { flex: 1 },
});
