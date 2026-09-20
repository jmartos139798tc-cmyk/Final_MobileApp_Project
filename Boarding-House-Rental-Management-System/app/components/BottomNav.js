import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isDesktop, fs, spacing } from '../utils/responsive';
import { useTheme } from '../utils/ThemeContext';

export default function BottomNav({ activeScreen, onNavigate }) {
  const { colors } = useTheme();

  const navItems = [
    { id: 'home', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
    { id: 'rooms', label: 'Rooms', icon: 'grid', iconOutline: 'grid-outline' },
    { id: 'tenants', label: 'Tenants', icon: 'people', iconOutline: 'people-outline' },
    { id: 'billing', label: 'Billing', icon: 'card', iconOutline: 'card-outline' },
    { id: 'issues', label: 'Issues', icon: 'chatbubble-ellipses', iconOutline: 'chatbubble-ellipses-outline' },
    { id: 'announce', label: 'Announce', icon: 'megaphone', iconOutline: 'megaphone-outline' },
  ];

  // Desktop: sidebar navigation
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
        {/* App branding */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          gap: 10, 
          paddingHorizontal: 16, 
          marginBottom: 32 
        }}>
          <View style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons name="business" size={18} color="#ffffff" />
          </View>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>
            BoardMgr
          </Text>
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
                backgroundColor: isActive ? colors.accentBg : 'transparent',
              }}
              onPress={() => onNavigate(item.id)}
            >
              <Ionicons
                name={isActive ? item.icon : item.iconOutline}
                size={21}
                color={isActive ? colors.accent : colors.textSecondary}
              />
              <Text style={{
                fontSize: fs(13),
                fontWeight: isActive ? '700' : '500',
                color: isActive ? colors.accent : colors.textSecondary,
              }}>
                {item.label}
              </Text>
              {isActive && (
                <View style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.accent,
                  marginLeft: 'auto',
                }} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // Mobile: bottom tab bar (no absolute positioning — it's a flex child)
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
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 4,
            }}
            onPress={() => onNavigate(item.id)}
          >
            {/* Active pill highlight behind icon */}
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 30,
              borderRadius: 15,
              backgroundColor: isActive ? colors.accentBg : 'transparent',
              marginBottom: 2,
            }}>
              <Ionicons
                name={isActive ? item.icon : item.iconOutline}
                size={21}
                color={isActive ? colors.accent : colors.navInactive}
              />
            </View>
            <Text style={{
              fontSize: 10,
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
