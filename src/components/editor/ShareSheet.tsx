import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  formId: string;
  formName: string;
}

export default function ShareSheet({
  visible,
  onClose,
  formId,
  formName,
}: ShareSheetProps) {
  const snapPoints = useMemo(() => ['75%'], []);
  const formUrl = `https://rocketformspro.com/form/${formId}`;
  const embedCode = `<iframe src="${formUrl}" width="100%" height="600" frameborder="0" style="border:none;"></iframe>`;

  const handleCopyLink = useCallback(async () => {
    await Clipboard.setStringAsync(formUrl);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [formUrl]);

  const handleCopyEmbed = useCallback(async () => {
    await Clipboard.setStringAsync(embedCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [embedCode]);

  const handleNativeShare = useCallback(async () => {
    try {
      await Share.share({
        title: formName,
        message: `Fyll i formular: ${formName}\n${formUrl}`,
        url: formUrl,
      });
    } catch {
      // User cancelled
    }
  }, [formUrl, formName]);

  if (!visible) return null;

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
        <Text style={styles.title}>Dela formular</Text>

        {/* Public URL */}
        <Text style={styles.sectionLabel}>Publik lank</Text>
        <View style={styles.urlBox}>
          <Text style={styles.urlText} numberOfLines={2} selectable>
            {formUrl}
          </Text>
        </View>
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleCopyLink}>
            <MaterialCommunityIcons name="content-copy" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Kopiera lank</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleNativeShare}>
            <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Dela</Text>
          </TouchableOpacity>
        </View>

        {/* QR Code */}
        <Text style={styles.sectionLabel}>QR-kod</Text>
        <View style={styles.qrPlaceholder}>
          <MaterialCommunityIcons name="qrcode" size={48} color="#555" />
          <Text style={styles.qrUrl} numberOfLines={1}>{formUrl}</Text>
          <Text style={styles.qrNote}>QR-kodgenerering kommer i nasta version</Text>
        </View>

        {/* Embed */}
        <Text style={styles.sectionLabel}>Inbaddningskod</Text>
        <View style={styles.embedBox}>
          <Text style={styles.embedCode} numberOfLines={4} selectable>
            {embedCode}
          </Text>
        </View>
        <TouchableOpacity style={styles.copyEmbedBtn} onPress={handleCopyEmbed}>
          <MaterialCommunityIcons name="content-copy" size={18} color="#e8622c" />
          <Text style={styles.copyEmbedText}>Kopiera inbaddningskod</Text>
        </TouchableOpacity>
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
    marginBottom: 24,
    textAlign: 'center',
  },

  sectionLabel: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 20,
  },

  urlBox: {
    backgroundColor: '#121220',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  urlText: { color: '#e8622c', fontSize: 14 },

  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#e8622c',
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  qrPlaceholder: {
    backgroundColor: '#121220',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  qrUrl: { color: '#888', fontSize: 12 },
  qrNote: { color: '#555', fontSize: 12, fontStyle: 'italic' },

  embedBox: {
    backgroundColor: '#121220',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  embedCode: { color: '#aaa', fontSize: 12, fontFamily: 'monospace' },

  copyEmbedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8622c',
  },
  copyEmbedText: { color: '#e8622c', fontWeight: '600', fontSize: 14 },
});
