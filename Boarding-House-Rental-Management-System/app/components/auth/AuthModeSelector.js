import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const modes = [
  { key: 'login', label: 'Sign In', icon: 'log-in-outline' },
  { key: 'register', label: 'Tenant Sign Up', icon: 'person-add-outline' },
];

export default function AuthModeSelector({ value, onChange, palette }) {
  const { width } = useWindowDimensions();
  const compact = width < 360;

  return (
    <View style={[styles.track, { backgroundColor: palette.segmentTrack, borderColor: palette.border }]}>
      {modes.map((mode) => {
        const selected = value === mode.key;
        return (
          <Pressable
            key={mode.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={mode.label}
            onPress={() => onChange(mode.key)}
            style={[
              styles.option,
              selected && [styles.selectedOption, { backgroundColor: palette.surface, borderColor: palette.border }],
            ]}
          >
            <Ionicons name={mode.icon} size={compact ? 14 : 17} color={selected ? palette.accent : palette.muted} />
            <Text style={[styles.label, { color: selected ? palette.text : palette.textSecondary, fontSize: compact ? 11 : 13 }]}>
              {mode.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
    marginBottom: 22,
  },
  option: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  selectedOption: {
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  label: {
    fontWeight: '700',
  },
});
