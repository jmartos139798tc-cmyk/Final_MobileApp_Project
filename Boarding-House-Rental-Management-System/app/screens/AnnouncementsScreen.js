import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import {
  isMobile,
  isTablet,
  isDesktop,
  getResponsivePadding,
  fs,
  spacing,
  cardStyle,
  cardShadow,
  safeAreaTop,
  accentShadow,
} from '../utils/responsive';

export default function AnnouncementsScreen() {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1400 : '100%';

  const announcements = [
    {
      id: 1,
      category: 'Payment',
      title: 'October Rent Reminder',
      description: 'October rent is due on October 5, 2026. Please settle your balances on time to avoid late fees.',
      date: 'Sep 14, 2026',
      categoryColor: { bg: colors.successBg, text: colors.successText },
    },
    {
      id: 2,
      category: 'Maintenance',
      title: 'Water Interruption Notice',
      description: 'Water supply will be interrupted on Sep 18 from 8AM-12PM for pipe maintenance. Store water in advance.',
      date: 'Sep 14, 2026',
      categoryColor: { bg: colors.infoBg, text: colors.infoText },
    },
    {
      id: 3,
      category: 'House Rules',
      title: 'Curfew Reminder',
      description: 'Please be reminded that curfew is strictly at 10PM. Gates will be locked promptly after.',
      date: 'Sep 10, 2026',
      categoryColor: { bg: colors.warningBg, text: colors.warningText },
    },
  ];

  const getCategoryBorderColor = (category) => {
    switch (category) {
      case 'Payment':
        return colors.success;
      case 'Maintenance':
        return colors.info;
      case 'House Rules':
        return colors.warning;
      default:
        return colors.accent;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Payment':
        return 'card';
      case 'Maintenance':
        return 'construct';
      case 'House Rules':
        return 'document-text';
      default:
        return 'notifications';
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: padding,
          paddingTop: isMobile ? safeAreaTop + 16 : isDesktop ? 40 : 60,
          paddingBottom: spacing.lg,
          alignItems: isDesktop ? 'center' : 'stretch',
        }}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text
                style={{
                  fontSize: fs(13),
                  color: colors.textMuted,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  marginBottom: 4,
                }}
              >
                Notice Board
              </Text>
              <Text
                style={{
                  fontSize: fs(32),
                  color: colors.text,
                  fontWeight: '700',
                  letterSpacing: -0.5,
                }}
              >
                Announcements
              </Text>
            </View>
            <View
              style={{
                backgroundColor: colors.accentBg,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.accent }}>
                {announcements.length} active
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Announcements List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: padding,
          paddingBottom: 80,
          gap: spacing.lg,
          alignItems: isDesktop ? 'center' : 'stretch',
        }}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%', gap: spacing.lg }}>
          {announcements.map((announcement) => (
            <TouchableOpacity
              key={announcement.id}
              activeOpacity={0.7}
              style={{
                ...cardStyle,
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                borderLeftWidth: 3,
                borderLeftColor: getCategoryBorderColor(announcement.category),
                padding: isDesktop ? 24 : 18,
              }}
            >
              {/* Category Badge & Date */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: announcement.categoryColor.bg,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    gap: 6,
                  }}
                >
                  <Ionicons
                    name={getCategoryIcon(announcement.category)}
                    size={13}
                    color={announcement.categoryColor.text}
                  />
                  <Text
                    style={{
                      fontSize: fs(11),
                      fontWeight: '700',
                      color: announcement.categoryColor.text,
                    }}
                  >
                    {announcement.category}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                  <Text style={{ fontSize: fs(12), fontWeight: '500', color: colors.textMuted }}>
                    {announcement.date}
                  </Text>
                </View>
              </View>

              {/* Title */}
              <Text
                style={{
                  fontSize: fs(18),
                  fontWeight: '700',
                  color: colors.text,
                  marginBottom: 8,
                  lineHeight: fs(24),
                }}
              >
                {announcement.title}
              </Text>

              {/* Description */}
              <Text
                style={{
                  fontSize: fs(14),
                  fontWeight: '400',
                  color: colors.textSecondary,
                  lineHeight: 22,
                }}
              >
                {announcement.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        activeOpacity={0.7}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          ...accentShadow,
        }}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}
