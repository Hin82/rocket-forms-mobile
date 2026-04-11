import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../translations';
import type { FormField } from '../../hooks/useFormEditor';

interface VideoFieldProps {
  field: FormField;
  value: string | null;
  onChange: (url: string | null) => void;
  readOnly?: boolean;
}

export default function VideoField({ field, value, onChange, readOnly }: VideoFieldProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);

  const player = useVideoPlayer(value ?? null, (p) => {
    p.loop = field.videoLoop || false;
    p.muted = field.videoMuted || false;
    if (field.videoAutoplay) {
      p.play();
    }
  });

  const handlePickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 0.8,
        videoMaxDuration: 300, // 5 min
      });

      if (!result.canceled && result.assets[0]) {
        await uploadVideo(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert(
        t('fieldEditor', 'videoUploadError') || 'Error',
        String(err)
      );
    }
  };

  const handleRecordVideo = async () => {
    try {
      const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (camStatus !== 'granted') {
        Alert.alert(
          t('fieldEditor', 'permissionRequired') || 'Permission Required',
          t('fieldEditor', 'cameraPermissionMsg') || 'Camera permission is needed to record video.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        quality: 0.8,
        videoMaxDuration: 300,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadVideo(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert(
        t('fieldEditor', 'videoUploadError') || 'Error',
        String(err)
      );
    }
  };

  const getMimeType = (ext: string): string => {
    const mimeMap: Record<string, string> = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      '3gp': 'video/3gpp',
      mkv: 'video/x-matroska',
      ogg: 'video/ogg',
    };
    return mimeMap[ext.toLowerCase()] || `video/${ext.toLowerCase()}`;
  };

  const uploadVideo = async (uri: string) => {
    setUploading(true);
    try {
      const ext = uri.split('.').pop() || 'mp4';
      const fileName = `video_${Date.now()}.${ext}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { data, error } = await supabase.storage
        .from('form-assets')
        .upload(fileName, arrayBuffer, {
          contentType: getMimeType(ext),
        });

      if (error) throw error;
      if (data) {
        const { data: urlData } = supabase.storage
          .from('form-assets')
          .getPublicUrl(data.path);
        onChange(urlData.publicUrl);
      }
    } catch (err) {
      Alert.alert(
        t('fieldEditor', 'videoUploadError') || 'Upload Error',
        String(err)
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    try {
      player.pause();
    } catch {}
    onChange(null);
  };

  if (uploading) {
    return (
      <View style={styles.uploadingContainer}>
        <ActivityIndicator size="large" color="#e8622c" />
        <Text style={styles.uploadingText}>
          {t('fieldEditor', 'uploading') || 'Uploading...'}
        </Text>
      </View>
    );
  }

  if (!value) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="video-outline" size={40} color="#999" />
        <Text style={styles.emptyText}>
          {t('fieldEditor', 'videoNoFile') || 'No video selected'}
        </Text>
        {!readOnly && (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handlePickVideo}>
              <MaterialCommunityIcons name="folder-open-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>
                {t('fieldEditor', 'videoUpload') || 'Upload'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleRecordVideo}>
              <MaterialCommunityIcons name="video-plus-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>
                {t('fieldEditor', 'videoRecord') || 'Record'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.previewContainer}>
      <View style={styles.videoWrapper}>
        <VideoView
          player={player}
          style={styles.video}
          nativeControls={field.videoControls !== false}
          contentFit="contain"
          allowsFullscreen
        />
      </View>

      {!readOnly && (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handlePickVideo}>
            <MaterialCommunityIcons name="swap-horizontal" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>
              {t('fieldEditor', 'videoReplace') || 'Replace'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={handleRemove}>
            <MaterialCommunityIcons name="delete-outline" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>
              {t('fieldEditor', 'videoRemove') || 'Remove'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  uploadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  uploadingText: {
    color: '#999',
    fontSize: 14,
  },
  emptyContainer: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#3d3d5c',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e8622c',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dangerButton: {
    backgroundColor: '#cc3333',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  previewContainer: {
    gap: 12,
  },
  videoWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: 220,
  },
});
