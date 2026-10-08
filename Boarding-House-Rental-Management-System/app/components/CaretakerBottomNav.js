import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isDesktop, fs } from '../utils/responsive';
import { useTheme } from '../utils/ThemeContext';

export default function CaretakerBottomNav({ activeScreen, onNavigate }) {
  const { colors } = useTheme();
  const navItems = [
    { id: 'home', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
    { id: 'rooms', label: 'Rooms', icon: 'grid', iconOutline: 'grid-outline' },
    { id: 'tenants', label: 'Tenants', icon: 'people', iconOutline: 'people-outline' },
    { id: 'billing', label: 'Billing', icon: 'card', iconOutline: 'card-outline' },
  ];

  if (isDesktop) {
    return (
      <View style={{ width: 240, backgroundColor: colors.sidebarBg, borderRightWidth: 1, borderRightColor: colors.sidebarBorder, paddingTop: 40, paddingHorizontal: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 32 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="business" size={18} color={colors.accent} />
          </View>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>BoardMgr</Text>
        </View>
        {navItems.map((item) => {
          const active = activeScreen === item.id;
          return (
            <TouchableOpacity key={item.id} activeOpacity={0.75} onPress={() => onNavigate(item.id)} accessibilityRole="button" accessibilityState={{ selected: active }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 999, overflow: 'hidden', marginBottom: 4, backgroundColor: active ? colors.accentBg : 'transparent' }}>
              <Ionicons name={active ? item.icon : item.iconOutline} size={22} color={active ? colors.accent : colors.textSecondary} />
              <Text style={{ fontSize: fs(13), fontWeight: active ? '700' : '500', color: active ? colors.accent : colors.textSecondary }}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: colors.navBg, borderTopWidth: 1, borderTopColor: colors.navBorder, flexDirection: 'row', paddingTop: 6, paddingBottom: Platform.OS === 'ios' ? 28 : 10, paddingHorizontal: 4 }}>
      {navItems.map((item) => {
        const active = activeScreen === item.id;
        return (
          <TouchableOpacity key={item.id} activeOpacity={0.8} onPress={() => onNavigate(item.id)} accessibilityRole="button" accessibilityLabel={`Navigate to ${item.label}`} accessibilityState={{ selected: active }} style={{ flex: 1, alignItems: 'center', paddingVertical: 4, borderRadius: 26, overflow: 'hidden' }}>
            <View style={{ alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 18, overflow: 'hidden', backgroundColor: active ? colors.accentBg : 'transparent', marginBottom: 2 }}>
              <Ionicons name={active ? item.icon : item.iconOutline} size={22} color={active ? colors.accent : colors.navInactive} />
            </View>
            <Text style={{ fontSize: fs(11), flexShrink: 1, textAlign: 'center', fontWeight: active ? '700' : '500', color: active ? colors.accent : colors.navInactive, marginTop: 1 }}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
