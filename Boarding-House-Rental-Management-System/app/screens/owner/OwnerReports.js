import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isMobile, isDesktop, getResponsivePadding, fs, spacing, cardStyle, cardShadow, safeAreaTop } from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import { getMonthlyIncome, getSeptemberSummary } from '../../services/dataService';

export default function OwnerReports() {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1400 : '100%';

  const monthlyIncome = getMonthlyIncome();
  const summary = getSeptemberSummary();

  // Chart calculations
  const maxAmount = Math.max(...monthlyIncome.map((m) => m.amount));
  const maxBarHeight = isMobile ? 120 : 160;
  const currentMonthIndex = monthlyIncome.length - 1; // Last month is current

  // Summary items with color coding
  const summaryItems = [
    { label: 'Rent Collected', value: `₱${summary.rentCollected.toLocaleString()}`, color: colors.success },
    { label: 'Unpaid Balance', value: `₱${summary.unpaidBalance.toLocaleString()}`, color: colors.danger },
    { label: 'Electricity Fees', value: `₱${summary.electricityFees.toLocaleString()}`, color: colors.warning },
    { label: 'Occupied Rooms', value: `${summary.occupiedRooms} / ${summary.totalRooms}`, color: colors.text },
    { label: 'New Complaints', value: `${summary.newComplaints}`, color: colors.warning },
    { label: 'Resolved', value: `${summary.resolved}`, color: colors.success },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: 20,
          alignItems: isDesktop ? 'center' : 'stretch',
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          {/* Header */}
          <View style={{ padding, paddingTop: isMobile ? safeAreaTop + 16 : isDesktop ? 40 : 60 }}>
            <Text style={{ fontSize: fs(13), color: colors.textMuted, fontWeight: '500' }}>
              Financial Overview
            </Text>
            <Text style={{ fontSize: fs(28), color: colors.text, fontWeight: '800', marginTop: 4 }}>
              Reports
            </Text>
          </View>

          <View style={{ paddingHorizontal: padding, gap: spacing.lg }}>
            {/* ── Monthly Income Bar Chart ────────────── */}
            <View style={{
              ...cardStyle,
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              padding: isMobile ? 20 : 28,
            }}>
              <Text style={{
                fontSize: fs(10),
                fontWeight: '800',
                color: colors.textSecondary,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 24,
              }}>
                Monthly Income (₱)
              </Text>

              {/* Bar chart */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                height: maxBarHeight + 30,
                gap: isMobile ? 8 : 16,
              }}>
                {monthlyIncome.map((item, index) => {
                  const barHeight = (item.amount / maxAmount) * maxBarHeight;
                  const isCurrent = index === currentMonthIndex;
                  const amountLabel = `${Math.round(item.amount / 1000)}k`;

                  return (
                    <View
                      key={item.month}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                      }}
                    >
                      {/* Amount label above bar */}
                      <Text style={{
                        fontSize: fs(10),
                        fontWeight: '700',
                        color: isCurrent ? colors.ownerAccent : colors.textMuted,
                        marginBottom: 6,
                      }}>
                        {amountLabel}
                      </Text>

                      {/* Bar */}
                      <View style={{
                        width: '100%',
                        maxWidth: isMobile ? 40 : 56,
                        height: barHeight,
                        borderRadius: 8,
                        backgroundColor: isCurrent ? colors.ownerBarHighlight : colors.ownerBarDefault,
                        ...(isCurrent ? {
                          // Subtle glow for current month
                          ...cardShadow,
                        } : {}),
                      }} />

                      {/* Month label */}
                      <Text style={{
                        fontSize: fs(10),
                        fontWeight: '600',
                        color: isCurrent ? colors.ownerAccent : colors.textMuted,
                        marginTop: 8,
                      }}>
                        {item.month}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ── September Summary ───────────────────── */}
            <View>
              <Text style={{
                fontSize: fs(11),
                fontWeight: '800',
                color: colors.textSecondary,
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}>
                September Summary
              </Text>

              <View style={{
                ...cardStyle,
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                overflow: 'hidden',
              }}>
                {summaryItems.map((item, index) => (
                  <View
                    key={item.label}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: isMobile ? 16 : 20,
                      paddingVertical: isMobile ? 14 : 16,
                      borderBottomWidth: index < summaryItems.length - 1 ? 1 : 0,
                      borderBottomColor: colors.divider,
                    }}
                  >
                    <Text style={{
                      fontSize: fs(14),
                      fontWeight: '500',
                      color: colors.textSecondary,
                    }}>
                      {item.label}
                    </Text>
                    <Text style={{
                      fontSize: fs(15),
                      fontWeight: '800',
                      color: item.color,
                      fontVariant: ['tabular-nums'],
                    }}>
                      {item.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

