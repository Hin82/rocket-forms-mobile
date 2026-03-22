import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, Pressable } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTranslation } from '@/src/translations';
const AVATAR_OPTIONS = [
  'Alex', 'Sarah', 'David', 'Emma', 'Michael', 'Lisa', 'James', 'Sophie',
  'Ryan', 'Olivia', 'Daniel', 'Emily', 'Matthew', 'Jessica', 'Chris', 'Anna',
];

function getAvatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('default');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const meta = currentUser?.user_metadata ?? {};
      setFirstName(meta.first_name ?? '');
      setLastName(meta.last_name ?? '');
      setPhone(meta.phone ?? '');

      // Load avatar_seed from profiles table (same as web app)
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_seed')
        .eq('id', currentUser!.id)
        .single();

      if (profile?.avatar_seed) {
        setAvatarSeed(profile.avatar_seed);
      }
    } catch (err: any) {
      Alert.alert(t('settings', 'error'), err.message ?? t('settings', 'couldNotLoadProfile'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAvatar = async (seed: string) => {
    setAvatarSeed(seed);
    try {
      await supabase
        .from('profiles')
        .update({ avatar_seed: seed })
        .eq('id', user!.id);
    } catch {
      // Silently fail - will be saved with next profile save
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

      // Also save avatar_seed to profiles
      await supabase
        .from('profiles')
        .update({ avatar_seed: avatarSeed })
        .eq('id', user!.id);

      Alert.alert(t('settings', 'saved'), t('settings', 'profileUpdated'));
    } catch (err: any) {
      Alert.alert(t('settings', 'error'), err.message ?? t('settings', 'couldNotSaveProfile'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: t('settings', 'profile'), headerBackTitle: t('auth', 'back') }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e8622c" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: t('settings', 'profile'), headerBackTitle: t('auth', 'back') }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Current avatar */}
        <View style={styles.avatarSection}>
          <Image
            source={{ uri: getAvatarUrl(avatarSeed) }}
            style={styles.currentAvatar}
          />
        </View>

        {/* Avatar grid */}
        <View style={styles.avatarGrid}>
          {AVATAR_OPTIONS.map((seed) => (
            <Pressable
              key={seed}
              onPress={() => handleSelectAvatar(seed)}
              style={[
                styles.avatarOption,
                avatarSeed === seed && styles.avatarOptionSelected,
              ]}
            >
              <Image
                source={{ uri: getAvatarUrl(seed) }}
                style={styles.avatarOptionImage}
              />
              {avatarSeed === seed && (
                <View style={styles.checkBadge}>
                  <MaterialCommunityIcons name="check" size={12} color="#fff" />
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <TextInput
            label={t('settings', 'firstName')}
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
            label={t('settings', 'lastName')}
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
            label={t('auth', 'email')}
            value={user?.email ?? ''}
            mode="outlined"
            style={styles.input}
            textColor="#666"
            outlineColor="#2d2d44"
            disabled
            theme={{ colors: { onSurfaceVariant: '#888' } }}
          />
          <TextInput
            label={t('settings', 'phone')}
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
          {t('settings', 'saveChanges')}
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  currentAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#2d2d44',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    padding: 16,
  },
  avatarOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: '#e8622c',
  },
  avatarOptionImage: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    backgroundColor: '#2d2d44',
  },
  checkBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#e8622c',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1e1e2e',
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
