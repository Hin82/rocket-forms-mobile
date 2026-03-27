import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../translations';

interface FormVersion {
  id: string;
  form_id: string;
  version_number: number;
  fields: any[];
  settings: any;
  description: string | null;
  created_at: string;
}

interface VersionHistorySheetProps {
  visible: boolean;
  onClose: () => void;
  formId: string;
  onRestore: (fields: any[], settings: any) => void;
}

function groupByDate(versions: FormVersion[]): Record<string, FormVersion[]> {
  const groups: Record<string, FormVersion[]> = {};
  for (const v of versions) {
    const date = new Date(v.created_at).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(v);
  }
  return groups;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function VersionHistorySheet({
  visible,
  onClose,
  formId,
  onRestore,
}: VersionHistorySheetProps) {
  const snapPoints = useMemo(() => ['80%'], []);
  const [versions, setVersions] = useState<FormVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('form_versions')
          .select('*')
          .eq('form_id', formId)
          .order('created_at', { ascending: false })
          .limit(20);
        if (fetchError) throw fetchError;
        if (!cancelled) {
          setVersions((data as FormVersion[]) || []);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, formId]);

  const handleRestore = useCallback(
    (version: FormVersion) => {
      Alert.alert(
        t('versionHistory', 'restoreTitle'),
        t('versionHistory', 'restoreConfirm').replace('{version}', String(version.version_number)),
        [
          { text: t('versionHistory', 'cancel'), style: 'cancel' },
          {
            text: t('versionHistory', 'restore'),
            style: 'destructive',
            onPress: () => {
              onRestore(version.fields, version.settings);
              onClose();
            },
          },
        ],
      );
    },
    [onRestore, onClose, t],
  );

  if (!visible) return null;

  const grouped = groupByDate(versions);
  const dateKeys = Object.keys(grouped);

  return (
    <BottomSheet
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('versionHistory', 'title')}</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#e8622c" />
            <Text style={styles.loadingText}>{t('versionHistory', 'loadingVersions')}</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <MaterialCommunityIcons name="alert-circle-outline" size={36} color="#cc3333" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : versions.length === 0 ? (
          <View style={styles.centered}>
            <MaterialCommunityIcons name="history" size={48} color="#2d2d44" />
            <Text style={styles.emptyTitle}>{t('versionHistory', 'noVersions')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('versionHistory', 'versionsAutoCreated')}
            </Text>
          </View>
        ) : (
          dateKeys.map((dateLabel) => (
            <View key={dateLabel} style={styles.dateGroup}>
              <Text style={styles.dateLabel}>{dateLabel}</Text>
              {grouped[dateLabel].map((version) => (
                <View key={version.id} style={styles.versionCard}>
                  <View style={styles.versionInfo}>
                    <View style={styles.versionHeader}>
                      <Text style={styles.versionNumber}>
                        {t('versionHistory', 'version')} {version.version_number}
                      </Text>
                      <Text style={styles.versionTime}>
                        {formatTime(version.created_at)}
                      </Text>
                    </View>
                    {version.description ? (
                      <Text style={styles.versionDesc} numberOfLines={2}>
                        {version.description}
                      </Text>
                    ) : (
                      <Text style={styles.versionDescMuted}>
                        {version.fields?.length || 0} {t('versionHistory', 'fields')}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.restoreBtn}
                    onPress={() => handleRestore(version)}
                  >
                    <MaterialCommunityIcons name="restore" size={18} color="#e8622c" />
                    <Text style={styles.restoreBtnText}>{t('versionHistory', 'restore')}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: '#1e1e2e' },
  handleIndicator: { backgroundColor: '#555', width: 40 },
  content: { padding: 20, paddingBottom: 40 },

  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },

  centered: { alignItems: 'center', paddingTop: 40, gap: 12 },
  loadingText: { color: '#888', fontSize: 14 },
  errorText: { color: '#cc3333', fontSize: 14, textAlign: 'center' },
  emptyTitle: { color: '#888', fontSize: 18, fontWeight: '600' },
  emptySubtitle: { color: '#555', fontSize: 14, textAlign: 'center', maxWidth: 260 },

  dateGroup: { marginBottom: 20 },
  dateLabel: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  versionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121220',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  versionInfo: { flex: 1 },
  versionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  versionNumber: { color: '#fff', fontSize: 15, fontWeight: '600' },
  versionTime: { color: '#666', fontSize: 12 },
  versionDesc: { color: '#aaa', fontSize: 13, marginTop: 4 },
  versionDescMuted: { color: '#555', fontSize: 13, marginTop: 4 },

  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8622c',
    marginLeft: 12,
  },
  restoreBtnText: { color: '#e8622c', fontWeight: '600', fontSize: 13 },
});
