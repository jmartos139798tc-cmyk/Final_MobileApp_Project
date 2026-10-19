import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isDesktop, fs } from '../utils/responsive';
import { useTheme } from '../utils/ThemeContext';

export default function TenantBottomNav({ user, activeScreen, onNavigate, badges = {}, showComplaints = true }) {
  const { colors } = useTheme();
  const getBadgeCount = (item) => badges[item.id] || 0;
  const getBadgeDescription = () => 'new updates';

  const navItems = [
    { id: 'home', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
    { id: 'finances', label: 'Finances', icon: 'wallet', iconOutline: 'wallet-outline' },
    { id: 'complaints', label: 'Complaints', icon: 'chatbubble', iconOutline: 'chatbubble-outline' },
  ].filter((item) => item.id !== 'complaints' || showComplaints);

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
            backgroundColor: colors.accentBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons name="person" size={19} color={colors.accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Tenant Portal</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>{user?.name || 'Tenant'}</Text>
          </View>
        </View>

        {navItems.map((item) => {
          const isActive = activeScreen === item.id;
          const badgeCount = getBadgeCount(item);
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={`Navigate to ${item.label}${badgeCount > 0 ? `, ${badgeCount} ${getBadgeDescription(item)}` : ''}`}
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
                backgroundColor: isActive ? colors.accentBg : 'transparent',
                borderLeftWidth: 3,
                borderLeftColor: isActive ? colors.accent : 'transparent',
              }}
              onPress={() => onNavigate(item.id)}
            >
              <View style={{ position: 'relative' }}>
                <Ionicons
                  name={isActive ? item.icon : item.iconOutline}
                  size={21}
                  color={isActive ? colors.accent : colors.textSecondary}
                />
                {badgeCount > 0 && (
                  <View style={{ position: 'absolute', top: -8, right: -12, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.dangerText, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.sidebarBg }}>
                    <Text style={{ color: '#fff', fontSize: 10, lineHeight: 12, fontWeight: '800' }}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
                  </View>
                )}
              </View>
              <Text style={{
                fontSize: fs(13),
                fontWeight: isActive ? '700' : '500',
                color: isActive ? colors.accent : colors.textSecondary,
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
        const badgeCount = getBadgeCount(item);
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={`Navigate to ${item.label}${badgeCount > 0 ? `, ${badgeCount} ${getBadgeDescription(item)}` : ''}`}
            accessibilityState={{ selected: isActive }}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 3, minHeight: 50, justifyContent: 'center' }}
            onPress={() => onNavigate(item.id)}
          >
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isActive ? colors.accentBg : 'transparent',
              marginBottom: 2,
            }}>
              <Ionicons
                name={isActive ? item.icon : item.iconOutline}
                size={21}
                color={isActive ? colors.accent : colors.navInactive}
              />
              {badgeCount > 0 && (
                <View style={{ position: 'absolute', top: -4, right: -5, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.dangerText, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.navBg }}>
                  <Text style={{ color: '#fff', fontSize: 10, lineHeight: 12, fontWeight: '800' }}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
                </View>
              )}
            </View>
            <Text style={{
              fontSize: 10,
              flexShrink: 1,
              textAlign: 'center',
              fontWeight: isActive ? '700' : '500',
              color: isActive ? colors.accent : colors.navInactive,
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
