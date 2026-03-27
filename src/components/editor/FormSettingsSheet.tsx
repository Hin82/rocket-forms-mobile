import React, { useMemo, useCallback, useState, useEffect, forwardRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Text, TextInput, Switch, Button, SegmentedButtons } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import ColorPickerField from './ColorPickerField';
import BackgroundLibrary from './BackgroundLibrary';
import { useTranslation } from '@/src/translations';
import type { FormSettings } from '../../hooks/useFormEditor';

interface FormGroup {
  id: string;
  name: string;
}

interface FormSettingsSheetProps {
  formName: string;
  settings: FormSettings;
  formGroupId: string | null;
  notificationEmail: string | null;
  senderName: string | null;
  groups: FormGroup[];
  onUpdateName: (name: string) => void;
  onUpdateSettings: (updates: Partial<FormSettings>) => void;
  onUpdateFormMeta: (updates: { form_group_id?: string | null; group_name?: string | null; notification_email?: string | null; sender_name?: string | null }) => void;
  onClose: () => void;
}

const LANGUAGES = [
  { code: 'sv', label: 'Svenska', flag: '🇸🇪' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'no', label: 'Norsk', flag: '🇳🇴' },
  { code: 'da', label: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', label: 'Suomi', flag: '🇫🇮' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Francais', flag: '🇫🇷' },
  { code: 'es', label: 'Espanol', flag: '🇪🇸' },
];

const FONT_SIZES = [
  { value: 'xl', label: 'XL' },
  { value: '2xl', label: '2XL' },
  { value: '3xl', label: '3XL' },
  { value: '4xl', label: '4XL' },
  { value: '5xl', label: '5XL' },
  { value: '6xl', label: '6XL' },
];

const FONT_FAMILIES = [
  'Arial', 'Roboto', 'Montserrat', 'Poppins', 'Inter',
  'Open Sans', 'Lato', 'Nunito', 'Raleway', 'Playfair Display',
];

const BG_POSITIONS = [
  { value: 'top left', label: '↖' },
  { value: 'top center', label: '↑' },
  { value: 'top right', label: '↗' },
  { value: 'center left', label: '←' },
  { value: 'center', label: '●' },
  { value: 'center right', label: '→' },
  { value: 'bottom left', label: '↙' },
  { value: 'bottom center', label: '↓' },
  { value: 'bottom right', label: '↘' },
];

const FormSettingsSheet = forwardRef<BottomSheet, FormSettingsSheetProps>(
  ({ formName, settings, formGroupId, notificationEmail, senderName, groups, onUpdateName, onUpdateSettings, onUpdateFormMeta, onClose }, ref) => {
    const snapPoints = useMemo(() => ['80%', '95%'], []);
    const { t } = useTranslation();

    const [name, setName] = useState(formName);
    const [email, setEmail] = useState(notificationEmail || '');
    const [sender, setSender] = useState(senderName || '');
    const [showBgLibrary, setShowBgLibrary] = useState(false);

    // Translated option arrays
    const bgSizes = useMemo(() => [
      { value: 'cover', label: 'Cover' },
      { value: 'contain', label: 'Contain' },
      { value: 'stretch', label: t('formSettings', 'bgStretch') },
      { value: 'repeat', label: t('formSettings', 'bgRepeat') },
      { value: 'no-repeat', label: t('formSettings', 'bgNoRepeat') },
    ], [t]);

    const bgAttachments = useMemo(() => [
      { value: 'scroll', label: 'Scroll' },
      { value: 'fixed', label: t('formSettings', 'bgFixed') },
      { value: 'local', label: t('formSettings', 'bgLocal') },
    ], [t]);

    const animatedBackgrounds = useMemo(() => [
      { value: 'none', label: t('formSettings', 'animNone') },
      { value: 'floating-shapes', label: t('formSettings', 'animFloatingShapes') },
      { value: 'wave-pattern', label: t('formSettings', 'animWavePattern') },
      { value: 'particle-field', label: t('formSettings', 'animParticles') },
      { value: 'geometric-grid', label: t('formSettings', 'animGeometricGrid') },
    ], [t]);

    // Collapsible sections
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
      basic: true,
    });

    useEffect(() => { setName(formName); }, [formName]);
    useEffect(() => { setEmail(notificationEmail || ''); }, [notificationEmail]);
    useEffect(() => { setSender(senderName || ''); }, [senderName]);

    const handleNameBlur = () => { if (name !== formName) onUpdateName(name); };
    const handleEmailBlur = () => { onUpdateFormMeta({ notification_email: email || null }); };
    const handleSenderBlur = () => { onUpdateFormMeta({ sender_name: sender || null }); };

    const toggleSection = (key: string) => {
      setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handlePickLogo = useCallback(async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const ext = asset.uri.split('.').pop() || 'jpg';
        const fileName = `logo_${Date.now()}.${ext}`;
        const base64 = asset.base64;
        if (base64) {
          const { data, error } = await supabase.storage
            .from('form-assets')
            .upload(fileName, decode(base64), { contentType: `image/${ext}` });
          if (!error && data) {
            const { data: urlData } = supabase.storage.from('form-assets').getPublicUrl(data.path);
            onUpdateSettings({ logoUrl: urlData.publicUrl });
          }
        }
      }
    }, [onUpdateSettings]);

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
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.headerText}>{t('formSettings', 'title')}</Text>
        </View>
        <BottomSheetScrollView contentContainerStyle={styles.scroll}>

          {/* ============ BASIC ============ */}
          <CollapsibleSection
            title={t('formSettings', 'basic')}
            sectionKey="basic"
            expanded={expandedSections.basic}
            onToggle={toggleSection}
          >
            <TextInput
              label={t('formSettings', 'formName')}
              value={name}
              onChangeText={setName}
              onBlur={handleNameBlur}
              mode="outlined"
              style={styles.input}
              textColor="#fff"
              outlineColor="#2d2d44"
              activeOutlineColor="#e8622c"
              theme={{ colors: { onSurfaceVariant: '#888' } }}
            />
            <TextInput
              label={t('formSettings', 'notificationEmail')}
              value={email}
              onChangeText={setEmail}
              onBlur={handleEmailBlur}
              keyboardType="email-address"
              mode="outlined"
              style={styles.input}
              textColor="#fff"
              outlineColor="#2d2d44"
              activeOutlineColor="#e8622c"
              theme={{ colors: { onSurfaceVariant: '#888' } }}
            />
            <TextInput
              label={t('formSettings', 'senderName')}
              value={sender}
              onChangeText={setSender}
              onBlur={handleSenderBlur}
              mode="outlined"
              style={styles.input}
              textColor="#fff"
              outlineColor="#2d2d44"
              activeOutlineColor="#e8622c"
              theme={{ colors: { onSurfaceVariant: '#888' } }}
            />

            {/* Category / Group */}
            <Text style={styles.subLabel}>{t('formSettings', 'categoryGroup')}</Text>
            <View style={styles.chipGrid}>
              <TouchableOpacity
                style={[styles.chip, !formGroupId && styles.chipActive]}
                onPress={() => onUpdateFormMeta({ form_group_id: null, group_name: null })}
              >
                <Text style={styles.chipText}>{t('formSettings', 'noGroup')}</Text>
              </TouchableOpacity>
              {groups.map(g => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.chip, formGroupId === g.id && styles.chipActive]}
                  onPress={() => onUpdateFormMeta({ form_group_id: g.id, group_name: g.name })}
                >
                  <Text style={styles.chipText}>{g.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Default language */}
            <Text style={styles.subLabel}>{t('formSettings', 'defaultLanguage')}</Text>
            <View style={styles.chipGrid}>
              {LANGUAGES.map(lang => (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langChip, settings.defaultLanguage === lang.code && styles.chipActive]}
                  onPress={() => onUpdateSettings({ defaultLanguage: lang.code })}
                >
                  <Text style={styles.langFlag}>{lang.flag}</Text>
                  <Text style={styles.chipText}>{lang.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </CollapsibleSection>

          {/* ============ APPEARANCE & BACKGROUND ============ */}
          <CollapsibleSection
            title={t('formSettings', 'appearanceBackground')}
            sectionKey="appearance"
            expanded={expandedSections.appearance}
            onToggle={toggleSection}
          >
            <ColorPickerField
              label={t('formSettings', 'backgroundColor')}
              value={settings.backgroundColor}
              onChange={(c) => onUpdateSettings({ backgroundColor: c })}
            />
            <ColorPickerField
              label={t('formSettings', 'textColor')}
              value={settings.textColor}
              onChange={(c) => onUpdateSettings({ textColor: c })}
            />

            {/* Background preview + browse button */}
            {settings.backgroundImage ? (
              <View style={styles.bgPreview}>
                <Image
                  source={{ uri: settings.backgroundImage }}
                  style={styles.bgPreviewImage}
                  resizeMode="cover"
                />
                <View style={styles.bgPreviewActions}>
                  <TouchableOpacity onPress={() => setShowBgLibrary(true)} style={styles.bgChangeBtn}>
                    <MaterialCommunityIcons name="image-edit-outline" size={16} color="#fff" />
                    <Text style={styles.bgChangeBtnText}>{t('formSettings', 'changeBackground')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onUpdateSettings({ backgroundImage: undefined })} style={styles.bgRemoveBtn}>
                    <MaterialCommunityIcons name="close" size={16} color="#cc3333" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setShowBgLibrary(true)} style={styles.bgBrowseBtn}>
                <MaterialCommunityIcons name="image-plus" size={24} color="#e8622c" />
                <Text style={styles.bgBrowseBtnText}>{t('formSettings', 'browseBackgrounds')}</Text>
              </TouchableOpacity>
            )}

            <BackgroundLibrary
              visible={showBgLibrary}
              onClose={() => setShowBgLibrary(false)}
              onSelect={(bg) => onUpdateSettings({ backgroundImage: bg || undefined })}
              currentBackground={settings.backgroundImage}
            />

            {/* Background size */}
            <Text style={styles.subLabel}>{t('formSettings', 'backgroundSize')}</Text>
            <View style={styles.chipGrid}>
              {bgSizes.map(s => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.chip, settings.backgroundSize === s.value && styles.chipActive]}
                  onPress={() => onUpdateSettings({ backgroundSize: s.value })}
                >
                  <Text style={styles.chipText}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Background position */}
            <Text style={styles.subLabel}>{t('formSettings', 'backgroundPosition')}</Text>
            <View style={styles.positionGrid}>
              {BG_POSITIONS.map(p => (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.positionCell, settings.backgroundPosition === p.value && styles.positionCellActive]}
                  onPress={() => onUpdateSettings({ backgroundPosition: p.value })}
                >
                  <Text style={styles.positionLabel}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Background attachment */}
            <Text style={styles.subLabel}>{t('formSettings', 'backgroundScroll')}</Text>
            <View style={styles.chipGrid}>
              {bgAttachments.map(a => (
                <TouchableOpacity
                  key={a.value}
                  style={[styles.chip, settings.backgroundAttachment === a.value && styles.chipActive]}
                  onPress={() => onUpdateSettings({ backgroundAttachment: a.value })}
                >
                  <Text style={styles.chipText}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Animated background */}
            <Text style={styles.subLabel}>{t('formSettings', 'animatedBackground')}</Text>
            <View style={styles.chipGrid}>
              {animatedBackgrounds.map(a => (
                <TouchableOpacity
                  key={a.value}
                  style={[styles.chip, (settings.animatedBackground || 'none') === a.value && styles.chipActive]}
                  onPress={() => onUpdateSettings({ animatedBackground: a.value === 'none' ? undefined : a.value })}
                >
                  <Text style={styles.chipText}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Form padding */}
            <TextInput
              label={t('formSettings', 'formPadding')}
              value={String(settings.formPadding ?? '')}
              onChangeText={(v) => onUpdateSettings({ formPadding: v ? parseInt(v, 10) || 0 : undefined })}
              mode="outlined"
              style={styles.input}
              textColor="#fff"
              outlineColor="#2d2d44"
              activeOutlineColor="#e8622c"
              keyboardType="numeric"
              theme={{ colors: { onSurfaceVariant: '#888' } }}
            />

            {/* Form border radius */}
            <TextInput
              label={t('formSettings', 'borderRadius')}
              value={String(settings.borderRadius ?? '')}
              onChangeText={(v) => onUpdateSettings({ borderRadius: v ? parseInt(v, 10) || 0 : undefined })}
              mode="outlined"
              style={styles.input}
              textColor="#fff"
              outlineColor="#2d2d44"
              activeOutlineColor="#e8622c"
              keyboardType="numeric"
              theme={{ colors: { onSurfaceVariant: '#888' } }}
            />
          </CollapsibleSection>

          {/* ============ LOGO ============ */}
          <CollapsibleSection
            title={t('formSettings', 'logo')}
            sectionKey="logo"
            expanded={expandedSections.logo}
            onToggle={toggleSection}
          >
            {settings.logoUrl ? (
              <View style={styles.logoPreview}>
                <Image source={{ uri: settings.logoUrl }} style={styles.logoImage} resizeMode="contain" />
                <Button mode="text" textColor="#cc3333" onPress={() => onUpdateSettings({ logoUrl: undefined, logo: undefined })}>
                  {t('formSettings', 'removeLogo')}
                </Button>
              </View>
            ) : null}
            <Button mode="outlined" icon="image-plus" textColor="#e8622c" style={styles.uploadBtn} onPress={handlePickLogo}>
              {t('formSettings', 'pickLogo')}
            </Button>

            {/* Logo alignment */}
            <Text style={[styles.subLabel, { marginTop: 14 }]}>{t('formSettings', 'logoAlignment')}</Text>
            <View style={styles.segmentedRow}>
              {(['left', 'center', 'right'] as const).map(align => (
                <TouchableOpacity
                  key={align}
                  style={[styles.segmentBtn, (settings.logoAlignment || 'center') === align && styles.segmentBtnActive]}
                  onPress={() => onUpdateSettings({ logoAlignment: align })}
                >
                  <MaterialCommunityIcons
                    name={align === 'left' ? 'format-align-left' : align === 'center' ? 'format-align-center' : 'format-align-right'}
                    size={20}
                    color={(settings.logoAlignment || 'center') === align ? '#fff' : '#888'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Logo size */}
            <TextInput
              label={t('formSettings', 'logoSize')}
              value={String(settings.logoSize ?? '120')}
              onChangeText={(v) => onUpdateSettings({ logoSize: v ? parseInt(v, 10) || 120 : 120 })}
              mode="outlined"
              style={styles.input}
              textColor="#fff"
              outlineColor="#2d2d44"
              activeOutlineColor="#e8622c"
              keyboardType="numeric"
              theme={{ colors: { onSurfaceVariant: '#888' } }}
            />
          </CollapsibleSection>

          {/* ============ TITLE ============ */}
          <CollapsibleSection
            title={t('formSettings', 'titleSection')}
            sectionKey="title"
            expanded={expandedSections.title}
            onToggle={toggleSection}
          >
            {/* Font size */}
            <Text style={styles.subLabel}>{t('formSettings', 'fontSize')}</Text>
            <View style={styles.chipGrid}>
              {FONT_SIZES.map(fs => (
                <TouchableOpacity
                  key={fs.value}
                  style={[styles.chip, (settings.titleFontSize || '3xl') === fs.value && styles.chipActive]}
                  onPress={() => onUpdateSettings({ titleFontSize: fs.value })}
                >
                  <Text style={styles.chipText}>{fs.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Font family */}
            <Text style={styles.subLabel}>{t('formSettings', 'fontFamily')}</Text>
            <View style={styles.chipGrid}>
              {FONT_FAMILIES.map(ff => (
                <TouchableOpacity
                  key={ff}
                  style={[styles.chip, (settings.titleFontFamily || 'Inter') === ff && styles.chipActive]}
                  onPress={() => onUpdateSettings({ titleFontFamily: ff })}
                >
                  <Text style={styles.chipText}>{ff}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Title color */}
            <ColorPickerField
              label={t('formSettings', 'titleColor')}
              value={settings.titleColor || settings.textColor || '#000000'}
              onChange={(c) => onUpdateSettings({ titleColor: c })}
            />

            {/* Title alignment */}
            <Text style={styles.subLabel}>{t('formSettings', 'titleAlignment')}</Text>
            <View style={styles.segmentedRow}>
              {(['left', 'center', 'right'] as const).map(align => (
                <TouchableOpacity
                  key={align}
                  style={[styles.segmentBtn, (settings.titleAlignment || 'center') === align && styles.segmentBtnActive]}
                  onPress={() => onUpdateSettings({ titleAlignment: align })}
                >
                  <MaterialCommunityIcons
                    name={align === 'left' ? 'format-align-left' : align === 'center' ? 'format-align-center' : 'format-align-right'}
                    size={20}
                    color={(settings.titleAlignment || 'center') === align ? '#fff' : '#888'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </CollapsibleSection>

          {/* ============ SUBMISSION ============ */}
          <CollapsibleSection
            title={t('formSettings', 'submission')}
            sectionKey="submission"
            expanded={expandedSections.submission}
            onToggle={toggleSection}
          >
            <TextInput
              label={t('formSettings', 'submitButtonText')}
              value={settings.submitButtonText}
              onChangeText={(v) => onUpdateSettings({ submitButtonText: v })}
              mode="outlined"
              style={styles.input}
              textColor="#fff"
              outlineColor="#2d2d44"
              activeOutlineColor="#e8622c"
              theme={{ colors: { onSurfaceVariant: '#888' } }}
            />
            <TextInput
              label={t('formSettings', 'thankYouMessage')}
              value={settings.successMessage}
              onChangeText={(v) => onUpdateSettings({ successMessage: v })}
              mode="outlined"
              style={styles.input}
              textColor="#fff"
              outlineColor="#2d2d44"
              activeOutlineColor="#e8622c"
              multiline
              numberOfLines={3}
              theme={{ colors: { onSurfaceVariant: '#888' } }}
            />
            <TextInput
              label={t('formSettings', 'redirectUrl')}
              value={settings.redirectUrl || ''}
              onChangeText={(v) => onUpdateSettings({ redirectUrl: v || undefined })}
              mode="outlined"
              style={styles.input}
              textColor="#fff"
              outlineColor="#2d2d44"
              activeOutlineColor="#e8622c"
              autoCapitalize="none"
              keyboardType="url"
              theme={{ colors: { onSurfaceVariant: '#888' } }}
            />

            <ToggleRow
              label={t('formSettings', 'allowMultipleSubmissions')}
              value={settings.allowMultipleSubmissions}
              onToggle={(v) => onUpdateSettings({ allowMultipleSubmissions: v })}
            />
            <ToggleRow
              label={t('formSettings', 'requireAuthentication')}
              value={settings.requireAuthentication}
              onToggle={(v) => onUpdateSettings({ requireAuthentication: v })}
            />
            <ToggleRow
              label={t('formSettings', 'showProgressBar')}
              value={settings.showProgressBar}
              onToggle={(v) => onUpdateSettings({ showProgressBar: v })}
            />
          </CollapsibleSection>

          {/* ============ EMAIL ============ */}
          <CollapsibleSection
            title={t('formSettings', 'emailSection')}
            sectionKey="email"
            expanded={expandedSections.email}
            onToggle={toggleSection}
          >
            <TextInput
              label={t('formSettings', 'emailSubject')}
              value={settings.emailSubject || ''}
              onChangeText={(v) => onUpdateSettings({ emailSubject: v || undefined })}
              mode="outlined"
              style={styles.input}
              textColor="#fff"
              outlineColor="#2d2d44"
              activeOutlineColor="#e8622c"
              theme={{ colors: { onSurfaceVariant: '#888' } }}
            />
            <TextInput
              label={t('formSettings', 'emailRecipient')}
              value={settings.emailRecipient || ''}
              onChangeText={(v) => onUpdateSettings({ emailRecipient: v || undefined })}
              mode="outlined"
              style={styles.input}
              textColor="#fff"
              outlineColor="#2d2d44"
              activeOutlineColor="#e8622c"
              keyboardType="email-address"
              autoCapitalize="none"
              theme={{ colors: { onSurfaceVariant: '#888' } }}
            />
          </CollapsibleSection>

          {/* ============ PERMISSIONS ============ */}
          <CollapsibleSection
            title={t('formSettings', 'permissions')}
            sectionKey="permissions"
            expanded={expandedSections.permissions}
            onToggle={toggleSection}
          >
            <ToggleRow
              label={t('formSettings', 'viewersCanSee')}
              value={settings.viewersCanSee ?? true}
              onToggle={(v) => onUpdateSettings({ viewersCanSee: v })}
            />
            <ToggleRow
              label={t('formSettings', 'viewersCanEdit')}
              value={settings.viewersCanEdit ?? false}
              onToggle={(v) => onUpdateSettings({ viewersCanEdit: v })}
            />
          </CollapsibleSection>

          <View style={{ height: 60 }} />
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

FormSettingsSheet.displayName = 'FormSettingsSheet';
export default FormSettingsSheet;

// ---- Sub-components ----

function CollapsibleSection({
  title,
  sectionKey,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  sectionKey: string;
  expanded: boolean;
  onToggle: (key: string) => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={() => onToggle(sectionKey)} activeOpacity={0.7}>
        <Text variant="labelLarge" style={styles.sectionTitle}>{title}</Text>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#999"
        />
      </TouchableOpacity>
      {expanded && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        color="#e8622c"
      />
    </View>
  );
}

// Simple base64 decode for upload
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: '#1e1e2e' },
  handle: { backgroundColor: '#555' },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerText: { color: '#fff', fontWeight: 'bold' },
  scroll: { paddingHorizontal: 16 },

  // Sections
  section: { marginBottom: 4, borderBottomWidth: 1, borderBottomColor: '#2d2d44' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  sectionTitle: { color: '#999', textTransform: 'uppercase', letterSpacing: 1 },
  sectionContent: { paddingBottom: 16 },

  // Inputs
  input: { backgroundColor: '#1e1e2e', marginBottom: 8 },
  subLabel: { color: '#ccc', fontSize: 13, marginBottom: 8, marginTop: 12 },

  // Chips
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#2d2d44' },
  chipActive: { backgroundColor: '#e8622c' },
  chipText: { color: '#fff', fontSize: 13 },

  // Language chips
  langChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#2d2d44',
  },
  langFlag: { fontSize: 18 },

  // Position grid (3x3)
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 156,
    gap: 4,
  },
  positionCell: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#2d2d44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionCellActive: { backgroundColor: '#e8622c' },
  positionLabel: { color: '#fff', fontSize: 18 },

  // Segmented row
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#2d2d44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: { backgroundColor: '#e8622c' },

  // Logo
  logoPreview: { alignItems: 'center', marginBottom: 12 },
  logoImage: { width: 120, height: 60, marginBottom: 8 },
  uploadBtn: { borderColor: '#e8622c', borderRadius: 12 },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  toggleLabel: { color: '#ccc', fontSize: 14, flex: 1 },

  // Background preview
  bgPreview: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#252540', marginBottom: 8 },
  bgPreviewImage: { width: '100%', height: 120, borderRadius: 12 },
  bgPreviewActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8 },
  bgChangeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bgChangeBtnText: { color: '#fff', fontSize: 13 },
  bgRemoveBtn: { padding: 4 },
  bgBrowseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: '#2d2d44',
    borderStyle: 'dashed', backgroundColor: '#1e1e2e',
  },
  bgBrowseBtnText: { color: '#ccc', fontSize: 14 },
});
