import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { Text, Card, ActivityIndicator, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTranslation } from '@/src/translations';
import { useLanguage } from '@/src/contexts/LanguageContext';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  form_id: string | null;
  created_at: string;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = language === 'sv' ? 'sv-SE' : 'en-US';

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

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    },
  });

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#e8622c" /></View>;
  }

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <Pressable onPress={() => markAllRead.mutate()} style={styles.markAll}>
          <Text style={styles.markAllText}>{t('notifications', 'markAllRead')} ({unreadCount})</Text>
        </Pressable>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => !item.is_read && markRead.mutate(item.id)}>
            <Card style={[styles.card, !item.is_read && styles.unread]} mode="outlined">
              <Card.Content style={styles.cardContent}>
                <MaterialCommunityIcons
                  name={item.type === 'submission' ? 'file-check-outline' : 'bell-outline'}
                  size={24}
                  color={item.is_read ? '#666' : '#e8622c'}
                />
                <View style={styles.textContainer}>
                  <Text variant="titleSmall" style={[styles.title, !item.is_read && styles.unreadText]}>
                    {item.title}
                  </Text>
                  <Text variant="bodySmall" style={styles.message} numberOfLines={2}>
                    {item.message}
                  </Text>
                  <Text variant="bodySmall" style={styles.date}>
                    {new Date(item.created_at).toLocaleDateString(dateLocale)}{' '}
                    {new Date(item.created_at).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </Pressable>
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#e8622c" />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.centered}>
            <MaterialCommunityIcons name="bell-off-outline" size={64} color="#555" />
            <Text variant="bodyLarge" style={styles.emptyText}>{t('notifications', 'noNotifications')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  list: { padding: 16, paddingBottom: 24 },
  markAll: { paddingHorizontal: 16, paddingTop: 12 },
  markAllText: { color: '#e8622c', fontWeight: '600' },
  card: {
    marginBottom: 8,
    backgroundColor: '#1e1e2e',
    borderColor: '#2d2d44',
    borderRadius: 12,
  },
  unread: { borderLeftWidth: 3, borderLeftColor: '#e8622c' },
  cardContent: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  textContainer: { flex: 1 },
  title: { color: '#ccc' },
  unreadText: { color: '#fff', fontWeight: '600' },
  message: { color: '#888', marginTop: 4 },
  date: { color: '#666', marginTop: 6 },
  emptyText: { color: '#888', marginTop: 16 },
});
