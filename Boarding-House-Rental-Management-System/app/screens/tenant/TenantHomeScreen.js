import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isMobile, isDesktop, getResponsivePadding, fs, spacing, cardStyle, cardShadow, safeAreaTop } from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import { getCurrentTenant, getTenantBillingBreakdown, getAnnouncements } from '../../services/dataService';

export default function TenantHomeScreen({ onNavigateToUpdates }) {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1400 : '100%';

  const tenant = getCurrentTenant('2');
  const billing = getTenantBillingBreakdown('2');
  const announcements = getAnnouncements();
  const latestNotice = announcements[0];

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extensionSubmitted, setExtensionSubmitted] = useState(false);

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
          <View style={{ padding, paddingTop: isMobile ? safeAreaTop + 16 : isDesktop ? 40 : 60 }}>
            <Text style={{
              fontSize: fs(11),
              color: colors.textMuted,
              fontWeight: '700',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}>
              Welcome Back
            </Text>
            <Text style={{
              fontSize: fs(30),
              color: colors.text,
              fontWeight: '800',
              letterSpacing: -0.5,
            }}>
              {tenant.name}
            </Text>
            <Text style={{
              fontSize: fs(13),
              color: colors.textSecondary,
              marginTop: 4,
              fontWeight: '500',
            }}>
              Room {tenant.roomNumber} · {tenant.roomType}
            </Text>
          </View>

          <View style={{ paddingHorizontal: padding, gap: spacing.lg }}>
            {/* ── Outstanding Balance Hero Card ────────────── */}
            <View style={{
              borderRadius: 22,
              overflow: 'hidden',
              backgroundColor: '#5b21b6',
              ...cardShadow,
            }}>
              <View style={{
                padding: isMobile ? 22 : 28,
                position: 'relative',
              }}>
                {/* Decorative translucent circle accent on the right */}
                <View style={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 140,
                  height: 140,
                  borderRadius: 70,
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                }} />

                <Text style={{
                  fontSize: fs(10),
                  fontWeight: '800',
                  color: 'rgba(255, 255, 255, 0.75)',
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}>
                  Outstanding Balance
                </Text>

                <Text style={{
                  fontSize: fs(38),
                  fontWeight: '900',
                  color: '#ffffff',
                  marginBottom: 6,
                  letterSpacing: -0.5,
                }}>
                  ₱{tenant.outstandingBalance.toLocaleString()}
                </Text>

                <Text style={{
                  fontSize: fs(12),
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginBottom: 20,
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
                  {/* View Receipt Button */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowReceiptModal(true)}
                    style={{
                      flex: isMobile ? 1 : undefined,
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      borderRadius: 24,
                      backgroundColor: '#ffffff',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{
                      fontSize: fs(13),
                      fontWeight: '800',
                      color: '#5b21b6',
                    }}>
                      View Receipt
                    </Text>
                  </TouchableOpacity>

                  {/* Request Extension Button */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setExtensionSubmitted(false);
                      setShowExtensionModal(true);
                    }}
                    style={{
                      flex: isMobile ? 1 : undefined,
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      borderRadius: 24,
                      backgroundColor: 'rgba(255, 255, 255, 0.18)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{
                      fontSize: fs(13),
                      fontWeight: '700',
                      color: '#ffffff',
                    }}>
                      Request Extension
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ── September Billing Breakdown ─────────────── */}
            <View>
              <Text style={{
                fontSize: fs(11),
                fontWeight: '800',
                color: colors.textSecondary,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}>
                September Billing
              </Text>

              <View style={{
                ...cardStyle,
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                paddingHorizontal: isMobile ? 18 : 22,
                paddingVertical: 10,
              }}>
                {/* Monthly Rent */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 14,
                }}>
                  <Text style={{ fontSize: fs(14), color: colors.textSecondary, fontWeight: '500' }}>
                    Monthly Rent
                  </Text>
                  <Text style={{ fontSize: fs(15), color: colors.text, fontWeight: '700' }}>
                    ₱{billing.monthlyRent.toLocaleString()}
                  </Text>
                </View>

                {/* Electricity */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: colors.divider,
                }}>
                  <Text style={{ fontSize: fs(14), color: colors.textSecondary, fontWeight: '500' }}>
                    Electricity
                  </Text>
                  <Text style={{ fontSize: fs(15), color: colors.text, fontWeight: '700' }}>
                    ₱{billing.electricity.toLocaleString()}
                  </Text>
                </View>

                {/* Water */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: colors.divider,
                }}>
                  <Text style={{ fontSize: fs(14), color: colors.textSecondary, fontWeight: '500' }}>
                    Water
                  </Text>
                  <Text style={{ fontSize: fs(14), color: colors.textSecondary, fontWeight: '600' }}>
                    {billing.water}
                  </Text>
                </View>

                {/* Total Due */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 16,
                  borderTopWidth: 1,
                  borderTopColor: colors.divider,
                }}>
                  <Text style={{ fontSize: fs(15), color: colors.text, fontWeight: '800' }}>
                    Total Due
                  </Text>
                  <Text style={{ fontSize: fs(16), color: '#a78bfa', fontWeight: '900' }}>
                    ₱{billing.totalDue.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Latest Notice Section ──────────────────── */}
            <View>
              <Text style={{
                fontSize: fs(11),
                fontWeight: '800',
                color: colors.textSecondary,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}>
                Latest Notice
              </Text>

              {latestNotice && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onNavigateToUpdates}
                  style={{
                    ...cardStyle,
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    padding: isMobile ? 18 : 22,
                  }}
                >
                  {/* Category Badge */}
                  <View style={{
                    backgroundColor: 'rgba(217, 119, 6, 0.15)',
                    alignSelf: 'flex-start',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                    marginBottom: 10,
                  }}>
                    <Text style={{
                      fontSize: fs(11),
                      fontWeight: '800',
                      color: '#f59e0b',
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
                      fontSize: fs(13),
                      color: colors.textSecondary,
                      lineHeight: 20,
                    }}
                    numberOfLines={2}
                  >
                    {latestNotice.description}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

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
                <Ionicons name="receipt" size={22} color="#8b5cf6" />
                <Text style={{ fontSize: fs(18), fontWeight: '800', color: colors.text }}>
                  Official Receipt
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowReceiptModal(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{
              backgroundColor: colors.bg,
              borderRadius: 12,
              padding: 16,
              gap: 10,
              marginBottom: 18,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fs(12), color: colors.textMuted }}>Receipt No.</Text>
                <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.text }}>OR-2026-0902</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fs(12), color: colors.textMuted }}>Tenant</Text>
                <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.text }}>Ana Reyes (Room 2)</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fs(12), color: colors.textMuted }}>Period</Text>
                <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.text }}>September 2026</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fs(12), color: colors.textMuted }}>Amount Paid</Text>
                <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.success }}>₱2,340.00</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 8 }}>
                <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textMuted }}>Balance Due</Text>
                <Text style={{ fontSize: fs(13), fontWeight: '900', color: colors.danger }}>₱500.00</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowReceiptModal(false)}
              style={{
                backgroundColor: '#8b5cf6',
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: fs(14), fontWeight: '800', color: '#ffffff' }}>
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
              <TouchableOpacity onPress={() => setShowExtensionModal(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {extensionSubmitted ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Ionicons name="checkmark-circle" size={54} color={colors.success} />
                <Text style={{ fontSize: fs(16), fontWeight: '800', color: colors.text, marginTop: 12 }}>
                  Request Sent!
                </Text>
                <Text style={{ fontSize: fs(13), color: colors.textMuted, textAlign: 'center', marginTop: 6 }}>
                  The caretaker and owner have been notified. New requested due date: Oct 12, 2026.
                </Text>
                <TouchableOpacity
                  onPress={() => setShowExtensionModal(false)}
                  style={{
                    marginTop: 20,
                    backgroundColor: '#8b5cf6',
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '800' }}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginBottom: 16, lineHeight: 20 }}>
                  Current balance is <Text style={{ fontWeight: '800', color: colors.text }}>₱500</Text> due on <Text style={{ fontWeight: '800', color: colors.text }}>Oct 5, 2026</Text>. Would you like to request an extension of +7 days to Oct 12, 2026?
                </Text>

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
                    }}
                  >
                    <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.textMuted }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setExtensionSubmitted(true)}
                    style={{
                      flex: 1,
                      backgroundColor: '#8b5cf6',
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: fs(14), fontWeight: '800', color: '#ffffff' }}>Send Request</Text>
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

