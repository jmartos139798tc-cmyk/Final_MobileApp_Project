import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isDesktop, fs } from '../utils/responsive';
import { useTheme } from '../utils/ThemeContext';

export default function LandlordBottomNav({ user, activeScreen, onNavigate }) {
  const { colors } = useTheme();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home', iconOutline: 'home-outline' },
    { id: 'approvals', label: 'Approvals', icon: 'checkmark-done-circle', iconOutline: 'checkmark-done-circle-outline' },
    { id: 'finances', label: 'Finances', icon: 'wallet', iconOutline: 'wallet-outline' },
    { id: 'tenants', label: 'Tenants', icon: 'people', iconOutline: 'people-outline' },
    { id: 'rooms', label: 'Rooms', icon: 'bed', iconOutline: 'bed-outline' },
  ];

  // Desktop: sidebar
  if (isDesktop) {
    return (
      <View style={{
        width: 240,
        backgroundColor: colors.sidebarBg,
        borderRightWidth: 1,
        borderRightColor: colors.sidebarBorder,
        paddingTop: 32,
        paddingHorizontal: 14,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 32 }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 13,
            backgroundColor: colors.ownerAccentBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons name="business" size={19} color={colors.ownerAccent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Landlord Portal</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>{user?.name || 'Landlord'}</Text>
          </View>
        </View>

        {navItems.map((item) => {
          const isActive = activeScreen === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={`Navigate to ${item.label}`}
              accessibilityState={{ selected: isActive }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 13,
                borderRadius: 13,
                overflow: 'hidden',
                marginBottom: 5,
                backgroundColor: isActive ? colors.ownerAccentBg : 'transparent',
                borderLeftWidth: 3,
                borderLeftColor: isActive ? colors.ownerAccent : 'transparent',
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
      paddingTop: 8,
      paddingBottom: Platform.OS === 'ios' ? 26 : 10,
      paddingHorizontal: 4,
    }}>
      {navItems.map((item) => {
        const isActive = activeScreen === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={`Navigate to ${item.label}`}
            accessibilityState={{ selected: isActive }}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 3, minHeight: 50, justifyContent: 'center', borderRadius: 26, overflow: 'hidden' }}
            onPress={() => onNavigate(item.id)}
          >
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 18,
              overflow: 'hidden',
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
              flexShrink: 1,
              textAlign: 'center',
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
