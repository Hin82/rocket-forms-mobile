import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, TextInput, Button, IconButton, Portal, Modal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { useFormGroups, type FormGroup } from '@/src/hooks/useForms';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useTranslation } from '@/src/translations';
import { useAppTheme } from '@/src/contexts/ThemeContext';

interface FolderManagerProps {
  visible: boolean;
  onClose: () => void;
}

export default function FolderManager({ visible, onClose }: FolderManagerProps) {
  const { user } = useAuth();
  const { data: groups, refetch } = useFormGroups();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [creating, setCreating] = useState(false);

  const isDuplicateName = (name: string, excludeId?: string) => {
    return (groups || []).some(
      g => g.name.toLowerCase() === name.trim().toLowerCase() && g.id !== excludeId
    );
  };

  const handleCreate = async () => {
    if (!newName.trim() || !user?.id) return;
    if (isDuplicateName(newName)) {
      Alert.alert(t('settings', 'error'), t('folders', 'duplicateName'));
      return;
    }
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
    if (isDuplicateName(editName, group.id)) {
      Alert.alert(t('settings', 'error'), t('folders', 'duplicateName'));
      return;
    }
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
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={[styles.modal, { backgroundColor: colors.headerBg }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('folders', 'manageFolders')}</Text>
          <IconButton icon="close" iconColor={colors.textSecondary} size={20} onPress={onClose} accessibilityLabel={t('settings', 'cancel')} accessibilityRole="button" />
        </View>

        {/* Create new */}
        <View style={styles.createRow}>
          <TextInput
            placeholder={t('folders', 'newFolderName')}
            placeholderTextColor={colors.textTertiary}
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={handleCreate}
            style={[styles.createInput, { backgroundColor: colors.headerBg }]}
            mode="outlined"
            outlineColor={colors.border}
            activeOutlineColor={colors.accent}
            textColor={colors.text}
            theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
            dense
          />
          <Button
            mode="contained"
            onPress={handleCreate}
            disabled={!newName.trim() || creating}
            loading={creating}
            buttonColor={colors.accent}
            compact
            style={styles.createBtn}
          >
            {t('folders', 'create')}
          </Button>
        </View>

        {/* Existing groups */}
        {(!groups || groups.length === 0) ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="folder-outline" size={40} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>{t('folders', 'noFolders')}</Text>
          </View>
        ) : (
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {groups.map(group => (
              <View key={group.id} style={[styles.groupRow, { borderBottomColor: colors.border }]}>
                {editingId === group.id ? (
                  <View style={styles.editRow}>
                    <TextInput
                      value={editName}
                      onChangeText={setEditName}
                      onSubmitEditing={() => handleRename(group)}
                      style={[styles.editInput, { backgroundColor: colors.headerBg }]}
                      mode="outlined"
                      outlineColor={colors.border}
                      activeOutlineColor={colors.accent}
                      textColor={colors.text}
                      dense
                      autoFocus
                      theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
                    />
                    <IconButton icon="check" iconColor={colors.success} size={20} onPress={() => handleRename(group)} accessibilityLabel={t('settings', 'save')} accessibilityRole="button" />
                    <IconButton icon="close" iconColor={colors.textSecondary} size={20} onPress={() => setEditingId(null)} accessibilityLabel={t('settings', 'cancel')} accessibilityRole="button" />
                  </View>
                ) : (
                  <>
                    <MaterialCommunityIcons name="folder-outline" size={20} color={colors.accent} />
                    <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>{group.name}</Text>
                    <IconButton
                      icon="pencil-outline"
                      iconColor={colors.textSecondary}
                      size={18}
                      onPress={() => { setEditingId(group.id); setEditName(group.name); }}
                      style={styles.iconBtn}
                      accessibilityLabel={t('folders', 'manageFolders')}
                      accessibilityRole="button"
                    />
                    <IconButton
                      icon="delete-outline"
                      iconColor={colors.error}
                      size={18}
                      onPress={() => handleDelete(group)}
                      style={styles.iconBtn}
                      accessibilityLabel={t('folders', 'deleteFolder')}
                      accessibilityRole="button"
                    />
                  </>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
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
  title: { fontSize: 18, fontWeight: '700' },
  createRow: { flexDirection: 'row', gap: 8, marginBottom: 20, alignItems: 'center' },
  createInput: { flex: 1, height: 42 },
  createBtn: { borderRadius: 8 },
  list: { maxHeight: 300 },
  listContent: { paddingBottom: 16 },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  groupName: { flex: 1, fontSize: 15 },
  iconBtn: { margin: 0, width: 32, height: 32 },
  editRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  editInput: { flex: 1, height: 38 },
  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { marginTop: 8 },
});
