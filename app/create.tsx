import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  ActivityIndicator,
  Animated,
  Image,
} from 'react-native';
import { Text, TextInput, Button, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { useFormGroups } from '@/src/hooks/useForms';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { trackAction } from '@/src/hooks/useAppRating';
import { useTranslation } from '@/src/translations';
import FormPreviewCard from '@/src/components/FormPreviewCard';

// ── Types ──

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

interface UnsplashPhoto {
  id: string;
  urls: { small: string; regular: string; thumb: string };
  alt_description?: string;
}

// ── Constants ──

const TOTAL_STEPS = 5;

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

const PRESET_BG_COLORS = [
  '#ffffff',
  '#f5f5f7',
  '#1a1a2e',
  '#0f172a',
  '#fdf2f8',
  '#ecfdf5',
  '#eff6ff',
  '#fef3c7',
];

const PRESET_TEXT_COLORS = [
  '#000000',
  '#1c1c1e',
  '#ffffff',
  '#374151',
  '#1e3a5f',
  '#4a3728',
];

const UNSPLASH_CATEGORIES = [
  { key: 'abstract', icon: 'shape-outline' },
  { key: 'nature', icon: 'leaf' },
  { key: 'gradient', icon: 'gradient-horizontal' },
  { key: 'texture', icon: 'texture' },
  { key: 'minimal', icon: 'minus-circle-outline' },
  { key: 'geometric', icon: 'hexagon-outline' },
  { key: 'sky', icon: 'weather-cloudy' },
  { key: 'ocean', icon: 'waves' },
];

const GRADIENT_PRESETS = [
  'https://images.unsplash.com/photo-1557683316-973673baf926?w=400',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400',
  'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400',
  'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=400',
  'https://images.unsplash.com/photo-1557682260-96773eb01377?w=400',
  'https://images.unsplash.com/photo-1557682268-e3955ed5d83f?w=400',
];

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

// ── Progress Dots Component ──

function ProgressDots({ current, total }: { current: number; total: number }) {
  const anims = useRef(
    Array.from({ length: total }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    anims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: i + 1 === current ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });
  }, [current, anims]);

  return (
    <View style={styles.dotsRow}>
      {anims.map((anim, i) => {
        const width = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [8, 24],
        });
        const bg = anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['#2d2d44', '#e8622c'],
        });
        return (
          <Animated.View
            key={i}
            style={[styles.dot, { width, backgroundColor: bg }]}
          />
        );
      })}
    </View>
  );
}

// ── Main Component ──

export default function CreateFormScreen() {
  // Wizard state
  const [step, setStep] = useState(1);

  // Step 1 – Name
  const [formName, setFormName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Step 2 – Logo
  const [logoUri, setLogoUri] = useState<string | null>(null);

  // Step 3 – Look
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#000000');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [unsplashPhotos, setUnsplashPhotos] = useState<UnsplashPhoto[]>([]);
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const [activeUnsplashCategory, setActiveUnsplashCategory] = useState<string | null>(null);

  // Step 4 – Email
  const [notificationEmail, setNotificationEmail] = useState('');
  const [notificationEmailError, setNotificationEmailError] = useState('');
  const [senderName, setSenderName] = useState('');

  // Step 5 – Fields
  const [fields, setFields] = useState<NewField[]>([]);

  // Hooks
  const { user } = useAuth();
  const { data: groups } = useFormGroups();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Fetch templates
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
    staleTime: 10 * 60 * 1000,
  });

  // ── Helpers ──

  const getTemplateIcon = (category: string): string =>
    CATEGORY_ICONS[category.toLowerCase()] || 'file-document-outline';

  const getTemplateColor = (category: string): string =>
    CATEGORY_COLORS[category.toLowerCase()] || '#667eea';

  const applyTemplate = async (template: FormTemplate) => {
    if (!user?.id) {
      Alert.alert(t('settings', 'error'), t('create', 'couldNotCreate'));
      return;
    }
    try {
      const { data, error } = await supabase
        .from('forms')
        .insert({
          name: formName.trim() || template.name,
          fields: template.fields,
          settings: template.settings,
          user_id: user.id,
          form_group_id: selectedGroup,
        })
        .select()
        .single();

      if (error) throw error;

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

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('settings', 'error'), t('create', 'photoPermissionDenied'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleNotificationEmailChange = (text: string) => {
    setNotificationEmail(text);
    if (notificationEmailError && (text.trim() === '' || isValidEmail(text))) {
      setNotificationEmailError('');
    }
  };

  const handleNotificationEmailBlur = () => {
    const trimmed = notificationEmail.trim();
    if (trimmed && !isValidEmail(trimmed)) {
      setNotificationEmailError(t('create', 'invalidEmail'));
    } else {
      setNotificationEmailError('');
    }
  };

  const fetchUnsplash = async (category: string) => {
    if (activeUnsplashCategory === category) return;
    setActiveUnsplashCategory(category);
    setUnsplashLoading(true);
    try {
      const { data } = await supabase.functions.invoke('fetch-unsplash', {
        body: { query: category, per_page: 12, orientation: 'landscape' },
      });
      if (data?.results) {
        setUnsplashPhotos(data.results);
      } else if (Array.isArray(data)) {
        setUnsplashPhotos(data);
      }
    } catch (err) {
      if (__DEV__) console.warn('Unsplash fetch failed:', err);
    } finally {
      setUnsplashLoading(false);
    }
  };

  const addField = (type: string, label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFields(prev => [
      ...prev,
      {
        id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type,
        label,
        required: false,
      },
    ]);
  };

  const removeField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
  };

  // ── Create form mutation ──

  const createForm = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error(t('create', 'couldNotCreate'));
      const emailTrimmed = notificationEmail.trim();
      if (emailTrimmed && !isValidEmail(emailTrimmed)) {
        throw new Error(t('create', 'invalidEmail'));
      }
      const formFields = fields.map((f, i) => ({
        id: f.id,
        type: f.type,
        label: f.label,
        required: f.required,
        order: i,
        placeholder: '',
        options:
          f.type === 'select' || f.type === 'radio' || f.type === 'checkbox'
            ? [`${t('create', 'option')} 1`, `${t('create', 'option')} 2`, `${t('create', 'option')} 3`]
            : undefined,
      }));

      const { data, error } = await supabase
        .from('forms')
        .insert({
          name: formName,
          fields: formFields,
          settings: {
            backgroundColor,
            textColor,
            backgroundImage: backgroundImage || undefined,
            logoUrl: logoUri || undefined,
            submitButtonText: t('fieldEditor', 'defaultSubmitButton'),
            successMessage: t('fieldEditor', 'defaultSuccessMessage'),
            borderRadius: 8,
            emailNotifications: !!notificationEmail.trim(),
            allowMultipleSubmissions: true,
            showProgressBar: false,
            requireAuthentication: false,
            collectAnalytics: false,
          },
          notification_email: notificationEmail.trim() || null,
          sender_name: senderName.trim() || null,
          user_id: user.id,
          form_group_id: selectedGroup,
        })
        .select()
        .single();

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

  // ── Navigation helpers ──

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  };

  const goBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 1) {
      router.back();
    } else {
      setStep(s => s - 1);
    }
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return formName.trim().length > 0;
      default:
        return true;
    }
  };

  // ── Step title helper ──

  const stepTitles = [
    t('create', 'stepName'),
    t('create', 'stepLogo'),
    t('create', 'stepLook'),
    t('create', 'stepEmail'),
    t('create', 'stepFields'),
  ];

  // ── Render each step ──

  const renderStep1 = () => (
    <>
      <Text variant="headlineMedium" style={styles.title}>
        {t('create', 'newForm')}
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        {t('create', 'nameYourForm')}
      </Text>

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
          <Text variant="titleSmall" style={styles.groupLabel}>
            {t('create', 'folderOptional')}
          </Text>
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

      {/* Templates */}
      <Text variant="titleSmall" style={styles.sectionLabel}>
        {t('templates', 'quickStart')}
      </Text>
      <Text style={styles.sectionHint}>{t('templates', 'quickStartDesc')}</Text>

      {templatesLoading ? (
        <ActivityIndicator size="small" color="#e8622c" style={{ marginVertical: 20 }} />
      ) : templates && templates.length > 0 ? (
        <View style={styles.templateGrid}>
          {templates.map(tmpl => {
            const icon = getTemplateIcon(tmpl.category);
            const color = getTemplateColor(tmpl.category);
            return (
              <Pressable
                key={tmpl.id}
                onPress={() => applyTemplate(tmpl)}
                style={styles.templateCard}
              >
                <View style={[styles.templateIcon, { backgroundColor: color + '20' }]}>
                  <MaterialCommunityIcons name={icon as any} size={28} color={color} />
                </View>
                <View style={styles.templateTextCol}>
                  <Text style={styles.templateName}>{tmpl.name}</Text>
                  {tmpl.description ? (
                    <Text style={styles.templateDesc} numberOfLines={2}>
                      {tmpl.description}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Text variant="titleSmall" style={[styles.sectionLabel, { marginTop: 24 }]}>
        {t('templates', 'orFromScratch')}
      </Text>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text variant="headlineMedium" style={styles.title}>
        {t('create', 'stepLogo')}
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        {t('create', 'uploadLogo')}
      </Text>

      <Pressable onPress={pickLogo} style={styles.logoUploadArea}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.logoPreview} resizeMode="contain" />
        ) : (
          <View style={styles.logoPlaceholder}>
            <MaterialCommunityIcons name="image-plus" size={48} color="#555" />
            <Text style={styles.logoPlaceholderText}>{t('create', 'uploadLogo')}</Text>
          </View>
        )}
      </Pressable>

      {logoUri && (
        <Pressable
          onPress={() => setLogoUri(null)}
          style={styles.removeLogoBtn}
        >
          <MaterialCommunityIcons name="close-circle" size={18} color="#e8622c" />
          <Text style={styles.removeLogo}>{t('create', 'removeLogo')}</Text>
        </Pressable>
      )}
    </>
  );

  const renderStep3 = () => (
    <>
      <Text variant="headlineMedium" style={styles.title}>
        {t('create', 'stepLook')}
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        {t('create', 'livePreview')}
      </Text>

      {/* Live preview */}
      <FormPreviewCard
        formName={formName}
        logoUri={logoUri}
        backgroundColor={backgroundColor}
        textColor={textColor}
        backgroundImage={backgroundImage}
      />

      {/* Background color */}
      <Text style={styles.pickerLabel}>{t('create', 'backgroundColor')}</Text>
      <View style={styles.colorRow}>
        {PRESET_BG_COLORS.map(color => (
          <Pressable
            key={color}
            onPress={() => {
              setBackgroundColor(color);
            }}
            style={[
              styles.colorCircle,
              { backgroundColor: color },
              backgroundColor === color && styles.colorCircleActive,
            ]}
          >
            {backgroundColor === color && (
              <MaterialCommunityIcons
                name="check"
                size={16}
                color={color === '#ffffff' || color === '#f5f5f7' || color === '#fef3c7' ? '#000' : '#fff'}
              />
            )}
          </Pressable>
        ))}
      </View>

      {/* Text color */}
      <Text style={styles.pickerLabel}>{t('create', 'textColor')}</Text>
      <View style={styles.colorRow}>
        {PRESET_TEXT_COLORS.map(color => (
          <Pressable
            key={color}
            onPress={() => setTextColor(color)}
            style={[
              styles.colorCircle,
              { backgroundColor: color },
              textColor === color && styles.colorCircleActive,
            ]}
          >
            {textColor === color && (
              <MaterialCommunityIcons
                name="check"
                size={16}
                color={color === '#ffffff' ? '#000' : '#fff'}
              />
            )}
          </Pressable>
        ))}
      </View>

      {/* Background images */}
      <Text style={styles.pickerLabel}>{t('create', 'chooseBackground')}</Text>

      {/* Unsplash categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {UNSPLASH_CATEGORIES.map(cat => (
          <Pressable
            key={cat.key}
            onPress={() => fetchUnsplash(cat.key)}
            style={[
              styles.unsplashCatBtn,
              activeUnsplashCategory === cat.key && styles.unsplashCatBtnActive,
            ]}
          >
            <MaterialCommunityIcons
              name={cat.icon as any}
              size={18}
              color={activeUnsplashCategory === cat.key ? '#fff' : '#aaa'}
            />
            <Text
              style={[
                styles.unsplashCatText,
                activeUnsplashCategory === cat.key && styles.unsplashCatTextActive,
              ]}
            >
              {cat.key}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Gradient presets */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bgScroll}
        contentContainerStyle={styles.bgScrollContent}
      >
        {/* No background option */}
        <Pressable
          onPress={() => setBackgroundImage(null)}
          style={[
            styles.bgThumb,
            !backgroundImage && styles.bgThumbActive,
            { backgroundColor: '#2d2d44', alignItems: 'center', justifyContent: 'center' },
          ]}
        >
          <MaterialCommunityIcons name="close" size={20} color="#888" />
        </Pressable>
        {GRADIENT_PRESETS.map((url, i) => (
          <Pressable
            key={i}
            onPress={() => setBackgroundImage(url)}
            style={[styles.bgThumb, backgroundImage === url && styles.bgThumbActive]}
          >
            <Image source={{ uri: url }} style={styles.bgThumbImage} />
          </Pressable>
        ))}
      </ScrollView>

      {/* Unsplash results */}
      {unsplashLoading && (
        <ActivityIndicator size="small" color="#e8622c" style={{ marginVertical: 12 }} />
      )}

      {!unsplashLoading && unsplashPhotos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bgScroll}
          contentContainerStyle={styles.bgScrollContent}
        >
          {unsplashPhotos.map(photo => (
            <Pressable
              key={photo.id}
              onPress={() => setBackgroundImage(photo.urls.regular)}
              style={[
                styles.bgThumb,
                backgroundImage === photo.urls.regular && styles.bgThumbActive,
              ]}
            >
              <Image source={{ uri: photo.urls.thumb }} style={styles.bgThumbImage} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </>
  );

  const renderStep4 = () => (
    <>
      <Text variant="headlineMedium" style={styles.title}>
        {t('create', 'stepEmail')}
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        {t('create', 'notificationEmail')}
      </Text>

      <TextInput
        label={t('create', 'notificationEmail')}
        value={notificationEmail}
        onChangeText={handleNotificationEmailChange}
        onBlur={handleNotificationEmailBlur}
        mode="outlined"
        style={styles.input}
        textColor="#fff"
        outlineColor={notificationEmailError ? '#ef4444' : '#2d2d44'}
        activeOutlineColor={notificationEmailError ? '#ef4444' : '#e8622c'}
        error={!!notificationEmailError}
        theme={{ colors: { onSurfaceVariant: '#888', error: '#ef4444' } }}
        keyboardType="email-address"
        autoCapitalize="none"
        left={<TextInput.Icon icon="email-outline" color={notificationEmailError ? '#ef4444' : '#888'} />}
      />
      {notificationEmailError ? (
        <Text style={styles.emailError}>{notificationEmailError}</Text>
      ) : null}

      <TextInput
        label={t('create', 'senderName')}
        value={senderName}
        onChangeText={setSenderName}
        mode="outlined"
        style={styles.input}
        textColor="#fff"
        outlineColor="#2d2d44"
        activeOutlineColor="#e8622c"
        theme={{ colors: { onSurfaceVariant: '#888' } }}
        left={<TextInput.Icon icon="account-outline" color="#888" />}
      />

      <View style={styles.skipHint}>
        <MaterialCommunityIcons name="information-outline" size={16} color="#666" />
        <Text style={styles.skipHintText}>{t('create', 'skipStep')}</Text>
      </View>
    </>
  );

  const renderStep5 = () => (
    <>
      <Text variant="headlineMedium" style={styles.title}>
        {t('create', 'stepFields')}
      </Text>
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
                key={`${cat.titleKey}-${f.type}`}
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
    </>
  );

  // ── Render ──

  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress dots */}
      <ProgressDots current={step} total={TOTAL_STEPS} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {renderCurrentStep()}
      </ScrollView>

      {/* Bottom navigation */}
      <View style={styles.bottomBar}>
        <Pressable onPress={goBack} style={styles.backBtn}>
          <MaterialCommunityIcons
            name={step === 1 ? 'close' : 'arrow-left'}
            size={22}
            color="#ccc"
          />
          <Text style={styles.backBtnText}>
            {step === 1 ? t('create', 'cancel') : t('create', 'back')}
          </Text>
        </Pressable>

        {step < TOTAL_STEPS ? (
          <Pressable
            onPress={goNext}
            disabled={!canProceed()}
            style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
          >
            <Text style={[styles.nextBtnText, !canProceed() && styles.nextBtnTextDisabled]}>
              {step === 2 && !logoUri ? t('create', 'skipStep') : t('create', 'next')}
            </Text>
            <MaterialCommunityIcons
              name="arrow-right"
              size={20}
              color={canProceed() ? '#fff' : '#555'}
            />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => createForm.mutate()}
            disabled={fields.length === 0 || createForm.isPending}
            style={[
              styles.nextBtn,
              (fields.length === 0 || createForm.isPending) && styles.nextBtnDisabled,
            ]}
          >
            {createForm.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text
                  style={[
                    styles.nextBtnText,
                    fields.length === 0 && styles.nextBtnTextDisabled,
                  ]}
                >
                  {t('create', 'createForm')}
                </Text>
                <MaterialCommunityIcons
                  name="check"
                  size={20}
                  color={fields.length > 0 ? '#fff' : '#555'}
                />
              </>
            )}
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  content: { padding: 24, paddingBottom: 100 },

  // Progress dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },

  // Typography
  title: { color: '#fff', fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#888', marginBottom: 24 },
  sectionLabel: { color: '#fff', marginBottom: 4, fontWeight: '600' },
  sectionHint: { color: '#666', fontSize: 13, marginBottom: 12 },

  // Inputs
  input: { marginBottom: 16, backgroundColor: '#121220' },
  emailError: { color: '#ef4444', fontSize: 12, marginTop: -12, marginBottom: 12, marginLeft: 4 },

  // Groups / folders
  groupLabel: { color: '#ccc', marginBottom: 8 },
  groupChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  groupChip: { backgroundColor: '#2d2d44' },
  groupChipText: { color: '#ccc' },

  // Templates
  templateGrid: { gap: 12 },
  templateCard: {
    backgroundColor: '#1e1e2e',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  templateIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateTextCol: { flex: 1 },
  templateName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  templateDesc: { color: '#888', fontSize: 13, marginTop: 2 },

  // Step 2 – Logo
  logoUploadArea: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2d2d44',
    borderStyle: 'dashed',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  logoPreview: {
    width: '80%',
    height: '80%',
  },
  logoPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  logoPlaceholderText: {
    color: '#666',
    fontSize: 14,
  },
  removeLogoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginBottom: 16,
  },
  removeLogo: {
    color: '#e8622c',
    fontSize: 14,
  },

  // Step 3 – Colors
  pickerLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 16,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#2d2d44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleActive: {
    borderColor: '#e8622c',
    borderWidth: 3,
  },

  // Step 3 – Unsplash
  categoryScroll: { marginBottom: 12 },
  categoryScrollContent: { gap: 8, paddingRight: 16 },
  unsplashCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e1e2e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  unsplashCatBtnActive: {
    backgroundColor: '#e8622c',
    borderColor: '#e8622c',
  },
  unsplashCatText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  unsplashCatTextActive: {
    color: '#fff',
  },

  // Step 3 – Background thumbnails
  bgScroll: { marginBottom: 8 },
  bgScrollContent: { gap: 10, paddingRight: 16 },
  bgThumb: {
    width: 72,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#2d2d44',
  },
  bgThumbActive: {
    borderColor: '#e8622c',
    borderWidth: 3,
  },
  bgThumbImage: {
    width: '100%',
    height: '100%',
  },

  // Step 4 – Skip hint
  skipHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  skipHintText: {
    color: '#666',
    fontSize: 13,
  },

  // Step 5 – Fields
  addedFields: { gap: 6, marginBottom: 24 },
  addedChip: { backgroundColor: '#1e1e2e' },
  addedChipText: { color: '#fff' },
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categorySection: { marginBottom: 16 },
  categoryTitle: {
    color: '#e8622c',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 1,
  },
  fieldChip: { backgroundColor: '#2d2d44' },
  fieldChipText: { color: '#ccc' },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e1e2e',
    backgroundColor: '#121220',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  backBtnText: {
    color: '#ccc',
    fontSize: 15,
    fontWeight: '500',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e8622c',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  nextBtnDisabled: {
    backgroundColor: '#2d2d44',
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  nextBtnTextDisabled: {
    color: '#555',
  },
});
