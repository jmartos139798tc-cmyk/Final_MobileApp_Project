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
            <View style={{
              width: 36,
              height: 3,
              backgroundColor: colors.success,
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
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                  <View style={{
                    backgroundColor: colors.successBg,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}>
                    <Text style={{
                      fontSize: fs(12),
                      fontWeight: '800',
                      color: colors.successText,
                    }}>
                      {item.category}
                    </Text>
                  </View>

                  <Text style={{
                    fontSize: fs(12),
                    fontWeight: '500',
                    color: colors.textMuted,
                  }}>
                    {item.date}
                  </Text>
                </View>

                <Text style={{
                  fontSize: fs(16),
                  fontWeight: '800',
                  color: colors.text,
                  marginBottom: 8,
                  lineHeight: 23,
                }}>
                  {item.title}
                </Text>

                <Text style={{
                  fontSize: fs(14),
                  color: colors.textSecondary,
                  lineHeight: 21,
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