import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, List, Divider, Button, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

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

      {/* Account */}
      <List.Section>
        <List.Subheader style={styles.subheader}>Konto</List.Subheader>
        <List.Item
          title="Företag"
          description="Hantera företag och team"
          left={props => <List.Icon {...props} icon="domain" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => {}}
        />
        <List.Item
          title="Språk"
          description="Svenska"
          left={props => <List.Icon {...props} icon="translate" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => {}}
        />
      </List.Section>

      <Divider style={styles.divider} />

      {/* Notifications */}
      <List.Section>
        <List.Subheader style={styles.subheader}>Notiser</List.Subheader>
        <List.Item
          title="Push-notiser"
          description="Få notiser vid nya inskickningar"
          left={props => <List.Icon {...props} icon="bell-outline" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => {}}
        />
      </List.Section>

      <Divider style={styles.divider} />

      {/* About */}
      <List.Section>
        <List.Subheader style={styles.subheader}>Om</List.Subheader>
        <List.Item
          title="Öppna webbapp"
          description="rocketformspro.com"
          left={props => <List.Icon {...props} icon="open-in-new" color="#e8622c" />}
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDesc}
          onPress={() => {}}
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
