import React from 'react';
import { View, StyleSheet, ScrollView, Image, Share, Alert, Pressable } from 'react-native';
import { Text, Card, Divider, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useTranslation } from '@/src/translations';
import { useLanguage, type LanguageCode } from '@/src/contexts/LanguageContext';
import { SubmissionsSkeleton } from '@/src/components/SkeletonLoader';

const DATE_LOCALE_MAP: Record<LanguageCode, string> = {
  sv: 'sv-SE', en: 'en-GB', no: 'nb-NO', da: 'da-DK',
  fi: 'fi-FI', de: 'de-DE', fr: 'fr-FR', es: 'es-ES',
};

export default function SubmissionDetailScreen() {
  const { id, submissionId } = useLocalSearchParams<{ id: string; submissionId: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = DATE_LOCALE_MAP[language] || 'en-GB';

  const { data: submission, isLoading: subLoading } = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', submissionId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: form } = useQuery({
    queryKey: ['form', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('name, fields')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (subLoading) {
    return <SubmissionsSkeleton />;
  }

  if (!submission) {
    return <View style={styles.centered}><Text style={{ color: '#888' }}>{t('forms', 'notFound')}</Text></View>;
  }

  const labelMap: Record<string, string> = {};
  (form?.fields || []).forEach((field: any) => {
    if (field.id && field.label) labelMap[field.id] = field.label;
  });

  const formData = submission.form_data || {};

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? t('forms', 'yes') : t('forms', 'no');
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') {
      if (value.firstName || value.lastName) {
        return [value.firstName, value.lastName].filter(Boolean).join(' ');
      }
      if (value.street) {
        return [value.street, value.postalCode, value.city, value.country].filter(Boolean).join(', ');
      }
      return JSON.stringify(value);
    }
    return String(value);
  };

  const handleCopyValue = async (label: string, value: string) => {
    await Clipboard.setStringAsync(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleShareSubmission = async () => {
    const lines = Object.entries(formData).map(([key, value]) => {
      const label = labelMap[key] || key;
      return `${label}: ${formatValue(value)}`;
    });
    const text = `${form?.name || 'Form'}\n${t('forms', 'submittedAt')} ${new Date(submission.submitted_at).toLocaleString(dateLocale)}\n\n${lines.join('\n')}`;

    try {
      await Share.share({ message: text });
    } catch {}
  };

  const submittedDate = new Date(submission.submitted_at);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text variant="titleMedium" style={styles.formName}>{form?.name || t('nav', 'form')}</Text>
              <Text style={styles.date}>
                {submittedDate.toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                {' · '}
                {submittedDate.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <Pressable onPress={handleShareSubmission} style={styles.shareBtn} accessibilityLabel={t('forms', 'shareForm')} accessibilityRole="button">
              <MaterialCommunityIcons name="share-variant-outline" size={20} color="#e8622c" />
            </Pressable>
          </View>
        </Card.Content>
      </Card>

      {/* Fields */}
      <View style={styles.fieldsContainer}>
        {Object.entries(formData).map(([key, value], index) => {
          const label = labelMap[key] || key;
          const displayValue = formatValue(value);

          return (
            <View key={key}>
              <Pressable
                onLongPress={() => handleCopyValue(label, displayValue)}
                style={styles.fieldRow}
              >
                <Text style={styles.fieldLabel}>{label}</Text>
                <View style={styles.valueRow}>
                  <Text style={styles.fieldValue}>{displayValue}</Text>
                  <Pressable onPress={() => handleCopyValue(label, displayValue)} hitSlop={8}>
                    <MaterialCommunityIcons name="content-copy" size={16} color="#555" />
                  </Pressable>
                </View>
              </Pressable>
              {index < Object.entries(formData).length - 1 && <Divider style={styles.divider} />}
            </View>
          );
        })}
      </View>

      {/* Signature */}
      {submission.signature && (
        <Card style={styles.signatureCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.signatureTitle}>{t('forms', 'signature')}</Text>
            <Image
              source={{ uri: submission.signature }}
              style={styles.signatureImage}
              resizeMode="contain"
            />
          </Card.Content>
        </Card>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: { margin: 16, marginBottom: 8, backgroundColor: '#1e1e2e', borderRadius: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1 },
  formName: { color: '#fff', fontWeight: 'bold' },
  date: { color: '#888', marginTop: 6, fontSize: 13 },
  shareBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(232, 98, 44, 0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  fieldsContainer: { marginHorizontal: 16, backgroundColor: '#1e1e2e', borderRadius: 16, padding: 16 },
  fieldRow: { paddingVertical: 12 },
  fieldLabel: { color: '#888', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldValue: { color: '#fff', fontSize: 15, flex: 1, marginRight: 8 },
  divider: { backgroundColor: '#2d2d44' },
  signatureCard: { margin: 16, backgroundColor: '#1e1e2e', borderRadius: 16 },
  signatureTitle: { color: '#888', marginBottom: 8 },
  signatureImage: { width: '100%', height: 120, backgroundColor: '#fff', borderRadius: 8 },
});
