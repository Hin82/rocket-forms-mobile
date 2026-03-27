import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../translations';

// ---- Types mirroring the web app ----

export type FieldType =
  | 'text' | 'email' | 'number' | 'url' | 'phone' | 'name'
  | 'textarea' | 'select' | 'radio' | 'checkbox' | 'yesno'
  | 'date' | 'time' | 'datetime' | 'file' | 'image' | 'document'
  | 'recaptcha' | 'separator' | 'text-display' | 'multi-text-row'
  | 'rating' | 'nps' | 'likert'
  | 'ranking' | 'hidden' | 'html-block' | 'page-break' | 'signature'
  | 'slider' | 'color' | 'currency' | 'personnummer'
  | 'organisationsnummer' | 'address' | 'matrix' | 'drawing';

export interface FieldOption {
  id: string;
  label: string;
  value: string;
  hasTextInput?: boolean;
  textInputPlaceholder?: string;
  subOptions?: FieldOption[];
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  acceptedFileTypes?: string[];
}

export interface Condition {
  id: string;
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: string | number | boolean;
}

export interface ConditionalLogic {
  enabled: boolean;
  action: 'show' | 'hide';
  operator: 'and' | 'or';
  conditions: Condition[];
}

export interface DocumentResizeOptions {
  width?: string;
  height?: string;
  unit?: 'percentage' | 'pixels';
  scale?: number;
}

export interface SeparatorOptions {
  style?: 'solid' | 'dashed' | 'dotted' | 'double' | 'gradient';
  color?: string;
  thickness?: number;
  pattern?: 'simple' | 'decorative' | 'wavy';
  spacing?: 'small' | 'medium' | 'large';
}

export interface ShadowOptions {
  enabled?: boolean;
  blur?: number;
  spread?: number;
  offsetX?: number;
  offsetY?: number;
  color?: string;
  opacity?: number;
}

export interface BorderOptions {
  enabled?: boolean;
  width?: number;
  style?: 'solid' | 'dashed' | 'dotted' | 'double';
  color?: string;
  radius?: number;
}

export interface TextDisplayOptions {
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  backgroundColor?: string;
  padding?: string;
  margin?: string;
  borderRadius?: string;
  textShadow?: string;
  lineHeight?: string;
  content?: string;
}

export interface MultiTextRowOptions {
  fields: Array<{
    key: string;
    label: string;
    placeholder?: string;
    required?: boolean;
  }>;
}

export interface ImageResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  labels?: Partial<Record<string, string>>; // Per-language label overrides
  placeholder?: string;
  description?: string;
  required?: boolean;
  readOnly?: boolean;
  isPublishedMode?: boolean;
  isHiddenField?: boolean; // Hide in published mode (still visible in builder)
  options?: FieldOption[];
  helpText?: string;
  validation?: FieldValidation;
  // Name field
  showMiddleName?: boolean;
  showPrefix?: boolean;
  showSuffix?: boolean;
  firstNamePlaceholder?: string;
  lastNamePlaceholder?: string;
  middleNamePlaceholder?: string;
  prefixPlaceholder?: string;
  suffixPlaceholder?: string;
  // Date/time
  minDate?: string;
  maxDate?: string;
  includeTime?: boolean;
  timeFormat24h?: boolean;
  dateFormat?: string;
  dateTimeMode?: 'date-only' | 'time-only' | 'datetime';
  dateRangePreset?: string;
  // File / Image
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  showFilePreview?: boolean;
  maxImages?: number;
  imageAlignment?: 'left' | 'center' | 'right';
  gridColumns?: number;
  imageResizeOptions?: ImageResizeOptions;
  // Document
  documentUrl?: string | File;
  document?: string | File;
  documentAlignment?: 'left' | 'center' | 'right';
  documentResize?: DocumentResizeOptions;
  title?: string;
  // Rating
  ratingScale?: number;
  ratingIcon?: 'star' | 'heart' | 'thumbs' | 'number';
  // NPS
  npsQuestion?: string;
  npsPromoterQuestion?: string;
  npsPassiveQuestion?: string;
  npsDetractorQuestion?: string;
  npsCommentsLabel?: string;
  // Likert
  likertOptions?: string[];
  // Ranking
  rankingItems?: FieldOption[];
  // Slider
  min?: number;
  max?: number;
  step?: number;
  showValue?: boolean;
  prefix?: string;
  suffix?: string;
  // Currency
  currency?: string;
  // Color
  defaultColor?: string;
  // Address
  showCountry?: boolean;
  defaultCountry?: string;
  // Matrix
  matrixRows?: Array<{ id: string; label: string }>;
  matrixColumns?: Array<{ id: string; label: string }>;
  matrixInputType?: 'radio' | 'checkbox';
  // HTML / text display
  htmlContent?: string;
  textContent?: string;
  // Display options
  separatorOptions?: SeparatorOptions;
  shadowOptions?: ShadowOptions;
  borderOptions?: BorderOptions;
  textDisplayOptions?: TextDisplayOptions;
  multiTextRowOptions?: MultiTextRowOptions;
  // Page break
  pageTitle?: string;
  pageDescription?: string;
  // Textarea
  enableRichText?: boolean;
  // Yes/No field
  defaultAnswer?: 'yes' | 'no' | null;
  hasCommentField?: boolean;
  commentPlaceholder?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  // Hidden field
  hiddenFieldValue?: string;
  // Drawing field
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundColor?: string;
  // URL field
  urlLinkText?: string;
  urlOpenInNewTab?: boolean;
  // Decorative / field image
  fieldImage?: string;
  imagePosition?: 'above' | 'below';
  // Multiple selections
  allowMultipleSelections?: boolean;
  maxSelections?: number;
  // Conditional logic
  conditionalLogic?: ConditionalLogic;
  // Any extra web-app props we round-trip
  [key: string]: any;
}

export interface FormSettings {
  defaultLanguage?: string;
  backgroundColor: string;
  textColor: string;
  logoUrl?: string;
  logo?: string;
  logoAlignment?: 'left' | 'center' | 'right';
  logoSize?: number;
  backgroundImageUrl?: string;
  backgroundImage?: string;
  animatedBackground?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundAttachment?: string;
  submitButtonText: string;
  successMessage: string;
  redirectUrl?: string;
  emailNotifications: boolean;
  emailRecipient?: string;
  emailSubject?: string;
  emailConfigId?: string;
  allowMultipleSubmissions: boolean;
  showProgressBar: boolean;
  requireAuthentication: boolean;
  collectAnalytics: boolean;
  borderRadius?: number;
  padding?: string;
  customEmailDomain?: string;
  customFormDomain?: string;
  titleStyle?: {
    fontSize?: string;
    fontFamily?: string;
    color?: string;
    textAlign?: string;
  };
  viewerPermissions?: {
    canView?: boolean;
    canEdit?: boolean;
  };
  [key: string]: any;
}

export interface FormData {
  id: string;
  name: string;
  fields: FormField[];
  settings: FormSettings;
  form_group_id: string | null;
  group_name: string | null;
  notification_email: string | null;
  sender_name: string | null;
  user_id: string;
  company_id: string | null;
}

function getDefaultSettings(t: (section: string, key: string) => string): FormSettings {
  return {
    backgroundColor: '#ffffff',
    textColor: '#000000',
    submitButtonText: t('formEditor', 'defaultSubmitButton'),
    successMessage: t('formEditor', 'defaultSuccessMessage'),
    emailNotifications: false,
    allowMultipleSubmissions: true,
    showProgressBar: false,
    requireAuthentication: false,
    collectAnalytics: false,
    borderRadius: 8,
    padding: '2rem',
    titleStyle: {
      fontSize: '4xl',
      fontFamily: 'inherit',
      color: '#111827',
      textAlign: 'center',
    },
  };
}

function generateId(): string {
  return 'f' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export function useFormEditor(formId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const DEFAULT_SETTINGS = getDefaultSettings(t);

  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load form
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('forms')
          .select('*')
          .eq('id', formId)
          .single();
        if (fetchError) throw fetchError;
        if (!cancelled) {
          setForm({
            ...data,
            fields: data.fields || [],
            settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
          } as FormData);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [formId]);

  // Auto-save debounced
  useEffect(() => {
    if (!dirty || !form) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveForm();
    }, 2000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [dirty, form]);

  const saveForm = useCallback(async () => {
    if (!form) return;
    try {
      setSaving(true);
      const { error: saveError } = await supabase
        .from('forms')
        .update({
          name: form.name,
          fields: form.fields,
          settings: form.settings,
          form_group_id: form.form_group_id,
          group_name: form.group_name,
          notification_email: form.notification_email,
          sender_name: form.sender_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', form.id);
      if (saveError) throw saveError;
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['form', form.id] });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }, [form, queryClient]);

  const updateForm = useCallback((updates: Partial<FormData>) => {
    setForm((prev: FormData | null) => prev ? { ...prev, ...updates } : prev);
    setDirty(true);
  }, []);

  const updateSettings = useCallback((updates: Partial<FormSettings>) => {
    setForm((prev: FormData | null) => {
      if (!prev) return prev;
      return { ...prev, settings: { ...prev.settings, ...updates } };
    });
    setDirty(true);
  }, []);

  const addField = useCallback((type: FieldType) => {
    const newField = createFieldWithDefaults(type, t);
    setForm((prev: FormData | null) => {
      if (!prev) return prev;
      return { ...prev, fields: [...prev.fields, newField] };
    });
    setDirty(true);
    return newField;
  }, [t]);

  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    setForm((prev: FormData | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.map((f: FormField) => f.id === fieldId ? { ...f, ...updates } : f),
      };
    });
    setDirty(true);
  }, []);

  const removeField = useCallback((fieldId: string) => {
    setForm(prev => {
      if (!prev) return prev;
      return { ...prev, fields: prev.fields.filter(f => f.id !== fieldId) };
    });
    setDirty(true);
  }, []);

  const reorderFields = useCallback((fromIndex: number, toIndex: number) => {
    setForm(prev => {
      if (!prev) return prev;
      const newFields = [...prev.fields];
      const [moved] = newFields.splice(fromIndex, 1);
      newFields.splice(toIndex, 0, moved);
      return { ...prev, fields: newFields };
    });
    setDirty(true);
  }, []);

  const duplicateField = useCallback((fieldId: string) => {
    setForm(prev => {
      if (!prev) return prev;
      const sourceField = prev.fields.find(f => f.id === fieldId);
      if (!sourceField) return prev;
      // Deep copy the field and assign a new ID
      const duplicated: FormField = JSON.parse(JSON.stringify(sourceField));
      duplicated.id = generateId();
      duplicated.label = `${sourceField.label} (${t('formEditor', 'copy')})`;
      // Re-generate IDs for nested objects that carry their own IDs
      if (duplicated.options) {
        duplicated.options = duplicated.options.map((opt: FieldOption) => ({ ...opt, id: generateId() }));
      }
      if (duplicated.matrixRows) {
        duplicated.matrixRows = duplicated.matrixRows.map((r: { id: string; label: string }) => ({ ...r, id: generateId() }));
      }
      if (duplicated.matrixColumns) {
        duplicated.matrixColumns = duplicated.matrixColumns.map((c: { id: string; label: string }) => ({ ...c, id: generateId() }));
      }
      if (duplicated.conditionalLogic?.conditions) {
        duplicated.conditionalLogic.conditions = duplicated.conditionalLogic.conditions.map((cond: Condition) => ({ ...cond, id: generateId() }));
      }
      // Insert the duplicate right after the source field
      const sourceIndex = prev.fields.findIndex(f => f.id === fieldId);
      const newFields = [...prev.fields];
      newFields.splice(sourceIndex + 1, 0, duplicated);
      return { ...prev, fields: newFields };
    });
    setDirty(true);
  }, []);

  return {
    form,
    loading,
    saving,
    dirty,
    error,
    saveForm,
    updateForm,
    updateSettings,
    addField,
    updateField,
    removeField,
    reorderFields,
    duplicateField,
  };
}

/** Maps a FieldType to its corresponding translation key in the fieldTypes section. */
function getFieldTypeKey(type: FieldType): string {
  const keyMap: Record<string, string> = {
    'text-display': 'textDisplay',
    'multi-text-row': 'multiTextRow',
    'html-block': 'htmlBlock',
    'page-break': 'pageBreak',
  };
  return keyMap[type] || type;
}

/**
 * Shared field factory that creates a complete field object with all necessary defaults.
 * This ensures consistent field initialization across the app (mobile create screen, editor, etc.)
 */
export function createFieldWithDefaults(
  type: FieldType,
  t: (section: string, key: string) => string
): FormField {
  const fieldTypeKey = getFieldTypeKey(type);
  const newField: FormField = {
    id: generateId(),
    type,
    label: t('fieldTypes', fieldTypeKey),
    required: false,
  };

  // Add default options for choice fields
  if (['select', 'radio', 'checkbox'].includes(type)) {
    newField.options = [
      { id: generateId(), label: `${t('formEditor', 'option')} 1`, value: 'option_1' },
      { id: generateId(), label: `${t('formEditor', 'option')} 2`, value: 'option_2' },
    ];
  }

  if (type === 'rating') newField.ratingScale = 5;

  if (type === 'slider') {
    newField.min = 0;
    newField.max = 100;
    newField.step = 1;
  }

  if (type === 'likert') {
    newField.likertOptions = [
      t('formEditor', 'likertStronglyDisagree'),
      t('formEditor', 'likertDisagree'),
      t('formEditor', 'likertNeutral'),
      t('formEditor', 'likertAgree'),
      t('formEditor', 'likertStronglyAgree'),
    ];
  }

  if (type === 'currency') newField.currency = 'SEK';

  if (type === 'matrix') {
    newField.matrixRows = [
      { id: generateId(), label: `${t('formEditor', 'row')} 1` },
      { id: generateId(), label: `${t('formEditor', 'row')} 2` },
    ];
    newField.matrixColumns = [
      { id: generateId(), label: `${t('formEditor', 'column')} 1` },
      { id: generateId(), label: `${t('formEditor', 'column')} 2` },
    ];
    newField.matrixInputType = 'radio';
  }

  return newField;
}