import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isMobile, isDesktop, getResponsivePadding, fs, spacing, cardStyle, cardShadow } from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import { getCurrentTenant, getTenantBillingBreakdown, getAnnouncements, getTenantNotifications } from '../../services/dataService';
import AnnouncementDetailsModal from '../../components/AnnouncementDetailsModal';
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';

const getAnnouncementTime = (announcement) => {
  const idTime = Number(String(announcement.announcement_id || announcement.id || '').match(/\d{10,}/)?.[0]);
  if (Number.isFinite(idTime)) return idTime;
  const dateTime = Date.parse(announcement.created_at || announcement.date || '');
  return Number.isNaN(dateTime) ? 0 : dateTime;
};

const formatApprovalDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-PH', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function TenantHomeScreen({ user, onNavigateToNotifications, onNavigateToApplication }) {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1180 : '100%';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [billing, setBilling] = useState(null);
  const [latestNotice, setLatestNotice] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const hasLoadedOnce = useRef(false);

  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useRealtimeRefresh(`tenant-home-${user?.tenant_id || 'unknown'}`, [
    { table: 'tenants', filter: `id=eq.${user?.tenant_id || ''}` },
    { table: 'tenant_notifications', filter: `tenant_id=eq.${user?.tenant_id || ''}` },
    { table: 'announcements' },
    { table: 'invoices' },
    { table: 'payment_proofs', filter: `tenant_id=eq.${user?.tenant_id || ''}` },
    { table: 'room_assignment_requests', filter: `tenant_id=eq.${user?.tenant_id || ''}` },
    { table: 'leases', filter: `tenant_id=eq.${user?.tenant_id || ''}` },
  ], () => setRefreshKey((key) => key + 1), Boolean(user?.tenant_id));

  useEffect(() => {
    let isMounted = true;
    const fetchTenantData = async () => {
      try {
        if (!hasLoadedOnce.current) setLoading(true);
        setError(null);
        const [tenantData, billingData, announcementsData, notificationsData] = await Promise.all([
          getCurrentTenant(user?.tenant_id),
          getTenantBillingBreakdown(user?.tenant_id),
          getAnnouncements(),
          getTenantNotifications(user?.tenant_id),
        ]);
        if (isMounted) {
          setTenant(tenantData);
          setBilling(billingData);
          const announcements = (announcementsData || []).map((announcement) => ({
            ...announcement,
            type: 'announcement',
            message: announcement.description,
            created_at: new Date(getAnnouncementTime(announcement)).toISOString(),
            announcement,
          }));
          const notices = [...(notificationsData || []), ...announcements]
            .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
          setLatestNotice(notices[0] || null);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load tenant dashboard. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          hasLoadedOnce.current = true;
        }
      }
    };

    fetchTenantData();
    return () => {
      isMounted = false;
    };
  }, [user?.tenant_id, refreshKey]);

  if (loading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ paddingBottom: spacing.sm, alignItems: isDesktop ? 'center' : 'stretch' }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          <View style={{ padding, paddingTop: isMobile ? 16 : isDesktop ? 28 : 24, paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: colors.cardBorder }} />
              <View style={{ flex: 1, gap: 8 }}>
                <View style={{ width: 100, height: 10, borderRadius: 5, backgroundColor: colors.cardBorder }} />
                <View style={{ width: '68%', height: 20, borderRadius: 7, backgroundColor: colors.cardBorder }} />
                <View style={{ width: '42%', height: 12, borderRadius: 6, backgroundColor: colors.cardBorder }} />
              </View>
            </View>
            <View style={{ width: '76%', height: 12, borderRadius: 6, backgroundColor: colors.cardBorder, marginTop: 16 }} />
          </View>

          <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 18, marginHorizontal: 16, marginBottom: 18 }}>
            <View style={{ width: '58%', height: 16, borderRadius: 8, backgroundColor: colors.cardBorder, marginBottom: 14 }} />
            <View style={{ width: '88%', height: 12, borderRadius: 6, backgroundColor: colors.cardBorder, marginBottom: 8 }} />
            <View style={{ width: '70%', height: 12, borderRadius: 6, backgroundColor: colors.cardBorder, marginBottom: 18 }} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[0, 1].map((item) => (
                <View key={item} style={{ flex: 1, height: 84, borderRadius: 12, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder }} />
              ))}
            </View>
            <View style={{ width: '90%', height: 12, borderRadius: 6, backgroundColor: colors.cardBorder, marginTop: 16 }} />
            <View style={{ height: 42, borderRadius: 11, backgroundColor: colors.cardBorder, marginTop: 14 }} />
          </View>

          <View style={{ paddingHorizontal: padding, gap: spacing.md }}>
            <View style={{ height: 210, borderRadius: 26, backgroundColor: colors.cardBorder }} />
            <View style={{ height: 130, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }} />
            <View style={{ height: 100, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }} />
          </View>
        </View>
      </ScrollView>
    );
  }

  if (error || !tenant || !billing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg, padding: 20 }}>
        <Text style={{ color: colors.danger, fontSize: fs(16), textAlign: 'center', fontWeight: '600' }}>
          {error || 'Your profile is not available yet. Please sign in again or contact the property administrator.'}
        </Text>
        {!!error && <TouchableOpacity onPress={() => setRefreshKey((key) => key + 1)} style={{ marginTop: 18, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: 999, overflow: 'hidden' }}><Text style={{ color: colors.onPrimary, fontWeight: '700' }}>Try again</Text></TouchableOpacity>}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: spacing.sm,
          alignItems: isDesktop ? 'center' : 'stretch',
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          {/* Header */}
          <View style={{ padding, paddingTop: isMobile ? 16 : isDesktop ? 28 : 24, paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.accent, fontSize: fs(18), fontWeight: '900' }}>{tenant.initials || tenant.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fs(12), color: colors.textMuted, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 3 }}>TENANT PORTAL</Text>
                <Text style={{ fontSize: fs(26), color: colors.text, fontWeight: '900', letterSpacing: -0.6 }} numberOfLines={1}>{tenant.name}</Text>
                <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginTop: 3, fontWeight: '500' }}>
                  {tenant.roomNumber ? `Room ${tenant.roomNumber} · ${tenant.roomType}` : 'Room assignment pending'}
                </Text>
                {tenant.accountStatus === 'approved' && formatApprovalDate(tenant.approvedAt) && (
                  <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 3 }}>
                    Approved on {formatApprovalDate(tenant.approvedAt)}
                  </Text>
                )}
              </View>
              {!!tenant.roomNumber && (
                <View style={{ backgroundColor: colors.successBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.successText} />
                  <Text style={{ fontSize: fs(11), color: colors.successText, fontWeight: '800' }}>ACTIVE</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: fs(14), color: colors.textMuted, lineHeight: 21, marginTop: 14 }}>
              Your home, billing, and property updates in one place.
            </Text>
            {tenant.accountStatus === 'approved' && (
              <TouchableOpacity
                onPress={onNavigateToApplication}
                accessibilityRole="button"
                accessibilityLabel="View room and application details"
                activeOpacity={0.75}
                style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingVertical: 7 }}
              >
                <Ionicons name="document-text-outline" size={15} color={colors.accent} />
                <Text style={{ fontSize: fs(12), color: colors.accent, fontWeight: '700' }}>Room & application details</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.accent} />
              </TouchableOpacity>
            )}
          </View>
            {tenant.accountStatus === 'approved' ? (
            <View style={{ paddingHorizontal: padding, gap: spacing.xl, paddingBottom: 0 }}>
            {/* ── Outstanding Balance Hero Card ────────────── */}
            <View style={{
              borderRadius: 26,
              overflow: 'hidden',
              backgroundColor: colors.heroBg,
              ...cardShadow,
            }}>
              <View style={{
                padding: isMobile ? 22 : 32,
                position: 'relative',
              }}>
                <View style={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 140,
                  height: 140,
                  borderRadius: 70,
                  backgroundColor: colors.heroBarBg,
                }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 12, gap: 8 }}>
                  <Ionicons name="cash-outline" size={18} color={colors.heroText} />
                  <Text style={{ fontSize: fs(12), fontWeight: '800', color: colors.heroSubtext, letterSpacing: 1, textTransform: 'uppercase' }}>
                    Outstanding balance
                  </Text>
                </View>

                <Text style={{
                  fontSize: isMobile ? fs(38) : fs(46),
                  fontWeight: '900',
                  color: colors.heroText,
                  marginBottom: 6,
                  letterSpacing: -0.5,
                }}>
                  ₱{tenant.outstandingBalance.toLocaleString()}
                </Text>

                <Text style={{
                  fontSize: fs(13),
                  color: colors.heroSubtext,
                  marginBottom: 22,
                  fontWeight: '500',
                }}>
                  Due: {tenant.dueDate}
                </Text>

                {/* Hero Action Buttons */}
                <View style={{
                  flexDirection: 'row',
                  gap: 10,
                  flexWrap: isMobile ? 'wrap' : 'nowrap',
                }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowReceiptModal(true)}
                    style={{
                      flex: isMobile ? 1 : undefined,
                      paddingHorizontal: 20,
                      paddingVertical: 13,
                      borderRadius: 14,
                      overflow: 'hidden',
                      backgroundColor: colors.heroText,
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 48,
                      flexDirection: 'row',
                      gap: 8,
                    }}
                  >
                    <Ionicons name="receipt-outline" size={17} color={colors.heroBg} />
                    <Text style={{
                      fontSize: fs(14),
                      fontWeight: '800',
                      color: colors.heroBg,
                    }}>
                      View Receipt
                    </Text>
                  </TouchableOpacity>

                </View>
              </View>
            </View>

            {/* ── September Billing Breakdown ─────────────── */}
            <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing.lg, alignItems: 'stretch' }}>
            <View style={{ flex: isDesktop ? 1 : undefined, width: isDesktop ? undefined : '100%' }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="receipt-outline" size={19} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fs(16), fontWeight: '800', color: colors.text }}>Billing overview</Text>
                  <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 2 }}>{billing.month || 'Current period'}</Text>
                </View>
              </View>

              <View style={{
                ...cardStyle,
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                borderRadius: 22,
                paddingHorizontal: isMobile ? 18 : 22,
                paddingVertical: 8,
              }}>
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 14,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="home-outline" size={17} color={colors.textMuted} />
                    <Text style={{ fontSize: fs(14), color: colors.textSecondary, fontWeight: '600' }}>{billing.invoiceType === 'initial' ? '1 Month Advance' : 'Monthly rent'}</Text>
                  </View>
                  <Text style={{ fontSize: fs(16), color: colors.text, fontWeight: '700' }}>
                    ₱{billing.monthlyRent.toLocaleString()}
                  </Text>
                </View>

                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: colors.divider,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="flash-outline" size={17} color={colors.textMuted} />
                    <Text style={{ fontSize: fs(14), color: colors.textSecondary, fontWeight: '600' }}>Electricity</Text>
                  </View>
                  <Text style={{ fontSize: fs(16), color: colors.text, fontWeight: '700' }}>
                    ₱{billing.electricity.toLocaleString()}
                  </Text>
                </View>

                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: colors.divider,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="water-outline" size={17} color={colors.textMuted} />
                    <Text style={{ fontSize: fs(14), color: colors.textSecondary, fontWeight: '600' }}>Water</Text>
                  </View>
                  <Text style={{ fontSize: fs(16), color: colors.text, fontWeight: '700' }}>₱0</Text>
                </View>

                {(billing.additionalCharges || []).map((charge, index) => (
                  <View key={charge.id || `${charge.label}-${index}`} style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 14,
                    borderTopWidth: 1,
                    borderTopColor: colors.divider,
                  }}>
                    <Text style={{ fontSize: fs(14), color: colors.textSecondary, fontWeight: '600' }}>{charge.label || 'Additional charge'}</Text>
                    <Text style={{ fontSize: fs(15), color: colors.text, fontWeight: '700' }}>₱{Number(charge.amount || 0).toLocaleString()}</Text>
                  </View>
                ))}

                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 16,
                  borderTopWidth: 1,
                  borderTopColor: colors.divider,
                  backgroundColor: colors.accentBg,
                  borderRadius: 13,
                  paddingHorizontal: 12,
                  marginTop: 5,
                }}>
                  <Text style={{ fontSize: fs(16), color: colors.text, fontWeight: '800' }}>
                    Total Due
                  </Text>
                  <Text style={{ fontSize: fs(17), color: colors.accent, fontWeight: '900' }}>
                    ₱{billing.totalDue.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            </View>
            <View style={{ flex: isDesktop ? 1 : undefined, width: isDesktop ? undefined : '100%', gap: spacing.lg }}>
            {/* ── Latest Notice Section ──────────────────── */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="notifications-outline" size={19} color={colors.successText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fs(16), fontWeight: '800', color: colors.text }}>Latest notice</Text>
                  <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 2 }}>Updates from your property</Text>
                </View>
                <TouchableOpacity
                  onPress={onNavigateToNotifications}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Open notifications"
                >
                  <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {latestNotice && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    if (latestNotice.announcement) {
                      setSelectedAnnouncement(latestNotice.announcement);
                    } else {
                      onNavigateToNotifications?.();
                    }
                  }}
                  style={{
                    ...cardStyle,
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    borderRadius: 20,
                    overflow: 'hidden',
                    padding: isMobile ? 18 : 22,
                  }}
                >
                  {String(latestNotice.category || latestNotice.type || '').toLowerCase() !== 'payment_verified' && (
                    <View style={{
                      backgroundColor: colors.warningBg,
                      alignSelf: 'flex-start',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      marginBottom: 10,
                    }}>
                      <Text style={{
                        fontSize: fs(12),
                        fontWeight: '800',
                        color: colors.warningText,
                      }}>
                        {latestNotice.category || latestNotice.type}
                      </Text>
                    </View>
                  )}

                  <Text style={{
                    fontSize: fs(16),
                    fontWeight: '800',
                    color: colors.text,
                    marginBottom: 6,
                  }}>
                    {latestNotice.title}
                  </Text>

                  <Text
                    style={{
                      fontSize: fs(14),
                      color: colors.textSecondary,
                      lineHeight: 21,
                    }}
                    numberOfLines={2}
                  >
                    {latestNotice.message || latestNotice.description}
                  </Text>
                </TouchableOpacity>
              )}
              {!latestNotice && (
                <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Ionicons name="checkmark-done-circle-outline" size={24} color={colors.success} />
                  <Text style={{ flex: 1, color: colors.textMuted, fontSize: fs(13), lineHeight: 19 }}>You’re all caught up. New property updates will appear here.</Text>
                </View>
              )}
            </View>
            </View>
            </View>
          </View>
            ) : (
              <View style={{ paddingHorizontal: padding, paddingBottom: 24 }}>
                <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 22, alignItems: 'center' }}>
                  <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Ionicons name="home-outline" size={24} color={colors.accent} />
                  </View>
                  <Text style={{ fontSize: fs(18), color: colors.text, fontWeight: '800', textAlign: 'center' }}>Welcome to your tenant dashboard</Text>
                  <Text style={{ fontSize: fs(13), color: colors.textSecondary, lineHeight: 20, textAlign: 'center', marginTop: 7 }}>
                    Set up your application by choosing a room and adding your move-in payment details.
                  </Text>
                  <TouchableOpacity onPress={onNavigateToApplication} accessibilityRole="button" style={{ marginTop: 16, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 11, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: '#fff', fontSize: fs(13), fontWeight: '800' }}>Set up application</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
        </View>
      </ScrollView>

      <AnnouncementDetailsModal announcement={selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} />

      {/* ── View Receipt Modal ──────────────────────── */}
      <Modal
        visible={showReceiptModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReceiptModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}>
          <View style={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: colors.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: 24, ...cardShadow,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="receipt" size={22} color={colors.accent} />
                <Text style={{ fontSize: fs(18), fontWeight: '800', color: colors.text }}>
                  Payment Receipt
                </Text>
              </View>
            <TouchableOpacity onPress={() => setShowReceiptModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close-circle" size={26} color={colors.dangerText} />
              </TouchableOpacity>
            </View>

            {billing.receiptNumber ? <View style={{
              backgroundColor: colors.bg,
                  borderRadius: 12,
                  overflow: 'hidden',
              padding: 16,
              gap: 10,
              marginBottom: 18,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fs(13), color: colors.textMuted }}>Receipt No.</Text>
                <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.text }}>{billing.receiptNumber}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fs(13), color: colors.textMuted }}>Tenant</Text>
                <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.text }}>{tenant.name} (Room {tenant.roomNumber})</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fs(13), color: colors.textMuted }}>Period</Text>
                <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.text }}>{billing.month || 'Current period'}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fs(13), color: colors.textMuted }}>Payment Date</Text>
                <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.text }}>{billing.paymentDate || '—'}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fs(13), color: colors.textMuted }}>Payment Method</Text>
                <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.text }}>{billing.paymentMethod || '—'}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fs(13), color: colors.textMuted }}>Amount Paid</Text>
                <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.success }}>₱{billing.receiptAmount.toLocaleString()}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 8 }}>
                <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.textMuted }}>Balance Due</Text>
                <Text style={{ fontSize: fs(14), fontWeight: '900', color: colors.danger }}>₱{tenant.outstandingBalance.toLocaleString()}</Text>
              </View>
            </View> : <View style={{ backgroundColor: colors.bg, borderRadius: 12, padding: 18, marginBottom: 18 }}><Text style={{ color: colors.textSecondary, fontSize: fs(14), lineHeight: 21 }}>No payment receipt is available for this billing period yet.</Text></View>}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowReceiptModal(false)}
              style={{
                backgroundColor: colors.dangerText,
                paddingVertical: 14,
                  borderRadius: 12,
                  overflow: 'hidden',
                alignItems: 'center',
                minHeight: 48,
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: fs(15), fontWeight: '800', color: '#fff' }}>
                Close Receipt
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


    </View>
  );
}
