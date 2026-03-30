import React from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, Card, ActivityIndicator, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { useTranslation } from '@/src/translations';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useAppTheme } from '@/src/contexts/ThemeContext';

export default function SubmissionDetailScreen() {
  const { id, submissionId } = useLocalSearchParams<{ id: string; submissionId: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = language === 'sv' ? 'sv-SE' : 'en-US';
  const { colors } = useAppTheme();

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
    return <View style={styles.centered}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  if (!submission) {
    return <View style={styles.centered}><Text style={{ color: colors.textSecondary }}>{t('forms', 'notFound')}</Text></View>;
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Card style={[styles.headerCard, { backgroundColor: colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.formName, { color: colors.text }]}>{form?.name || t('nav', 'form')}</Text>
          <Text variant="bodySmall" style={[styles.date, { color: colors.textSecondary }]}>
            {t('forms', 'submittedAt')} {new Date(submission.submitted_at).toLocaleDateString(dateLocale)}{' '}
            {new Date(submission.submitted_at).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Card.Content>
      </Card>

      <View style={[styles.fieldsContainer, { backgroundColor: colors.surface }]}>
        {Object.entries(formData).map(([key, value], index) => {
          const label = labelMap[key] || key;
          const displayValue = formatValue(value);

          return (
            <View key={key}>
              <View style={styles.fieldRow}>
                <Text variant="bodySmall" style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
                <Text variant="bodyMedium" style={[styles.fieldValue, { color: colors.text }]}>{displayValue}</Text>
              </View>
              {index < Object.entries(formData).length - 1 && <Divider style={[styles.divider, { backgroundColor: colors.border }]} />}
            </View>
          );
        })}
      </View>

      {submission.signature && (
        <Card style={[styles.signatureCard, { backgroundColor: colors.surface }]}>
          <Card.Content>
            <Text variant="titleSmall" style={[styles.signatureTitle, { color: colors.textSecondary }]}>{t('forms', 'signature')}</Text>
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
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: { margin: 16, marginBottom: 8, borderRadius: 16 },
  formName: { fontWeight: 'bold' },
  date: { marginTop: 6 },
  fieldsContainer: { marginHorizontal: 16, borderRadius: 16, padding: 16 },
  fieldRow: { paddingVertical: 10 },
  fieldLabel: { marginBottom: 4 },
  fieldValue: {},
  divider: {},
  signatureCard: { margin: 16, borderRadius: 16 },
  signatureTitle: { marginBottom: 8 },
  signatureImage: { width: '100%', height: 120, backgroundColor: '#fff', borderRadius: 8 },
});
