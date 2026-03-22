import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';

export default function ProfileScreen() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      if (error) throw error;

      const meta = currentUser?.user_metadata ?? {};
      setFirstName(meta.first_name ?? '');
      setLastName(meta.last_name ?? '');
      setPhone(meta.phone ?? '');
    } catch (err: any) {
      Alert.alert('Fel', err.message ?? 'Kunde inte ladda profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
        },
      });
      if (error) throw error;
      Alert.alert('Sparat', 'Din profil har uppdaterats.');
    } catch (err: any) {
      Alert.alert('Fel', err.message ?? 'Kunde inte spara profil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Profil', headerBackTitle: 'Tillbaka' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e8622c" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Profil', headerBackTitle: 'Tillbaka' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <TextInput
            label="Förnamn"
            value={firstName}
            onChangeText={setFirstName}
            mode="outlined"
            style={styles.input}
            textColor="#fff"
            outlineColor="#2d2d44"
            activeOutlineColor="#e8622c"
            theme={{ colors: { onSurfaceVariant: '#888' } }}
          />
          <TextInput
            label="Efternamn"
            value={lastName}
            onChangeText={setLastName}
            mode="outlined"
            style={styles.input}
            textColor="#fff"
            outlineColor="#2d2d44"
            activeOutlineColor="#e8622c"
            theme={{ colors: { onSurfaceVariant: '#888' } }}
          />
          <TextInput
            label="E-post"
            value={user?.email ?? ''}
            mode="outlined"
            style={styles.input}
            textColor="#666"
            outlineColor="#2d2d44"
            disabled
            theme={{ colors: { onSurfaceVariant: '#888' } }}
          />
          <TextInput
            label="Telefon"
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            style={styles.input}
            textColor="#fff"
            outlineColor="#2d2d44"
            activeOutlineColor="#e8622c"
            keyboardType="phone-pad"
            theme={{ colors: { onSurfaceVariant: '#888' } }}
          />
        </View>

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
          buttonColor="#e8622c"
          textColor="#fff"
          icon="content-save"
        >
          Spara ändringar
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121220',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  input: {
    backgroundColor: '#1e1e2e',
  },
  saveButton: {
    marginTop: 24,
    borderRadius: 12,
    paddingVertical: 4,
  },
});
