import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, Pressable } from 'react-native';
import { Text, TextInput, Button, Switch, IconButton, Portal, Modal, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTranslation } from '@/src/translations';
import * as Haptics from 'expo-haptics';

interface Webhook {
  id: string;
  name: string;
  url: string;
  method: string;
  is_active: boolean;
  created_at: string;
}

interface WebhookManagerProps {
  visible: boolean;
  onClose: () => void;
  formId: string;
}

export default function WebhookManager({ visible, onClose, formId }: WebhookManagerProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const { data: webhooks, isLoading, error: queryError } = useQuery({
    queryKey: ['webhooks', formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_webhooks')
        .select('*')
        .eq('form_id', formId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Webhook[];
    },
    enabled: visible,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!name.trim() || !url.trim()) throw new Error(t('webhooks', 'fillFields'));
      if (!/^https?:\/\/.+/.test(url.trim())) throw new Error(t('webhooks', 'invalidUrl'));

      const { error } = await supabase.from('form_webhooks').insert({
        form_id: formId,
        name: name.trim(),
        url: url.trim(),
        method: 'POST',
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['webhooks', formId] });
      setName('');
      setUrl('');
      setShowAdd(false);
    },
    onError: (err: Error) => Alert.alert(t('settings', 'error'), err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('form_webhooks').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      Haptics.selectionAsync();
      queryClient.invalidateQueries({ queryKey: ['webhooks', formId] });
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('settings', 'error'), err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('form_webhooks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      queryClient.invalidateQueries({ queryKey: ['webhooks', formId] });
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('settings', 'error'), err.message);
    },
  });

  const handleDelete = (webhook: Webhook) => {
    Alert.alert(
      t('webhooks', 'deleteWebhook'),
      t('webhooks', 'deleteConfirm', { name: webhook.name }),
      [
        { text: t('settings', 'cancel'), style: 'cancel' },
        { text: t('settings', 'delete'), style: 'destructive', onPress: () => deleteMutation.mutate(webhook.id) },
      ],
    );
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('webhooks', 'title')}</Text>
          <IconButton icon="close" iconColor="#888" size={20} onPress={onClose} accessibilityLabel={t('settings', 'cancel')} accessibilityRole="button" />
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#e8622c" style={{ padding: 40 }} />
        ) : queryError ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#cc3333" />
            <Text style={styles.emptyText}>{t('settings', 'error')}</Text>
            <Text style={styles.emptyDesc}>{(queryError as Error).message}</Text>
          </View>
        ) : (
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {(!webhooks || webhooks.length === 0) && !showAdd ? (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="webhook" size={40} color="#2d2d44" />
                <Text style={styles.emptyText}>{t('webhooks', 'noWebhooks')}</Text>
                <Text style={styles.emptyDesc}>{t('webhooks', 'noWebhooksDesc')}</Text>
              </View>
            ) : (
              webhooks?.map(wh => (
                <View key={wh.id} style={styles.webhookRow}>
                  <View style={styles.webhookInfo}>
                    <Text style={styles.webhookName} numberOfLines={1}>{wh.name}</Text>
                    <Text style={styles.webhookUrl} numberOfLines={1}>{wh.url}</Text>
                  </View>
                  <Switch
                    value={wh.is_active}
                    onValueChange={v => toggleMutation.mutate({ id: wh.id, active: v })}
                    color="#e8622c"
                  />
                  <IconButton icon="delete-outline" iconColor="#cc3333" size={18} onPress={() => handleDelete(wh)} style={styles.deleteBtn} accessibilityLabel={t('webhooks', 'deleteWebhook')} accessibilityRole="button" />
                </View>
              ))
            )}

            {showAdd && (
              <View style={styles.addForm}>
                <TextInput
                  label={t('webhooks', 'webhookName')}
                  value={name}
                  onChangeText={setName}
                  mode="outlined"
                  style={styles.input}
                  textColor="#fff"
                  outlineColor="#2d2d44"
                  activeOutlineColor="#e8622c"
                  theme={{ colors: { onSurfaceVariant: '#888' } }}
                  dense
                />
                <TextInput
                  label={t('webhooks', 'webhookUrl')}
                  value={url}
                  onChangeText={setUrl}
                  mode="outlined"
                  style={styles.input}
                  textColor="#fff"
                  outlineColor="#2d2d44"
                  activeOutlineColor="#e8622c"
                  theme={{ colors: { onSurfaceVariant: '#888' } }}
                  autoCapitalize="none"
                  keyboardType="url"
                  placeholder={t('webhooks', 'urlPlaceholder')}
                  dense
                />
                <View style={styles.addActions}>
                  <Button mode="text" onPress={() => setShowAdd(false)} textColor="#888">{t('settings', 'cancel')}</Button>
                  <Button mode="contained" onPress={() => addMutation.mutate()} loading={addMutation.isPending} disabled={!name.trim() || !url.trim()} buttonColor="#e8622c">{t('webhooks', 'add')}</Button>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {!showAdd && (
          <Pressable onPress={() => setShowAdd(true)} style={styles.addBtn}>
            <MaterialCommunityIcons name="plus" size={18} color="#e8622c" />
            <Text style={styles.addBtnText}>{t('webhooks', 'addWebhook')}</Text>
          </Pressable>
        )}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { backgroundColor: '#1a1a2e', margin: 20, borderRadius: 16, padding: 20, maxHeight: '75%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  list: { maxHeight: 300 },
  listContent: { paddingBottom: 8 },
  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { color: '#888', marginTop: 8, fontWeight: '600' },
  emptyDesc: { color: '#555', fontSize: 13, marginTop: 4, textAlign: 'center' },
  webhookRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2d2d44' },
  webhookInfo: { flex: 1 },
  webhookName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  webhookUrl: { color: '#666', fontSize: 12, marginTop: 2 },
  deleteBtn: { margin: 0, width: 32, height: 32 },
  addForm: { marginTop: 12, gap: 8 },
  input: { backgroundColor: '#1a1a2e' },
  addActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#2d2d44', marginTop: 8 },
  addBtnText: { color: '#e8622c', fontWeight: '600' },
});
