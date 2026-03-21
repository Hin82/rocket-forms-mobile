import React, { useMemo, useCallback, useState, useEffect, forwardRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Text, TextInput, Switch, Button, SegmentedButtons } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import ColorPickerField from './ColorPickerField';
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

const BG_SIZES = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'stretch', label: 'Stracka' },
  { value: 'repeat', label: 'Repetera' },
  { value: 'no-repeat', label: 'Ingen rep.' },
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

const BG_ATTACHMENTS = [
  { value: 'scroll', label: 'Scroll' },
  { value: 'fixed', label: 'Fast' },
  { value: 'local', label: 'Lokal' },
];

const ANIMATED_BACKGROUNDS = [
  { value: 'none', label: 'Ingen' },
  { value: 'floating-shapes', label: 'Flytande former' },
  { value: 'wave-pattern', label: 'Vagmonster' },
  { value: 'particle-field', label: 'Partiklar' },
  { value: 'geometric-grid', label: 'Geometriskt rutnot' },
];

const FormSettingsSheet = forwardRef<BottomSheet, FormSettingsSheetProps>(
  ({ formName, settings, formGroupId, notificationEmail, senderName, groups, onUpdateName, onUpdateSettings, onUpdateFormMeta, onClose }, ref) => {
    const snapPoints = useMemo(() => ['80%', '95%'], []);

    const [name, setName] = useState(formName);
    const [email, setEmail] = useState(notificationEmail || '');
    const [sender, setSender] = useState(senderName || '');

    // Collapsible sections
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
      grundlaggande: true,
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
          <Text variant="titleMedium" style={styles.headerText}>Formularinstallningar</Text>
        </View>
        <BottomSheetScrollView contentContainerStyle={styles.scroll}>

          {/* ============ GRUNDLAGGANDE ============ */}
          <CollapsibleSection
            title="Grundlaggande"
            sectionKey="grundlaggande"
            expanded={expandedSections.grundlaggande}
            onToggle={toggleSection}
          >
            <TextInput
              label="Formularnamn"
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
              label="Notifieringse-post"
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
              label="Avsandarnamn"
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
            <Text style={styles.subLabel}>Kategori / Grupp</Text>
            <View style={styles.chipGrid}>
              <TouchableOpacity
                style={[styles.chip, !formGroupId && styles.chipActive]}
                onPress={() => onUpdateFormMeta({ form_group_id: null, group_name: null })}
              >
                <Text style={styles.chipText}>Ingen grupp</Text>
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
            <Text style={styles.subLabel}>Standardsprak</Text>
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

          {/* ============ UTSEENDE & BAKGRUND ============ */}
          <CollapsibleSection
            title="Utseende & Bakgrund"
            sectionKey="utseende"
            expanded={expandedSections.utseende}
            onToggle={toggleSection}
          >
            <ColorPickerField
              label="Bakgrundsfarg"
              value={settings.backgroundColor}
              onChange={(c) => onUpdateSettings({ backgroundColor: c })}
            />
            <ColorPickerField
              label="Textfarg"
              value={settings.textColor}
              onChange={(c) => onUpdateSettings({ textColor: c })}
            />

            <TextInput
              label="Bakgrundsbild URL"
              value={settings.backgroundImage || ''}
              onChangeText={(v) => onUpdateSettings({ backgroundImage: v || undefined })}
              mode="outlined"
              style={styles.input}
              textColor="#fff"
              outlineColor="#2d2d44"
              activeOutlineColor="#e8622c"
              theme={{ colors: { onSurfaceVariant: '#888' } }}
              autoCapitalize="none"
            />

            {/* Background size */}
            <Text style={styles.subLabel}>Bakgrundsstorlek</Text>
            <View style={styles.chipGrid}>
              {BG_SIZES.map(s => (
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
            <Text style={styles.subLabel}>Bakgrundsposition</Text>
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
            <Text style={styles.subLabel}>Bakgrundsrullning</Text>
            <View style={styles.chipGrid}>
              {BG_ATTACHMENTS.map(a => (
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
            <Text style={styles.subLabel}>Animerad bakgrund</Text>
            <View style={styles.chipGrid}>
              {ANIMATED_BACKGROUNDS.map(a => (
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
              label="Formularpadding (px)"
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
              label="Hornradie (px)"
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
            title="Logotyp"
            sectionKey="logo"
            expanded={expandedSections.logo}
            onToggle={toggleSection}
          >
            {settings.logoUrl ? (
              <View style={styles.logoPreview}>
                <Image source={{ uri: settings.logoUrl }} style={styles.logoImage} resizeMode="contain" />
                <Button mode="text" textColor="#cc3333" onPress={() => onUpdateSettings({ logoUrl: undefined, logo: undefined })}>
                  Ta bort
                </Button>
              </View>
            ) : null}
            <Button mode="outlined" icon="image-plus" textColor="#e8622c" style={styles.uploadBtn} onPress={handlePickLogo}>
              Valj logotyp
            </Button>

            {/* Logo alignment */}
            <Text style={[styles.subLabel, { marginTop: 14 }]}>Logotypjustering</Text>
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
              label="Logotypstorlek (px)"
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

          {/* ============ TITEL ============ */}
          <CollapsibleSection
            title="Titel"
            sectionKey="titel"
            expanded={expandedSections.titel}
            onToggle={toggleSection}
          >
            {/* Font size */}
            <Text style={styles.subLabel}>Teckenstorlek</Text>
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
            <Text style={styles.subLabel}>Typsnitt</Text>
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
              label="Titelfarg"
              value={settings.titleColor || settings.textColor || '#000000'}
              onChange={(c) => onUpdateSettings({ titleColor: c })}
            />

            {/* Title alignment */}
            <Text style={styles.subLabel}>Titeljustering</Text>
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

          {/* ============ INSKICKNING ============ */}
          <CollapsibleSection
            title="Inskickning"
            sectionKey="inskickning"
            expanded={expandedSections.inskickning}
            onToggle={toggleSection}
          >
            <TextInput
              label="Skicka-knapptext"
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
              label="Tackmeddelande"
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
              label="Omdirigerings-URL"
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
              label="Tillaet flera inskickningar"
              value={settings.allowMultipleSubmissions}
              onToggle={(v) => onUpdateSettings({ allowMultipleSubmissions: v })}
            />
            <ToggleRow
              label="Krav autentisering"
              value={settings.requireAuthentication}
              onToggle={(v) => onUpdateSettings({ requireAuthentication: v })}
            />
            <ToggleRow
              label="Visa framdriftsindikator"
              value={settings.showProgressBar}
              onToggle={(v) => onUpdateSettings({ showProgressBar: v })}
            />
          </CollapsibleSection>

          {/* ============ E-POST ============ */}
          <CollapsibleSection
            title="E-post"
            sectionKey="epost"
            expanded={expandedSections.epost}
            onToggle={toggleSection}
          >
            <TextInput
              label="E-postamne"
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
              label="E-postmottagare"
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

          {/* ============ BEHORIGHETER ============ */}
          <CollapsibleSection
            title="Behorigheter"
            sectionKey="behorigheter"
            expanded={expandedSections.behorigheter}
            onToggle={toggleSection}
          >
            <ToggleRow
              label="Visare kan se"
              value={settings.viewersCanSee ?? true}
              onToggle={(v) => onUpdateSettings({ viewersCanSee: v })}
            />
            <ToggleRow
              label="Visare kan redigera"
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
});
