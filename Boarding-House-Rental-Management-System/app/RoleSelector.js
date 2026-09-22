import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './utils/ThemeContext';
import { isMobile, safeAreaTop, cardStyle, cardShadow, fs, spacing } from './utils/responsive';

export default function RoleSelector({ onSelect }) {
  const { colors, isDark, toggleTheme } = useTheme();

  const roles = [
    {
      id: 'owner',
      title: 'Owner',
      subtitle: 'Revenue overview, reports & monitoring',
      icon: 'business',
      accent: colors.ownerAccent,
      accentBg: colors.ownerAccentBg,
    },
    {
      id: 'caretaker',
      title: 'Caretaker',
      subtitle: 'Rooms, tenants, billing & issues',
      icon: 'construct',
      accent: colors.accent,
      accentBg: colors.accentBg,
    },
    {
      id: 'tenant',
      title: 'Tenant',
      subtitle: 'Billing, receipts, complaints & notices',
      icon: 'person',
      accent: '#8b5cf6',
      accentBg: 'rgba(139, 92, 246, 0.15)',
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', paddingHorizontal: 24 }}>
      {/* Theme toggle */}
      <TouchableOpacity
        onPress={toggleTheme}
        activeOpacity={0.7}
        style={{
          position: 'absolute',
          top: isMobile ? safeAreaTop + 8 : 16,
          right: 16,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          ...cardShadow,
        }}
      >
        <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color={isDark ? '#fbbf24' : '#6366f1'} />
      </TouchableOpacity>

      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: 48 }}>
        <View style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          backgroundColor: colors.ownerAccent,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          ...cardShadow,
        }}>
          <Ionicons name="home" size={32} color="#ffffff" />
        </View>
        <Text style={{ fontSize: fs(24), fontWeight: '800', color: colors.text, marginBottom: 8 }}>
          Neat & Groovy BH
        </Text>
        <Text style={{ fontSize: fs(14), color: colors.textMuted, textAlign: 'center' }}>
          Select your role to continue
        </Text>
      </View>

      {/* Role Cards */}
      <View style={{ gap: 16 }}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role.id}
            activeOpacity={0.7}
            onPress={() => onSelect(role.id)}
            style={{
              ...cardStyle,
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              padding: 24,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: role.accentBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ionicons name={role.icon} size={26} color={role.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fs(18), fontWeight: '800', color: colors.text, marginBottom: 4 }}>
                {role.title}
              </Text>
              <Text style={{ fontSize: fs(13), color: colors.textMuted, lineHeight: 18 }}>
                {role.subtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Footer */}
      <Text style={{
        fontSize: fs(11),
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: 40,
      }}>
        Boarding House Rental Management System
      </Text>
    </View>
  );
}

