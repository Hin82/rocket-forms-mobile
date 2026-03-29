import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, ActivityIndicator } from 'react-native';
import { Text, TextInput, Button, List, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { useFormGroups } from '@/src/hooks/useForms';
import * as Haptics from 'expo-haptics';
import { trackAction } from '@/src/hooks/useAppRating';
import { useTranslation } from '@/src/translations';
import { useAppTheme } from '@/src/contexts/ThemeContext';

interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: any[];
  settings: Record<string, any>;
  tags: string[];
  usage_count: number;
}

interface NewField {
  id: string;
  type: string;
  label: string;
  required: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  contact: 'email-outline',
  registration: 'account-plus-outline',
  feedback: 'star-outline',
  survey: 'clipboard-text-outline',
  booking: 'calendar-check-outline',
  application: 'file-document-edit-outline',
  order: 'cart-outline',
  hr: 'account-group-outline',
  education: 'school-outline',
  healthcare: 'hospital-box-outline',
  wedding: 'heart-outline',
  event: 'calendar-star-outline',
};

const CATEGORY_COLORS: Record<string, string> = {
  contact: '#4facfe',
  registration: '#667eea',
  feedback: '#43e97b',
  survey: '#fa709a',
  booking: '#f7971e',
  application: '#a18cd1',
  order: '#fbc2eb',
  hr: '#84fab0',
  education: '#fccb90',
  healthcare: '#e0c3fc',
  wedding: '#f5576c',
  event: '#667eea',
};

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
  const { colors } = useAppTheme();

  // Fetch templates from database
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['formTemplates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .order('usage_count', { ascending: false });
      if (error) throw error;
      return (data || []) as FormTemplate[];
    },
    staleTime: 10 * 60 * 1000, // 10 min
  });

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

  const applyTemplate = async (template: FormTemplate) => {
    try {
      const { data, error } = await supabase.from('forms').insert({
        name: formName.trim() || template.name,
        fields: template.fields,
        settings: template.settings,
        user_id: user!.id,
        form_group_id: selectedGroup,
      }).select().single();

      if (error) throw error;

      // Update template usage count
      supabase
        .from('form_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', template.id)
        .then();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      trackAction().catch(() => {});
      router.replace(`/form/${data.id}/edit`);
    } catch (err: any) {
      Alert.alert(t('create', 'error'), err.message || t('create', 'couldNotCreate'));
    }
  };

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
      trackAction().catch(() => {});
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

  const getTemplateIcon = (category: string): string => {
    return CATEGORY_ICONS[category.toLowerCase()] || 'file-document-outline';
  };

  const getTemplateColor = (category: string): string => {
    return CATEGORY_COLORS[category.toLowerCase()] || '#667eea';
  };

  if (step === 1) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text variant="headlineMedium" style={[styles.title, { color: colors.text }]}>{t('create', 'newForm')}</Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: colors.textSecondary }]}>{t('create', 'nameYourForm')}</Text>

          <TextInput
            label={t('create', 'formName')}
            value={formName}
            onChangeText={setFormName}
            mode="outlined"
            style={[styles.input, { backgroundColor: colors.background }]}
            textColor={colors.text}
            outlineColor={colors.border}
            activeOutlineColor={colors.accent}
            theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
            autoFocus
          />

          {groups && groups.length > 0 && (
            <>
              <Text variant="titleSmall" style={[styles.groupLabel, { color: colors.text }]}>{t('create', 'folderOptional')}</Text>
              <View style={styles.groupChips}>
                {groups.map(g => (
                  <Chip
                    key={g.id}
                    selected={selectedGroup === g.id}
                    onPress={() => setSelectedGroup(selectedGroup === g.id ? null : g.id)}
                    style={[styles.groupChip, { backgroundColor: colors.border }]}
                    textStyle={[styles.groupChipText, { color: colors.text }]}
                  >
                    {g.name}
                  </Chip>
                ))}
              </View>
            </>
          )}

          {/* Templates from database */}
          <Text variant="titleSmall" style={[styles.sectionLabel, { color: colors.text }]}>{t('templates', 'quickStart')}</Text>
          <Text style={[styles.sectionHint, { color: colors.textTertiary }]}>{t('templates', 'quickStartDesc')}</Text>

          {templatesLoading ? (
            <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 20 }} />
          ) : templates && templates.length > 0 ? (
            <View style={styles.templateGrid}>
              {templates.map(tmpl => {
                const icon = getTemplateIcon(tmpl.category);
                const color = getTemplateColor(tmpl.category);
                return (
                  <Pressable
                    key={tmpl.id}
                    onPress={() => applyTemplate(tmpl)}
                    style={[styles.templateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <View style={[styles.templateIcon, { backgroundColor: color + '20' }]}>
                      <MaterialCommunityIcons name={icon as any} size={28} color={color} />
                    </View>
                    <View style={styles.templateTextCol}>
                      <Text style={[styles.templateName, { color: colors.text }]}>{tmpl.name}</Text>
                      {tmpl.description ? (
                        <Text style={[styles.templateDesc, { color: colors.textSecondary }]} numberOfLines={2}>{tmpl.description}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* Or create from scratch */}
          <Text variant="titleSmall" style={[styles.sectionLabel, { color: colors.text, marginTop: 24 }]}>{t('templates', 'orFromScratch')}</Text>

          <Button
            mode="contained"
            onPress={() => setStep(2)}
            disabled={!formName.trim()}
            style={styles.nextButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            icon="plus"
          >
            {t('create', 'nextAddFields')}
          </Button>

          <Button mode="text" onPress={() => router.back()}>{t('create', 'cancel')}</Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineSmall" style={[styles.title, { color: colors.text }]}>{formName}</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('create', 'tapToAdd', { count: String(fields.length) })}
        </Text>

        {fields.length > 0 && (
          <View style={styles.addedFields}>
            {fields.map((f, i) => (
              <Chip
                key={f.id}
                onClose={() => removeField(f.id)}
                style={[styles.addedChip, { backgroundColor: colors.surface }]}
                textStyle={[styles.addedChipText, { color: colors.text }]}
              >
                {i + 1}. {f.label}
              </Chip>
            ))}
          </View>
        )}

        {FIELD_CATEGORIES.map(cat => (
          <View key={cat.titleKey} style={styles.categorySection}>
            <Text style={[styles.categoryTitle, { color: colors.accent }]}>{t('fieldPalette', cat.titleKey)}</Text>
            <View style={styles.fieldGrid}>
              {cat.items.map(f => (
                <Chip
                  key={f.type}
                  icon={f.icon}
                  onPress={() => addField(f.type, t('fieldTypes', f.labelKey))}
                  style={[styles.fieldChip, { backgroundColor: colors.border }]}
                  textStyle={[styles.fieldChipText, { color: colors.text }]}
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
          labelStyle={styles.buttonLabel}
        >
          {t('create', 'createForm')}
        </Button>

        <Button mode="text" onPress={() => setStep(1)}>{t('create', 'back')}</Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontWeight: 'bold', marginBottom: 8 },
  subtitle: { marginBottom: 24 },
  input: { marginBottom: 16 },
  groupLabel: { marginBottom: 8 },
  groupChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  groupChip: {},
  groupChipText: {},
  nextButton: { marginTop: 16, borderRadius: 12, backgroundColor: '#e8622c' },
  buttonContent: { paddingVertical: 6 },
  buttonLabel: { color: '#fff', fontWeight: '700', fontSize: 15 },
  addedFields: { gap: 6, marginBottom: 24 },
  addedChip: {},
  addedChipText: {},
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categorySection: { marginBottom: 16 },
  categoryTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 },
  fieldChip: {},
  fieldChipText: {},
  sectionLabel: { marginBottom: 4, fontWeight: '600' },
  sectionHint: { fontSize: 13, marginBottom: 12 },
  templateGrid: { gap: 12 },
  templateCard: {
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
  },
  templateIcon: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  templateTextCol: { flex: 1 },
  templateName: { fontSize: 16, fontWeight: '600' },
  templateDesc: { fontSize: 13, marginTop: 2 },
});
