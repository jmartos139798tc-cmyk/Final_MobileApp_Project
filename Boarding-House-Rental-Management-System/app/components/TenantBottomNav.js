import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isDesktop, fs } from '../utils/responsive';
import { useTheme } from '../utils/ThemeContext';

export default function TenantBottomNav({ user, activeScreen, onNavigate }) {
  const { colors } = useTheme();

  const navItems = [
    { id: 'home', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
    { id: 'complaints', label: 'Complaints', icon: 'chatbubble', iconOutline: 'chatbubble-outline' },
    { id: 'room-change', label: 'Room Change', icon: 'swap-horizontal', iconOutline: 'swap-horizontal-outline' },
    { id: 'updates', label: 'Updates', icon: 'notifications', iconOutline: 'notifications-outline' },
  ];

  const activeColor = colors.accent;
  const activeBg = colors.accentBg;

  // Desktop sidebar
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
            backgroundColor: activeBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons name="home" size={19} color={activeColor} />
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Tenant Portal</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>{user?.name || 'Tenant account'}</Text>
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
                marginBottom: 5,
                backgroundColor: isActive ? activeBg : 'transparent',
                borderLeftWidth: 3,
                borderLeftColor: isActive ? activeColor : 'transparent',
              }}
              onPress={() => onNavigate(item.id)}
            >
              <Ionicons
                name={isActive ? item.icon : item.iconOutline}
                size={21}
                color={isActive ? activeColor : colors.textSecondary}
              />
              <Text style={{
                fontSize: fs(13),
                fontWeight: isActive ? '700' : '500',
                color: isActive ? activeColor : colors.textSecondary,
              }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // Mobile bottom tab bar
  return (
    <View style={{
      backgroundColor: colors.navBg,
      borderTopWidth: 1,
      borderTopColor: colors.navBorder,
      flexDirection: 'row',
      paddingTop: 8,
      paddingBottom: Platform.OS === 'ios' ? 26 : 10,
      paddingHorizontal: 10,
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
            style={{ flex: 1, alignItems: 'center', paddingVertical: 3, minHeight: 50, justifyContent: 'center' }}
            onPress={() => onNavigate(item.id)}
          >
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 30,
              borderRadius: 15,
              backgroundColor: isActive ? activeBg : 'transparent',
              marginBottom: 2,
            }}>
              <Ionicons
                name={isActive ? item.icon : item.iconOutline}
                size={21}
                color={isActive ? activeColor : colors.navInactive}
              />
            </View>
            <Text style={{
              fontSize: 10,
              flexShrink: 1,
              textAlign: 'center',
              fontWeight: isActive ? '700' : '500',
              color: isActive ? activeColor : colors.navInactive,
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

