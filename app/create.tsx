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

  const QUICK_FIELDS = [
    { type: 'text', label: t('create', 'textField'), icon: 'form-textbox' },
    { type: 'email', label: t('create', 'emailField'), icon: 'email-outline' },
    { type: 'phone', label: t('create', 'phoneField'), icon: 'phone-outline' },
    { type: 'name', label: t('create', 'nameField'), icon: 'account-outline' },
    { type: 'textarea', label: t('create', 'textArea'), icon: 'text-box-outline' },
    { type: 'select', label: t('create', 'dropdown'), icon: 'form-dropdown' },
    { type: 'radio', label: t('create', 'radioButtons'), icon: 'radiobox-marked' },
    { type: 'checkbox', label: t('create', 'checkboxes'), icon: 'checkbox-marked-outline' },
    { type: 'date', label: t('create', 'dateField'), icon: 'calendar' },
    { type: 'file', label: t('create', 'fileUpload'), icon: 'file-outline' },
    { type: 'signature', label: t('create', 'signatureField'), icon: 'draw' },
    { type: 'rating', label: t('create', 'ratingField'), icon: 'star-outline' },
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

  const addField = (type: string, label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFields(prev => [...prev, {
      id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      label,
      required: false,
    }]);
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

        <View style={styles.fieldGrid}>
          {QUICK_FIELDS.map(f => (
            <Chip
              key={f.type}
              icon={f.icon}
              onPress={() => addField(f.type, f.label)}
              style={styles.fieldChip}
            >
              {f.label}
            </Chip>
          ))}
        </View>

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
  nextButton: { marginTop: 16, borderRadius: 12, backgroundColor: '#e8622c' },
  buttonContent: { paddingVertical: 6 },
  addedFields: { gap: 6, marginBottom: 24 },
  addedChip: { backgroundColor: '#1e1e2e' },
  addedChipText: { color: '#fff' },
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fieldChip: { backgroundColor: '#2d2d44' },
});
