import React from 'react';
import { Image, View, Platform } from 'react-native';
import BrandLogo from '../../assets/nads-gracy-logo-transparent.png';

// Import SVG conditionally - only for native platforms
let BrandMark;
if (Platform.OS !== 'web') {
  BrandMark = require('../../assets/nads-gracy-symbol-enhanced.svg').default;
}

const variants = {
  mark: {
    Component: Platform.OS === 'web' ? null : BrandMark,
    source: Platform.OS === 'web' ? BrandLogo : null,
    aspectRatio: 1,
    label: 'Nads and Gracy logo mark',
  },
  full: {
    source: BrandLogo,
    aspectRatio: 1,
    label: 'Nads and Gracy Boarding House Management System logo',
  },
};

/**
 * Responsive, accessible brand artwork for Expo and bare React Native apps.
 * The default width is 160 points; height follows the selected asset's ratio.
 */
export default function Logo({
  variant = 'mark',
  width,
  height,
  style,
  accessibilityLabel,
  ...svgProps
}) {
  const selectedVariant = variants[variant] || variants.mark;
  const { Component, source, aspectRatio, label } = selectedVariant;

  return (
    <View
      style={[
        { aspectRatio },
        { width: width ?? (height == null ? 160 : undefined), height },
        style,
      ]}
    >
      {Component ? (
        <Component
          {...svgProps}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          accessible
          accessibilityRole="image"
          accessibilityLabel={accessibilityLabel || label}
        />
      ) : (
        <Image
          {...svgProps}
          source={source}
          resizeMode="contain"
          accessible
          accessibilityLabel={accessibilityLabel || label}
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </View>
  );
}

