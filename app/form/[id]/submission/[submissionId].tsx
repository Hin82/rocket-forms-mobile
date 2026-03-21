import React from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, Card, ActivityIndicator, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';

export default function SubmissionDetailScreen() {
  const { id, submissionId } = useLocalSearchParams<{ id: string; submissionId: string }>();

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
    return <View style={styles.centered}><ActivityIndicator size="large" color="#e8622c" /></View>;
  }

  if (!submission) {
    return <View style={styles.centered}><Text style={{ color: '#888' }}>Hittades inte</Text></View>;
  }

  // Build label map from form fields
  const labelMap: Record<string, string> = {};
  (form?.fields || []).forEach((field: any) => {
    if (field.id && field.label) labelMap[field.id] = field.label;
  });

  const formData = submission.form_data || {};

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.formName}>{form?.name || 'Formulär'}</Text>
          <Text variant="bodySmall" style={styles.date}>
            Inskickad {new Date(submission.submitted_at).toLocaleDateString('sv-SE')}{' '}
            {new Date(submission.submitted_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Card.Content>
      </Card>

      <View style={styles.fieldsContainer}>
        {Object.entries(formData).map(([key, value], index) => {
          const label = labelMap[key] || key;
          const displayValue = formatValue(value);

          return (
            <View key={key}>
              <View style={styles.fieldRow}>
                <Text variant="bodySmall" style={styles.fieldLabel}>{label}</Text>
                <Text variant="bodyMedium" style={styles.fieldValue}>{displayValue}</Text>
              </View>
              {index < Object.entries(formData).length - 1 && <Divider style={styles.divider} />}
            </View>
          );
        })}
      </View>

      {/* Signature */}
      {submission.signature && (
        <Card style={styles.signatureCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.signatureTitle}>Underskrift</Text>
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

function formatValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nej';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') {
    // Name field: { firstName, lastName }
    if (value.firstName || value.lastName) {
      return [value.firstName, value.lastName].filter(Boolean).join(' ');
    }
    // Address field
    if (value.street) {
      return [value.street, value.postalCode, value.city, value.country].filter(Boolean).join(', ');
    }
    return JSON.stringify(value);
  }
  return String(value);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
  },
  formName: { color: '#fff', fontWeight: 'bold' },
  date: { color: '#888', marginTop: 6 },
  fieldsContainer: {
    marginHorizontal: 16,
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 16,
  },
  fieldRow: { paddingVertical: 10 },
  fieldLabel: { color: '#888', marginBottom: 4 },
  fieldValue: { color: '#fff' },
  divider: { backgroundColor: '#2d2d44' },
  signatureCard: {
    margin: 16,
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
  },
  signatureTitle: { color: '#888', marginBottom: 8 },
  signatureImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
});
