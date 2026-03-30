import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ImageBackground,
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { FormField, FormSettings } from '../../hooks/useFormEditor';
import { useTranslation } from '../../translations';

interface FormPreviewSheetProps {
  visible: boolean;
  onClose: () => void;
  fields: FormField[];
  settings: FormSettings;
  formName: string;
}

const FONT_SIZE_MAP: Record<string, number> = {
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
};

const ALIGN_MAP: Record<string, 'left' | 'center' | 'right'> = {
  left: 'left',
  center: 'center',
  right: 'right',
};

export default function FormPreviewSheet({
  visible,
  onClose,
  fields,
  settings,
  formName,
}: FormPreviewSheetProps) {
  const { t } = useTranslation();
  const titleStyle = settings.titleStyle;
  const titleFontSize = FONT_SIZE_MAP[titleStyle?.fontSize || '4xl'] || 36;
  const titleColor = titleStyle?.color || settings.textColor || '#111827';
  const titleAlign = ALIGN_MAP[titleStyle?.textAlign || 'center'] || 'center';
  const bgColor = settings.backgroundColor || '#ffffff';
  const textColor = settings.textColor || '#000000';
  const logoUrl = settings.logoUrl || settings.logo;
  const bgImageUrl = settings.backgroundImageUrl || settings.backgroundImage;

  const hasPageBg = !!bgImageUrl;

  const renderFormFields = () => (
    <>
      {/* Logo */}
      {logoUrl ? (
        <View
          style={[
            styles.logoContainer,
            {
              alignItems:
                settings.logoAlignment === 'left'
                  ? 'flex-start'
                  : settings.logoAlignment === 'right'
                  ? 'flex-end'
                  : 'center',
            },
          ]}
        >
          <Image
            source={{ uri: logoUrl }}
            style={[styles.logo, settings.logoSize ? { width: settings.logoSize, height: settings.logoSize * 0.6 } : {}]}
            resizeMode="contain"
          />
        </View>
      ) : null}

      {/* Title */}
      <Text
        style={[
          styles.formTitle,
          {
            fontSize: titleFontSize,
            color: titleColor,
            textAlign: titleAlign,
            fontFamily: titleStyle?.fontFamily !== 'inherit' ? titleStyle?.fontFamily : undefined,
          },
        ]}
      >
        {formName}
      </Text>

      {/* Fields */}
      {fields.map((field) => (
        <FieldPreview key={field.id} field={field} textColor={textColor} t={t} />
      ))}

      {/* Submit button */}
      <TouchableOpacity
        style={[styles.submitBtn, { borderRadius: settings.borderRadius || 8 }]}
        activeOpacity={0.8}
      >
        <Text style={styles.submitBtnText}>
          {settings.submitButtonText || t('preview', 'submitBtn')}
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderContent = () => (
    <ScrollView
      style={[styles.scrollView, !hasPageBg && { backgroundColor: bgColor }]}
      contentContainerStyle={[styles.scrollContent, hasPageBg && styles.scrollContentWithBg]}
    >
      {hasPageBg ? (
        <View style={[styles.formCard, { backgroundColor: bgColor, borderRadius: settings.borderRadius || 8 }]}>
          {renderFormFields()}
        </View>
      ) : (
        renderFormFields()
      )}
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Close bar */}
        <View style={styles.closeBar}>
          <Text style={styles.closeBarTitle}>{t('preview', 'previewTitle')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {bgImageUrl ? (
          <ImageBackground
            source={{ uri: bgImageUrl }}
            style={styles.bgImage}
            resizeMode="cover"
          >
            {renderContent()}
          </ImageBackground>
        ) : (
          renderContent()
        )}
      </View>
    </Modal>
  );
}

// ---- Field Preview ----

function FieldPreview({ field, textColor, t }: { field: FormField; textColor: string; t: (section: string, key: string) => string }) {
  if (field.type === 'hidden') return null;

  switch (field.type) {
    case 'separator':
      return <SeparatorPreview field={field} />;
    case 'text-display':
      return <TextDisplayPreview field={field} />;
    case 'page-break':
      return <PageBreakPreview field={field} textColor={textColor} t={t} />;
    default:
      return (
        <View style={styles.fieldContainer}>
          <FieldLabel label={field.label} required={field.required} textColor={textColor} />
          {field.description ? (
            <Text style={[styles.fieldDescription, { color: textColor + '99' }]}>
              {field.description}
            </Text>
          ) : null}
          <FieldInput field={field} textColor={textColor} t={t} />
        </View>
      );
  }
}

function FieldLabel({
  label,
  required,
  textColor,
}: {
  label: string;
  required?: boolean;
  textColor: string;
}) {
  return (
    <Text style={[styles.fieldLabel, { color: textColor }]}>
      {label}
      {required ? <Text style={styles.requiredStar}> *</Text> : null}
    </Text>
  );
}

function FieldInput({ field, textColor, t }: { field: FormField; textColor: string; t: (section: string, key: string) => string }) {
  const inputStyle = [styles.previewInput, { color: textColor, borderColor: textColor + '33' }];

  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'number':
    case 'url':
    case 'personnummer':
    case 'organisationsnummer':
      return (
        <TextInput
          style={inputStyle}
          placeholder={field.placeholder || field.label}
          placeholderTextColor={textColor + '55'}
          editable={false}
        />
      );

    case 'textarea':
      return (
        <TextInput
          style={[...inputStyle, styles.textareaInput]}
          placeholder={field.placeholder || field.label}
          placeholderTextColor={textColor + '55'}
          multiline
          numberOfLines={4}
          editable={false}
        />
      );

    case 'name':
      return (
        <View style={styles.nameRow}>
          <TextInput
            style={[...inputStyle, styles.nameInput]}
            placeholder={field.firstNamePlaceholder || t('preview', 'firstName')}
            placeholderTextColor={textColor + '55'}
            editable={false}
          />
          <TextInput
            style={[...inputStyle, styles.nameInput]}
            placeholder={field.lastNamePlaceholder || t('preview', 'lastName')}
            placeholderTextColor={textColor + '55'}
            editable={false}
          />
        </View>
      );

    case 'select':
      return (
        <View style={[styles.previewInput, styles.selectInput, { borderColor: textColor + '33' }]}>
          <Text style={{ color: textColor + '55', flex: 1 }}>
            {field.placeholder || t('preview', 'selectOption')}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color={textColor + '55'} />
        </View>
      );

    case 'radio':
      return (
        <View style={styles.optionsList}>
          {(field.options || []).map((opt, i) => (
            <View key={opt.id || i} style={styles.radioRow}>
              <View style={[styles.radioCircle, { borderColor: textColor + '55' }]} />
              <Text style={[styles.optionLabel, { color: textColor }]}>{opt.label}</Text>
            </View>
          ))}
        </View>
      );

    case 'checkbox':
      return (
        <View style={styles.optionsList}>
          {(field.options || []).map((opt, i) => (
            <View key={opt.id || i} style={styles.radioRow}>
              <View style={[styles.checkboxSquare, { borderColor: textColor + '55' }]} />
              <Text style={[styles.optionLabel, { color: textColor }]}>{opt.label}</Text>
            </View>
          ))}
        </View>
      );

    case 'yesno':
      return (
        <View style={styles.yesNoRow}>
          <TouchableOpacity style={styles.yesNoBtn} activeOpacity={1}>
            <Text style={styles.yesNoBtnText}>{t('preview', 'yes')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.yesNoBtn} activeOpacity={1}>
            <Text style={styles.yesNoBtnText}>{t('preview', 'no')}</Text>
          </TouchableOpacity>
        </View>
      );

    case 'date':
    case 'time':
    case 'datetime':
      return (
        <View style={[styles.previewInput, styles.selectInput, { borderColor: textColor + '33' }]}>
          <Text style={{ color: textColor + '55', flex: 1 }}>
            {field.type === 'time' ? 'HH:MM' : field.type === 'datetime' ? 'AAAA-MM-DD HH:MM' : 'AAAA-MM-DD'}
          </Text>
          <MaterialCommunityIcons
            name={field.type === 'time' ? 'clock-outline' : 'calendar'}
            size={20}
            color={textColor + '55'}
          />
        </View>
      );

    case 'rating': {
      const scale = field.ratingScale || 5;
      return (
        <View style={styles.ratingRow}>
          {Array.from({ length: scale }).map((_, i) => (
            <MaterialCommunityIcons
              key={i}
              name="star-outline"
              size={32}
              color="#e8622c"
            />
          ))}
        </View>
      );
    }

    case 'nps':
      return (
        <View style={styles.npsRow}>
          {Array.from({ length: 11 }).map((_, i) => (
            <View key={i} style={styles.npsItem}>
              <Text style={[styles.npsNumber, { color: textColor }]}>{i}</Text>
            </View>
          ))}
        </View>
      );

    case 'slider':
      return (
        <View style={styles.sliderContainer}>
          <View style={styles.sliderTrack}>
            <View style={styles.sliderThumb} />
          </View>
          <View style={styles.sliderLabels}>
            <Text style={{ color: textColor + '88', fontSize: 12 }}>{field.min ?? 0}</Text>
            <Text style={{ color: textColor + '88', fontSize: 12 }}>{field.max ?? 100}</Text>
          </View>
        </View>
      );

    case 'signature':
      return (
        <View style={[styles.placeholderBox, { borderColor: textColor + '33' }]}>
          <MaterialCommunityIcons name="draw" size={28} color={textColor + '55'} />
          <Text style={[styles.placeholderBoxText, { color: textColor + '55' }]}>
            {t('preview', 'signatureField')}
          </Text>
        </View>
      );

    case 'file':
    case 'image':
      return (
        <View style={[styles.placeholderBox, { borderColor: textColor + '33' }]}>
          <MaterialCommunityIcons
            name={field.type === 'image' ? 'image-outline' : 'file-upload-outline'}
            size={28}
            color={textColor + '55'}
          />
          <Text style={[styles.placeholderBoxText, { color: textColor + '55' }]}>
            {field.type === 'image' ? t('preview', 'uploadImage') : t('preview', 'uploadFile')}
          </Text>
        </View>
      );

    case 'document': {
      const docUrl: string | null = (field.documentUrl as string | undefined) ?? (typeof field.document === 'string' ? field.document : null);
      if (!docUrl) {
        return (
          <View style={[styles.placeholderBox, { borderColor: textColor + '33' }]}>
            <MaterialCommunityIcons name="file-document-outline" size={28} color={textColor + '55'} />
            <Text style={[styles.placeholderBoxText, { color: textColor + '55' }]}>{t('preview', 'noDocument')}</Text>
          </View>
        );
      }
      const isPdf = docUrl.toLowerCase().endsWith('.pdf');
      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(docUrl);
      if (isImage) {
        return (
          <View style={{ alignItems: field.documentAlignment === 'right' ? 'flex-end' : field.documentAlignment === 'center' ? 'center' : 'flex-start' }}>
            <Image
              source={{ uri: docUrl }}
              style={{ width: '100%', height: 300, borderRadius: 8 }}
              resizeMode="contain"
            />
          </View>
        );
      }
      // PDF — render directly in WebView (iOS renders PDFs natively)
      return (
        <View style={[styles.documentWebView, { alignItems: field.documentAlignment === 'right' ? 'flex-end' : field.documentAlignment === 'center' ? 'center' : 'flex-start' }]}>
          <WebView
            source={{ uri: docUrl }}
            style={styles.pdfWebView}
            scrollEnabled={true}
            nestedScrollEnabled={true}
            startInLoadingState={true}
            originWhitelist={['*']}
            allowFileAccess={true}
          />
        </View>
      );
    }

    case 'address':
      return (
        <View style={styles.addressStack}>
          <TextInput style={inputStyle} placeholder={t('preview', 'streetAddress')} placeholderTextColor={textColor + '55'} editable={false} />
          <TextInput style={inputStyle} placeholder={t('preview', 'postalCode')} placeholderTextColor={textColor + '55'} editable={false} />
          <TextInput style={inputStyle} placeholder={t('preview', 'city')} placeholderTextColor={textColor + '55'} editable={false} />
          {field.showCountry !== false && (
            <TextInput style={inputStyle} placeholder={t('preview', 'country')} placeholderTextColor={textColor + '55'} editable={false} />
          )}
        </View>
      );

    case 'currency':
      return (
        <View style={[styles.previewInput, styles.selectInput, { borderColor: textColor + '33' }]}>
          <Text style={{ color: textColor + '55' }}>{field.currency || 'SEK'}</Text>
          <TextInput
            style={[styles.currencyInput, { color: textColor }]}
            placeholder="0.00"
            placeholderTextColor={textColor + '55'}
            editable={false}
          />
        </View>
      );

    case 'color':
      return (
        <View style={styles.colorSwatchRow}>
          <View style={[styles.colorSwatch, { backgroundColor: field.defaultColor || '#e8622c' }]} />
          <Text style={{ color: textColor + '88', fontSize: 13 }}>{field.defaultColor || '#e8622c'}</Text>
        </View>
      );

    case 'likert':
      return (
        <View style={styles.likertContainer}>
          {(field.likertOptions || []).map((opt, i) => (
            <View key={i} style={styles.radioRow}>
              <View style={[styles.radioCircle, { borderColor: textColor + '55' }]} />
              <Text style={[styles.optionLabel, { color: textColor }]}>{opt}</Text>
            </View>
          ))}
        </View>
      );

    case 'matrix': {
      const rows = field.matrixRows || [];
      const cols = field.matrixColumns || [];
      return (
        <View style={styles.matrixContainer}>
          {/* Header row */}
          <View style={styles.matrixRow}>
            <View style={styles.matrixLabelCell} />
            {cols.map((col) => (
              <View key={col.id} style={styles.matrixCell}>
                <Text style={[styles.matrixHeaderText, { color: textColor }]} numberOfLines={1}>
                  {col.label}
                </Text>
              </View>
            ))}
          </View>
          {rows.map((row) => (
            <View key={row.id} style={styles.matrixRow}>
              <View style={styles.matrixLabelCell}>
                <Text style={[styles.matrixRowLabel, { color: textColor }]}>{row.label}</Text>
              </View>
              {cols.map((col) => (
                <View key={col.id} style={styles.matrixCell}>
                  <View style={[styles.radioCircle, { borderColor: textColor + '55' }]} />
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    }

    case 'ranking':
      return (
        <View style={styles.optionsList}>
          {(field.rankingItems || field.options || []).map((opt, i) => (
            <View key={opt.id || i} style={styles.rankingRow}>
              <Text style={[styles.rankingNumber, { color: textColor }]}>{i + 1}.</Text>
              <Text style={[styles.optionLabel, { color: textColor }]}>{opt.label}</Text>
            </View>
          ))}
        </View>
      );

    case 'drawing':
      return (
        <View style={[styles.placeholderBox, { borderColor: textColor + '33', height: 120 }]}>
          <MaterialCommunityIcons name="draw" size={28} color={textColor + '55'} />
          <Text style={[styles.placeholderBoxText, { color: textColor + '55' }]}>{t('preview', 'drawingArea')}</Text>
        </View>
      );

    default:
      return (
        <TextInput
          style={inputStyle}
          placeholder={field.placeholder || field.label}
          placeholderTextColor={textColor + '55'}
          editable={false}
        />
      );
  }
}

function SeparatorPreview({ field }: { field: FormField }) {
  const opts = field.separatorOptions;
  const color = opts?.color || '#cccccc';
  const thickness = opts?.thickness || 1;
  const borderStyle = (opts?.style as any) || 'solid';
  const spacing = opts?.spacing === 'large' ? 24 : opts?.spacing === 'small' ? 8 : 16;

  return (
    <View style={{ marginVertical: spacing }}>
      <View
        style={{
          borderBottomWidth: thickness,
          borderBottomColor: color,
          borderStyle: borderStyle === 'gradient' ? 'solid' : borderStyle,
        }}
      />
    </View>
  );
}

function TextDisplayPreview({ field }: { field: FormField }) {
  const opts = field.textDisplayOptions;
  const content = opts?.content || field.textContent || field.label;
  const fontSize = parseInt(opts?.fontSize || '16', 10) || 16;
  const color = opts?.color || '#000000';
  const textAlign = (opts?.textAlign as any) || 'left';
  const fontWeight = (opts?.fontWeight as any) || 'normal';
  const bgColor = opts?.backgroundColor || 'transparent';

  return (
    <View style={[styles.fieldContainer, { backgroundColor: bgColor }]}>
      <Text style={{ fontSize, color, textAlign, fontWeight }}>{content}</Text>
    </View>
  );
}

function PageBreakPreview({ field, textColor, t }: { field: FormField; textColor: string; t: (section: string, key: string) => string }) {
  return (
    <View style={styles.pageBreakContainer}>
      <View style={styles.pageBreakLine} />
      <Text style={[styles.pageBreakTitle, { color: textColor }]}>
        {field.pageTitle || t('preview', 'nextPage')}
      </Text>
      {field.pageDescription ? (
        <Text style={[styles.pageBreakDesc, { color: textColor + '88' }]}>
          {field.pageDescription}
        </Text>
      ) : null}
      <View style={styles.pageBreakLine} />
    </View>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  closeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1e1e2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  closeBarTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  closeBtn: { padding: 4 },
  bgImage: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  scrollContentWithBg: { paddingVertical: 40 },
  formCard: { padding: 20, overflow: 'hidden' },

  logoContainer: { marginBottom: 16 },
  logo: { width: 120, height: 60 },

  formTitle: { fontWeight: '700', marginBottom: 24 },

  // Fields
  fieldContainer: { marginBottom: 20 },
  fieldLabel: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  requiredStar: { color: '#cc3333' },
  fieldDescription: { fontSize: 13, marginBottom: 6 },

  previewInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textareaInput: { minHeight: 90, textAlignVertical: 'top' },

  nameRow: { flexDirection: 'row', gap: 10 },
  nameInput: { flex: 1 },

  selectInput: { flexDirection: 'row', alignItems: 'center' },

  optionsList: { gap: 10 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
  },
  optionLabel: { fontSize: 15 },

  yesNoRow: { flexDirection: 'row', gap: 12 },
  yesNoBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#e8622c22',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8622c44',
  },
  yesNoBtnText: { color: '#e8622c', fontWeight: '600', fontSize: 15 },

  ratingRow: { flexDirection: 'row', gap: 4 },

  npsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  npsItem: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  npsNumber: { fontSize: 12, fontWeight: '600' },

  sliderContainer: { marginTop: 4 },
  sliderTrack: {
    height: 6,
    backgroundColor: '#ddd',
    borderRadius: 3,
    justifyContent: 'center',
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e8622c',
    position: 'absolute',
    left: '30%',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },

  placeholderBox: {
    height: 80,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  placeholderBoxText: { fontSize: 13 },

  documentPreview: {
    padding: 24,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  documentWebView: {
    width: '100%' as any,
    borderRadius: 8,
    overflow: 'hidden' as const,
  },
  pdfWebView: {
    width: '100%',
    height: 500,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },

  addressStack: { gap: 10 },

  currencyInput: { flex: 1, marginLeft: 8, fontSize: 15 },

  colorSwatchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorSwatch: { width: 32, height: 32, borderRadius: 8 },

  likertContainer: { gap: 10 },

  matrixContainer: { gap: 2 },
  matrixRow: { flexDirection: 'row', alignItems: 'center' },
  matrixLabelCell: { flex: 2, paddingVertical: 6 },
  matrixCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  matrixHeaderText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  matrixRowLabel: { fontSize: 13 },

  rankingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rankingNumber: { fontSize: 15, fontWeight: '700', width: 24 },

  pageBreakContainer: { marginVertical: 20, alignItems: 'center', gap: 8 },
  pageBreakLine: { height: 1, backgroundColor: '#ccc', width: '100%' },
  pageBreakTitle: { fontSize: 16, fontWeight: '600' },
  pageBreakDesc: { fontSize: 13 },

  submitBtn: {
    backgroundColor: '#e8622c',
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
