import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { List, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useLanguage, LANGUAGES } from '@/src/contexts/LanguageContext';
import { useTranslation } from '@/src/translations';

export default function LanguageScreen() {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: t('settings', 'language'), headerBackTitle: t('auth', 'back') }} />
      <ScrollView>
        <List.Section>
          <List.Subheader style={styles.subheader}>{t('settings', 'chooseLanguage')}</List.Subheader>
          {LANGUAGES.map((lang, index) => (
            <React.Fragment key={lang.code}>
              <List.Item
                title={`${lang.flag}  ${lang.name}`}
                titleStyle={styles.itemTitle}
                onPress={() => setLanguage(lang.code)}
                right={() =>
                  language === lang.code ? (
                    <List.Icon icon="check" color="#e8622c" />
                  ) : null
                }
                style={[
                  styles.item,
                  language === lang.code && styles.selectedItem,
                ]}
              />
              {index < LANGUAGES.length - 1 && (
                <Divider style={styles.divider} />
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
    backgroundColor: '#121220',
  },
  subheader: {
    color: '#888',
  },
  item: {
    paddingVertical: 12,
  },
  selectedItem: {
    backgroundColor: '#1e1e2e',
  },
  itemTitle: {
    color: '#fff',
    fontSize: 17,
  },
  divider: {
    backgroundColor: '#2d2d44',
  },
});
