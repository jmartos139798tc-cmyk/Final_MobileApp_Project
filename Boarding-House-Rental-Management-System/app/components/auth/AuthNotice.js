import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const tones = {
  error: { icon: 'alert-circle-outline', colorKey: 'danger', backgroundKey: 'dangerBg' },
  success: { icon: 'checkmark-circle-outline', colorKey: 'success', backgroundKey: 'successBg' },
  info: { icon: 'information-circle-outline', colorKey: 'accent', backgroundKey: 'accentSoft' },
};

export default function AuthNotice({ type = 'info', children, palette, style }) {
  const tone = tones[type] || tones.info;
  return (
    <View style={[styles.container, { backgroundColor: palette[tone.backgroundKey] }, style]}>
      <Ionicons name={tone.icon} size={19} color={palette[tone.colorKey]} />
      <Text style={[styles.message, { color: palette.textSecondary }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginBottom: 16,
  },
  message: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
