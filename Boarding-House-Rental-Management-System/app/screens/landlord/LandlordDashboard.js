import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isMobile, isDesktop, getResponsivePadding, fs, spacing, cardStyle, cardShadow } from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import { getBoardingHouseConfig, getRevenue, getOccupancyStats, getUnpaidStats, getIssueStats, getUnpaidTenants } from '../../services/dataService';

export default function OwnerDashboard() {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1180 : '100%';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [occupancy, setOccupancy] = useState(null);
  const [unpaidStats, setUnpaidStats] = useState(null);
  const [issueStats, setIssueStats] = useState(null);
  const [unpaidTenants, setUnpaidTenants] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const configData = await getBoardingHouseConfig();
        const revenueData = await getRevenue('september');
        const occupancyData = await getOccupancyStats();
        const unpaidStatsData = await getUnpaidStats();
        const issueStatsData = await getIssueStats();
        const unpaidTenantsData = await getUnpaidTenants();

        setConfig(configData);
        setRevenue(revenueData);
        setOccupancy(occupancyData);
        setUnpaidStats(unpaidStatsData);
        setIssueStats(issueStatsData);
        setUnpaidTenants(unpaidTenantsData);
      } catch (err) {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}><ActivityIndicator size="large" color={colors.accent} /></View>;
  if (error) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}><Text style={{ color: colors.danger, fontSize: 16 }}>{error}</Text></View>;

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
          <View style={{ padding, paddingTop: isMobile ? 16 : isDesktop ? 28 : 24, paddingBottom: 16 }}>
            <Text style={{ fontSize: fs(12), color: colors.textMuted, fontWeight: '800', letterSpacing: 1, marginBottom: 5 }}>OWNER PORTAL</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fs(28), color: colors.text, fontWeight: '900', letterSpacing: -0.5 }}>Overview</Text>
                <Text style={{ fontSize: fs(14), color: colors.textSecondary, marginTop: 5 }}>A snapshot of {config.name || 'your property'}.</Text>
              </View>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.ownerAccentBg, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="business-outline" size={22} color={colors.ownerAccent} />
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: padding, gap: spacing.lg }}>
            {/* ── Revenue Hero Card ───────────────────── */}
            <View style={{
              borderRadius: 24,
              overflow: 'hidden',
              ...cardShadow,
            }}>
              {/* Purple gradient effect via layered views */}
              <View style={{
                backgroundColor: colors.ownerHero,
                padding: isMobile ? 22 : 30,
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
                  September revenue
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
                  borderRadius: 18,
                }}>
                  <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.ownerAccentBg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><Ionicons name="home-outline" size={17} color={colors.ownerAccent} /></View>
                  <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textMuted, marginBottom: 5 }}>Occupancy</Text>
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
                  borderRadius: 18,
                }}>
                  <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.dangerBg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><Ionicons name="wallet-outline" size={17} color={colors.danger} /></View>
                  <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textMuted, marginBottom: 5 }}>Unpaid</Text>
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
                  borderRadius: 18,
                }}>
                  <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.warningBg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><Ionicons name="chatbubble-ellipses-outline" size={17} color={colors.warningText} /></View>
                  <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textMuted, marginBottom: 5 }}>Complaints</Text>
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
                  borderRadius: 18,
                }}>
                  <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><Ionicons name="bed-outline" size={17} color={colors.successText} /></View>
                  <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textMuted, marginBottom: 5 }}>Vacant</Text>
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
                  Unpaid balances
                </Text>
              </View>

              {unpaidTenants.length === 0 ? (
                <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: 18, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Ionicons name="checkmark-circle-outline" size={24} color={colors.successText} />
                  <Text style={{ flex: 1, color: colors.textSecondary, fontSize: fs(14), lineHeight: 20 }}>No unpaid balances to follow up right now.</Text>
                </View>
              ) : unpaidTenants.map((tenant) => (
                <View
                  key={tenant.id}
                  style={{
                    ...cardStyle,
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    padding: isMobile ? 14 : 18,
                    borderRadius: 16,
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
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
