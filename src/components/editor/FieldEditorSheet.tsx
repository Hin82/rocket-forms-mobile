import React, { useMemo, useCallback, useState, forwardRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import {
  Text,
  TextInput,
  Switch,
  Button,
  Chip,
  IconButton,
  SegmentedButtons,
  List,
  Menu,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { FormField, FieldOption, ConditionalLogic, Condition } from '../../hooks/useFormEditor';
import { useTranslation } from '@/src/translations';
import { LANGUAGES } from '@/src/contexts/LanguageContext';

// ---- Constants ----

const COLORS = {
  bg: '#121220',
  card: '#1e1e2e',
  border: '#2d2d44',
  accent: '#e8622c',
  text: '#ffffff',
  textSecondary: '#cccccc',
  textMuted: '#999999',
  textDim: '#888888',
  danger: '#cc3333',
};

const CURRENCIES = ['SEK', 'NOK', 'DKK', 'EUR', 'USD', 'GBP', 'CHF'];

// Shared field type key mapping - same as used in useFormEditor.ts
function getFieldTypeKey(type: string): string {
  const keyMap: Record<string, string> = {
    'text-display': 'textDisplay',
    'multi-text-row': 'multiTextRow',
    'html-block': 'htmlBlock',
    'page-break': 'pageBreak',
    recaptcha: 'recaptcha',
  };
  return keyMap[type] || type;
}

// ---- Interfaces ----

interface FieldEditorSheetProps {
  field: FormField | null;
  allFields: FormField[];
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
  onDelete: (fieldId: string) => void;
  onDuplicate?: (fieldId: string) => void;
  onClose: () => void;
}

// ---- Helpers ----

function generateId(): string {
  return 'o' + Math.random().toString(36).substring(2, 11);
}

function isLayoutType(type: string): boolean {
  return ['separator', 'page-break', 'html-block', 'text-display', 'document'].includes(type);
}

function hasPlaceholder(type: string): boolean {
  return [
    'text', 'email', 'number', 'url', 'phone', 'textarea',
    'select', 'currency', 'personnummer', 'organisationsnummer',
  ].includes(type);
}

// ========================
// MAIN COMPONENT
// ========================

const FieldEditorSheet = forwardRef<BottomSheet, FieldEditorSheetProps>(
  ({ field, allFields, onUpdate, onDelete, onDuplicate, onClose }, ref) => {
    const { t } = useTranslation();
    const snapPoints = useMemo(() => ['80%', '95%'], []);

    const acceptedFileTypesOptions = useMemo(() => [
      { label: t('fieldEditor', 'fileTypeImages'), value: 'images' },
      { label: t('fieldEditor', 'fileTypeDocuments'), value: 'documents' },
      { label: t('fieldEditor', 'fileTypePdf'), value: 'pdf' },
      { label: t('fieldEditor', 'fileTypeWord'), value: 'word' },
      { label: t('fieldEditor', 'fileTypeExcel'), value: 'excel' },
      { label: t('fieldEditor', 'fileTypeAll'), value: 'all' },
    ], [t]);

    const conditionOperators = useMemo(() => [
      { label: t('fieldEditor', 'operatorEquals'), value: 'equals' },
      { label: t('fieldEditor', 'operatorNotEquals'), value: 'not_equals' },
      { label: t('fieldEditor', 'operatorContains'), value: 'contains' },
      { label: t('fieldEditor', 'operatorNotContains'), value: 'not_contains' },
      { label: t('fieldEditor', 'operatorGreaterThan'), value: 'greater_than' },
      { label: t('fieldEditor', 'operatorLessThan'), value: 'less_than' },
      { label: t('fieldEditor', 'operatorIsEmpty'), value: 'is_empty' },
      { label: t('fieldEditor', 'operatorIsNotEmpty'), value: 'is_not_empty' },
    ], [t]);

    const getFieldTypeLabel = useCallback((type: string) => {
      const key = getFieldTypeKey(type);
      return t('fieldTypes', key);
    }, [t]);

    const [localField, setLocalField] = useState<FormField | null>(field);

    useEffect(() => {
      setLocalField(field);
    }, [field]);

    const update = useCallback(
      (updates: Partial<FormField>) => {
        if (!localField) return;
        const updated = { ...localField, ...updates };
        setLocalField(updated);
        onUpdate(localField.id, updates);
      },
      [localField, onUpdate],
    );

    const handleDelete = useCallback(() => {
      if (!localField) return;
      Alert.alert(
        t('fieldEditor', 'deleteFieldTitle'),
        t('fieldEditor', 'deleteFieldConfirm', { label: localField.label }),
        [
          { text: t('fieldEditor', 'deleteCancel'), style: 'cancel' },
          {
            text: t('fieldEditor', 'deleteConfirm'),
            style: 'destructive',
            onPress: () => {
              onDelete(localField.id);
              onClose();
            },
          },
        ],
      );
    }, [localField, onDelete, onClose, t]);

    const handleDuplicate = useCallback(() => {
      if (!localField || !onDuplicate) return;
      onDuplicate(localField.id);
      onClose();
    }, [localField, onDuplicate, onClose]);

    if (!localField) return null;

    const ft = localField.type;

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.headerText}>
            {t('fieldEditor', 'editField')}
          </Text>
          <Chip style={styles.typeBadge} textStyle={styles.typeBadgeText}>
            {getFieldTypeLabel(ft)}
          </Chip>
        </View>

        <BottomSheetScrollView contentContainerStyle={styles.scroll}>
          {/* =============================== */}
          {/* COMMON SETTINGS                  */}
          {/* =============================== */}
          <Section title={t('fieldEditor', 'basicSettings')}>
            <Input
              label={t('fieldEditor', 'label')}
              value={localField.label}
              onChangeText={(v) => update({ label: v })}
            />
            <Input
              label={t('fieldEditor', 'description')}
              value={localField.description || ''}
              onChangeText={(v) => update({ description: v })}
              multiline
            />
            {hasPlaceholder(ft) && (
              <Input
                label={t('fieldEditor', 'placeholder')}
                value={localField.placeholder || ''}
                onChangeText={(v) => update({ placeholder: v })}
              />
            )}
            <Input
              label={t('fieldEditor', 'helpText')}
              value={localField.helpText || ''}
              onChangeText={(v) => update({ helpText: v })}
            />
            {!isLayoutType(ft) && (
              <>
                <Row label={t('fieldEditor', 'required')}>
                  <Switch
                    value={!!localField.required}
                    onValueChange={(v) => update({ required: v })}
                    color={COLORS.accent}
                  />
                </Row>
                <Row label={t('fieldEditor', 'hiddenField')}>
                  <Switch
                    value={!!localField.isHiddenField}
                    onValueChange={(v) => update({ isHiddenField: v })}
                    color={COLORS.accent}
                  />
                </Row>
              </>
            )}
          </Section>

          {/* =============================== */}
          {/* LANGUAGE TRANSLATIONS             */}
          {/* =============================== */}
          <CollapsibleSection title={t('fieldEditor', 'languageVersions')}>
            {LANGUAGES.map((lang) => (
              <Input
                key={lang.code}
                label={`${lang.name} (${lang.code})`}
                value={(localField.labels && localField.labels[lang.code]) || ''}
                onChangeText={(v) =>
                  update({ labels: { ...localField.labels, [lang.code]: v } })
                }
              />
            ))}
          </CollapsibleSection>

          {/* =============================== */}
          {/* SELECT / RADIO / CHECKBOX        */}
          {/* =============================== */}
          {['select', 'radio', 'checkbox'].includes(ft) && (
            <Section title={t('fieldEditor', 'options')}>
              <OptionsEditor
                options={localField.options || []}
                onChange={(opts) => update({ options: opts })}
              />
            </Section>
          )}

          {/* =============================== */}
          {/* RATING                           */}
          {/* =============================== */}
          {ft === 'rating' && (
            <Section title={t('fieldEditor', 'ratingSettings')}>
              <Text style={styles.subLabel}>{t('fieldEditor', 'scale')}</Text>
              <SegmentedButtons
                value={String(localField.ratingScale || 5)}
                onValueChange={(v) => update({ ratingScale: parseInt(v, 10) })}
                buttons={[
                  { value: '3', label: '3' },
                  { value: '5', label: '5' },
                  { value: '7', label: '7' },
                  { value: '10', label: '10' },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Text style={[styles.subLabel, { marginTop: 12 }]}>{t('fieldEditor', 'icon')}</Text>
              <SegmentedButtons
                value={localField.ratingIcon || 'star'}
                onValueChange={(v) =>
                  update({ ratingIcon: v as 'star' | 'heart' | 'thumbs' | 'number' })
                }
                buttons={[
                  { value: 'star', label: t('fieldEditor', 'iconStar'), icon: 'star' },
                  { value: 'heart', label: t('fieldEditor', 'iconHeart'), icon: 'heart' },
                  { value: 'thumbs', label: t('fieldEditor', 'iconThumb'), icon: 'thumb-up' },
                  { value: 'number', label: t('fieldEditor', 'iconNumber'), icon: 'numeric' },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
            </Section>
          )}

          {/* =============================== */}
          {/* NPS                              */}
          {/* =============================== */}
          {ft === 'nps' && (
            <Section title={t('fieldEditor', 'npsSettings')}>
              <Input
                label={t('fieldEditor', 'mainQuestion')}
                value={localField.npsQuestion || ''}
                onChangeText={(v) => update({ npsQuestion: v })}
              />
              <Input
                label={t('fieldEditor', 'promoterQuestion')}
                value={localField.npsPromoterQuestion || ''}
                onChangeText={(v) => update({ npsPromoterQuestion: v })}
              />
              <Input
                label={t('fieldEditor', 'passiveQuestion')}
                value={localField.npsPassiveQuestion || ''}
                onChangeText={(v) => update({ npsPassiveQuestion: v })}
              />
              <Input
                label={t('fieldEditor', 'detractorQuestion')}
                value={localField.npsDetractorQuestion || ''}
                onChangeText={(v) => update({ npsDetractorQuestion: v })}
              />
              <Input
                label={t('fieldEditor', 'commentsLabel')}
                value={localField.npsCommentsLabel || ''}
                onChangeText={(v) => update({ npsCommentsLabel: v })}
              />
            </Section>
          )}

          {/* =============================== */}
          {/* SLIDER                           */}
          {/* =============================== */}
          {ft === 'slider' && (
            <Section title={t('fieldEditor', 'sliderSettings')}>
              <Input
                label={t('fieldEditor', 'min')}
                value={String(localField.min ?? 0)}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  if (!isNaN(n)) update({ min: n });
                }}
              />
              <Input
                label={t('fieldEditor', 'max')}
                value={String(localField.max ?? 100)}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  if (!isNaN(n)) update({ max: n });
                }}
              />
              <Input
                label={t('fieldEditor', 'step')}
                value={String(localField.step ?? 1)}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  if (!isNaN(n) && n > 0) update({ step: n });
                }}
              />
              <Input
                label={t('fieldEditor', 'prefix')}
                value={localField.prefix || ''}
                onChangeText={(v) => update({ prefix: v })}
              />
              <Input
                label={t('fieldEditor', 'suffix')}
                value={localField.suffix || ''}
                onChangeText={(v) => update({ suffix: v })}
              />
              <Row label={t('fieldEditor', 'showValue')}>
                <Switch
                  value={!!localField.showValue}
                  onValueChange={(v) => update({ showValue: v })}
                  color={COLORS.accent}
                />
              </Row>
            </Section>
          )}

          {/* =============================== */}
          {/* TEXTAREA                         */}
          {/* =============================== */}
          {ft === 'textarea' && (
            <Section title={t('fieldEditor', 'textareaSettings')}>
              <Row label={t('fieldEditor', 'enableRichText')}>
                <Switch
                  value={!!localField.enableRichText}
                  onValueChange={(v) => update({ enableRichText: v })}
                  color={COLORS.accent}
                />
              </Row>
            </Section>
          )}

          {/* =============================== */}
          {/* YES/NO                           */}
          {/* =============================== */}
          {ft === 'yesno' && (
            <Section title={t('fieldEditor', 'yesNoSettings')}>
              <Text style={styles.subLabel}>{t('fieldEditor', 'defaultAnswer')}</Text>
              <SegmentedButtons
                value={localField.defaultAnswer || 'none'}
                onValueChange={(v) =>
                  update({ defaultAnswer: v === 'none' ? null : (v as 'yes' | 'no') })
                }
                buttons={[
                  { value: 'yes', label: t('fieldEditor', 'yes') },
                  { value: 'no', label: t('fieldEditor', 'no') },
                  { value: 'none', label: t('fieldEditor', 'none') },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Row label={t('fieldEditor', 'commentField')}>
                <Switch
                  value={!!localField.hasCommentField}
                  onValueChange={(v) => update({ hasCommentField: v })}
                  color={COLORS.accent}
                />
              </Row>
              {!!localField.hasCommentField && (
                <Input
                  label={t('fieldEditor', 'commentPlaceholder')}
                  value={localField.commentPlaceholder || ''}
                  onChangeText={(v) => update({ commentPlaceholder: v })}
                />
              )}
              <Input
                label={t('fieldEditor', 'mediaUrl')}
                value={localField.mediaUrl || ''}
                onChangeText={(v) => update({ mediaUrl: v })}
              />
              <Text style={styles.subLabel}>{t('fieldEditor', 'mediaType')}</Text>
              <SegmentedButtons
                value={localField.mediaType || 'image'}
                onValueChange={(v) => update({ mediaType: v as 'image' | 'video' })}
                buttons={[
                  { value: 'image', label: t('fieldEditor', 'mediaImage') },
                  { value: 'video', label: t('fieldEditor', 'mediaVideo') },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
            </Section>
          )}

          {/* =============================== */}
          {/* SEPARATOR                        */}
          {/* =============================== */}
          {ft === 'separator' && (
            <Section title={t('fieldEditor', 'separatorSettings')}>
              <Text style={styles.subLabel}>{t('fieldEditor', 'style')}</Text>
              <SegmentedButtons
                value={localField.separatorOptions?.style || 'solid'}
                onValueChange={(v) =>
                  update({
                    separatorOptions: {
                      ...localField.separatorOptions,
                      style: v as any,
                    },
                  })
                }
                buttons={[
                  { value: 'solid', label: t('fieldEditor', 'styleSolid') },
                  { value: 'dashed', label: t('fieldEditor', 'styleDashed') },
                  { value: 'dotted', label: t('fieldEditor', 'styleDotted') },
                  { value: 'double', label: t('fieldEditor', 'styleDouble') },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <SegmentedButtons
                value={localField.separatorOptions?.style === 'gradient' || localField.separatorOptions?.pattern === 'wavy' ? (localField.separatorOptions?.pattern === 'wavy' ? 'wavy' : localField.separatorOptions!.style!) : ''}
                onValueChange={(v) =>
                  update({
                    separatorOptions: {
                      ...localField.separatorOptions,
                      style: v as any,
                    },
                  })
                }
                buttons={[
                  { value: 'gradient', label: t('fieldEditor', 'styleGradient') },
                ]}
                style={[styles.segmented, { marginTop: 8 }]}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Input
                label={t('fieldEditor', 'colorHex')}
                value={localField.separatorOptions?.color || '#2d2d44'}
                onChangeText={(v) =>
                  update({
                    separatorOptions: { ...localField.separatorOptions, color: v },
                  })
                }
              />
              <Text style={[styles.subLabel, { marginTop: 8 }]}>
                {t('fieldEditor', 'thickness')}: {localField.separatorOptions?.thickness || 1}px
              </Text>
              <Slider
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={localField.separatorOptions?.thickness || 1}
                onValueChange={(v: number) =>
                  update({
                    separatorOptions: { ...localField.separatorOptions, thickness: v },
                  })
                }
                minimumTrackTintColor={COLORS.accent}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.accent}
                style={{ marginBottom: 8 }}
              />
              <Text style={styles.subLabel}>{t('fieldEditor', 'pattern')}</Text>
              <SegmentedButtons
                value={localField.separatorOptions?.pattern || 'simple'}
                onValueChange={(v) =>
                  update({
                    separatorOptions: { ...localField.separatorOptions, pattern: v as any },
                  })
                }
                buttons={[
                  { value: 'simple', label: t('fieldEditor', 'patternSimple') },
                  { value: 'decorative', label: t('fieldEditor', 'patternDecorative') },
                  { value: 'wavy', label: t('fieldEditor', 'patternWavy') },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Text style={[styles.subLabel, { marginTop: 12 }]}>{t('fieldEditor', 'spacing')}</Text>
              <SegmentedButtons
                value={localField.separatorOptions?.spacing || 'medium'}
                onValueChange={(v) =>
                  update({
                    separatorOptions: { ...localField.separatorOptions, spacing: v as any },
                  })
                }
                buttons={[
                  { value: 'small', label: t('fieldEditor', 'spacingSmall') },
                  { value: 'medium', label: t('fieldEditor', 'spacingMedium') },
                  { value: 'large', label: t('fieldEditor', 'spacingLarge') },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
            </Section>
          )}

          {/* =============================== */}
          {/* TEXT-DISPLAY                      */}
          {/* =============================== */}
          {ft === 'text-display' && (
            <Section title={t('fieldEditor', 'textDisplaySettings')}>
              <Input
                label={t('fieldEditor', 'content')}
                value={localField.textContent || ''}
                onChangeText={(v) => update({ textContent: v })}
                multiline
                numberOfLines={4}
              />
              <Text style={styles.subLabel}>{t('fieldEditor', 'fontSize')}</Text>
              <SegmentedButtons
                value={localField.textDisplayOptions?.fontSize || '16'}
                onValueChange={(v) =>
                  update({
                    textDisplayOptions: { ...localField.textDisplayOptions, fontSize: v },
                  })
                }
                buttons={[
                  { value: '12', label: '12' },
                  { value: '14', label: '14' },
                  { value: '16', label: '16' },
                  { value: '20', label: '20' },
                  { value: '24', label: '24' },
                  { value: '32', label: '32' },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Input
                label={t('fieldEditor', 'fontFamily')}
                value={localField.textDisplayOptions?.fontFamily || ''}
                onChangeText={(v) =>
                  update({
                    textDisplayOptions: { ...localField.textDisplayOptions, fontFamily: v },
                  })
                }
              />
              <Text style={[styles.subLabel, { marginTop: 12 }]}>{t('fieldEditor', 'fontWeight')}</Text>
              <SegmentedButtons
                value={localField.textDisplayOptions?.fontWeight || 'normal'}
                onValueChange={(v) =>
                  update({
                    textDisplayOptions: { ...localField.textDisplayOptions, fontWeight: v },
                  })
                }
                buttons={[
                  { value: 'normal', label: t('fieldEditor', 'fontWeightNormal') },
                  { value: 'bold', label: t('fieldEditor', 'fontWeightBold') },
                  { value: '300', label: t('fieldEditor', 'fontWeightLight') },
                  { value: '600', label: t('fieldEditor', 'fontWeightSemibold') },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Input
                label={t('fieldEditor', 'textColor')}
                value={localField.textDisplayOptions?.color || '#ffffff'}
                onChangeText={(v: string) =>
                  update({
                    textDisplayOptions: { ...localField.textDisplayOptions, color: v },
                  })
                }
              />
              <Text style={[styles.subLabel, { marginTop: 12 }]}>{t('fieldEditor', 'textAlign')}</Text>
              <SegmentedButtons
                value={localField.textDisplayOptions?.textAlign || 'left'}
                onValueChange={(v) =>
                  update({
                    textDisplayOptions: { ...localField.textDisplayOptions, textAlign: v as any },
                  })
                }
                buttons={[
                  { value: 'left', label: t('fieldEditor', 'alignLeft') },
                  { value: 'center', label: t('fieldEditor', 'alignCenter') },
                  { value: 'right', label: t('fieldEditor', 'alignRight') },
                  { value: 'justify', label: t('fieldEditor', 'alignJustify') },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Input
                label={t('fieldEditor', 'backgroundColor')}
                value={localField.textDisplayOptions?.backgroundColor || ''}
                onChangeText={(v) =>
                  update({
                    textDisplayOptions: { ...localField.textDisplayOptions, backgroundColor: v },
                  })
                }
              />
              <Input
                label={t('fieldEditor', 'padding')}
                value={String(localField.textDisplayOptions?.padding ?? '')}
                keyboardType="numeric"
                onChangeText={(v) =>
                  update({
                    textDisplayOptions: { ...localField.textDisplayOptions, padding: v },
                  })
                }
              />
              <Input
                label={t('fieldEditor', 'margin')}
                value={String(localField.textDisplayOptions?.margin ?? '')}
                keyboardType="numeric"
                onChangeText={(v) =>
                  update({
                    textDisplayOptions: { ...localField.textDisplayOptions, margin: v },
                  })
                }
              />
              <Input
                label={t('fieldEditor', 'borderRadius')}
                value={String(localField.textDisplayOptions?.borderRadius ?? '')}
                keyboardType="numeric"
                onChangeText={(v) =>
                  update({
                    textDisplayOptions: { ...localField.textDisplayOptions, borderRadius: v },
                  })
                }
              />
              <Input
                label={t('fieldEditor', 'lineHeight')}
                value={String(localField.textDisplayOptions?.lineHeight ?? '')}
                keyboardType="numeric"
                onChangeText={(v) =>
                  update({
                    textDisplayOptions: { ...localField.textDisplayOptions, lineHeight: v },
                  })
                }
              />
            </Section>
          )}

          {/* =============================== */}
          {/* RANKING                          */}
          {/* =============================== */}
          {ft === 'ranking' && (
            <Section title={t('fieldEditor', 'rankingItems')}>
              <OptionsEditor
                options={localField.rankingItems || []}
                onChange={(items) => update({ rankingItems: items })}
              />
            </Section>
          )}

          {/* =============================== */}
          {/* DRAWING                          */}
          {/* =============================== */}
          {ft === 'drawing' && (
            <Section title={t('fieldEditor', 'drawingSettings')}>
              <Text style={styles.subLabel}>
                {t('fieldEditor', 'canvasWidth')}: {localField.canvasWidth || 800}px
              </Text>
              <Slider
                minimumValue={400}
                maximumValue={1200}
                step={50}
                value={localField.canvasWidth || 800}
                onValueChange={(v: number) => update({ canvasWidth: v })}
                minimumTrackTintColor={COLORS.accent}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.accent}
                style={{ marginBottom: 8 }}
              />
              <Text style={styles.subLabel}>
                {t('fieldEditor', 'canvasHeight')}: {localField.canvasHeight || 400}px
              </Text>
              <Slider
                minimumValue={200}
                maximumValue={800}
                step={50}
                value={localField.canvasHeight || 400}
                onValueChange={(v: number) => update({ canvasHeight: v })}
                minimumTrackTintColor={COLORS.accent}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.accent}
                style={{ marginBottom: 8 }}
              />
              <Input
                label={t('fieldEditor', 'backgroundColor')}
                value={localField.backgroundColor || '#ffffff'}
                onChangeText={(v) => update({ backgroundColor: v })}
              />
            </Section>
          )}

          {/* =============================== */}
          {/* HIDDEN                           */}
          {/* =============================== */}
          {ft === 'hidden' && (
            <Section title={t('fieldEditor', 'hiddenFieldSection')}>
              <Input
                label={t('fieldEditor', 'hiddenValue')}
                value={localField.hiddenFieldValue || ''}
                onChangeText={(v) => update({ hiddenFieldValue: v })}
              />
            </Section>
          )}

          {/* =============================== */}
          {/* COLOR                            */}
          {/* =============================== */}
          {ft === 'color' && (
            <Section title={t('fieldEditor', 'colorPickerSettings')}>
              <Input
                label={t('fieldEditor', 'defaultColor')}
                value={localField.defaultColor || '#000000'}
                onChangeText={(v) => update({ defaultColor: v })}
              />
              {localField.defaultColor ? (
                <View
                  style={[
                    styles.colorPreview,
                    { backgroundColor: localField.defaultColor },
                  ]}
                />
              ) : null}
            </Section>
          )}

          {/* =============================== */}
          {/* DOCUMENT                         */}
          {/* =============================== */}
          {ft === 'document' && (
            <Section title={t('fieldEditor', 'documentSettings')}>
              <Text style={styles.subLabel}>{t('fieldEditor', 'alignment')}</Text>
              <SegmentedButtons
                value={localField.documentAlignment || 'center'}
                onValueChange={(v) =>
                  update({ documentAlignment: v as 'left' | 'center' | 'right' })
                }
                buttons={[
                  { value: 'left', label: t('fieldEditor', 'alignLeft') },
                  { value: 'center', label: t('fieldEditor', 'alignCenter') },
                  { value: 'right', label: t('fieldEditor', 'alignRight') },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Text style={[styles.subLabel, { marginTop: 16 }]}>{t('fieldEditor', 'resizing')}</Text>
              <Input
                label={t('fieldEditor', 'width')}
                value={String(localField.documentResize?.width ?? '')}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  update({
                    documentResize: {
                      ...localField.documentResize,
                      width: isNaN(n) ? undefined : String(n),
                    },
                  });
                }}
              />
              <Input
                label={t('fieldEditor', 'height')}
                value={String(localField.documentResize?.height ?? '')}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  update({
                    documentResize: {
                      ...localField.documentResize,
                      height: isNaN(n) ? undefined : String(n),
                    },
                  });
                }}
              />
              <Text style={styles.subLabel}>{t('fieldEditor', 'unit')}</Text>
              <SegmentedButtons
                value={localField.documentResize?.unit || 'percentage'}
                onValueChange={(v) =>
                  update({
                    documentResize: {
                      ...localField.documentResize,
                      unit: v as 'percentage' | 'pixels',
                    },
                  })
                }
                buttons={[
                  { value: 'percentage', label: t('fieldEditor', 'unitPercentage') },
                  { value: 'pixels', label: t('fieldEditor', 'unitPixels') },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Input
                label={t('fieldEditor', 'scalePercent')}
                value={String(localField.documentResize?.scale ?? 100)}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  update({
                    documentResize: {
                      ...localField.documentResize,
                      scale: isNaN(n) ? undefined : n,
                    },
                  });
                }}
              />
            </Section>
          )}

          {/* =============================== */}
          {/* FILE                             */}
          {/* =============================== */}
          {ft === 'file' && (
            <Section title={t('fieldEditor', 'fileUploadSettings')}>
              <Text style={styles.subLabel}>{t('fieldEditor', 'acceptedFileTypes')}</Text>
              <View style={styles.chipRow}>
                {acceptedFileTypesOptions.map((opt) => {
                  const current = localField.acceptedFileTypes || [];
                  const selected = current.includes(opt.value);
                  return (
                    <Chip
                      key={opt.value}
                      selected={selected}
                      onPress={() => {
                        const updated = selected
                          ? current.filter((v) => v !== opt.value)
                          : [...current, opt.value];
                        update({ acceptedFileTypes: updated });
                      }}
                      style={[styles.chip, selected && styles.chipSelected]}
                      textStyle={{ color: selected ? '#fff' : COLORS.textSecondary }}
                      selectedColor="#fff"
                    >
                      {opt.label}
                    </Chip>
                  );
                })}
              </View>
              <Input
                label={t('fieldEditor', 'maxFileSize')}
                value={String((localField.maxFileSize || 10485760) / 1048576)}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  if (!isNaN(n)) update({ maxFileSize: n * 1048576 });
                }}
              />
              <Input
                label={t('fieldEditor', 'maxFiles')}
                value={String(localField.maxFiles || 1)}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseInt(v, 10);
                  if (!isNaN(n) && n > 0) update({ maxFiles: n });
                }}
              />
            </Section>
          )}

          {/* =============================== */}
          {/* IMAGE                            */}
          {/* =============================== */}
          {ft === 'image' && (
            <Section title={t('fieldEditor', 'imageSettings')}>
              <Text style={styles.subLabel}>{t('fieldEditor', 'alignment')}</Text>
              <SegmentedButtons
                value={localField.imageAlignment || 'center'}
                onValueChange={(v) =>
                  update({ imageAlignment: v as 'left' | 'center' | 'right' })
                }
                buttons={[
                  { value: 'left', label: t('fieldEditor', 'alignLeft') },
                  { value: 'center', label: t('fieldEditor', 'alignCenter') },
                  { value: 'right', label: t('fieldEditor', 'alignRight') },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Text style={[styles.subLabel, { marginTop: 12 }]}>{t('fieldEditor', 'gridColumns')}</Text>
              <SegmentedButtons
                value={String(localField.gridColumns || 1)}
                onValueChange={(v) => update({ gridColumns: parseInt(v, 10) })}
                buttons={[
                  { value: '1', label: '1' },
                  { value: '2', label: '2' },
                  { value: '3', label: '3' },
                  { value: '4', label: '4' },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Input
                label={t('fieldEditor', 'maxImages')}
                value={String(localField.maxImages || 1)}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseInt(v, 10);
                  if (!isNaN(n) && n > 0) update({ maxImages: n });
                }}
              />
            </Section>
          )}

          {/* =============================== */}
          {/* DATE                             */}
          {/* =============================== */}
          {ft === 'date' && (
            <Section title={t('fieldEditor', 'dateSettings')}>
              <Text style={styles.subLabel}>{t('fieldEditor', 'dateFormat')}</Text>
              <SegmentedButtons
                value={localField.dateFormat || 'YYYY-MM-DD'}
                onValueChange={(v) => update({ dateFormat: v })}
                buttons={[
                  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Text style={[styles.subLabel, { marginTop: 12 }]}>{t('fieldEditor', 'dateRange')}</Text>
              <SegmentedButtons
                value={localField.dateRangePreset || 'any'}
                onValueChange={(v) => update({ dateRangePreset: v })}
                buttons={[
                  { value: 'any', label: t('fieldEditor', 'dateRangeAll') },
                  { value: 'today_onwards', label: t('fieldEditor', 'dateRangeFromToday') },
                  { value: 'next_7', label: t('fieldEditor', 'dateRange7Days') },
                  { value: 'next_30', label: t('fieldEditor', 'dateRange30Days') },
                  { value: 'past_only', label: t('fieldEditor', 'dateRangePastOnly') },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Row label={t('fieldEditor', 'includeTime')}>
                <Switch
                  value={!!localField.includeTime}
                  onValueChange={(v) => update({ includeTime: v })}
                  color={COLORS.accent}
                />
              </Row>
              <Row label={t('fieldEditor', 'timeFormat24h')}>
                <Switch
                  value={!!localField.timeFormat24h}
                  onValueChange={(v) => update({ timeFormat24h: v })}
                  color={COLORS.accent}
                />
              </Row>
            </Section>
          )}

          {/* =============================== */}
          {/* TIME                             */}
          {/* =============================== */}
          {ft === 'time' && (
            <Section title={t('fieldEditor', 'timeSettings')}>
              <Row label={t('fieldEditor', 'timeFormat24h')}>
                <Switch
                  value={!!localField.timeFormat24h}
                  onValueChange={(v) => update({ timeFormat24h: v })}
                  color={COLORS.accent}
                />
              </Row>
            </Section>
          )}

          {/* =============================== */}
          {/* NAME                             */}
          {/* =============================== */}
          {ft === 'name' && (
            <Section title={t('fieldEditor', 'nameSettings')}>
              <Row label={t('fieldEditor', 'showPrefix')}>
                <Switch
                  value={!!localField.showPrefix}
                  onValueChange={(v) => update({ showPrefix: v })}
                  color={COLORS.accent}
                />
              </Row>
              {!!localField.showPrefix && (
                <Input
                  label={t('fieldEditor', 'prefixPlaceholder')}
                  value={localField.prefixPlaceholder || ''}
                  onChangeText={(v) => update({ prefixPlaceholder: v })}
                />
              )}
              <Input
                label={t('fieldEditor', 'firstNamePlaceholder')}
                value={localField.firstNamePlaceholder || ''}
                onChangeText={(v) => update({ firstNamePlaceholder: v })}
              />
              <Row label={t('fieldEditor', 'showMiddleName')}>
                <Switch
                  value={!!localField.showMiddleName}
                  onValueChange={(v) => update({ showMiddleName: v })}
                  color={COLORS.accent}
                />
              </Row>
              {!!localField.showMiddleName && (
                <Input
                  label={t('fieldEditor', 'middleNamePlaceholder')}
                  value={localField.middleNamePlaceholder || ''}
                  onChangeText={(v) => update({ middleNamePlaceholder: v })}
                />
              )}
              <Input
                label={t('fieldEditor', 'lastNamePlaceholder')}
                value={localField.lastNamePlaceholder || ''}
                onChangeText={(v) => update({ lastNamePlaceholder: v })}
              />
              <Row label={t('fieldEditor', 'showSuffix')}>
                <Switch
                  value={!!localField.showSuffix}
                  onValueChange={(v) => update({ showSuffix: v })}
                  color={COLORS.accent}
                />
              </Row>
              {!!localField.showSuffix && (
                <Input
                  label={t('fieldEditor', 'suffixPlaceholder')}
                  value={localField.suffixPlaceholder || ''}
                  onChangeText={(v) => update({ suffixPlaceholder: v })}
                />
              )}
            </Section>
          )}

          {/* =============================== */}
          {/* TEXT / EMAIL / NUMBER VALIDATION  */}
          {/* =============================== */}
          {['text', 'email'].includes(ft) && (
            <Section title={t('fieldEditor', 'validation')}>
              <Input
                label={t('fieldEditor', 'minLength')}
                value={String(localField.validation?.minLength ?? '')}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseInt(v, 10);
                  update({
                    validation: {
                      ...localField.validation,
                      minLength: isNaN(n) ? undefined : n,
                    },
                  });
                }}
              />
              <Input
                label={t('fieldEditor', 'maxLength')}
                value={String(localField.validation?.maxLength ?? '')}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseInt(v, 10);
                  update({
                    validation: {
                      ...localField.validation,
                      maxLength: isNaN(n) ? undefined : n,
                    },
                  });
                }}
              />
              <Input
                label={t('fieldEditor', 'patternRegex')}
                value={localField.validation?.pattern || ''}
                onChangeText={(v) =>
                  update({ validation: { ...localField.validation, pattern: v } })
                }
              />
            </Section>
          )}

          {ft === 'textarea' && (
            <Section title={t('fieldEditor', 'validation')}>
              <Input
                label={t('fieldEditor', 'minLength')}
                value={String(localField.validation?.minLength ?? '')}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseInt(v, 10);
                  update({
                    validation: {
                      ...localField.validation,
                      minLength: isNaN(n) ? undefined : n,
                    },
                  });
                }}
              />
              <Input
                label={t('fieldEditor', 'maxLength')}
                value={String(localField.validation?.maxLength ?? '')}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseInt(v, 10);
                  update({
                    validation: {
                      ...localField.validation,
                      maxLength: isNaN(n) ? undefined : n,
                    },
                  });
                }}
              />
            </Section>
          )}

          {ft === 'number' && (
            <Section title={t('fieldEditor', 'validation')}>
              <Input
                label={t('fieldEditor', 'minValue')}
                value={String(localField.validation?.min ?? '')}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  update({
                    validation: {
                      ...localField.validation,
                      min: isNaN(n) ? undefined : n,
                    },
                  });
                }}
              />
              <Input
                label={t('fieldEditor', 'maxValue')}
                value={String(localField.validation?.max ?? '')}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  update({
                    validation: {
                      ...localField.validation,
                      max: isNaN(n) ? undefined : n,
                    },
                  });
                }}
              />
            </Section>
          )}

          {/* =============================== */}
          {/* MATRIX                           */}
          {/* =============================== */}
          {ft === 'matrix' && (
            <Section title={t('fieldEditor', 'matrixSettings')}>
              <Text style={styles.subLabel}>{t('fieldEditor', 'inputType')}</Text>
              <SegmentedButtons
                value={localField.matrixInputType || 'radio'}
                onValueChange={(v) =>
                  update({ matrixInputType: v as 'radio' | 'checkbox' })
                }
                buttons={[
                  { value: 'radio', label: t('fieldEditor', 'matrixRadio') },
                  { value: 'checkbox', label: t('fieldEditor', 'matrixCheckbox') },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Text style={[styles.subLabel, { marginTop: 16 }]}>{t('fieldEditor', 'rows')}</Text>
              <MatrixItemsEditor
                items={localField.matrixRows || []}
                onChange={(items) => update({ matrixRows: items })}
                addLabel={t('fieldEditor', 'addRow')}
              />
              <Text style={[styles.subLabel, { marginTop: 16 }]}>{t('fieldEditor', 'columns')}</Text>
              <MatrixItemsEditor
                items={localField.matrixColumns || []}
                onChange={(items) => update({ matrixColumns: items })}
                addLabel={t('fieldEditor', 'addColumn')}
              />
            </Section>
          )}

          {/* =============================== */}
          {/* LIKERT                           */}
          {/* =============================== */}
          {ft === 'likert' && (
            <Section title={t('fieldEditor', 'likertSettings')}>
              <Text style={styles.subLabel}>{t('fieldEditor', 'statements')}</Text>
              <StringListEditor
                items={localField.likertStatements || []}
                onChange={(items) => update({ likertStatements: items })}
                addLabel={t('fieldEditor', 'addStatement')}
              />
              <Text style={[styles.subLabel, { marginTop: 16 }]}>{t('fieldEditor', 'scaleOptions')}</Text>
              <StringListEditor
                items={localField.likertOptions || []}
                onChange={(items) => update({ likertOptions: items })}
                addLabel={t('fieldEditor', 'addScaleOption')}
              />
            </Section>
          )}

          {/* =============================== */}
          {/* CURRENCY                         */}
          {/* =============================== */}
          {ft === 'currency' && (
            <Section title={t('fieldEditor', 'currencySettings')}>
              <Text style={styles.subLabel}>{t('fieldEditor', 'currencyLabel')}</Text>
              <View style={styles.chipRow}>
                {CURRENCIES.map((c) => (
                  <Chip
                    key={c}
                    selected={localField.currency === c}
                    onPress={() => update({ currency: c })}
                    style={[
                      styles.chip,
                      localField.currency === c && styles.chipSelected,
                    ]}
                    textStyle={{
                      color: localField.currency === c ? '#fff' : COLORS.textSecondary,
                    }}
                    selectedColor="#fff"
                  >
                    {c}
                  </Chip>
                ))}
              </View>
              <Input
                label={t('fieldEditor', 'minAmount')}
                value={String(localField.min ?? '')}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  update({ min: isNaN(n) ? undefined : n });
                }}
              />
              <Input
                label={t('fieldEditor', 'maxAmount')}
                value={String(localField.max ?? '')}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  update({ max: isNaN(n) ? undefined : n });
                }}
              />
            </Section>
          )}

          {/* =============================== */}
          {/* ADDRESS                          */}
          {/* =============================== */}
          {ft === 'address' && (
            <Section title={t('fieldEditor', 'addressSettings')}>
              <Row label={t('fieldEditor', 'showCountry')}>
                <Switch
                  value={localField.showCountry !== false}
                  onValueChange={(v) => update({ showCountry: v })}
                  color={COLORS.accent}
                />
              </Row>
              <Input
                label={t('fieldEditor', 'defaultCountry')}
                value={localField.defaultCountry || 'SE'}
                onChangeText={(v) => update({ defaultCountry: v.toUpperCase() })}
              />
            </Section>
          )}

          {/* =============================== */}
          {/* URL                              */}
          {/* =============================== */}
          {ft === 'url' && (
            <Section title={t('fieldEditor', 'urlSettings')}>
              <Input
                label={t('fieldEditor', 'linkText')}
                value={localField.urlLinkText || ''}
                onChangeText={(v) => update({ urlLinkText: v })}
              />
              <Row label={t('fieldEditor', 'openInNewWindow')}>
                <Switch
                  value={localField.urlOpenInNewTab !== false}
                  onValueChange={(v) => update({ urlOpenInNewTab: v })}
                  color={COLORS.accent}
                />
              </Row>
            </Section>
          )}

          {/* =============================== */}
          {/* CONDITIONAL LOGIC                */}
          {/* =============================== */}
          {!isLayoutType(ft) && (
            <CollapsibleSection title={t('fieldEditor', 'conditionalLogic')}>
              <ConditionalLogicEditor
                field={localField}
                allFields={allFields}
                onUpdate={update}
                t={t}
                conditionOperators={conditionOperators}
              />
            </CollapsibleSection>
          )}

          {/* =============================== */}
          {/* DUPLICATE BUTTON                 */}
          {/* =============================== */}
          {onDuplicate && (
            <Button
              mode="outlined"
              icon="content-copy"
              onPress={handleDuplicate}
              style={styles.duplicateButton}
              textColor={COLORS.accent}
              theme={{ colors: { outline: COLORS.accent } }}
            >
              {t('fieldEditor', 'duplicateField')}
            </Button>
          )}

          {/* =============================== */}
          {/* DELETE BUTTON                    */}
          {/* =============================== */}
          <Button
            mode="contained"
            icon="delete-outline"
            onPress={handleDelete}
            style={styles.deleteButton}
            buttonColor={COLORS.danger}
            textColor="#fff"
          >
            {t('fieldEditor', 'deleteField')}
          </Button>

          <View style={{ height: 60 }} />
        </BottomSheetScrollView>
      </BottomSheet>
    );
  },
);

FieldEditorSheet.displayName = 'FieldEditorSheet';
export default FieldEditorSheet;

// ==================================================
// HELPER COMPONENTS
// ==================================================

// ---- Section ----

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="labelLarge" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

// ---- CollapsibleSection ----

function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.section}>
      <List.Accordion
        title={title}
        expanded={expanded}
        onPress={() => setExpanded(!expanded)}
        titleStyle={styles.accordionTitle}
        style={styles.accordion}
        theme={{
          colors: {
            primary: COLORS.accent,
            background: 'transparent',
          },
        }}
      >
        <View style={styles.accordionContent}>{children}</View>
      </List.Accordion>
    </View>
  );
}

// ---- Input ----

function Input({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
  numberOfLines,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  multiline?: boolean;
  numberOfLines?: number;
}) {
  return (
    <TextInput
      label={label}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType || 'default'}
      mode="outlined"
      multiline={multiline}
      numberOfLines={numberOfLines}
      style={[styles.input, multiline && { minHeight: 80 }]}
      textColor="#fff"
      outlineColor={COLORS.border}
      activeOutlineColor={COLORS.accent}
      theme={{ colors: { onSurfaceVariant: COLORS.textDim } }}
    />
  );
}

// ---- Row ----

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

// ---- OptionsEditor (for select/radio/checkbox/ranking) ----

function OptionsEditor({
  options,
  onChange,
  addLabel,
  optionLabelText,
  optionValueText,
  optionDefaultLabel,
  optionDefaultValue,
}: {
  options: FieldOption[];
  onChange: (opts: FieldOption[]) => void;
  addLabel?: string;
  optionLabelText?: string;
  optionValueText?: string;
  optionDefaultLabel?: string;
  optionDefaultValue?: string;
}) {
  const { t } = useTranslation();

  // Use translation function for default fallbacks
  const actualAddLabel = addLabel || t('fieldEditor', 'addOption');
  const actualLabelText = optionLabelText || t('fieldEditor', 'optionLabel');
  const actualValueText = optionValueText || t('fieldEditor', 'optionValue');
  const actualDefaultLabel = optionDefaultLabel || t('fieldEditor', 'optionDefault');
  const actualDefaultValue = optionDefaultValue || t('fieldEditor', 'optionValueDefault');

  const addOption = () => {
    const idx = options.length + 1;
    onChange([
      ...options,
      { id: generateId(), label: actualDefaultLabel.replace('{index}', String(idx)), value: actualDefaultValue.replace('{index}', String(idx)) },
    ]);
  };

  const removeOption = (id: string) => onChange(options.filter((o) => o.id !== id));

  const updateOption = (id: string, label: string) => {
    onChange(
      options.map((o) =>
        o.id === id
          ? { ...o, label, value: label.toLowerCase().replace(/\s+/g, '_') }
          : o,
      ),
    );
  };

  const updateValue = (id: string, value: string) => {
    onChange(options.map((o) => (o.id === id ? { ...o, value } : o)));
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const copy = [...options];
    [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
    onChange(copy);
  };

  const moveDown = (idx: number) => {
    if (idx === options.length - 1) return;
    const copy = [...options];
    [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
    onChange(copy);
  };

  return (
    <View>
      {options.map((opt, idx) => (
        <View key={opt.id} style={styles.optionCard}>
          <View style={styles.optionRow}>
            <View style={styles.optionReorderButtons}>
              <TouchableOpacity
                onPress={() => moveUp(idx)}
                disabled={idx === 0}
                style={styles.reorderBtn}
              >
                <Text style={[styles.reorderText, idx === 0 && { opacity: 0.3 }]}>
                  {'\u25B2'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => moveDown(idx)}
                disabled={idx === options.length - 1}
                style={styles.reorderBtn}
              >
                <Text
                  style={[
                    styles.reorderText,
                    idx === options.length - 1 && { opacity: 0.3 },
                  ]}
                >
                  {'\u25BC'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                label={actualLabelText}
                value={opt.label}
                onChangeText={(v) => updateOption(opt.id, v)}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
                textColor="#fff"
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.accent}
                dense
                theme={{ colors: { onSurfaceVariant: COLORS.textDim } }}
              />
              <TextInput
                label={actualValueText}
                value={opt.value}
                onChangeText={(v) => updateValue(opt.id, v)}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
                textColor="#fff"
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.accent}
                dense
                theme={{ colors: { onSurfaceVariant: COLORS.textDim } }}
              />
            </View>
            <IconButton
              icon="close"
              iconColor={COLORS.danger}
              size={20}
              onPress={() => removeOption(opt.id)}
            />
          </View>
        </View>
      ))}
      <Button mode="text" icon="plus" textColor={COLORS.accent} onPress={addOption} compact>
        {actualAddLabel}
      </Button>
    </View>
  );
}

// ---- StringListEditor (for likert statements/options) ----

function StringListEditor({
  items,
  onChange,
  addLabel,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  addLabel: string;
}) {
  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const copy = [...items];
    [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
    onChange(copy);
  };

  const moveDown = (idx: number) => {
    if (idx === items.length - 1) return;
    const copy = [...items];
    [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
    onChange(copy);
  };

  return (
    <View>
      {items.map((item, idx) => (
        <View key={idx} style={styles.optionRow}>
          <View style={styles.optionReorderButtons}>
            <TouchableOpacity
              onPress={() => moveUp(idx)}
              disabled={idx === 0}
              style={styles.reorderBtn}
            >
              <Text style={[styles.reorderText, idx === 0 && { opacity: 0.3 }]}>
                {'\u25B2'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => moveDown(idx)}
              disabled={idx === items.length - 1}
              style={styles.reorderBtn}
            >
              <Text
                style={[
                  styles.reorderText,
                  idx === items.length - 1 && { opacity: 0.3 },
                ]}
              >
                {'\u25BC'}
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            value={item}
            onChangeText={(v) => {
              const copy = [...items];
              copy[idx] = v;
              onChange(copy);
            }}
            mode="outlined"
            style={[styles.input, { flex: 1 }]}
            textColor="#fff"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.accent}
            dense
            theme={{ colors: { onSurfaceVariant: COLORS.textDim } }}
          />
          <IconButton
            icon="close"
            iconColor={COLORS.danger}
            size={20}
            onPress={() => onChange(items.filter((_, i) => i !== idx))}
          />
        </View>
      ))}
      <Button
        mode="text"
        icon="plus"
        textColor={COLORS.accent}
        onPress={() => onChange([...items, ''])}
        compact
      >
        {addLabel}
      </Button>
    </View>
  );
}

// ---- MatrixItemsEditor ----

function MatrixItemsEditor({
  items,
  onChange,
  addLabel,
}: {
  items: Array<{ id: string; label: string }>;
  onChange: (items: Array<{ id: string; label: string }>) => void;
  addLabel: string;
}) {
  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const copy = [...items];
    [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
    onChange(copy);
  };

  const moveDown = (idx: number) => {
    if (idx === items.length - 1) return;
    const copy = [...items];
    [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
    onChange(copy);
  };

  return (
    <View>
      {items.map((item, idx) => (
        <View key={item.id} style={styles.optionRow}>
          <View style={styles.optionReorderButtons}>
            <TouchableOpacity
              onPress={() => moveUp(idx)}
              disabled={idx === 0}
              style={styles.reorderBtn}
            >
              <Text style={[styles.reorderText, idx === 0 && { opacity: 0.3 }]}>
                {'\u25B2'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => moveDown(idx)}
              disabled={idx === items.length - 1}
              style={styles.reorderBtn}
            >
              <Text
                style={[
                  styles.reorderText,
                  idx === items.length - 1 && { opacity: 0.3 },
                ]}
              >
                {'\u25BC'}
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            value={item.label}
            onChangeText={(v) =>
              onChange(items.map((i) => (i.id === item.id ? { ...i, label: v } : i)))
            }
            mode="outlined"
            style={[styles.input, { flex: 1 }]}
            textColor="#fff"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.accent}
            dense
            theme={{ colors: { onSurfaceVariant: COLORS.textDim } }}
          />
          <IconButton
            icon="close"
            iconColor={COLORS.danger}
            size={20}
            onPress={() => onChange(items.filter((i) => i.id !== item.id))}
          />
        </View>
      ))}
      <Button
        mode="text"
        icon="plus"
        textColor={COLORS.accent}
        onPress={() => onChange([...items, { id: generateId(), label: '' }])}
        compact
      >
        {addLabel}
      </Button>
    </View>
  );
}

// ---- ConditionalLogicEditor ----

function ConditionalLogicEditor({
  field,
  allFields,
  onUpdate,
  t,
  conditionOperators,
}: {
  field: FormField;
  allFields: FormField[];
  onUpdate: (updates: Partial<FormField>) => void;
  t: (section: string, key: string, params?: Record<string, string>) => string;
  conditionOperators: Array<{ label: string; value: string }>;
}) {
  const logic = field.conditionalLogic || {
    enabled: false,
    action: 'show' as const,
    operator: 'and' as const,
    conditions: [],
  };
  const otherFields = allFields.filter(
    (f) => f.id !== field.id && !isLayoutType(f.type),
  );

  const [fieldMenuVisible, setFieldMenuVisible] = useState<string | null>(null);
  const [operatorMenuVisible, setOperatorMenuVisible] = useState<string | null>(null);

  const setLogic = (updates: Partial<ConditionalLogic>) => {
    onUpdate({ conditionalLogic: { ...logic, ...updates } });
  };

  const addCondition = () => {
    if (otherFields.length === 0) return;
    const newCond: Condition = {
      id: generateId(),
      fieldId: otherFields[0].id,
      operator: 'equals',
      value: '',
    };
    setLogic({ conditions: [...logic.conditions, newCond] });
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    setLogic({
      conditions: logic.conditions.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    });
  };

  const removeCondition = (id: string) => {
    setLogic({ conditions: logic.conditions.filter((c) => c.id !== id) });
  };

  return (
    <View>
      <Row label={t('fieldEditor', 'enableCondition')}>
        <Switch
          value={logic.enabled}
          onValueChange={(v) => setLogic({ enabled: v })}
          color={COLORS.accent}
        />
      </Row>
      {logic.enabled && (
        <>
          <Text style={styles.subLabel}>{t('fieldEditor', 'action')}</Text>
          <SegmentedButtons
            value={logic.action}
            onValueChange={(v) => setLogic({ action: v as 'show' | 'hide' })}
            buttons={[
              { value: 'show', label: t('fieldEditor', 'actionShow') },
              { value: 'hide', label: t('fieldEditor', 'actionHide') },
            ]}
            style={styles.segmented}
            theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
          />

          {logic.conditions.map((cond) => (
            <View key={cond.id} style={styles.conditionCard}>
              {/* Field picker */}
              <Text style={styles.conditionLabel}>{t('fieldEditor', 'conditionField')}</Text>
              <Menu
                visible={fieldMenuVisible === cond.id}
                onDismiss={() => setFieldMenuVisible(null)}
                anchor={
                  <TouchableOpacity
                    style={styles.menuAnchor}
                    onPress={() => setFieldMenuVisible(cond.id)}
                  >
                    <Text style={styles.menuAnchorText} numberOfLines={1}>
                      {otherFields.find((f) => f.id === cond.fieldId)?.label ||
                        t('fieldEditor', 'selectField')}
                    </Text>
                  </TouchableOpacity>
                }
                contentStyle={{ backgroundColor: COLORS.card }}
              >
                {otherFields.map((f) => (
                  <Menu.Item
                    key={f.id}
                    onPress={() => {
                      updateCondition(cond.id, { fieldId: f.id });
                      setFieldMenuVisible(null);
                    }}
                    title={f.label}
                    titleStyle={{ color: '#fff' }}
                  />
                ))}
              </Menu>

              {/* Operator picker */}
              <Text style={[styles.conditionLabel, { marginTop: 8 }]}>{t('fieldEditor', 'operator')}</Text>
              <Menu
                visible={operatorMenuVisible === cond.id}
                onDismiss={() => setOperatorMenuVisible(null)}
                anchor={
                  <TouchableOpacity
                    style={styles.menuAnchor}
                    onPress={() => setOperatorMenuVisible(cond.id)}
                  >
                    <Text style={styles.menuAnchorText}>
                      {conditionOperators.find((op) => op.value === cond.operator)
                        ?.label || cond.operator}
                    </Text>
                  </TouchableOpacity>
                }
                contentStyle={{ backgroundColor: COLORS.card }}
              >
                {conditionOperators.map((op) => (
                  <Menu.Item
                    key={op.value}
                    onPress={() => {
                      updateCondition(cond.id, { operator: op.value as any });
                      setOperatorMenuVisible(null);
                    }}
                    title={op.label}
                    titleStyle={{ color: '#fff' }}
                  />
                ))}
              </Menu>

              {/* Value input */}
              {!['is_empty', 'is_not_empty'].includes(cond.operator) && (
                <TextInput
                  label={t('fieldEditor', 'conditionValue')}
                  value={String(cond.value)}
                  onChangeText={(v) => updateCondition(cond.id, { value: v })}
                  mode="outlined"
                  style={[styles.input, { marginTop: 8 }]}
                  textColor="#fff"
                  outlineColor={COLORS.border}
                  activeOutlineColor={COLORS.accent}
                  dense
                  theme={{ colors: { onSurfaceVariant: COLORS.textDim } }}
                />
              )}

              <IconButton
                icon="close"
                iconColor={COLORS.danger}
                size={18}
                onPress={() => removeCondition(cond.id)}
                style={styles.conditionDeleteBtn}
              />
            </View>
          ))}

          {otherFields.length > 0 && (
            <Button
              mode="text"
              icon="plus"
              textColor={COLORS.accent}
              onPress={addCondition}
              compact
            >
              {t('fieldEditor', 'addCondition')}
            </Button>
          )}
        </>
      )}
    </View>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: COLORS.card,
  },
  handle: {
    backgroundColor: '#555',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerText: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
  typeBadge: {
    backgroundColor: COLORS.border,
  },
  typeBadgeText: {
    color: COLORS.accent,
    fontSize: 12,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.card,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowLabel: {
    color: COLORS.textSecondary,
    fontSize: 15,
    flex: 1,
  },
  optionCard: {
    backgroundColor: COLORS.border,
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  optionReorderButtons: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    width: 28,
  },
  reorderBtn: {
    paddingVertical: 2,
  },
  reorderText: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  segmented: {
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: COLORS.border,
    marginBottom: 4,
  },
  chipSelected: {
    backgroundColor: COLORS.accent,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  accordion: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  accordionTitle: {
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 13,
  },
  accordionContent: {
    paddingTop: 8,
  },
  duplicateButton: {
    marginTop: 12,
    borderRadius: 12,
  },
  deleteButton: {
    marginTop: 12,
    borderRadius: 12,
  },
  conditionCard: {
    backgroundColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    marginTop: 8,
    position: 'relative',
  },
  conditionLabel: {
    color: COLORS.textDim,
    fontSize: 12,
    marginBottom: 4,
  },
  conditionDeleteBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  menuAnchor: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  menuAnchorText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});