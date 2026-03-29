import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, Pressable } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTranslation } from '@/src/translations';
import { useAppTheme } from '@/src/contexts/ThemeContext';

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
  const { colors } = useAppTheme();
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <Stack.Screen options={{ title: t('settings', 'profile'), headerBackTitle: t('auth', 'back') }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const inputProps = {
    mode: 'outlined' as const,
    textColor: colors.text,
    outlineColor: colors.border,
    activeOutlineColor: colors.accent,
    theme: { colors: { onSurfaceVariant: colors.textSecondary } },
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: t('settings', 'profile'), headerBackTitle: t('auth', 'back') }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Current avatar */}
        <View style={styles.avatarSection}>
          <Image
            source={{ uri: getAvatarUrl(avatarSeed) }}
            style={[styles.currentAvatar, { backgroundColor: colors.border }]}
          />
        </View>

        {/* Avatar grid */}
        <View style={[styles.avatarGrid, { backgroundColor: colors.surface }]}>
          {AVATAR_OPTIONS.map((seed) => (
            <Pressable
              key={seed}
              onPress={() => handleSelectAvatar(seed)}
              style={[
                styles.avatarOption,
                avatarSeed === seed && { borderColor: colors.accent },
              ]}
            >
              <Image
                source={{ uri: getAvatarUrl(seed) }}
                style={[styles.avatarOptionImage, { backgroundColor: colors.border }]}
              />
              {avatarSeed === seed && (
                <View style={[styles.checkBadge, { backgroundColor: colors.accent, borderColor: colors.surface }]}>
                  <MaterialCommunityIcons name="check" size={12} color={colors.text} />
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Personal information */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-outline" size={20} color={colors.accent} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings', 'personalInfo')}</Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{t('settings', 'personalInfoDesc')}</Text>

          <View style={styles.row}>
            <TextInput
              label={t('settings', 'firstName')}
              value={firstName}
              onChangeText={setFirstName}
              style={[styles.input, styles.halfInput, { backgroundColor: colors.surface }]}
              {...inputProps}
            />
            <TextInput
              label={t('settings', 'lastName')}
              value={lastName}
              onChangeText={setLastName}
              style={[styles.input, styles.halfInput, { backgroundColor: colors.surface }]}
              {...inputProps}
            />
          </View>
          <TextInput
            label={t('auth', 'email')}
            value={user?.email ?? ''}
            style={[styles.input, { backgroundColor: colors.surface }]}
            textColor={colors.textTertiary}
            outlineColor={colors.border}
            disabled
            mode="outlined"
            theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
            left={<TextInput.Icon icon="email-outline" />}
          />
          <TextInput
            label={t('settings', 'phone')}
            value={phone}
            onChangeText={setPhone}
            style={[styles.input, { backgroundColor: colors.surface }]}
            keyboardType="phone-pad"
            left={<TextInput.Icon icon="phone-outline" />}
            {...inputProps}
          />
        </View>

        {/* Address information */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.accent} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings', 'addressInfo')}</Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{t('settings', 'addressInfoDesc')}</Text>

          <TextInput
            label={t('settings', 'streetAddress')}
            value={address}
            onChangeText={setAddress}
            style={[styles.input, { backgroundColor: colors.surface }]}
            multiline
            numberOfLines={2}
            {...inputProps}
          />
          <View style={styles.row}>
            <TextInput
              label={t('settings', 'city')}
              value={city}
              onChangeText={setCity}
              style={[styles.input, styles.halfInput, { backgroundColor: colors.surface }]}
              {...inputProps}
            />
            <TextInput
              label={t('settings', 'postalCode')}
              value={postalCode}
              onChangeText={setPostalCode}
              style={[styles.input, styles.halfInput, { backgroundColor: colors.surface }]}
              keyboardType="number-pad"
              {...inputProps}
            />
          </View>
          <TextInput
            label={t('settings', 'country')}
            value={country}
            onChangeText={setCountry}
            style={[styles.input, { backgroundColor: colors.surface }]}
            {...inputProps}
          />
        </View>

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
          buttonColor={colors.accent}
          textColor={colors.text}
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
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
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
  avatarOptionImage: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  checkBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  card: {
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
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
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
