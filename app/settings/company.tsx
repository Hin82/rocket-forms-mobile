import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, TextInput as RNTextInput } from 'react-native';
import {
  Text,
  Button,
  Card,
  ActivityIndicator,
  Chip,
  Divider,
  IconButton,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTranslation } from '@/src/translations';

interface Company {
  id: string;
  name: string;
  role: string;
  member_count: number;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export default function CompanyScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitingCompanyId, setInvitingCompanyId] = useState<string | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('company_memberships')
        .select(`role, companies (id, name)`)
        .eq('user_id', user!.id);

      if (error) throw error;

      const companiesWithCounts: Company[] = [];
      for (const membership of data ?? []) {
        const company = (membership as any).companies;
        if (!company) continue;

        const { count } = await supabase
          .from('company_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id);

        companiesWithCounts.push({
          id: company.id,
          name: company.name,
          role: membership.role,
          member_count: count ?? 0,
        });
      }

      setCompanies(companiesWithCounts);
    } catch (err: any) {
      Alert.alert(t('settings', 'error'), err.message ?? t('settings', 'couldNotLoadCompanies'));
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (companyId: string) => {
    setMembersLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_memberships')
        .select('id, user_id, role')
        .eq('company_id', companyId);

      if (error) throw error;

      // Look up user profiles separately
      const userIds = (data ?? []).map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);

      const profileMap: Record<string, any> = {};
      (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p; });

      const mapped: Member[] = (data ?? []).map((m: any) => {
        const profile = profileMap[m.user_id];
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          email: profile?.email ?? '?',
          first_name: profile?.first_name ?? null,
          last_name: profile?.last_name ?? null,
        };
      });

      setMembers(mapped);
    } catch (err: any) {
      Alert.alert(t('settings', 'error'), err.message ?? t('settings', 'couldNotLoadMembers'));
    } finally {
      setMembersLoading(false);
    }
  };

  const handleToggleExpand = (companyId: string) => {
    if (expandedId === companyId) {
      setExpandedId(null);
      setMembers([]);
    } else {
      setExpandedId(companyId);
      loadMembers(companyId);
    }
  };

  const handleCreateCompany = async () => {
    const name = newCompanyName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({ name })
        .select()
        .single();

      if (companyError) throw companyError;

      const { error: memberError } = await supabase
        .from('company_memberships')
        .insert({ company_id: company.id, user_id: user!.id, role: 'admin' });

      if (memberError) throw memberError;

      setNewCompanyName('');
      setShowCreateInput(false);
      Alert.alert(t('settings', 'done'), t('settings', 'companyCreated', { name }));
      loadCompanies();
    } catch (err: any) {
      Alert.alert(t('settings', 'error'), err.message ?? t('settings', 'couldNotCreateCompany'));
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (companyId: string) => {
    const email = inviteEmail.trim();
    if (!email) return;

    try {
      const { error } = await supabase.from('company_invitations').insert({
        company_id: companyId,
        email,
        invited_by: user!.id,
      });

      if (error) throw error;

      setInviteEmail('');
      setInvitingCompanyId(null);
      Alert.alert(t('settings', 'done'), t('settings', 'inviteSent', { email }));
    } catch (err: any) {
      Alert.alert(t('settings', 'error'), err.message ?? t('settings', 'couldNotSendInvite'));
    }
  };

  const handleRemoveMember = (membershipId: string, memberEmail: string) => {
    Alert.alert(
      t('settings', 'removeMember'),
      t('settings', 'removeMemberConfirm', { email: memberEmail }),
      [
        { text: t('settings', 'cancel'), style: 'cancel' },
        {
          text: t('settings', 'remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('company_memberships')
                .delete()
                .eq('id', membershipId);

              if (error) throw error;

              setMembers((prev) => prev.filter((m) => m.id !== membershipId));
              loadCompanies();
            } catch (err: any) {
              Alert.alert(t('settings', 'error'), err.message ?? t('settings', 'couldNotRemoveMember'));
            }
          },
        },
      ],
    );
  };

  const handleDeleteCompany = (companyId: string, companyName: string) => {
    Alert.alert(
      t('settings', 'removeCompany'),
      t('settings', 'deleteCompanyConfirm', { name: companyName }),
      [
        { text: t('settings', 'cancel'), style: 'cancel' },
        {
          text: t('settings', 'delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('companies')
                .delete()
                .eq('id', companyId);

              if (error) throw error;

              setExpandedId(null);
              Alert.alert(t('settings', 'done'), t('settings', 'companyDeleted'));
              loadCompanies();
            } catch (err: any) {
              Alert.alert(t('settings', 'error'), err.message ?? t('settings', 'couldNotDeleteCompany'));
            }
          },
        },
      ],
    );
  };

  const isAdmin = (companyId: string) => {
    return companies.find((c) => c.id === companyId)?.role === 'admin';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: t('settings', 'company'), headerBackTitle: t('auth', 'back') }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e8622c" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: t('settings', 'company'), headerBackTitle: t('auth', 'back') }} />
      <ScrollView contentContainerStyle={styles.content}>
        {companies.length === 0 && (
          <Text style={styles.emptyText}>{t('settings', 'noCompanies')}</Text>
        )}

        {companies.map((company) => (
          <Card
            key={company.id}
            style={styles.card}
            onPress={() => handleToggleExpand(company.id)}
          >
            <Card.Title
              title={company.name}
              titleStyle={styles.cardTitle}
              subtitle={`${company.member_count} ${company.member_count !== 1 ? t('settings', 'members').toLowerCase() : t('settings', 'member').toLowerCase()}`}
              subtitleStyle={styles.cardSubtitle}
              right={() => (
                <Chip
                  style={[styles.roleBadge, company.role === 'admin' && styles.adminBadge]}
                  textStyle={styles.roleBadgeText}
                >
                  {company.role === 'admin' ? t('settings', 'admin') : t('settings', 'member')}
                </Chip>
              )}
            />

            {expandedId === company.id && (
              <Card.Content style={styles.expandedContent}>
                <Divider style={styles.divider} />

                {membersLoading ? (
                  <ActivityIndicator size="small" color="#e8622c" style={{ marginVertical: 16 }} />
                ) : (
                  <>
                    <Text style={styles.sectionLabel}>{t('settings', 'members')}</Text>
                    {members.map((member) => (
                      <View key={member.id} style={styles.memberRow}>
                        <View style={styles.memberInfo}>
                          <Text style={styles.memberName}>
                            {member.first_name || member.last_name
                              ? `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim()
                              : member.email}
                          </Text>
                          {(member.first_name || member.last_name) && (
                            <Text style={styles.memberEmail}>{member.email}</Text>
                          )}
                        </View>
                        <Chip
                          style={[styles.memberRoleBadge, member.role === 'admin' && styles.adminBadge]}
                          textStyle={styles.roleBadgeText}
                        >
                          {member.role === 'admin' ? t('settings', 'admin') : t('settings', 'member')}
                        </Chip>
                        {isAdmin(company.id) && member.user_id !== user!.id && (
                          <IconButton
                            icon="close"
                            size={18}
                            iconColor="#ef4444"
                            onPress={() => handleRemoveMember(member.id, member.email)}
                          />
                        )}
                      </View>
                    ))}

                    {isAdmin(company.id) && (
                      <>
                        <Divider style={[styles.divider, { marginTop: 12 }]} />

                        {invitingCompanyId === company.id ? (
                          <View style={styles.inviteRow}>
                            <TextInput
                              label={t('settings', 'emailAddress')}
                              value={inviteEmail}
                              onChangeText={setInviteEmail}
                              mode="outlined"
                              style={styles.inviteInput}
                              textColor="#fff"
                              outlineColor="#2d2d44"
                              activeOutlineColor="#e8622c"
                              keyboardType="email-address"
                              autoCapitalize="none"
                              theme={{ colors: { onSurfaceVariant: '#888' } }}
                            />
                            <Button
                              mode="contained"
                              onPress={() => handleInvite(company.id)}
                              buttonColor="#e8622c"
                              textColor="#fff"
                              compact
                              style={styles.inviteSendButton}
                            >
                              {t('settings', 'sendInvite')}
                            </Button>
                            <IconButton
                              icon="close"
                              size={20}
                              iconColor="#888"
                              onPress={() => {
                                setInvitingCompanyId(null);
                                setInviteEmail('');
                              }}
                            />
                          </View>
                        ) : (
                          <Button
                            mode="outlined"
                            icon="email-plus"
                            onPress={() => setInvitingCompanyId(company.id)}
                            style={styles.actionButton}
                            textColor="#e8622c"
                          >
                            {t('settings', 'invite')}
                          </Button>
                        )}

                        <Button
                          mode="outlined"
                          icon="delete"
                          onPress={() => handleDeleteCompany(company.id, company.name)}
                          style={[styles.actionButton, { borderColor: '#ef4444' }]}
                          textColor="#ef4444"
                        >
                          {t('settings', 'removeCompany')}
                        </Button>
                      </>
                    )}
                  </>
                )}
              </Card.Content>
            )}
          </Card>
        ))}

        <Divider style={[styles.divider, { marginVertical: 16 }]} />

        {showCreateInput ? (
          <View style={styles.createSection}>
            <TextInput
              label={t('settings', 'companyName')}
              value={newCompanyName}
              onChangeText={setNewCompanyName}
              mode="outlined"
              style={styles.createInput}
              textColor="#fff"
              outlineColor="#2d2d44"
              activeOutlineColor="#e8622c"
              theme={{ colors: { onSurfaceVariant: '#888' } }}
            />
            <View style={styles.createButtons}>
              <Button
                mode="contained"
                onPress={handleCreateCompany}
                loading={creating}
                disabled={creating || !newCompanyName.trim()}
                buttonColor="#e8622c"
                textColor="#fff"
                style={{ flex: 1 }}
              >
                {t('settings', 'create')}
              </Button>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowCreateInput(false);
                  setNewCompanyName('');
                }}
                textColor="#888"
                style={{ flex: 1 }}
              >
                {t('settings', 'cancel')}
              </Button>
            </View>
          </View>
        ) : (
          <Button
            mode="contained"
            icon="plus"
            onPress={() => setShowCreateInput(true)}
            style={styles.createButton}
            buttonColor="#e8622c"
            textColor="#fff"
          >
            {t('settings', 'createNewCompany')}
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 32, fontSize: 16 },
  card: { backgroundColor: '#1e1e2e', marginBottom: 12, borderRadius: 12 },
  cardTitle: { color: '#fff' },
  cardSubtitle: { color: '#888' },
  roleBadge: { backgroundColor: '#2d2d44', marginRight: 12 },
  adminBadge: { backgroundColor: '#e8622c33' },
  roleBadgeText: { color: '#fff', fontSize: 12 },
  memberRoleBadge: { backgroundColor: '#2d2d44' },
  expandedContent: { paddingBottom: 16 },
  divider: { backgroundColor: '#2d2d44' },
  sectionLabel: { color: '#888', fontSize: 13, marginTop: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  memberInfo: { flex: 1 },
  memberName: { color: '#fff', fontSize: 15 },
  memberEmail: { color: '#888', fontSize: 13 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  inviteInput: { flex: 1, backgroundColor: '#1e1e2e' },
  inviteSendButton: { borderRadius: 8 },
  actionButton: { marginTop: 8, borderColor: '#2d2d44', borderRadius: 8 },
  createSection: { backgroundColor: '#1e1e2e', borderRadius: 12, padding: 16, gap: 12 },
  createInput: { backgroundColor: '#1e1e2e' },
  createButtons: { flexDirection: 'row', gap: 12 },
  createButton: { borderRadius: 12, paddingVertical: 4 },
});
