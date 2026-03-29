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
import { useLanguage, type LanguageCode } from '@/src/contexts/LanguageContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { FormDetailSkeleton } from '@/src/components/SkeletonLoader';
import { useTrackAction } from '@/src/hooks/useAppRating';
import WebhookManager from '@/src/components/WebhookManager';
import { useAppTheme } from '@/src/contexts/ThemeContext';

function getDateLocale(languageCode: LanguageCode): string {
  const localeMap: Record<LanguageCode, string> = {
    sv: 'sv-SE', en: 'en-GB', no: 'nb-NO', da: 'da-DK',
    fi: 'fi-FI', de: 'de-DE', fr: 'fr-FR', es: 'es-ES',
  };
  return localeMap[languageCode] || 'en-GB';
}

export default function FormDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = getDateLocale(language);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const [isDuplicating, setIsDuplicating] = React.useState(false);
  const [showWebhooks, setShowWebhooks] = React.useState(false);
  useTrackAction(id);
  const duplicatingRef = React.useRef(false);

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

  const { data: stats } = useQuery({
    queryKey: ['formStats', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select('submitted_at')
        .eq('form_id', id)
        .order('submitted_at', { ascending: false });
      if (error) throw error;

      const total = data?.length || 0;
      const lastSubmission = data?.[0]?.submitted_at || null;

      // This week vs last week
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const thisWeek = (data || []).filter(s => new Date(s.submitted_at) >= weekAgo).length;
      const lastWeek = (data || []).filter(s => {
        const d = new Date(s.submitted_at);
        return d >= twoWeeksAgo && d < weekAgo;
      }).length;

      // Today
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const today = (data || []).filter(s => new Date(s.submitted_at) >= todayStart).length;

      return { total, lastSubmission, thisWeek, lastWeek, today };
    },
  });

  const submissionCount = stats?.total ?? 0;

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
    if (duplicatingRef.current) return;
    if (!user?.id) {
      Alert.alert(t('settings', 'error'), t('forms', 'couldNotDuplicate'));
      return;
    }

    try {
      duplicatingRef.current = true;
      setIsDuplicating(true);
      const { data, error } = await supabase.from('forms').insert({
        name: `${form?.name} (${t('forms', 'copy')})`,
        fields: form?.fields || [],
        settings: form?.settings || {},
        user_id: user.id,
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
      duplicatingRef.current = false;
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
                ? t('forms', 'couldNotDelete')
                : (err.message || t('forms', 'couldNotDelete'));
              Alert.alert(t('settings', 'error'), msg);
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return <FormDetailSkeleton />;
  }

  if (!form) {
    return <View style={styles.centered}><Text style={{ color: colors.textSecondary }}>{t('forms', 'formNotFound')}</Text></View>;
  }

  const fieldCount = form.fields?.length || 0;
  const groupName = (form as any).form_groups?.name || form.group_name;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Card style={[styles.headerCard, { backgroundColor: colors.surface }]}>
        <Card.Content>
          <Text variant="headlineSmall" style={[styles.formName, { color: colors.text }]}>{form.name}</Text>
          <View style={styles.chips}>
            <Chip icon="format-list-numbered" style={[styles.chip, { backgroundColor: colors.surfaceSecondary }]} textStyle={[styles.chipText, { color: colors.text }]}>
              {fieldCount} {t('forms', 'fields')}
            </Chip>
            <Chip icon="file-check-outline" style={[styles.chip, { backgroundColor: colors.surfaceSecondary }]} textStyle={[styles.chipText, { color: colors.text }]}>
              {submissionCount ?? 0} {t('forms', 'submittedCount')}
            </Chip>
            {groupName && (
              <Chip icon="folder-outline" style={[styles.chip, { backgroundColor: colors.surfaceSecondary }]} textStyle={[styles.chipText, { color: colors.text }]}>
                {groupName}
              </Chip>
            )}
          </View>
          <Text variant="bodySmall" style={[styles.date, { color: colors.textTertiary }]}>
            {t('forms', 'created')} {new Date(form.created_at).toLocaleDateString(dateLocale)}
          </Text>
        </Card.Content>
      </Card>

      {/* Stats */}
      {stats && stats.total > 0 && (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.today}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('forms', 'today')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.thisWeek}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('forms', 'thisWeek')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.trendRow}>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
              {stats.thisWeek > stats.lastWeek ? (
                <MaterialCommunityIcons name="trending-up" size={16} color="#22c55e" />
              ) : stats.thisWeek < stats.lastWeek ? (
                <MaterialCommunityIcons name="trending-down" size={16} color="#ef4444" />
              ) : null}
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('forms', 'totalSubs')}</Text>
          </View>
          {stats.lastSubmission && (
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.statValueSmall, { color: colors.text }]}>
                {new Date(stats.lastSubmission).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('forms', 'lastSub')}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.actions}>
        <Button mode="contained" icon="pencil-outline" onPress={() => router.push(`/form/${id}/edit`)} style={styles.editButton} contentStyle={styles.editContent} labelStyle={styles.editLabel}>
          {t('forms', 'editForm')}
        </Button>
        <Button mode="contained" icon="eye-outline" onPress={() => router.push(`/form/${id}/submissions`)} style={styles.actionButton} contentStyle={styles.actionContent}>
          {t('forms', 'viewSubmissions')}
        </Button>
        <Button mode="outlined" icon="share-variant-outline" onPress={handleShare} style={[styles.actionButtonOutline, { borderColor: colors.accent }]} textColor={colors.accent}>
          {t('forms', 'shareForm')}
        </Button>
        <Button mode="outlined" icon="content-copy" onPress={handleCopyLink} style={[styles.actionButtonOutline, { borderColor: colors.accent }]} textColor={colors.accent}>
          {t('forms', 'copyLink')}
        </Button>
        <Button mode="outlined" icon="content-duplicate" onPress={handleDuplicate} style={[styles.actionButtonOutline, { borderColor: colors.accent }]} textColor={colors.accent} disabled={isDuplicating} loading={isDuplicating}>
          {t('forms', 'duplicateForm')}
        </Button>
        <Button mode="outlined" icon="webhook" onPress={() => setShowWebhooks(true)} style={[styles.actionButtonOutline, { borderColor: colors.accent }]} textColor={colors.accent}>
          {t('webhooks', 'title')}
        </Button>
        <Button mode="outlined" icon="delete-outline" onPress={handleDelete} style={[styles.deleteButton, { borderColor: '#ef4444' }]} textColor="#ef4444">
          {t('forms', 'deleteForm')}
        </Button>
      </View>

      <WebhookManager visible={showWebhooks} onClose={() => setShowWebhooks(false)} formId={id!} />

      <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.fieldsSection}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>{t('forms', 'formFields')}</Text>
        {(form.fields || []).slice(0, 10).map((field: any, index: number) => (
          <View key={field.id || index} style={[styles.fieldRow, { borderBottomColor: colors.border }]}>
            <MaterialCommunityIcons name={getFieldIcon(field.type) as any} size={20} color={colors.accent} />
            <Text style={[styles.fieldLabel, { color: colors.text }]} numberOfLines={1}>{field.label || field.type}</Text>
            {field.required && <Text style={[styles.required, { color: colors.accent }]}>*</Text>}
          </View>
        ))}
        {fieldCount > 10 && (
          <Text style={[styles.moreFields, { color: colors.textSecondary }]}>{t('forms', 'moreFields', { count: String(fieldCount - 10) })}</Text>
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
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: { margin: 16, borderRadius: 16 },
  formName: { fontWeight: 'bold', marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {},
  chipText: { fontSize: 12 },
  date: {},
  statsRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 16,
  },
  statCard: {
    flex: 1, borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1,
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statValueSmall: { fontSize: 14, fontWeight: '600' },
  statLabel: { fontSize: 11, marginTop: 2 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: { paddingHorizontal: 16, gap: 10 },
  editButton: { borderRadius: 12, backgroundColor: '#e8622c', marginBottom: 4 },
  editContent: { paddingVertical: 8 },
  editLabel: { fontSize: 16, fontWeight: '700' },
  actionButton: { borderRadius: 12, backgroundColor: '#e8622c' },
  actionButtonOutline: { borderRadius: 12 },
  deleteButton: { borderRadius: 12 },
  actionContent: { paddingVertical: 4 },
  divider: { marginVertical: 20, marginHorizontal: 16 },
  fieldsSection: { paddingHorizontal: 16 },
  sectionTitle: { marginBottom: 12 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  fieldLabel: { flex: 1 },
  required: { fontWeight: 'bold' },
  moreFields: { marginTop: 12, textAlign: 'center' },
});
