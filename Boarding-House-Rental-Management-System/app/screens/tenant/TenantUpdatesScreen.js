import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { isMobile, isDesktop, getResponsivePadding, fs, spacing, cardStyle, safeAreaTop } from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import { getAnnouncements } from '../../services/dataService';

export default function TenantUpdatesScreen() {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1400 : '100%';

  const announcements = getAnnouncements();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: 30,
          alignItems: isDesktop ? 'center' : 'stretch',
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          {/* Header */}
          <View style={{ padding, paddingTop: isMobile ? safeAreaTop + 16 : isDesktop ? 40 : 60 }}>
            <Text style={{
              fontSize: fs(28),
              color: colors.text,
              fontWeight: '800',
              letterSpacing: -0.5,
            }}>
              Announcements
            </Text>
            {/* Green accent underline bar */}
            <View style={{
              width: 36,
              height: 3,
              backgroundColor: '#10b981',
              borderRadius: 2,
              marginTop: 8,
              marginBottom: spacing.md,
            }} />
          </View>

          {/* Announcements Cards */}
          <View style={{ paddingHorizontal: padding, gap: spacing.md }}>
            {announcements.map((item) => (
              <View
                key={item.id}
                style={{
                  ...cardStyle,
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  padding: isMobile ? 18 : 22,
                }}
              >
                {/* Header row: Category Pill & Date */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                  <View style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}>
                    <Text style={{
                      fontSize: fs(11),
                      fontWeight: '800',
                      color: '#10b981',
                    }}>
                      {item.category}
                    </Text>
                  </View>

                  <Text style={{
                    fontSize: fs(11),
                    fontWeight: '500',
                    color: colors.textMuted,
                  }}>
                    {item.date}
                  </Text>
                </View>

                {/* Announcement Title */}
                <Text style={{
                  fontSize: fs(16),
                  fontWeight: '800',
                  color: colors.text,
                  marginBottom: 8,
                  lineHeight: 22,
                }}>
                  {item.title}
                </Text>

                {/* Announcement Body */}
                <Text style={{
                  fontSize: fs(13),
                  color: colors.textSecondary,
                  lineHeight: 20,
                  fontWeight: '400',
                }}>
                  {item.description}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

