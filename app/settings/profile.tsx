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
  return `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}`;
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('default');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user?.id]);

  const loadProfile = async () => {
    try {
      if (!user) return;

      // Load from profiles table (same as web app)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (profile) {
        setFirstName(profile.first_name ?? '');
        setLastName(profile.last_name ?? '');
        setPhone(profile.phone ?? '');
        setAddress(profile.address ?? '');
        setCity(profile.city ?? '');
        setPostalCode(profile.postal_code ?? '');
        setCountry(profile.country ?? '');
        if (profile.avatar_seed) setAvatarSeed(profile.avatar_seed);
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
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user!.id, avatar_seed: seed });
      if (error) {
        console.warn(`Avatar save failed for user ${user!.id} seed=${seed}:`, error.message);
      }
    } catch (err: any) {
      console.warn('Avatar save threw unexpectedly:', err?.message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert to profiles table (same as web app)
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user!.id,
          email: user?.email ?? null,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim(),
          postal_code: postalCode.trim(),
          country: country.trim(),
          avatar_seed: avatarSeed,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;

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

  const inputProps = {
    mode: 'outlined' as const,
    textColor: '#fff',
    outlineColor: '#2d2d44',
    activeOutlineColor: '#e8622c',
    theme: { colors: { onSurfaceVariant: '#888' } },
  };

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

        {/* Personal information */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-outline" size={20} color="#e8622c" />
            <Text style={styles.sectionTitle}>{t('settings', 'personalInfo')}</Text>
          </View>
          <Text style={styles.sectionSubtitle}>{t('settings', 'personalInfoDesc')}</Text>

          <View style={styles.row}>
            <TextInput
              label={t('settings', 'firstName')}
              value={firstName}
              onChangeText={setFirstName}
              style={[styles.input, styles.halfInput]}
              {...inputProps}
            />
            <TextInput
              label={t('settings', 'lastName')}
              value={lastName}
              onChangeText={setLastName}
              style={[styles.input, styles.halfInput]}
              {...inputProps}
            />
          </View>
          <TextInput
            label={t('auth', 'email')}
            value={user?.email ?? ''}
            style={styles.input}
            textColor="#666"
            outlineColor="#2d2d44"
            disabled
            mode="outlined"
            theme={{ colors: { onSurfaceVariant: '#888' } }}
            left={<TextInput.Icon icon="email-outline" />}
          />
          <TextInput
            label={t('settings', 'phone')}
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            keyboardType="phone-pad"
            left={<TextInput.Icon icon="phone-outline" />}
            {...inputProps}
          />
        </View>

        {/* Address information */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="map-marker-outline" size={20} color="#e8622c" />
            <Text style={styles.sectionTitle}>{t('settings', 'addressInfo')}</Text>
          </View>
          <Text style={styles.sectionSubtitle}>{t('settings', 'addressInfoDesc')}</Text>

          <TextInput
            label={t('settings', 'streetAddress')}
            value={address}
            onChangeText={setAddress}
            style={styles.input}
            multiline
            numberOfLines={2}
            {...inputProps}
          />
          <View style={styles.row}>
            <TextInput
              label={t('settings', 'city')}
              value={city}
              onChangeText={setCity}
              style={[styles.input, styles.halfInput]}
              {...inputProps}
            />
            <TextInput
              label={t('settings', 'postalCode')}
              value={postalCode}
              onChangeText={setPostalCode}
              style={[styles.input, styles.halfInput]}
              keyboardType="number-pad"
              {...inputProps}
            />
          </View>
          <TextInput
            label={t('settings', 'country')}
            value={country}
            onChangeText={setCountry}
            style={styles.input}
            {...inputProps}
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
    paddingBottom: 40,
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
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: '#888',
    fontSize: 13,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    backgroundColor: '#1e1e2e',
  },
  halfInput: {
    flex: 1,
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 4,
  },
});
