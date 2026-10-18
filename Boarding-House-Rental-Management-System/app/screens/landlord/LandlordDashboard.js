import ScreenSkeleton from '../../components/ScreenSkeleton';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isMobile, isDesktop, getResponsivePadding, fs, spacing, cardStyle, cardShadow } from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import { getBoardingHouseConfig, getRevenue, getOccupancyStats, getUnpaidStats, getIssueStats, getUnpaidTenants } from '../../services/dataService';
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';

const getCurrentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const shiftPeriod = (period, amount) => {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatPeriod = (period) => new Date(`${period}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export default function OwnerDashboard() {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1180 : '100%';

  const [loading, setLoading] = useState(true);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revenueError, setRevenueError] = useState(null);
  const [config, setConfig] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [occupancy, setOccupancy] = useState(null);
  const [unpaidStats, setUnpaidStats] = useState(null);
  const [issueStats, setIssueStats] = useState(null);
  const [unpaidTenants, setUnpaidTenants] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod);
  const [showAllUnpaid, setShowAllUnpaid] = useState(false);
  const [realtimeVersion, setRealtimeVersion] = useState(0);
  const revenueCache = useRef({});

  useRealtimeRefresh('landlord-dashboard', [
    { table: 'rooms' },
    { table: 'tenants' },
    { table: 'leases' },
    { table: 'invoices' },
    { table: 'payments' },
    { table: 'complaints' },
    { table: 'utility_readings' },
  ], () => {
    revenueCache.current = {};
    setRealtimeVersion((version) => version + 1);
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getBoardingHouseConfig(),
      getOccupancyStats(),
      getUnpaidStats(),
      getIssueStats(),
      getUnpaidTenants(),
    ])
      .then(([configData, occupancyData, unpaidStatsData, issueStatsData, unpaidTenantsData]) => {
        if (cancelled) return;
        setConfig(configData);
        setOccupancy(occupancyData);
        setUnpaidStats(unpaidStatsData);
        setIssueStats(issueStatsData);
        setUnpaidTenants(unpaidTenantsData);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Failed to load dashboard data.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [realtimeVersion]);

  useEffect(() => {
    const cachedRevenue = revenueCache.current[selectedPeriod];
    if (cachedRevenue) {
      setRevenueError(null);
      setRevenue(cachedRevenue);
      setRevenueLoading(false);
      return undefined;
    }

    let cancelled = false;
    setRevenueError(null);
    setRevenueLoading(true);
    getRevenue(selectedPeriod)
      .then((revenueData) => {
        revenueCache.current[selectedPeriod] = revenueData;
        if (!cancelled) setRevenue(revenueData);
      })
      .catch(() => {
        if (!cancelled) setRevenueError('Failed to load revenue data.');
      })
      .finally(() => {
        if (!cancelled) {
          setRevenueLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPeriod, realtimeVersion]);

  if (loading) return <ScreenSkeleton />;
  if (error) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}><Text style={{ color: colors.danger, fontSize: 16 }}>{error}</Text></View>;
  if (revenueError) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}><Text style={{ color: colors.danger, fontSize: 16 }}>{revenueError}</Text></View>;
  if (!revenue) return <ScreenSkeleton />;

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

                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                    accessibilityHint="Shows the previous month's dashboard data"
                    activeOpacity={0.75}
                    onPress={() => setSelectedPeriod((period) => shiftPeriod(period, -1))}
                    style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' }}
                  >
                    <Ionicons name="chevron-back" size={20} color="#fff" />
                  </TouchableOpacity>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: fs(10),
                      fontWeight: '800',
                      color: 'rgba(255,255,255,0.7)',
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                    }}
                  >
                    Cash received in {formatPeriod(selectedPeriod)}
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Next month"
                    accessibilityHint="Shows the next month's dashboard data"
                    activeOpacity={0.75}
                    onPress={() => setSelectedPeriod((period) => shiftPeriod(period, 1))}
                    style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' }}
                  >
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

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
                  ₱{revenue.expected.toLocaleString()} billed this month
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
                    {revenue.percentCollected}% of this month's bills collected
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
              {unpaidTenants.length > 3 && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={showAllUnpaid ? 'Show fewer unpaid balances' : 'See all unpaid balances'}
                    onPress={() => setShowAllUnpaid((showAll) => !showAll)}
                    style={{ paddingHorizontal: 10, paddingVertical: 6 }}
                  >
                    <Text style={{ color: colors.accent, fontSize: fs(13), fontWeight: '700' }}>
                      {showAllUnpaid ? 'Show less' : 'See all'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {unpaidTenants.length === 0 ? (
                <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: 18, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Ionicons name="checkmark-circle-outline" size={24} color={colors.successText} />
                  <Text style={{ flex: 1, color: colors.textSecondary, fontSize: fs(14), lineHeight: 20 }}>No unpaid balances to follow up right now.</Text>
                </View>
              ) : (showAllUnpaid ? unpaidTenants : unpaidTenants.slice(0, 3)).map((tenant) => (
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
