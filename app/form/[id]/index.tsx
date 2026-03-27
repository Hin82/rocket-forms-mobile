import React from 'react';
import { View, StyleSheet, ScrollView, Share, Alert } from 'react-native';
import { Text, Card, Button, Chip, ActivityIndicator, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useTranslation } from '@/src/translations';
import { useLanguage } from '@/src/contexts/LanguageContext';

export default function FormDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = language === 'sv' ? 'sv-SE' : 'en-US';
  const queryClient = useQueryClient();
  const [isDuplicating, setIsDuplicating] = React.useState(false);

  const { data: form, isLoading } = useQuery({
    queryKey: ['form', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('*, form_groups(name)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: submissionCount } = useQuery({
    queryKey: ['submissionCount', id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('form_id', id);
      if (error) throw error;
      return count || 0;
    },
  });

  const formUrl = `https://rocketformspro.com/form/${id}`;

  const handleShare = async () => {
    await Share.share({
      message: `${t('forms', 'fillForm')} ${form?.name}\n${formUrl}`,
      url: formUrl,
    });
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(formUrl);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(t('forms', 'copied'), t('forms', 'linkCopied'));
  };

  const handleDuplicate = async () => {
    if (isDuplicating) return;

    try {
      setIsDuplicating(true);
      const { data, error } = await supabase.from('forms').insert({
        name: `${form?.name} (${t('forms', 'copy')})`,
        fields: form?.fields || [],
        settings: form?.settings || {},
        user_id: form?.user_id,
        form_group_id: form?.form_group_id,
        notification_email: form?.notification_email,
        sender_name: form?.sender_name,
      }).select().single();

      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      router.push(`/form/${data.id}`);
    } catch (err: any) {
      Alert.alert(t('settings', 'error'), err.message || t('forms', 'couldNotDuplicate'));
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('forms', 'deleteForm'),
      t('forms', 'deleteFormConfirm', { name: form?.name ?? '' }),
      [
        { text: t('settings', 'cancel'), style: 'cancel' },
        {
          text: t('settings', 'delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('forms').delete().eq('id', id);
              if (error) throw error;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              queryClient.invalidateQueries({ queryKey: ['forms'] });
              router.back();
            } catch (err: any) {
              const msg = err.code === '23503'
                ? t('forms', 'couldNotDelete') // FK constraint - related data exists
                : (err.message || t('forms', 'couldNotDelete'));
              Alert.alert(t('settings', 'error'), msg);
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#e8622c" /></View>;
  }

  if (!form) {
    return <View style={styles.centered}><Text style={{ color: '#888' }}>{t('forms', 'formNotFound')}</Text></View>;
  }

  const fieldCount = form.fields?.length || 0;
  const groupName = (form as any).form_groups?.name || form.group_name;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.formName}>{form.name}</Text>
          <View style={styles.chips}>
            <Chip icon="format-list-numbered" style={styles.chip} textStyle={styles.chipText}>
              {fieldCount} {t('forms', 'fields')}
            </Chip>
            <Chip icon="file-check-outline" style={styles.chip} textStyle={styles.chipText}>
              {submissionCount ?? 0} {t('forms', 'submittedCount')}
            </Chip>
            {groupName && (
              <Chip icon="folder-outline" style={styles.chip} textStyle={styles.chipText}>
                {groupName}
              </Chip>
            )}
          </View>
          <Text variant="bodySmall" style={styles.date}>
            {t('forms', 'created')} {new Date(form.created_at).toLocaleDateString(dateLocale)}
          </Text>
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button mode="contained" icon="pencil-outline" onPress={() => router.push(`/form/${id}/edit`)} style={styles.editButton} contentStyle={styles.editContent} labelStyle={styles.editLabel}>
          {t('forms', 'editForm')}
        </Button>
        <Button mode="contained" icon="eye-outline" onPress={() => router.push(`/form/${id}/submissions`)} style={styles.actionButton} contentStyle={styles.actionContent}>
          {t('forms', 'viewSubmissions')}
        </Button>
        <Button mode="outlined" icon="share-variant-outline" onPress={handleShare} style={styles.actionButtonOutline} textColor="#e8622c">
          {t('forms', 'shareForm')}
        </Button>
        <Button mode="outlined" icon="content-copy" onPress={handleCopyLink} style={styles.actionButtonOutline} textColor="#e8622c">
          {t('forms', 'copyLink')}
        </Button>
        <Button mode="outlined" icon="content-duplicate" onPress={handleDuplicate} style={styles.actionButtonOutline} textColor="#e8622c" disabled={isDuplicating} loading={isDuplicating}>
          {t('forms', 'duplicateForm')}
        </Button>
        <Button mode="outlined" icon="delete-outline" onPress={handleDelete} style={styles.deleteButton} textColor="#ef4444">
          {t('forms', 'deleteForm')}
        </Button>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.fieldsSection}>
        <Text variant="titleMedium" style={styles.sectionTitle}>{t('forms', 'formFields')}</Text>
        {(form.fields || []).slice(0, 10).map((field: any, index: number) => (
          <View key={field.id || index} style={styles.fieldRow}>
            <MaterialCommunityIcons name={getFieldIcon(field.type) as any} size={20} color="#e8622c" />
            <Text style={styles.fieldLabel} numberOfLines={1}>{field.label || field.type}</Text>
            {field.required && <Text style={styles.required}>*</Text>}
          </View>
        ))}
        {fieldCount > 10 && (
          <Text style={styles.moreFields}>{t('forms', 'moreFields', { count: String(fieldCount - 10) })}</Text>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function getFieldIcon(type: string): string {
  const icons: Record<string, string> = {
    text: 'form-textbox', email: 'email-outline', phone: 'phone-outline',
    textarea: 'text-box-outline', select: 'form-dropdown', radio: 'radiobox-marked',
    checkbox: 'checkbox-marked-outline', date: 'calendar', time: 'clock-outline',
    file: 'file-outline', image: 'image-outline', signature: 'draw',
    rating: 'star-outline', name: 'account-outline', number: 'numeric',
    document: 'file-document-outline', yesno: 'toggle-switch-outline', address: 'map-marker-outline',
  };
  return icons[type] || 'form-textbox';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: { margin: 16, backgroundColor: '#1e1e2e', borderRadius: 16 },
  formName: { color: '#fff', fontWeight: 'bold', marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { backgroundColor: '#2d2d44' },
  chipText: { color: '#ccc', fontSize: 12 },
  date: { color: '#666' },
  actions: { paddingHorizontal: 16, gap: 10 },
  editButton: { borderRadius: 12, backgroundColor: '#e8622c', marginBottom: 4 },
  editContent: { paddingVertical: 8 },
  editLabel: { fontSize: 16, fontWeight: '700' },
  actionButton: { borderRadius: 12, backgroundColor: '#e8622c' },
  actionButtonOutline: { borderRadius: 12, borderColor: '#e8622c' },
  deleteButton: { borderRadius: 12, borderColor: '#ef4444' },
  actionContent: { paddingVertical: 4 },
  divider: { backgroundColor: '#2d2d44', marginVertical: 20, marginHorizontal: 16 },
  fieldsSection: { paddingHorizontal: 16 },
  sectionTitle: { color: '#fff', marginBottom: 12 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2d2d44' },
  fieldLabel: { color: '#ccc', flex: 1 },
  required: { color: '#e8622c', fontWeight: 'bold' },
  moreFields: { color: '#888', marginTop: 12, textAlign: 'center' },
});