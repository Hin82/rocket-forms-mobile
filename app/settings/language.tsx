import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { List, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const LANGUAGE_KEY = 'app_language';

interface LanguageOption {
  code: string;
  label: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: 'sv', label: 'Svenska', flag: '\u{1F1F8}\u{1F1EA}' },
  { code: 'en', label: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'no', label: 'Norsk', flag: '\u{1F1F3}\u{1F1F4}' },
  { code: 'da', label: 'Dansk', flag: '\u{1F1E9}\u{1F1F0}' },
  { code: 'fi', label: 'Suomi', flag: '\u{1F1EB}\u{1F1EE}' },
  { code: 'de', label: 'Deutsch', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'fr', label: 'Fran\u00e7ais', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'es', label: 'Espa\u00f1ol', flag: '\u{1F1EA}\u{1F1F8}' },
];

export default function LanguageScreen() {
  const [selected, setSelected] = useState('sv');

  useEffect(() => {
    SecureStore.getItemAsync(LANGUAGE_KEY).then(saved => {
      if (saved) setSelected(saved);
    });
  }, []);

  const handleSelect = (code: string) => {
    setSelected(code);
    SecureStore.setItemAsync(LANGUAGE_KEY, code);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Spr\u00e5k', headerBackTitle: 'Tillbaka' }} />
      <ScrollView>
        <List.Section>
          <List.Subheader style={styles.subheader}>V\u00e4lj spr\u00e5k</List.Subheader>
          {languages.map((lang, index) => (
            <React.Fragment key={lang.code}>
              <List.Item
                title={`${lang.flag}  ${lang.label}`}
                titleStyle={styles.itemTitle}
                onPress={() => handleSelect(lang.code)}
                right={() =>
                  selected === lang.code ? (
                    <List.Icon icon="check" color="#e8622c" />
                  ) : null
                }
                style={[
                  styles.item,
                  selected === lang.code && styles.selectedItem,
                ]}
              />
              {index < languages.length - 1 && (
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
