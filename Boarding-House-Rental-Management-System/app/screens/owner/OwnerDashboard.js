import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isMobile, isDesktop, getResponsivePadding, fs, spacing, cardStyle, cardShadow, safeAreaTop, accentShadow } from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import { getBoardingHouseConfig, getRevenue, getOccupancyStats, getUnpaidStats, getIssueStats, getUnpaidTenants } from '../../services/dataService';

export default function OwnerDashboard() {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1400 : '100%';

  const config = getBoardingHouseConfig();
  const revenue = getRevenue('september');
  const occupancy = getOccupancyStats();
  const unpaidStats = getUnpaidStats();
  const issueStats = getIssueStats();
  const unpaidTenants = getUnpaidTenants();

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
              {config.name}
            </Text>
            <Text style={{ fontSize: fs(28), color: colors.text, fontWeight: '800', marginTop: 4 }}>
              Overview
            </Text>
          </View>

          <View style={{ paddingHorizontal: padding, gap: spacing.lg }}>
            {/* ── Revenue Hero Card ───────────────────── */}
            <View style={{
              borderRadius: 20,
              overflow: 'hidden',
              ...cardShadow,
            }}>
              {/* Purple gradient effect via layered views */}
              <View style={{
                backgroundColor: colors.ownerHero,
                padding: isMobile ? 20 : 28,
              }}>
                {/* Decorative gradient overlay */}
                <View style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: '60%',
                  backgroundColor: colors.ownerHeroLight,
                  opacity: 0.3,
                  borderTopLeftRadius: 100,
                  borderBottomLeftRadius: 60,
                }} />

                <Text style={{
                  fontSize: fs(10),
                  fontWeight: '800',
                  color: 'rgba(255,255,255,0.7)',
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}>
                  September Revenue
                </Text>

                <Text style={{
                  fontSize: fs(36),
                  fontWeight: '900',
                  color: '#ffffff',
                  marginBottom: 4,
                }}>
                  ₱{revenue.collected.toLocaleString()}
                </Text>

                <Text style={{
                  fontSize: fs(12),
                  color: 'rgba(255,255,255,0.6)',
                  marginBottom: 16,
                }}>
                  of ₱{revenue.expected.toLocaleString()} expected
                </Text>

                {/* Progress bar */}
                <View style={{
                  height: 6,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  marginBottom: 14,
                }}>
                  <View style={{
                    width: `${revenue.percentCollected}%`,
                    height: '100%',
                    backgroundColor: '#ffffff',
                    borderRadius: 3,
                  }} />
                </View>

                {/* Stats row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: fs(12), fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>
                    {revenue.percentCollected}% collected
                  </Text>
                  <Text style={{ fontSize: fs(12), fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>
                    ₱{revenue.outstanding.toLocaleString()} outstanding
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Stats Grid 2×2 ─────────────────────── */}
            <View style={{ gap: spacing.md }}>
              {/* Row 1 */}
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                {/* Occupancy */}
                <View style={{
                  flex: 1,
                  ...cardStyle,
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  padding: isMobile ? 16 : 20,
                }}>
                  <Text style={{ fontSize: fs(11), fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>
                    Occupancy
                  </Text>
                  <Text style={{ fontSize: fs(26), fontWeight: '900', color: colors.ownerAccent }}>
                    {occupancy.rate}%
                  </Text>
                  <Text style={{ fontSize: fs(11), color: colors.textMuted, marginTop: 4 }}>
                    {occupancy.occupied}/{occupancy.totalRooms} rooms
                  </Text>
                </View>

                {/* Unpaid */}
                <View style={{
                  flex: 1,
                  ...cardStyle,
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  padding: isMobile ? 16 : 20,
                }}>
                  <Text style={{ fontSize: fs(11), fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>
                    Unpaid
                  </Text>
                  <Text style={{ fontSize: fs(26), fontWeight: '900', color: colors.danger }}>
                    ₱{(unpaidStats.total / 1000).toFixed(1)}k
                  </Text>
                  <Text style={{ fontSize: fs(11), color: colors.textMuted, marginTop: 4 }}>
                    {unpaidStats.count} tenants
                  </Text>
                </View>
              </View>

              {/* Row 2 */}
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                {/* Complaints */}
                <View style={{
                  flex: 1,
                  ...cardStyle,
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  padding: isMobile ? 16 : 20,
                }}>
                  <Text style={{ fontSize: fs(11), fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>
                    Complaints
                  </Text>
                  <Text style={{ fontSize: fs(26), fontWeight: '900', color: colors.text }}>
                    {issueStats.total}
                  </Text>
                  <Text style={{ fontSize: fs(11), color: colors.textMuted, marginTop: 4 }}>
                    {issueStats.resolved} resolved
                  </Text>
                </View>

                {/* Vacant */}
                <View style={{
                  flex: 1,
                  ...cardStyle,
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  padding: isMobile ? 16 : 20,
                }}>
                  <Text style={{ fontSize: fs(11), fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>
                    Vacant
                  </Text>
                  <Text style={{ fontSize: fs(26), fontWeight: '900', color: colors.text }}>
                    {occupancy.vacant}
                  </Text>
                  <Text style={{ fontSize: fs(11), color: colors.textMuted, marginTop: 4 }}>
                    available rooms
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Unpaid Balances ─────────────────────── */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{
                  fontSize: fs(11),
                  fontWeight: '800',
                  color: colors.textSecondary,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}>
                  Unpaid Balances
                </Text>
              </View>

              {unpaidTenants.map((tenant) => (
                <TouchableOpacity
                  key={tenant.id}
                  activeOpacity={0.7}
                  style={{
                    ...cardStyle,
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    padding: isMobile ? 14 : 18,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: spacing.sm,
                  }}
                >
                  {/* Room badge */}
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: tenant.color,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: fs(11), fontWeight: '900', color: '#ffffff' }}>
                      R{tenant.room}
                    </Text>
                  </View>

                  {/* Name */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text }} numberOfLines={1}>
                      {tenant.name}
                    </Text>
                  </View>

                  {/* Balance */}
                  <Text style={{ fontSize: fs(15), fontWeight: '800', color: colors.danger }}>
                    ₱{tenant.balance.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

