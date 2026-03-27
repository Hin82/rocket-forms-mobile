import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, List, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { useFormGroups } from '@/src/hooks/useForms';
import * as Haptics from 'expo-haptics';
import { useTranslation } from '@/src/translations';

interface NewField {
  id: string;
  type: string;
  label: string;
  required: boolean;
}

export default function CreateFormScreen() {
  const [formName, setFormName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [fields, setFields] = useState<NewField[]>([]);
  const [step, setStep] = useState(1);

  const { user } = useAuth();
  const { data: groups } = useFormGroups();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Same categories as web app (fieldDefinitions.ts)
  const FIELD_CATEGORIES = [
    {
      titleKey: 'essentials',
      items: [
        { type: 'text', labelKey: 'text', icon: 'form-textbox' },
        { type: 'name', labelKey: 'name', icon: 'account-outline' },
        { type: 'textarea', labelKey: 'textarea', icon: 'text-box-outline' },
        { type: 'number', labelKey: 'number', icon: 'numeric' },
        { type: 'email', labelKey: 'email', icon: 'email-outline' },
        { type: 'phone', labelKey: 'phone', icon: 'phone-outline' },
        { type: 'url', labelKey: 'url', icon: 'link-variant' },
        { type: 'select', labelKey: 'select', icon: 'form-dropdown' },
        { type: 'radio', labelKey: 'radio', icon: 'radiobox-marked' },
        { type: 'checkbox', labelKey: 'checkbox', icon: 'checkbox-marked-outline' },
        { type: 'yesno', labelKey: 'yesno', icon: 'toggle-switch-outline' },
      ],
    },
    {
      titleKey: 'contactInfo',
      items: [
        { type: 'name', labelKey: 'name', icon: 'account-outline' },
        { type: 'email', labelKey: 'email', icon: 'email-outline' },
        { type: 'phone', labelKey: 'phone', icon: 'phone-outline' },
        { type: 'address', labelKey: 'address', icon: 'map-marker-outline' },
      ],
    },
    {
      titleKey: 'uploads',
      items: [
        { type: 'file', labelKey: 'file', icon: 'file-upload-outline' },
        { type: 'image', labelKey: 'image', icon: 'image-outline' },
        { type: 'document', labelKey: 'document', icon: 'file-document-outline' },
      ],
    },
    {
      titleKey: 'ratingScales',
      items: [
        { type: 'rating', labelKey: 'rating', icon: 'star-outline' },
        { type: 'nps', labelKey: 'nps', icon: 'chart-bar' },
        { type: 'likert', labelKey: 'likert', icon: 'format-list-numbered' },
        { type: 'ranking', labelKey: 'ranking', icon: 'sort-numeric-ascending' },
        { type: 'multi-text-row', labelKey: 'multiTextRow', icon: 'table-row' },
      ],
    },
    {
      titleKey: 'dateTime',
      items: [
        { type: 'date', labelKey: 'date', icon: 'calendar' },
        { type: 'time', labelKey: 'time', icon: 'clock-outline' },
        { type: 'datetime', labelKey: 'datetime', icon: 'calendar-clock' },
      ],
    },
    {
      titleKey: 'nationalId',
      items: [
        { type: 'personnummer', labelKey: 'personnummer', icon: 'card-account-details-outline' },
        { type: 'organisationsnummer', labelKey: 'organisationsnummer', icon: 'domain' },
      ],
    },
    {
      titleKey: 'legalConsent',
      items: [
        { type: 'recaptcha', labelKey: 'recaptcha', icon: 'shield-check-outline' },
        { type: 'signature', labelKey: 'signature', icon: 'draw' },
        { type: 'drawing', labelKey: 'drawing', icon: 'draw' },
      ],
    },
    {
      titleKey: 'advancedFields',
      items: [
        { type: 'slider', labelKey: 'slider', icon: 'tune-vertical' },
        { type: 'color', labelKey: 'color', icon: 'palette-outline' },
        { type: 'currency', labelKey: 'currency', icon: 'currency-usd' },
        { type: 'matrix', labelKey: 'matrix', icon: 'grid' },
      ],
    },
    {
      titleKey: 'layoutDisplay',
      items: [
        { type: 'text-display', labelKey: 'textDisplay', icon: 'format-text' },
        { type: 'separator', labelKey: 'separator', icon: 'minus' },
        { type: 'page-break', labelKey: 'pageBreak', icon: 'book-open-page-variant-outline' },
        { type: 'hidden', labelKey: 'hidden', icon: 'eye-off-outline' },
        { type: 'html-block', labelKey: 'htmlBlock', icon: 'code-tags' },
      ],
    },
  ];

  const createForm = useMutation({
    mutationFn: async () => {
      const formFields = fields.map((f, i) => ({
        id: f.id,
        type: f.type,
        label: f.label,
        required: f.required,
        order: i,
        placeholder: '',
        options: f.type === 'select' || f.type === 'radio' || f.type === 'checkbox'
          ? [`${t('create', 'option')} 1`, `${t('create', 'option')} 2`, `${t('create', 'option')} 3`]
          : undefined,
      }));

      const { data, error } = await supabase.from('forms').insert({
        name: formName,
        fields: formFields,
        settings: {},
        user_id: user!.id,
        form_group_id: selectedGroup,
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      router.replace(`/form/${data.id}`);
    },
    onError: (err: any) => {
      Alert.alert(t('create', 'error'), err.message || t('create', 'couldNotCreate'));
    },
  });

  // Field factory helper that mirrors the shared factory in useFormEditor.ts
  const createFieldDefaults = (type: string, label: string) => {
    const baseField = {
      id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      label,
      required: false,
    };

    // Add type-specific defaults matching useFormEditor factory
    if (['select', 'radio', 'checkbox'].includes(type)) {
      return {
        ...baseField,
        options: [
          { id: `o${Math.random().toString(36).substring(2, 11)}`, label: `${t('create', 'option')} 1`, value: 'option_1' },
          { id: `o${Math.random().toString(36).substring(2, 11)}`, label: `${t('create', 'option')} 2`, value: 'option_2' },
        ],
      };
    }
    if (type === 'rating') {
      return { ...baseField, ratingScale: 5 };
    }
    if (type === 'slider') {
      return { ...baseField, min: 0, max: 100, step: 1 };
    }
    if (type === 'likert') {
      return {
        ...baseField,
        likertOptions: [
          t('formEditor', 'likertStronglyDisagree'),
          t('formEditor', 'likertDisagree'),
          t('formEditor', 'likertNeutral'),
          t('formEditor', 'likertAgree'),
          t('formEditor', 'likertStronglyAgree'),
        ],
      };
    }
    if (type === 'currency') {
      return { ...baseField, currency: 'SEK' };
    }
    if (type === 'matrix') {
      return {
        ...baseField,
        matrixRows: [
          { id: `o${Math.random().toString(36).substring(2, 11)}`, label: `${t('formEditor', 'row')} 1` },
          { id: `o${Math.random().toString(36).substring(2, 11)}`, label: `${t('formEditor', 'row')} 2` },
        ],
        matrixColumns: [
          { id: `o${Math.random().toString(36).substring(2, 11)}`, label: `${t('formEditor', 'column')} 1` },
          { id: `o${Math.random().toString(36).substring(2, 11)}`, label: `${t('formEditor', 'column')} 2` },
        ],
        matrixInputType: 'radio',
      };
    }
    return baseField;
  };

  const addField = (type: string, label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newField = createFieldDefaults(type, label);
    setFields(prev => [...prev, newField]);
  };

  const removeField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
  };

  if (step === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>{t('create', 'newForm')}</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>{t('create', 'nameYourForm')}</Text>

          <TextInput
            label={t('create', 'formName')}
            value={formName}
            onChangeText={setFormName}
            mode="outlined"
            style={styles.input}
            textColor="#fff"
            outlineColor="#2d2d44"
            activeOutlineColor="#e8622c"
            theme={{ colors: { onSurfaceVariant: '#888' } }}
            autoFocus
          />

          {groups && groups.length > 0 && (
            <>
              <Text variant="titleSmall" style={styles.groupLabel}>{t('create', 'folderOptional')}</Text>
              <View style={styles.groupChips}>
                {groups.map(g => (
                  <Chip
                    key={g.id}
                    selected={selectedGroup === g.id}
                    onPress={() => setSelectedGroup(selectedGroup === g.id ? null : g.id)}
                    style={styles.groupChip}
                    textStyle={styles.groupChipText}
                  >
                    {g.name}
                  </Chip>
                ))}
              </View>
            </>
          )}

          <Button
            mode="contained"
            onPress={() => setStep(2)}
            disabled={!formName.trim()}
            style={styles.nextButton}
            contentStyle={styles.buttonContent}
          >
            {t('create', 'nextAddFields')}
          </Button>

          <Button mode="text" onPress={() => router.back()}>{t('create', 'cancel')}</Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineSmall" style={styles.title}>{formName}</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {t('create', 'tapToAdd', { count: String(fields.length) })}
        </Text>

        {fields.length > 0 && (
          <View style={styles.addedFields}>
            {fields.map((f, i) => (
              <Chip
                key={f.id}
                onClose={() => removeField(f.id)}
                style={styles.addedChip}
                textStyle={styles.addedChipText}
              >
                {i + 1}. {f.label}
              </Chip>
            ))}
          </View>
        )}

        {FIELD_CATEGORIES.map(cat => (
          <View key={cat.titleKey} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{t('fieldPalette', cat.titleKey)}</Text>
            <View style={styles.fieldGrid}>
              {cat.items.map(f => (
                <Chip
                  key={f.type}
                  icon={f.icon}
                  onPress={() => addField(f.type, t('fieldTypes', f.labelKey))}
                  style={styles.fieldChip}
                  textStyle={styles.fieldChipText}
                >
                  {t('fieldTypes', f.labelKey)}
                </Chip>
              ))}
            </View>
          </View>
        ))}

        <Button
          mode="contained"
          onPress={() => createForm.mutate()}
          disabled={fields.length === 0 || createForm.isPending}
          loading={createForm.isPending}
          style={styles.nextButton}
          contentStyle={styles.buttonContent}
        >
          {t('create', 'createForm')}
        </Button>

        <Button mode="text" onPress={() => setStep(1)}>{t('create', 'back')}</Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  content: { padding: 24, paddingBottom: 40 },
  title: { color: '#fff', fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#888', marginBottom: 24 },
  input: { marginBottom: 16, backgroundColor: '#121220' },
  groupLabel: { color: '#ccc', marginBottom: 8 },
  groupChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  groupChip: { backgroundColor: '#2d2d44' },
  groupChipText: { color: '#ccc' },
  nextButton: { marginTop: 16, borderRadius: 12, backgroundColor: '#e8622c' },
  buttonContent: { paddingVertical: 6 },
  addedFields: { gap: 6, marginBottom: 24 },
  addedChip: { backgroundColor: '#1e1e2e' },
  addedChipText: { color: '#fff' },
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categorySection: { marginBottom: 16 },
  categoryTitle: { color: '#e8622c', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 },
  fieldChip: { backgroundColor: '#2d2d44' },
  fieldChipText: { color: '#ccc' },
});