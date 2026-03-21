import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput as RNTextInput } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ColorPickerFieldProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
}

const PRESET_COLORS = [
  '#ffffff', '#f5f5f5', '#e0e0e0', '#9e9e9e',
  '#1e1e2e', '#121220', '#000000', '#e8622c',
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

function isLight(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return true;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

export default function ColorPickerField({ value, onChange, label }: ColorPickerFieldProps) {
  const [customHex, setCustomHex] = useState(value || '#ffffff');

  const handleCustomChange = (text: string) => {
    let hex = text;
    if (!hex.startsWith('#')) hex = '#' + hex;
    setCustomHex(hex);
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      onChange(hex);
    }
  };

  const handleSelectPreset = (color: string) => {
    setCustomHex(color);
    onChange(color);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {/* Preview */}
      <View style={styles.previewRow}>
        <View style={[styles.preview, { backgroundColor: value || '#ffffff' }]}>
          <Text style={{ color: isLight(value || '#ffffff') ? '#000' : '#fff', fontSize: 12 }}>
            {value || '#ffffff'}
          </Text>
        </View>
      </View>

      {/* Preset swatches */}
      <View style={styles.swatchGrid}>
        {PRESET_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.swatch, { backgroundColor: c }, value === c && styles.swatchActive]}
            onPress={() => handleSelectPreset(c)}
          >
            {value === c && (
              <MaterialCommunityIcons name="check" size={16} color={isLight(c) ? '#000' : '#fff'} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom hex input */}
      <View style={styles.hexRow}>
        <Text style={styles.hexLabel}>Hex-kod:</Text>
        <RNTextInput
          value={customHex}
          onChangeText={handleCustomChange}
          style={styles.hexInput}
          placeholder="#000000"
          placeholderTextColor="#555"
          maxLength={7}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  label: {
    color: '#ccc',
    fontSize: 13,
    marginBottom: 8,
  },
  previewRow: {
    marginBottom: 10,
  },
  preview: {
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  swatchActive: {
    borderColor: '#e8622c',
    borderWidth: 2,
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hexLabel: {
    color: '#999',
    fontSize: 13,
  },
  hexInput: {
    flex: 1,
    backgroundColor: '#1e1e2e',
    borderWidth: 1,
    borderColor: '#2d2d44',
    borderRadius: 8,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'monospace',
  },
});
