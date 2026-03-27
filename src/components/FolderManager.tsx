import React, { useState } from 'react';
import { View, StyleSheet, Alert, Pressable } from 'react-native';
import { Text, TextInput, Button, IconButton, Portal, Modal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { useFormGroups, type FormGroup } from '@/src/hooks/useForms';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useTranslation } from '@/src/translations';

interface FolderManagerProps {
  visible: boolean;
  onClose: () => void;
}

export default function FolderManager({ visible, onClose }: FolderManagerProps) {
  const { user } = useAuth();
  const { data: groups, refetch } = useFormGroups();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim() || !user?.id) return;
    setCreating(true);
    try {
      const { error } = await supabase.from('form_groups').insert({
        name: newName.trim(),
        user_id: user.id,
      });
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewName('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['formGroups'] });
    } catch (err: any) {
      Alert.alert(t('settings', 'error'), err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (group: FormGroup) => {
    if (!editName.trim()) return;
    try {
      const { error } = await supabase.from('form_groups')
        .update({ name: editName.trim() })
        .eq('id', group.id);
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingId(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    } catch (err: any) {
      Alert.alert(t('settings', 'error'), err.message);
    }
  };

  const handleDelete = (group: FormGroup) => {
    Alert.alert(
      t('folders', 'deleteFolder'),
      t('folders', 'deleteFolderConfirm', { name: group.name }),
      [
        { text: t('settings', 'cancel'), style: 'cancel' },
        {
          text: t('settings', 'delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('form_groups').delete().eq('id', group.id);
              if (error) throw error;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              refetch();
              queryClient.invalidateQueries({ queryKey: ['forms'] });
            } catch (err: any) {
              Alert.alert(t('settings', 'error'), err.message);
            }
          },
        },
      ],
    );
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('folders', 'manageFolders')}</Text>
          <IconButton icon="close" iconColor="#888" size={20} onPress={onClose} />
        </View>

        {/* Create new */}
        <View style={styles.createRow}>
          <TextInput
            placeholder={t('folders', 'newFolderName')}
            placeholderTextColor="#666"
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={handleCreate}
            style={styles.createInput}
            mode="outlined"
            outlineColor="#2d2d44"
            activeOutlineColor="#e8622c"
            textColor="#fff"
            theme={{ colors: { onSurfaceVariant: '#888' } }}
            dense
          />
          <Button
            mode="contained"
            onPress={handleCreate}
            disabled={!newName.trim() || creating}
            loading={creating}
            buttonColor="#e8622c"
            compact
            style={styles.createBtn}
          >
            {t('folders', 'create')}
          </Button>
        </View>

        {/* Existing groups */}
        {(!groups || groups.length === 0) ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="folder-outline" size={40} color="#2d2d44" />
            <Text style={styles.emptyText}>{t('folders', 'noFolders')}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {groups.map(group => (
              <View key={group.id} style={styles.groupRow}>
                {editingId === group.id ? (
                  <View style={styles.editRow}>
                    <TextInput
                      value={editName}
                      onChangeText={setEditName}
                      onSubmitEditing={() => handleRename(group)}
                      style={styles.editInput}
                      mode="outlined"
                      outlineColor="#2d2d44"
                      activeOutlineColor="#e8622c"
                      textColor="#fff"
                      dense
                      autoFocus
                      theme={{ colors: { onSurfaceVariant: '#888' } }}
                    />
                    <IconButton icon="check" iconColor="#22c55e" size={20} onPress={() => handleRename(group)} />
                    <IconButton icon="close" iconColor="#888" size={20} onPress={() => setEditingId(null)} />
                  </View>
                ) : (
                  <>
                    <MaterialCommunityIcons name="folder-outline" size={20} color="#e8622c" />
                    <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
                    <IconButton
                      icon="pencil-outline"
                      iconColor="#888"
                      size={18}
                      onPress={() => { setEditingId(group.id); setEditName(group.name); }}
                      style={styles.iconBtn}
                    />
                    <IconButton
                      icon="delete-outline"
                      iconColor="#cc3333"
                      size={18}
                      onPress={() => handleDelete(group)}
                      style={styles.iconBtn}
                    />
                  </>
                )}
              </View>
            ))}
          </View>
        )}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#1a1a2e',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  createRow: { flexDirection: 'row', gap: 8, marginBottom: 20, alignItems: 'center' },
  createInput: { flex: 1, backgroundColor: '#1a1a2e', height: 42 },
  createBtn: { borderRadius: 8 },
  list: { gap: 4 },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  groupName: { color: '#ccc', flex: 1, fontSize: 15 },
  iconBtn: { margin: 0, width: 32, height: 32 },
  editRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  editInput: { flex: 1, backgroundColor: '#1a1a2e', height: 38 },
  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { color: '#666', marginTop: 8 },
});
