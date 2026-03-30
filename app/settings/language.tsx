import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { List, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useLanguage, LANGUAGES } from '@/src/contexts/LanguageContext';
import { useTranslation } from '@/src/translations';
import { useAppTheme } from '@/src/contexts/ThemeContext';

export default function LanguageScreen() {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: t('settings', 'language'), headerBackTitle: t('auth', 'back') }} />
      <ScrollView>
        <List.Section>
          <List.Subheader style={{ color: colors.textSecondary }}>{t('settings', 'chooseLanguage')}</List.Subheader>
          {LANGUAGES.map((lang, index) => (
            <React.Fragment key={lang.code}>
              <List.Item
                title={`${lang.flag}  ${lang.name}`}
                titleStyle={{ color: colors.text, fontSize: 17 }}
                onPress={() => setLanguage(lang.code)}
                right={() =>
                  language === lang.code ? (
                    <List.Icon icon="check" color={colors.accent} />
                  ) : null
                }
                style={[
                  styles.item,
                  language === lang.code && { backgroundColor: colors.surface },
                ]}
              />
              {index < LANGUAGES.length - 1 && (
                <Divider style={{ backgroundColor: colors.border }} />
              )}
            </React.Fragment>
          ))}
        </List.Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  item: {
    paddingVertical: 12,
  },
});
