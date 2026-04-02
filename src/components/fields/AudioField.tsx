import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../translations';
import type { FormField } from '../../hooks/useFormEditor';

interface AudioFieldProps {
  field: FormField;
  value: string | null;
  onChange: (url: string | null) => void;
  readOnly?: boolean;
}

export default function AudioField({ field, value, onChange, readOnly }: AudioFieldProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Stable waveform bar heights (no re-render flicker)
  const waveformBars = useMemo(
    () => Array.from({ length: 12 }, () => ({
      height: 8 + Math.random() * 24,
      opacity: 0.5 + Math.random() * 0.5,
    })),
    []
  );

  // Unload sound when value changes
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      setIsPlaying(false);
      setPlaybackPosition(0);
      setPlaybackDuration(0);
    };
  }, [value]);

  // Autoplay when value is set and audioAutoplay is true
  useEffect(() => {
    if (value && field.audioAutoplay && !isPlaying && !soundRef.current) {
      togglePlayback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, field.audioAutoplay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  // Pulsing animation while recording
  useEffect(() => {
    if (isRecording) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePickAudio = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAudio(result.assets[0].uri, result.assets[0].mimeType || 'audio/mpeg');
      }
    } catch (err) {
      Alert.alert(
        t('fieldEditor', 'audioUploadError') || 'Error',
        String(err)
      );
    }
  };

  const startRecording = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('fieldEditor', 'permissionRequired') || 'Permission Required',
          t('fieldEditor', 'microphonePermissionMsg') || 'Microphone permission is needed to record audio.'
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      Alert.alert(
        t('fieldEditor', 'audioRecordError') || 'Recording Error',
        String(err)
      );
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
        await uploadAudio(uri, 'audio/m4a');
      }
    } catch (err) {
      Alert.alert(
        t('fieldEditor', 'audioRecordError') || 'Recording Error',
        String(err)
      );
    }
  };

  const uploadAudio = async (uri: string, mimeType: string) => {
    setUploading(true);
    try {
      const ext = uri.split('.').pop() || 'm4a';
      const fileName = `audio_${Date.now()}.${ext}`;

      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { data, error } = await supabase.storage
        .from('form-assets')
        .upload(fileName, arrayBuffer, { contentType: mimeType });

      if (error) throw error;
      if (data) {
        const { data: urlData } = supabase.storage
          .from('form-assets')
          .getPublicUrl(data.path);
        onChange(urlData.publicUrl);
      }
    } catch (err) {
      Alert.alert(
        t('fieldEditor', 'audioUploadError') || 'Upload Error',
        String(err)
      );
    } finally {
      setUploading(false);
    }
  };

  const togglePlayback = async () => {
    if (!value) return;

    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        return;
      }

      if (soundRef.current) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        return;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: value },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setPlaybackPosition(status.positionMillis / 1000);
            setPlaybackDuration((status.durationMillis || 0) / 1000);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPlaybackPosition(0);
              if (field.audioLoop) {
                soundRef.current?.replayAsync()
                  .then(() => setIsPlaying(true))
                  .catch(() => setIsPlaying(false));
              }
            }
          }
        }
      );

      soundRef.current = sound;
      setIsPlaying(true);
    } catch (err) {
      Alert.alert('Playback Error', String(err));
    }
  };

  const handleRemove = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackPosition(0);
    setPlaybackDuration(0);
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

  // Recording UI
  if (isRecording) {
    return (
      <View style={styles.recordingContainer}>
        <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
        <Text style={styles.recordingTime}>{formatTime(recordingDuration)}</Text>
        <Text style={styles.recordingLabel}>
          {t('fieldEditor', 'audioRecording') || 'Recording...'}
        </Text>
        {/* Simple waveform indicator */}
        <View style={styles.waveformRow}>
          {waveformBars.map((bar, i) => (
            <View
              key={i}
              style={[
                styles.waveformBar,
                { height: bar.height, opacity: bar.opacity },
              ]}
            />
          ))}
        </View>
        <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
          <MaterialCommunityIcons name="stop" size={24} color="#fff" />
          <Text style={styles.stopButtonText}>
            {t('fieldEditor', 'audioStopRecording') || 'Stop Recording'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!value) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="microphone-outline" size={40} color="#999" />
        <Text style={styles.emptyText}>
          {t('fieldEditor', 'audioNoFile') || 'No audio selected'}
        </Text>
        {!readOnly && (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handlePickAudio}>
              <MaterialCommunityIcons name="folder-open-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>
                {t('fieldEditor', 'audioUpload') || 'Upload'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={startRecording}>
              <MaterialCommunityIcons name="microphone" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>
                {t('fieldEditor', 'audioRecord') || 'Record'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // Playback UI
  const showControls = field.audioControls !== false;

  return (
    <View style={styles.playerContainer}>
      <View style={styles.playerCard}>
        {showControls && (
          <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
            <MaterialCommunityIcons
              name={isPlaying ? 'pause' : 'play'}
              size={28}
              color="#fff"
            />
          </TouchableOpacity>
        )}
        <View style={styles.playerInfo}>
          {showControls && (
            <>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width:
                        playbackDuration > 0
                          ? `${(playbackPosition / playbackDuration) * 100}%`
                          : '0%',
                    },
                  ]}
                />
              </View>
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatTime(playbackPosition)}</Text>
                <Text style={styles.timeText}>
                  {playbackDuration > 0 ? formatTime(playbackDuration) : '--:--'}
                </Text>
              </View>
            </>
          )}
          {!showControls && (
            <Text style={styles.timeText}>
              {t('fieldEditor', 'audioFile') || 'Audio file loaded'}
            </Text>
          )}
        </View>
      </View>

      {!readOnly && (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handlePickAudio}>
            <MaterialCommunityIcons name="swap-horizontal" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>
              {t('fieldEditor', 'audioReplace') || 'Replace'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={startRecording}>
            <MaterialCommunityIcons name="microphone" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>
              {t('fieldEditor', 'audioRecord') || 'Record'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleRemove}
          >
            <MaterialCommunityIcons name="delete-outline" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>
              {t('fieldEditor', 'audioRemove') || 'Remove'}
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
    flexWrap: 'wrap',
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
  recordingContainer: {
    borderWidth: 2,
    borderColor: '#cc3333',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a0000',
  },
  recordingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#cc3333',
  },
  recordingTime: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  recordingLabel: {
    color: '#cc3333',
    fontSize: 14,
    fontWeight: '600',
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 36,
    marginVertical: 8,
  },
  waveformBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#e8622c',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#cc3333',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playerContainer: {
    gap: 12,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 16,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8622c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerInfo: {
    flex: 1,
    gap: 6,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#e8622c',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: '#999',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});
