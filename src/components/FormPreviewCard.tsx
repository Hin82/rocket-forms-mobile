import React from 'react';
import { View, StyleSheet, Image, ImageBackground } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from '@/src/translations';

interface FormPreviewCardProps {
  formName: string;
  logoUri?: string | null;
  backgroundColor?: string;
  textColor?: string;
  backgroundImage?: string | null;
}

export default function FormPreviewCard({
  formName,
  logoUri,
  backgroundColor = '#ffffff',
  textColor = '#000000',
  backgroundImage,
}: FormPreviewCardProps) {
  const { t } = useTranslation();
  const content = (
    <View style={[styles.inner, { backgroundColor: backgroundImage ? 'transparent' : backgroundColor }]}>
      {logoUri && (
        <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="contain" />
      )}
      <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
        {formName || t('create', 'newForm')}
      </Text>

      {/* Placeholder fields */}
      <View style={[styles.field, { borderColor: textColor + '30' }]}>
        <View style={[styles.fieldLabel, { backgroundColor: textColor + '15' }]} />
        <View style={[styles.fieldInput, { borderColor: textColor + '25' }]} />
      </View>
      <View style={[styles.field, { borderColor: textColor + '30' }]}>
        <View style={[styles.fieldLabel, { backgroundColor: textColor + '15', width: '40%' }]} />
        <View style={[styles.fieldInput, { borderColor: textColor + '25' }]} />
      </View>

      {/* Submit button placeholder */}
      <View style={styles.submitBtn}>
        <Text style={styles.submitText}>{t('fieldEditor', 'defaultSubmitButton')}</Text>
      </View>
    </View>
  );

  if (backgroundImage) {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={{ uri: backgroundImage }}
          style={styles.bgImage}
          imageStyle={styles.bgImageInner}
          resizeMode="cover"
        >
          {content}
        </ImageBackground>
      </View>
    );
  }

  return <View style={styles.container}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  bgImage: { width: '100%' },
  bgImageInner: { borderRadius: 16 },
  inner: {
    padding: 20,
    borderRadius: 16,
    minHeight: 200,
  },
  logo: {
    width: 60,
    height: 30,
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  field: {
    marginBottom: 10,
  },
  fieldLabel: {
    width: '30%',
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  fieldInput: {
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
  },
  submitBtn: {
    backgroundColor: '#e8622c',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
