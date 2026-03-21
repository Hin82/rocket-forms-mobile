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

const LANGUAGES = [
  { code: 'sv', name: 'Svenska' },
  { code: 'en', name: 'Engelska' },
  { code: 'no', name: 'Norska' },
  { code: 'da', name: 'Danska' },
  { code: 'fi', name: 'Finska' },
  { code: 'de', name: 'Tyska' },
  { code: 'fr', name: 'Franska' },
  { code: 'es', name: 'Spanska' },
];

const CURRENCIES = ['SEK', 'NOK', 'DKK', 'EUR', 'USD', 'GBP', 'CHF'];

const ACCEPTED_FILE_TYPES_OPTIONS = [
  { label: 'Bilder', value: 'images' },
  { label: 'Dokument', value: 'documents' },
  { label: 'PDF', value: 'pdf' },
  { label: 'Word', value: 'word' },
  { label: 'Excel', value: 'excel' },
  { label: 'Alla', value: 'all' },
];

const CONDITION_OPERATORS: Array<{ label: string; value: string }> = [
  { label: 'Lika med', value: 'equals' },
  { label: 'Inte lika med', value: 'not_equals' },
  { label: 'Innehaller', value: 'contains' },
  { label: 'Innehaller inte', value: 'not_contains' },
  { label: 'Storre an', value: 'greater_than' },
  { label: 'Mindre an', value: 'less_than' },
  { label: 'Ar tom', value: 'is_empty' },
  { label: 'Ar inte tom', value: 'is_not_empty' },
];

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  email: 'E-post',
  number: 'Nummer',
  url: 'URL',
  phone: 'Telefon',
  name: 'Namn',
  textarea: 'Textomrade',
  select: 'Dropdown',
  radio: 'Radioknapp',
  checkbox: 'Kryssruta',
  yesno: 'Ja/Nej',
  date: 'Datum',
  time: 'Tid',
  datetime: 'Datum & Tid',
  file: 'Filuppladdning',
  image: 'Bild',
  document: 'Dokument',
  separator: 'Avdelare',
  'text-display': 'Textvisning',
  rating: 'Betyg',
  nps: 'NPS',
  likert: 'Likert',
  ranking: 'Ranking',
  hidden: 'Dolt falt',
  'html-block': 'HTML-block',
  'page-break': 'Sidbrytning',
  signature: 'Signatur',
  slider: 'Slider',
  color: 'Fargvaljare',
  currency: 'Valuta',
  personnummer: 'Personnummer',
  organisationsnummer: 'Organisationsnummer',
  address: 'Adress',
  matrix: 'Matris',
  drawing: 'Ritning',
};

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
    const snapPoints = useMemo(() => ['80%', '95%'], []);

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
      Alert.alert('Ta bort falt', `Vill du verkligen ta bort "${localField.label}"?`, [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: () => {
            onDelete(localField.id);
            onClose();
          },
        },
      ]);
    }, [localField, onDelete, onClose]);

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
            Redigera falt
          </Text>
          <Chip style={styles.typeBadge} textStyle={styles.typeBadgeText}>
            {FIELD_TYPE_LABELS[ft] || ft}
          </Chip>
        </View>

        <BottomSheetScrollView contentContainerStyle={styles.scroll}>
          {/* =============================== */}
          {/* COMMON SETTINGS                  */}
          {/* =============================== */}
          <Section title="Grundinstallningar">
            <Input
              label="Etikett"
              value={localField.label}
              onChangeText={(v) => update({ label: v })}
            />
            <Input
              label="Beskrivning"
              value={localField.description || ''}
              onChangeText={(v) => update({ description: v })}
              multiline
            />
            {hasPlaceholder(ft) && (
              <Input
                label="Platshallartext"
                value={localField.placeholder || ''}
                onChangeText={(v) => update({ placeholder: v })}
              />
            )}
            <Input
              label="Hjalptxt"
              value={localField.helpText || ''}
              onChangeText={(v) => update({ helpText: v })}
            />
            {!isLayoutType(ft) && (
              <>
                <Row label="Obligatoriskt">
                  <Switch
                    value={!!localField.required}
                    onValueChange={(v) => update({ required: v })}
                    color={COLORS.accent}
                  />
                </Row>
                <Row label="Dolt falt">
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
          <CollapsibleSection title="Sprakversioner (etiketter)">
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
            <Section title="Alternativ">
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
            <Section title="Betygsinstallningar">
              <Text style={styles.subLabel}>Skala</Text>
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
              <Text style={[styles.subLabel, { marginTop: 12 }]}>Ikon</Text>
              <SegmentedButtons
                value={localField.ratingIcon || 'star'}
                onValueChange={(v) =>
                  update({ ratingIcon: v as 'star' | 'heart' | 'thumbs' | 'number' })
                }
                buttons={[
                  { value: 'star', label: 'Stjarna', icon: 'star' },
                  { value: 'heart', label: 'Hjarta', icon: 'heart' },
                  { value: 'thumbs', label: 'Tumme', icon: 'thumb-up' },
                  { value: 'number', label: 'Nummer', icon: 'numeric' },
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
            <Section title="NPS-installningar">
              <Input
                label="Huvudfraga"
                value={localField.npsQuestion || ''}
                onChangeText={(v) => update({ npsQuestion: v })}
              />
              <Input
                label="Fraga for ambassadorer (9-10)"
                value={localField.npsPromoterQuestion || ''}
                onChangeText={(v) => update({ npsPromoterQuestion: v })}
              />
              <Input
                label="Fraga for passiva (7-8)"
                value={localField.npsPassiveQuestion || ''}
                onChangeText={(v) => update({ npsPassiveQuestion: v })}
              />
              <Input
                label="Fraga for kritiker (0-6)"
                value={localField.npsDetractorQuestion || ''}
                onChangeText={(v) => update({ npsDetractorQuestion: v })}
              />
              <Input
                label="Etikett for kommentarer"
                value={localField.npsCommentsLabel || ''}
                onChangeText={(v) => update({ npsCommentsLabel: v })}
              />
            </Section>
          )}

          {/* =============================== */}
          {/* SLIDER                           */}
          {/* =============================== */}
          {ft === 'slider' && (
            <Section title="Slider-installningar">
              <Input
                label="Min"
                value={String(localField.min ?? 0)}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  if (!isNaN(n)) update({ min: n });
                }}
              />
              <Input
                label="Max"
                value={String(localField.max ?? 100)}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  if (!isNaN(n)) update({ max: n });
                }}
              />
              <Input
                label="Steg"
                value={String(localField.step ?? 1)}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  if (!isNaN(n) && n > 0) update({ step: n });
                }}
              />
              <Input
                label="Prefix"
                value={localField.prefix || ''}
                onChangeText={(v) => update({ prefix: v })}
              />
              <Input
                label="Suffix"
                value={localField.suffix || ''}
                onChangeText={(v) => update({ suffix: v })}
              />
              <Row label="Visa varde">
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
            <Section title="Textomrade-installningar">
              <Row label="Aktivera riktexteditering">
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
            <Section title="Ja/Nej-installningar">
              <Text style={styles.subLabel}>Standardsvar</Text>
              <SegmentedButtons
                value={localField.defaultAnswer || 'none'}
                onValueChange={(v) =>
                  update({ defaultAnswer: v === 'none' ? null : (v as 'yes' | 'no') })
                }
                buttons={[
                  { value: 'yes', label: 'Ja' },
                  { value: 'no', label: 'Nej' },
                  { value: 'none', label: 'Inget' },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Row label="Kommentarsfalt">
                <Switch
                  value={!!localField.hasCommentField}
                  onValueChange={(v) => update({ hasCommentField: v })}
                  color={COLORS.accent}
                />
              </Row>
              {!!localField.hasCommentField && (
                <Input
                  label="Platshallartext for kommentar"
                  value={localField.commentPlaceholder || ''}
                  onChangeText={(v) => update({ commentPlaceholder: v })}
                />
              )}
              <Input
                label="Media-URL (bild/video)"
                value={localField.mediaUrl || ''}
                onChangeText={(v) => update({ mediaUrl: v })}
              />
              <Text style={styles.subLabel}>Mediatyp</Text>
              <SegmentedButtons
                value={localField.mediaType || 'image'}
                onValueChange={(v) => update({ mediaType: v as 'image' | 'video' })}
                buttons={[
                  { value: 'image', label: 'Bild' },
                  { value: 'video', label: 'Video' },
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
            <Section title="Avdelare-installningar">
              <Text style={styles.subLabel}>Stil</Text>
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
                  { value: 'solid', label: 'Heldragen' },
                  { value: 'dashed', label: 'Streckad' },
                  { value: 'dotted', label: 'Prickad' },
                  { value: 'double', label: 'Dubbel' },
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
                  { value: 'gradient', label: 'Gradient' },
                ]}
                style={[styles.segmented, { marginTop: 8 }]}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Input
                label="Farg (hex)"
                value={localField.separatorOptions?.color || '#2d2d44'}
                onChangeText={(v) =>
                  update({
                    separatorOptions: { ...localField.separatorOptions, color: v },
                  })
                }
              />
              <Text style={[styles.subLabel, { marginTop: 8 }]}>
                Tjocklek: {localField.separatorOptions?.thickness || 1}px
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
              <Text style={styles.subLabel}>Monster</Text>
              <SegmentedButtons
                value={localField.separatorOptions?.pattern || 'simple'}
                onValueChange={(v) =>
                  update({
                    separatorOptions: { ...localField.separatorOptions, pattern: v as any },
                  })
                }
                buttons={[
                  { value: 'simple', label: 'Enkel' },
                  { value: 'decorative', label: 'Dekorativ' },
                  { value: 'wavy', label: 'Vagig' },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Text style={[styles.subLabel, { marginTop: 12 }]}>Avstand</Text>
              <SegmentedButtons
                value={localField.separatorOptions?.spacing || 'medium'}
                onValueChange={(v) =>
                  update({
                    separatorOptions: { ...localField.separatorOptions, spacing: v as any },
                  })
                }
                buttons={[
                  { value: 'small', label: 'Liten' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'large', label: 'Stor' },
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
            <Section title="Textvisning-installningar">
              <Input
                label="Innehall"
                value={localField.textContent || ''}
                onChangeText={(v) => update({ textContent: v })}
                multiline
                numberOfLines={4}
              />
              <Text style={styles.subLabel}>Textstorlek</Text>
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
                label="Typsnittsfamilj"
                value={localField.textDisplayOptions?.fontFamily || ''}
                onChangeText={(v) =>
                  update({
                    textDisplayOptions: { ...localField.textDisplayOptions, fontFamily: v },
                  })
                }
              />
              <Text style={[styles.subLabel, { marginTop: 12 }]}>Tjocklek</Text>
              <SegmentedButtons
                value={localField.textDisplayOptions?.fontWeight || 'normal'}
                onValueChange={(v) =>
                  update({
                    textDisplayOptions: { ...localField.textDisplayOptions, fontWeight: v },
                  })
                }
                buttons={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'bold', label: 'Fet' },
                  { value: '300', label: 'Tunn' },
                  { value: '600', label: 'Halvfet' },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Input
                label="Textfarg (hex)"
                value={localField.textDisplayOptions?.color || '#ffffff'}
                onChangeText={(v: string) =>
                  update({
                    textDisplayOptions: { ...localField.textDisplayOptions, color: v },
                  })
                }
              />
              <Text style={[styles.subLabel, { marginTop: 12 }]}>Textjustering</Text>
              <SegmentedButtons
                value={localField.textDisplayOptions?.textAlign || 'left'}
                onValueChange={(v) =>
                  update({
                    textDisplayOptions: { ...localField.textDisplayOptions, textAlign: v as any },
                  })
                }
                buttons={[
                  { value: 'left', label: 'Vanster' },
                  { value: 'center', label: 'Center' },
                  { value: 'right', label: 'Hoger' },
                  { value: 'justify', label: 'Justera' },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Input
                label="Bakgrundsfarg (hex)"
                value={localField.textDisplayOptions?.backgroundColor || ''}
                onChangeText={(v) =>
                  update({
                    textDisplayOptions: { ...localField.textDisplayOptions, backgroundColor: v },
                  })
                }
              />
              <Input
                label="Padding (px)"
                value={String(localField.textDisplayOptions?.padding ?? '')}
                keyboardType="numeric"
                onChangeText={(v) =>
                  update({
                    textDisplayOptions: { ...localField.textDisplayOptions, padding: v },
                  })
                }
              />
              <Input
                label="Marginal (px)"
                value={String(localField.textDisplayOptions?.margin ?? '')}
                keyboardType="numeric"
                onChangeText={(v) =>
                  update({
                    textDisplayOptions: { ...localField.textDisplayOptions, margin: v },
                  })
                }
              />
              <Input
                label="Bordsradie (px)"
                value={String(localField.textDisplayOptions?.borderRadius ?? '')}
                keyboardType="numeric"
                onChangeText={(v) =>
                  update({
                    textDisplayOptions: { ...localField.textDisplayOptions, borderRadius: v },
                  })
                }
              />
              <Input
                label="Radhojd"
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
            <Section title="Ranking-objekt">
              <OptionsEditor
                options={localField.rankingItems || []}
                onChange={(items) => update({ rankingItems: items })}
                addLabel="Lagg till objekt"
              />
            </Section>
          )}

          {/* =============================== */}
          {/* DRAWING                          */}
          {/* =============================== */}
          {ft === 'drawing' && (
            <Section title="Ritnings-installningar">
              <Text style={styles.subLabel}>
                Canvasbredd: {localField.canvasWidth || 800}px
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
                Canvashojd: {localField.canvasHeight || 400}px
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
                label="Bakgrundsfarg (hex)"
                value={localField.backgroundColor || '#ffffff'}
                onChangeText={(v) => update({ backgroundColor: v })}
              />
            </Section>
          )}

          {/* =============================== */}
          {/* HIDDEN                           */}
          {/* =============================== */}
          {ft === 'hidden' && (
            <Section title="Dolt falt">
              <Input
                label="Dolt varde"
                value={localField.hiddenFieldValue || ''}
                onChangeText={(v) => update({ hiddenFieldValue: v })}
              />
            </Section>
          )}

          {/* =============================== */}
          {/* COLOR                            */}
          {/* =============================== */}
          {ft === 'color' && (
            <Section title="Fargvaljare-installningar">
              <Input
                label="Standardfarg (hex)"
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
            <Section title="Dokument-installningar">
              <Text style={styles.subLabel}>Justering</Text>
              <SegmentedButtons
                value={localField.documentAlignment || 'center'}
                onValueChange={(v) =>
                  update({ documentAlignment: v as 'left' | 'center' | 'right' })
                }
                buttons={[
                  { value: 'left', label: 'Vanster' },
                  { value: 'center', label: 'Center' },
                  { value: 'right', label: 'Hoger' },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Text style={[styles.subLabel, { marginTop: 16 }]}>Storleksandring</Text>
              <Input
                label="Bredd"
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
                label="Hojd"
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
              <Text style={styles.subLabel}>Enhet</Text>
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
                  { value: 'percentage', label: 'Procent' },
                  { value: 'pixels', label: 'Pixlar' },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Input
                label="Skala (%)"
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
            <Section title="Filuppladdning-installningar">
              <Text style={styles.subLabel}>Accepterade filtyper</Text>
              <View style={styles.chipRow}>
                {ACCEPTED_FILE_TYPES_OPTIONS.map((opt) => {
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
                label="Max filstorlek (MB)"
                value={String((localField.maxFileSize || 10485760) / 1048576)}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  if (!isNaN(n)) update({ maxFileSize: n * 1048576 });
                }}
              />
              <Input
                label="Max antal filer"
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
            <Section title="Bild-installningar">
              <Text style={styles.subLabel}>Justering</Text>
              <SegmentedButtons
                value={localField.imageAlignment || 'center'}
                onValueChange={(v) =>
                  update({ imageAlignment: v as 'left' | 'center' | 'right' })
                }
                buttons={[
                  { value: 'left', label: 'Vanster' },
                  { value: 'center', label: 'Center' },
                  { value: 'right', label: 'Hoger' },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Text style={[styles.subLabel, { marginTop: 12 }]}>Kolumner i rutat</Text>
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
                label="Max antal bilder"
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
            <Section title="Datuminstallningar">
              <Text style={styles.subLabel}>Datumformat</Text>
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
              <Text style={[styles.subLabel, { marginTop: 12 }]}>Datumintervall</Text>
              <SegmentedButtons
                value={localField.dateRangePreset || 'any'}
                onValueChange={(v) => update({ dateRangePreset: v })}
                buttons={[
                  { value: 'any', label: 'Alla' },
                  { value: 'today_onwards', label: 'Fran idag' },
                  { value: 'next_7', label: '7 dagar' },
                  { value: 'next_30', label: '30 dagar' },
                  { value: 'past_only', label: 'Forfluten' },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Row label="Inkludera tid">
                <Switch
                  value={!!localField.includeTime}
                  onValueChange={(v) => update({ includeTime: v })}
                  color={COLORS.accent}
                />
              </Row>
              <Row label="24-timmarsformat">
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
            <Section title="Tidinstallningar">
              <Row label="24-timmarsformat">
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
            <Section title="Namninstallningar">
              <Row label="Visa prefix (titel)">
                <Switch
                  value={!!localField.showPrefix}
                  onValueChange={(v) => update({ showPrefix: v })}
                  color={COLORS.accent}
                />
              </Row>
              {!!localField.showPrefix && (
                <Input
                  label="Platshallartext for prefix"
                  value={localField.prefixPlaceholder || ''}
                  onChangeText={(v) => update({ prefixPlaceholder: v })}
                />
              )}
              <Input
                label="Platshallartext for fornamn"
                value={localField.firstNamePlaceholder || ''}
                onChangeText={(v) => update({ firstNamePlaceholder: v })}
              />
              <Row label="Visa mellannamn">
                <Switch
                  value={!!localField.showMiddleName}
                  onValueChange={(v) => update({ showMiddleName: v })}
                  color={COLORS.accent}
                />
              </Row>
              {!!localField.showMiddleName && (
                <Input
                  label="Platshallartext for mellannamn"
                  value={localField.middleNamePlaceholder || ''}
                  onChangeText={(v) => update({ middleNamePlaceholder: v })}
                />
              )}
              <Input
                label="Platshallartext for efternamn"
                value={localField.lastNamePlaceholder || ''}
                onChangeText={(v) => update({ lastNamePlaceholder: v })}
              />
              <Row label="Visa suffix">
                <Switch
                  value={!!localField.showSuffix}
                  onValueChange={(v) => update({ showSuffix: v })}
                  color={COLORS.accent}
                />
              </Row>
              {!!localField.showSuffix && (
                <Input
                  label="Platshallartext for suffix"
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
            <Section title="Validering">
              <Input
                label="Min langd"
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
                label="Max langd"
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
                label="Monster (regex)"
                value={localField.validation?.pattern || ''}
                onChangeText={(v) =>
                  update({ validation: { ...localField.validation, pattern: v } })
                }
              />
            </Section>
          )}

          {ft === 'textarea' && (
            <Section title="Validering">
              <Input
                label="Min langd"
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
                label="Max langd"
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
            <Section title="Validering">
              <Input
                label="Min varde"
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
                label="Max varde"
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
            <Section title="Matrisinstallningar">
              <Text style={styles.subLabel}>Inmatningstyp</Text>
              <SegmentedButtons
                value={localField.matrixInputType || 'radio'}
                onValueChange={(v) =>
                  update({ matrixInputType: v as 'radio' | 'checkbox' })
                }
                buttons={[
                  { value: 'radio', label: 'Radio' },
                  { value: 'checkbox', label: 'Kryssruta' },
                ]}
                style={styles.segmented}
                theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
              />
              <Text style={[styles.subLabel, { marginTop: 16 }]}>Rader</Text>
              <MatrixItemsEditor
                items={localField.matrixRows || []}
                onChange={(items) => update({ matrixRows: items })}
                addLabel="Lagg till rad"
              />
              <Text style={[styles.subLabel, { marginTop: 16 }]}>Kolumner</Text>
              <MatrixItemsEditor
                items={localField.matrixColumns || []}
                onChange={(items) => update({ matrixColumns: items })}
                addLabel="Lagg till kolumn"
              />
            </Section>
          )}

          {/* =============================== */}
          {/* LIKERT                           */}
          {/* =============================== */}
          {ft === 'likert' && (
            <Section title="Likert-installningar">
              <Text style={styles.subLabel}>Pastaenden</Text>
              <StringListEditor
                items={localField.likertStatements || []}
                onChange={(items) => update({ likertStatements: items })}
                addLabel="Lagg till pastaende"
              />
              <Text style={[styles.subLabel, { marginTop: 16 }]}>Skalalternativ</Text>
              <StringListEditor
                items={localField.likertOptions || []}
                onChange={(items) => update({ likertOptions: items })}
                addLabel="Lagg till alternativ"
              />
            </Section>
          )}

          {/* =============================== */}
          {/* CURRENCY                         */}
          {/* =============================== */}
          {ft === 'currency' && (
            <Section title="Valutainstallningar">
              <Text style={styles.subLabel}>Valuta</Text>
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
                label="Min belopp"
                value={String(localField.min ?? '')}
                keyboardType="numeric"
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  update({ min: isNaN(n) ? undefined : n });
                }}
              />
              <Input
                label="Max belopp"
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
            <Section title="Adressinstallningar">
              <Row label="Visa land">
                <Switch
                  value={localField.showCountry !== false}
                  onValueChange={(v) => update({ showCountry: v })}
                  color={COLORS.accent}
                />
              </Row>
              <Input
                label="Standardland (landskod)"
                value={localField.defaultCountry || 'SE'}
                onChangeText={(v) => update({ defaultCountry: v.toUpperCase() })}
              />
            </Section>
          )}

          {/* =============================== */}
          {/* URL                              */}
          {/* =============================== */}
          {ft === 'url' && (
            <Section title="URL-installningar">
              <Input
                label="Lanktext"
                value={localField.urlLinkText || ''}
                onChangeText={(v) => update({ urlLinkText: v })}
              />
              <Row label="Oppna i nytt fonster">
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
            <CollapsibleSection title="Villkorlig logik">
              <ConditionalLogicEditor
                field={localField}
                allFields={allFields}
                onUpdate={update}
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
              Duplicera falt
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
            Ta bort falt
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
  addLabel = 'Lagg till alternativ',
}: {
  options: FieldOption[];
  onChange: (opts: FieldOption[]) => void;
  addLabel?: string;
}) {
  const addOption = () => {
    const idx = options.length + 1;
    onChange([
      ...options,
      { id: generateId(), label: `Alternativ ${idx}`, value: `alternativ_${idx}` },
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
                label="Etikett"
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
                label="Varde"
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
        {addLabel}
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
}: {
  field: FormField;
  allFields: FormField[];
  onUpdate: (updates: Partial<FormField>) => void;
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
      <Row label="Aktivera villkor">
        <Switch
          value={logic.enabled}
          onValueChange={(v) => setLogic({ enabled: v })}
          color={COLORS.accent}
        />
      </Row>
      {logic.enabled && (
        <>
          <Text style={styles.subLabel}>Aktion</Text>
          <SegmentedButtons
            value={logic.action}
            onValueChange={(v) => setLogic({ action: v as 'show' | 'hide' })}
            buttons={[
              { value: 'show', label: 'Visa' },
              { value: 'hide', label: 'Dolj' },
            ]}
            style={styles.segmented}
            theme={{ colors: { secondaryContainer: COLORS.accent, onSecondaryContainer: '#fff' } }}
          />

          {logic.conditions.map((cond) => (
            <View key={cond.id} style={styles.conditionCard}>
              {/* Field picker */}
              <Text style={styles.conditionLabel}>Falt</Text>
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
                        'Valj falt'}
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
              <Text style={[styles.conditionLabel, { marginTop: 8 }]}>Operator</Text>
              <Menu
                visible={operatorMenuVisible === cond.id}
                onDismiss={() => setOperatorMenuVisible(null)}
                anchor={
                  <TouchableOpacity
                    style={styles.menuAnchor}
                    onPress={() => setOperatorMenuVisible(cond.id)}
                  >
                    <Text style={styles.menuAnchorText}>
                      {CONDITION_OPERATORS.find((op) => op.value === cond.operator)
                        ?.label || cond.operator}
                    </Text>
                  </TouchableOpacity>
                }
                contentStyle={{ backgroundColor: COLORS.card }}
              >
                {CONDITION_OPERATORS.map((op) => (
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
                  label="Varde"
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
              Lagg till villkor
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
