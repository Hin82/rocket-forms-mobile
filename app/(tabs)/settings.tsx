import React from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { Text, List, Divider, Button, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = () => {
    Alert.alert('Logga ut', 'Vill du logga ut?', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Logga ut', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile section */}
      <View style={styles.profileSection}>
        <Avatar.Icon size={64} icon="account" style={styles.avatar} />
        <Text variant="titleMedium" style={styles.email}>{user?.email}</Text>
      </View>

      <Divider style={styles.divider} />

      {/* Konto */}
      <List.Section>
        <List.Subheader style={styles.subheader}>Konto</List.Subheader>
        <List.Item
          title="Profil"
          description="Hantera din profil"
          left={props => <List.Icon {...props} icon="account-outline" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => router.push('/settings/profile')}
        />
        <List.Item
          title="F\u00f6retag"
          description="Hantera f\u00f6retag och team"
          left={props => <List.Icon {...props} icon="domain" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => router.push('/settings/company')}
        />
        <List.Item
          title="Spr\u00e5k"
          description="Svenska"
          left={props => <List.Icon {...props} icon="translate" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => router.push('/settings/language')}
        />
      </List.Section>

      <Divider style={styles.divider} />

      {/* Notiser */}
      <List.Section>
        <List.Subheader style={styles.subheader}>Notiser</List.Subheader>
        <List.Item
          title="Notis-inst\u00e4llningar"
          description="Hantera push-notiser"
          left={props => <List.Icon {...props} icon="bell-outline" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => router.push('/settings/notifications-preferences')}
        />
      </List.Section>

      <Divider style={styles.divider} />

      {/* Prenumeration */}
      <List.Section>
        <List.Subheader style={styles.subheader}>Prenumeration</List.Subheader>
        <List.Item
          title="Min prenumeration"
          description="Hantera din plan"
          left={props => <List.Icon {...props} icon="credit-card-outline" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => router.push('/settings/subscription')}
        />
      </List.Section>

      <Divider style={styles.divider} />

      {/* Integrationer */}
      <List.Section>
        <List.Subheader style={styles.subheader}>Integrationer</List.Subheader>
        <List.Item
          title="API-nycklar"
          description="Hantera API-\u00e5tkomst"
          left={props => <List.Icon {...props} icon="key-outline" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => router.push('/settings/api-keys')}
        />
        <List.Item
          title="E-postkonfiguration"
          description="SMTP och e-postmallar"
          left={props => <List.Icon {...props} icon="email-outline" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => router.push('/settings/email-setup')}
        />
        <List.Item
          title="Dom\u00e4ner"
          description="Anpassade dom\u00e4ner"
          left={props => <List.Icon {...props} icon="web" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => router.push('/settings/domains')}
        />
      </List.Section>

      <Divider style={styles.divider} />

      {/* Om */}
      <List.Section>
        <List.Subheader style={styles.subheader}>Om</List.Subheader>
        <List.Item
          title="\u00d6ppna webbapp"
          description="rocketformspro.com"
          left={props => <List.Icon {...props} icon="open-in-new" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => Linking.openURL('https://rocketformspro.com')}
        />
        <List.Item
          title="Version"
          description="1.0.0"
          left={props => <List.Icon {...props} icon="information-outline" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
        />
      </List.Section>

      <Button
        mode="outlined"
        onPress={handleSignOut}
        style={styles.signOutButton}
        textColor="#ef4444"
        icon="logout"
      >
        Logga ut
      </Button>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  profileSection: { alignItems: 'center', paddingVertical: 32 },
  avatar: { backgroundColor: '#2d2d44' },
  email: { color: '#fff', marginTop: 12 },
  divider: { backgroundColor: '#2d2d44' },
  subheader: { color: '#888' },
  itemTitle: { color: '#fff' },
  itemDesc: { color: '#888' },
  signOutButton: {
    marginHorizontal: 16,
    marginTop: 24,
    borderColor: '#ef4444',
    borderRadius: 12,
  },
});
