import React from 'react';
import { View, StyleSheet, ScrollView, Linking, Image, Pressable } from 'react-native';
import { Text, List, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import Constants from 'expo-constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '@/src/translations';

const LINKS = [
  { icon: 'web', urlKey: 'website', url: 'https://rocketformspro.com' },
  { icon: 'email-outline', urlKey: 'support', url: 'mailto:support@rocketformspro.com' },
  { icon: 'shield-check-outline', urlKey: 'privacy', url: 'https://rocketformspro.com/privacy' },
  { icon: 'file-document-outline', urlKey: 'terms', url: 'https://rocketformspro.com/terms' },
];

export default function AboutScreen() {
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version || '1.0.0';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: t('about', 'title'), headerBackTitle: t('nav', 'back') }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Logo + name */}
        <View style={styles.logoSection}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.appName}>Rocket Forms Pro</Text>
          <Text style={styles.version}>{t('about', 'version')} {version}</Text>
          <Text style={styles.tagline}>{t('about', 'tagline')}</Text>
        </View>

        <Divider style={styles.divider} />

        {/* Links */}
        <List.Section>
          {LINKS.map(link => (
            <List.Item
              key={link.urlKey}
              title={t('about', link.urlKey)}
              description={link.url.replace('mailto:', '')}
              left={props => <List.Icon {...props} icon={link.icon} color="#e8622c" />}
              right={props => <List.Icon {...props} icon="open-in-new" color="#555" />}
              titleStyle={styles.linkTitle}
              descriptionStyle={styles.linkDesc}
              onPress={() => Linking.openURL(link.url)}
              style={styles.linkItem}
            />
          ))}
        </List.Section>

        <Divider style={styles.divider} />

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>{t('about', 'madeWith')}</Text>
          <View style={styles.techRow}>
            {['React Native', 'Expo', 'Supabase', 'TypeScript'].map(tech => (
              <View key={tech} style={styles.techBadge}>
                <Text style={styles.techText}>{tech}</Text>
              </View>
            ))}
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Credits */}
        <View style={styles.creditsSection}>
          <Text style={styles.credits}>{t('about', 'madeBy')}</Text>
          <Pressable onPress={() => Linking.openURL('https://omniwise.se')}>
            <Text style={styles.companyName}>OmniWise AB</Text>
          </Pressable>
          <Text style={styles.copyright}>© {new Date().getFullYear()} OmniWise AB</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  content: { padding: 24, paddingBottom: 40 },
  logoSection: { alignItems: 'center', paddingVertical: 20 },
  logo: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  appName: { color: '#fff', fontSize: 24, fontWeight: '700' },
  version: { color: '#888', fontSize: 14, marginTop: 4 },
  tagline: { color: '#666', fontSize: 13, marginTop: 8, textAlign: 'center' },
  divider: { backgroundColor: '#2d2d44', marginVertical: 16 },
  linkTitle: { color: '#fff' },
  linkDesc: { color: '#666', fontSize: 12 },
  linkItem: { paddingVertical: 4 },
  featuresSection: { alignItems: 'center' },
  featuresTitle: { color: '#888', fontSize: 13, marginBottom: 12 },
  techRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  techBadge: { backgroundColor: '#1e1e2e', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#2d2d44' },
  techText: { color: '#ccc', fontSize: 12 },
  creditsSection: { alignItems: 'center', paddingVertical: 8 },
  credits: { color: '#888', fontSize: 13 },
  companyName: { color: '#e8622c', fontSize: 16, fontWeight: '600', marginTop: 4 },
  copyright: { color: '#555', fontSize: 12, marginTop: 8 },
});
