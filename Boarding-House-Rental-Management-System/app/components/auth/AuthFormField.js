import React, { useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AuthFormField({
  label,
  icon,
  palette,
  right,
  inputRef,
  containerStyle,
  inputStyle,
  ...inputProps
}) {
  const [focused, setFocused] = useState(false);
  const focusProgress = useRef(new Animated.Value(0)).current;

  const setFocus = (nextFocused) => {
    setFocused(nextFocused);
    Animated.timing(focusProgress, {
      toValue: nextFocused ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [palette.border, palette.accent],
  });

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, { color: palette.textSecondary }]}>{label}</Text>
      <Animated.View
        style={[
          styles.inputFrame,
          {
            backgroundColor: palette.input,
            borderColor,
            shadowColor: focused ? palette.accent : 'transparent',
            shadowOpacity: focused ? 0.1 : 0,
          },
        ]}
      >
        <Ionicons name={icon} size={19} color={focused ? palette.accent : palette.muted} />
        <TextInput
          ref={inputRef}
          {...inputProps}
          onFocus={(event) => {
            setFocus(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocus(false);
            inputProps.onBlur?.(event);
          }}
          placeholderTextColor={palette.muted}
          selectionColor={palette.accent}
          style={[
            styles.input,
            { color: palette.text },
            Platform.OS === 'web' ? styles.webInput : null,
            inputStyle,
          ]}
        />
        {right}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputFrame: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    fontSize: 15,
  },
  webInput: {
    outlineStyle: 'none',
  },
});
