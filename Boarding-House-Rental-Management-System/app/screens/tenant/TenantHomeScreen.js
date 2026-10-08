import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isMobile, isDesktop, getResponsivePadding, fs, spacing, cardStyle, cardShadow } from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import { getCurrentTenant, getTenantBillingBreakdown, getAnnouncements, getTenantExtensionRequests, submitDueDateExtensionRequest } from '../../services/dataService';
import AnnouncementDetailsModal from '../../components/AnnouncementDetailsModal';

const formatCalendarDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const getAnnouncementTime = (announcement) => {
  const idTime = Number(String(announcement.announcement_id || announcement.id || '').match(/\d{10,}/)?.[0]);
  if (Number.isFinite(idTime)) return idTime;
  const dateTime = Date.parse(announcement.created_at || announcement.date || '');
  return Number.isNaN(dateTime) ? 0 : dateTime;
};

export default function TenantHomeScreen({ user, onNavigateToUpdates }) {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1180 : '100%';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [billing, setBilling] = useState(null);
  const [latestNotice, setLatestNotice] = useState(null);
  const [extensionRequests, setExtensionRequests] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extensionSubmitted, setExtensionSubmitted] = useState(false);
  const [requestedDueDate, setRequestedDueDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [extensionError, setExtensionError] = useState('');
  const [extensionSubmitting, setExtensionSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchTenantData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [tenantData, billingData, announcementsData, extensionData] = await Promise.all([
          getCurrentTenant(user?.tenant_id),
          getTenantBillingBreakdown(user?.tenant_id),
          getAnnouncements(),
          getTenantExtensionRequests(user?.tenant_id),
        ]);
        if (isMounted) {
          setTenant(tenantData);
          setBilling(billingData);
          const latestAnnouncement = [...(announcementsData || [])].sort((a, b) => getAnnouncementTime(b) - getAnnouncementTime(a))[0] || null;
          setLatestNotice(latestAnnouncement);
          setExtensionRequests(extensionData);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load tenant dashboard. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTenantData();
    return () => {
      isMounted = false;
    };
  }, [user?.tenant_id, refreshKey]);

  const sendExtensionRequest = async () => {
    const requestedDate = new Date(requestedDueDate);
    if (!requestedDueDate.trim() || Number.isNaN(requestedDate.getTime())) {
      setExtensionError('Enter a valid requested date, such as Oct 12, 2026.');
      return;
    }
    const currentDueDate = new Date(tenant?.dueDate);
    if (!Number.isNaN(currentDueDate.getTime()) && requestedDate <= currentDueDate) {
      setExtensionError('The requested date must be after your current due date.');
      return;
    }

    try {
      setExtensionSubmitting(true);
      setExtensionError('');
      const request = await submitDueDateExtensionRequest({
        tenantId: user?.tenant_id,
        requestedDueDate: requestedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        reason: extensionReason,
      });
      setExtensionRequests((current) => [request, ...current]);
      setExtensionSubmitted(true);
    } catch (submitError) {
      setExtensionError(submitError.message || 'Could not send your request. Please try again.');
    } finally {
      setExtensionSubmitting(false);
    }
  };

  const hasPendingExtension = extensionRequests.some((request) => request.status === 'pending');

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
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
          paddingBottom: 24,
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
          </View>
            <View style={{ paddingHorizontal: padding, gap: spacing.xl, paddingBottom: 24 }}>
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

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10 }}>
                  <Text style={{ fontSize: fs(12), fontWeight: '800', color: colors.heroSubtext, letterSpacing: 1, textTransform: 'uppercase' }}>
                    Outstanding balance
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)' }}>
                    <Ionicons name={tenant.outstandingBalance > 0 ? 'time-outline' : 'checkmark-circle-outline'} size={14} color={colors.heroText} />
                    <Text style={{ fontSize: fs(11), fontWeight: '800', color: colors.heroText }}>{tenant.outstandingBalance > 0 ? 'PAYMENT DUE' : 'ALL CAUGHT UP'}</Text>
                  </View>
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

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      if (hasPendingExtension) return;
                      setExtensionSubmitted(false);
                      setExtensionError('');
                      setExtensionReason('');
                      setCalendarVisible(false);
                      const dueDate = new Date(tenant.dueDate);
                      setCalendarMonth(Number.isNaN(dueDate.getTime()) ? new Date() : dueDate);
                      const due = new Date(tenant.dueDate);
                      if (!Number.isNaN(due.getTime())) {
                        due.setDate(due.getDate() + 7);
                        setRequestedDueDate(due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
                      } else {
                        setRequestedDueDate('');
                      }
                      setShowExtensionModal(true);
                    }}
                    style={{
                      flex: isMobile ? 1 : undefined,
                      paddingHorizontal: 20,
                      paddingVertical: 13,
                      borderRadius: 14,
                      backgroundColor: colors.heroBarBg,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 48,
                      pointerEvents: hasPendingExtension ? 'none' : 'auto',
                      opacity: hasPendingExtension ? 0.65 : 1,
                      flexDirection: 'row',
                      gap: 8,
                    }}
                  >
                    <Ionicons name="calendar-outline" size={17} color={colors.heroText} />
                    <Text style={{
                      fontSize: fs(14),
                      fontWeight: '700',
                      color: colors.heroText,
                    }}>
                      {hasPendingExtension ? 'Extension Pending' : 'Request Extension'}
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
                    <Text style={{ fontSize: fs(14), color: colors.textSecondary, fontWeight: '600' }}>Monthly rent</Text>
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
                  <Text style={{ fontSize: fs(15), color: colors.textSecondary, fontWeight: '600' }}>
                    {billing.water}
                  </Text>
                </View>

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
            {extensionRequests.length > 0 && (
              <View>
                <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text, marginBottom: 12 }}>Due Date Requests</Text>
                <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: 18, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.warningBg, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="calendar-outline" size={19} color={colors.warningText} />
                  </View>
                  <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fs(14), color: colors.text, fontWeight: '700' }}>Latest request</Text>
                  <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginTop: 5 }}>
                    {extensionRequests[0].currentDueDate} → {extensionRequests[0].requestedDueDate} · {extensionRequests[0].status}
                  </Text>
                  </View>
                </View>
              </View>
            )}

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
                {!!latestNotice && <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />}
              </View>

              {latestNotice && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSelectedAnnouncement(latestNotice)}
                  style={{
                    ...cardStyle,
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    borderRadius: 20,
                    overflow: 'hidden',
                    padding: isMobile ? 18 : 22,
                  }}
                >
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
                      {latestNotice.category}
                    </Text>
                  </View>

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
                    {latestNotice.description}
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
            padding: 24,
            ...cardShadow,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="receipt" size={22} color={colors.accent} />
                <Text style={{ fontSize: fs(18), fontWeight: '800', color: colors.text }}>
                  Payment Receipt
                </Text>
              </View>
            <TouchableOpacity onPress={() => setShowReceiptModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
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
                backgroundColor: colors.primary,
                paddingVertical: 14,
                  borderRadius: 12,
                  overflow: 'hidden',
                alignItems: 'center',
                minHeight: 48,
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: fs(15), fontWeight: '800', color: colors.onPrimary }}>
                Close Receipt
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Request Extension Modal ─────────────────── */}
      <Modal
        visible={showExtensionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExtensionModal(false)}
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
            padding: 24,
            ...cardShadow,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: fs(18), fontWeight: '800', color: colors.text }}>
                Request Due Date Extension
              </Text>
              <TouchableOpacity onPress={() => setShowExtensionModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {extensionSubmitted ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Ionicons name="checkmark-circle" size={54} color={colors.success} />
                <Text style={{ fontSize: fs(16), fontWeight: '800', color: colors.text, marginTop: 12 }}>
                  Request Sent!
                </Text>
                <Text style={{ fontSize: fs(14), color: colors.textMuted, textAlign: 'center', marginTop: 6 }}>
                  Your request for {requestedDueDate} was saved for caretaker review.
                </Text>
                <TouchableOpacity
                  onPress={() => setShowExtensionModal(false)}
                  style={{
                    marginTop: 20,
                    backgroundColor: colors.primary,
                    paddingHorizontal: 24,
                    paddingVertical: 13,
                    borderRadius: 12,
                    minHeight: 48,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: colors.onPrimary, fontWeight: '800', fontSize: fs(14) }}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={{ fontSize: fs(14), color: colors.textSecondary, marginBottom: 14, lineHeight: 21 }}>
                  Current balance is <Text style={{ fontWeight: '800', color: colors.text }}>₱{tenant.outstandingBalance.toLocaleString()}</Text> due on <Text style={{ fontWeight: '800', color: colors.text }}>{tenant.dueDate}</Text>. Choose a requested date and add a reason for the caretaker.
                </Text>

                <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>Requested due date *</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Choose requested due date from calendar"
                  onPress={() => setCalendarVisible((visible) => !visible)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.searchBg, borderColor: colors.searchBorder, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, marginBottom: calendarVisible ? 10 : 12 }}
                >
                  <Ionicons name="calendar-outline" size={19} color={colors.accent} />
                  <Text style={{ flex: 1, fontSize: fs(15), color: requestedDueDate ? colors.text : colors.textMuted }}>{requestedDueDate || 'Select a date'}</Text>
                  <Ionicons name={calendarVisible ? 'chevron-up' : 'chevron-down'} size={17} color={colors.textMuted} />
                </TouchableOpacity>
                {calendarVisible && (() => {
                  const year = calendarMonth.getFullYear();
                  const month = calendarMonth.getMonth();
                  const firstWeekday = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
                  const dueDate = new Date(tenant.dueDate);
                  dueDate.setHours(0, 0, 0, 0);
                  return (
                    <View style={{ padding: 12, marginBottom: 12, borderRadius: 14, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setCalendarMonth(new Date(year, month - 1, 1))} style={{ padding: 6 }}>
                          <Ionicons name="chevron-back" size={19} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: fs(14), fontWeight: '800', color: colors.text }}>{calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setCalendarMonth(new Date(year, month + 1, 1))} style={{ padding: 6 }}>
                          <Ionicons name="chevron-forward" size={19} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                      <View style={{ flexDirection: 'row' }}>
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={`${day}-${index}`} style={{ flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: fs(11), fontWeight: '700', paddingVertical: 6 }}>{day}</Text>)}
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {cells.map((day, index) => {
                          const selected = day && requestedDueDate === formatCalendarDate(new Date(year, month, day));
                          const chosenDate = day ? new Date(year, month, day) : null;
                          if (chosenDate) chosenDate.setHours(0, 0, 0, 0);
                          const disabled = !day || (Number.isNaN(dueDate.getTime()) ? false : chosenDate <= dueDate);
                          return (
                            <TouchableOpacity
                              key={`day-${index}`}
                              disabled={disabled}
                              accessibilityRole={day ? 'button' : undefined}
                              accessibilityLabel={day ? formatCalendarDate(new Date(year, month, day)) : undefined}
                              onPress={() => { setRequestedDueDate(formatCalendarDate(new Date(year, month, day))); setExtensionError(''); setCalendarVisible(false); }}
                              style={{ width: '14.285%', height: 38, alignItems: 'center', justifyContent: 'center' }}
                            >
                              {day ? <Text style={{ width: 32, height: 32, textAlign: 'center', textAlignVertical: 'center', lineHeight: 32, borderRadius: 16, overflow: 'hidden', backgroundColor: selected ? colors.primary : 'transparent', color: selected ? colors.onPrimary : disabled ? colors.textMuted : colors.text, opacity: disabled ? 0.4 : 1, fontSize: fs(13), fontWeight: selected ? '800' : '500' }}>{day}</Text> : null}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })()}
                <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>Reason (Optional)</Text>
                <TextInput
                  value={extensionReason}
                  onChangeText={(value) => { setExtensionReason(value); setExtensionError(''); }}
                  placeholder="Add a short explanation for your request"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={{ minHeight: 72, textAlignVertical: 'top', backgroundColor: colors.searchBg, borderColor: colors.searchBorder, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: fs(15), color: colors.text, marginBottom: 12 }}
                />
                {!!extensionError && <Text style={{ color: colors.danger, fontSize: fs(13), fontWeight: '600', marginBottom: 12 }}>{extensionError}</Text>}

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setShowExtensionModal(false)}
                    style={{
                      flex: 1,
                      backgroundColor: colors.bg,
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      minHeight: 48,
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.textMuted }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={extensionSubmitting ? undefined : sendExtensionRequest}
                    accessibilityState={{ disabled: extensionSubmitting }}
                    style={{
                      pointerEvents: extensionSubmitting ? 'none' : 'auto',
                      flex: 1,
                      backgroundColor: colors.primary,
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: 'center',
                      minHeight: 48,
                      justifyContent: 'center',
                      opacity: extensionSubmitting ? 0.6 : 1,
                    }}
                  >
                    {extensionSubmitting ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Text style={{ fontSize: fs(15), fontWeight: '800', color: colors.onPrimary }}>Send Request</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
