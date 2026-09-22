import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isDesktop, fs } from '../utils/responsive';
import { useTheme } from '../utils/ThemeContext';

export default function TenantBottomNav({ activeScreen, onNavigate }) {
  const { colors } = useTheme();

  const navItems = [
    { id: 'home', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
    { id: 'complaints', label: 'Complaints', icon: 'chatbubble', iconOutline: 'chatbubble-outline' },
    { id: 'updates', label: 'Updates', icon: 'notifications', iconOutline: 'notifications-outline' },
  ];

  const activeColor = '#8b5cf6';
  const activeBg = 'rgba(139, 92, 246, 0.15)';

  // Desktop sidebar
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
            backgroundColor: activeColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons name="person" size={18} color="#ffffff" />
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Tenant Portal</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>Room 2 · Ana Reyes</Text>
          </View>
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
                backgroundColor: isActive ? activeBg : 'transparent',
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
      paddingTop: 6,
      paddingBottom: Platform.OS === 'ios' ? 28 : 10,
      paddingHorizontal: 16,
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

