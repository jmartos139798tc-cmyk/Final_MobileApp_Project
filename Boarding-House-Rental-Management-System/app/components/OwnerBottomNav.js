import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isDesktop, fs, spacing } from '../utils/responsive';
import { useTheme } from '../utils/ThemeContext';

export default function OwnerBottomNav({ activeScreen, onNavigate }) {
  const { colors } = useTheme();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home', iconOutline: 'home-outline' },
    { id: 'reports', label: 'Reports', icon: 'bar-chart', iconOutline: 'bar-chart-outline' },
  ];

  // Desktop: sidebar
  if (isDesktop) {
    return (
      <View style={{
        width: 240,
        backgroundColor: colors.sidebarBg,
        borderRightWidth: 1,
        borderRightColor: colors.sidebarBorder,
        paddingTop: 40,
        paddingHorizontal: 12,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 32 }}>
          <View style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: colors.ownerAccent,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons name="business" size={18} color="#ffffff" />
          </View>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>Owner</Text>
        </View>

        {navItems.map((item) => {
          const isActive = activeScreen === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 13,
                paddingHorizontal: 16,
                borderRadius: 12,
                marginBottom: 2,
                backgroundColor: isActive ? colors.ownerAccentBg : 'transparent',
              }}
              onPress={() => onNavigate(item.id)}
            >
              <Ionicons
                name={isActive ? item.icon : item.iconOutline}
                size={21}
                color={isActive ? colors.ownerAccent : colors.textSecondary}
              />
              <Text style={{
                fontSize: fs(13),
                fontWeight: isActive ? '700' : '500',
                color: isActive ? colors.ownerAccent : colors.textSecondary,
              }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // Mobile: bottom tabs
  return (
    <View style={{
      backgroundColor: colors.navBg,
      borderTopWidth: 1,
      borderTopColor: colors.navBorder,
      flexDirection: 'row',
      paddingTop: 6,
      paddingBottom: Platform.OS === 'ios' ? 28 : 10,
      paddingHorizontal: 4,
    }}>
      {navItems.map((item) => {
        const isActive = activeScreen === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.7}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
            onPress={() => onNavigate(item.id)}
          >
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 30,
              borderRadius: 15,
              backgroundColor: isActive ? colors.ownerAccentBg : 'transparent',
              marginBottom: 2,
            }}>
              <Ionicons
                name={isActive ? item.icon : item.iconOutline}
                size={21}
                color={isActive ? colors.ownerAccent : colors.navInactive}
              />
            </View>
            <Text style={{
              fontSize: 10,
              fontWeight: isActive ? '700' : '500',
              color: isActive ? colors.ownerAccent : colors.navInactive,
              marginTop: 1,
            }}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

