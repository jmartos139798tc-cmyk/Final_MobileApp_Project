import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, Modal, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { isMobile, isDesktop, fs, spacing, safeAreaTop, cardShadow } from '../utils/responsive';

/**
 * LandlordHeader - Unified header component for Landlord screens
 * 
 * Features:
 * - Hamburger menu button (left)
 * - Screen title and subtitle/date (center-left)
 * - Theme toggle and logout buttons (right)
 * - Proper safe area handling
 * - Consistent spacing and touch targets
 */
export default function LandlordHeader({ 
  title = 'Dashboard',
  subtitle = null,
  onMenuPress,
  onLogout,
  isDark,
  onThemeToggle,
  user,
  complaintsCount = 0,
}) {
  const { colors } = useTheme();
  const [profileVisible, setProfileVisible] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const topInset =
  Platform.OS === 'ios'
    ? safeAreaTop
    : Platform.OS === 'android'
    ? StatusBar.currentHeight || 0
    : 0;

  const headerHeight = isMobile ? 56 : 64;
  const buttonSize = 40;
  const iconSize = 22;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.cardBorder,
        paddingTop: topInset,
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
        {/* Left Section: Hamburger Menu */}
        <TouchableOpacity
          onPress={onMenuPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Open menu${complaintsCount > 0 ? `, ${complaintsCount} complaints` : ''}`}
          style={{
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ position: 'relative' }}>
            <Ionicons name="menu" size={iconSize} color={colors.text} />
            {complaintsCount > 0 && (
              <View style={{ position: 'absolute', top: -9, right: -13, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.dangerText, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.card }}>
                <Text style={{ color: '#fff', fontSize: 10, lineHeight: 12, fontWeight: '800' }}>{complaintsCount > 99 ? '99+' : complaintsCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Center Section: Title and Subtitle */}
        <View style={{ flex: 1, marginLeft: 12 }}>
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
              overflow: 'hidden',
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

          <TouchableOpacity onPress={() => setProfileVisible(true)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Open profile menu" style={{ width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="person-circle-outline" size={26} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
      <Modal visible={profileVisible} transparent animationType="fade" onRequestClose={() => setProfileVisible(false)}>
        <View style={{ flex: 1, alignItems: 'flex-end', paddingTop: topInset + headerHeight + 6, paddingHorizontal: 14 }}>
          <Pressable onPress={() => setProfileVisible(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.18)' }} accessibilityRole="button" accessibilityLabel="Close profile menu" />
          <View style={{ width: 260, borderRadius: 16, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}>
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 7 }}>LANDLORD PROFILE</Text>
            <Text numberOfLines={1} style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{user?.full_name || user?.name || user?.displayName || 'Landlord account'}</Text>
            {!!user?.email && <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>{user.email}</Text>}
            {onLogout && <TouchableOpacity onPress={() => { setProfileVisible(false); setConfirmLogout(true); }} accessibilityRole="button" accessibilityLabel="Log out" style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, marginTop: 8, borderTopWidth: 1, borderTopColor: colors.cardBorder }}>
              <Ionicons name="log-out-outline" size={19} color={colors.danger} /><Text style={{ marginLeft: 12, color: colors.danger, fontSize: 14, fontWeight: '600' }}>Log out</Text>
            </TouchableOpacity>}
          </View>
        </View>
      </Modal>
      <Modal visible={confirmLogout} transparent animationType="fade" onRequestClose={() => setConfirmLogout(false)}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15, 23, 42, 0.42)' }}>
          <View style={{ width: '100%', maxWidth: 360, padding: 22, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Log out?</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 7 }}>Are you sure you want to log out of your landlord account?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <TouchableOpacity onPress={() => setConfirmLogout(false)} accessibilityRole="button" style={{ minHeight: 42, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 11, backgroundColor: colors.bg }}><Text style={{ color: '#4A4640', fontSize: 14, fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { setConfirmLogout(false); onLogout?.(); }} accessibilityRole="button" style={{ minHeight: 42, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 11, backgroundColor: colors.dangerText }}><Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Log out</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
