import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { isMobile, isDesktop, fs, spacing, safeAreaTop } from '../utils/responsive';

/**
 * OwnerHeader - Unified header component for Owner screens
 * 
 * Features:
 * - Screen title and subtitle/date (left)
 * - Theme toggle and logout buttons (right)
 * - Proper safe area handling
 * - Consistent spacing and touch targets
 */
export default function OwnerHeader({ 
  title = 'Dashboard',
  subtitle = null,
  onLogout,
  isDark,
  onThemeToggle,
}) {
  const { colors } = useTheme();

  const headerHeight = isMobile ? 56 : 64;
  const buttonSize = 40;
  const iconSize = 22;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.cardBorder,
        paddingTop: Platform.OS === 'ios' ? safeAreaTop : 0,
        ...Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          },
          android: {
            elevation: 2,
          },
          web: {
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          },
        }),
      }}
    >
      <View
        style={{
          height: headerHeight,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
        }}
      >
        {/* Left Section: Title and Subtitle */}
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text
            style={{
              fontSize: fs(20),
              fontWeight: '800',
              color: colors.text,
              lineHeight: fs(24),
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={{
                fontSize: fs(12),
                fontWeight: '500',
                color: colors.textMuted,
                lineHeight: fs(16),
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right Section: Theme Toggle and Logout */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Theme Toggle */}
          <TouchableOpacity
            onPress={onThemeToggle}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Toggle theme"
            style={{
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons 
              name={isDark ? 'sunny' : 'moon'} 
              size={18} 
              color={isDark ? '#fbbf24' : '#6366f1'} 
            />
          </TouchableOpacity>

          {/* Logout Button */}
          {onLogout && (
            <TouchableOpacity
              onPress={onLogout}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Logout"
              style={{
                width: buttonSize,
                height: buttonSize,
                borderRadius: buttonSize / 2,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="log-out-outline" size={19} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
