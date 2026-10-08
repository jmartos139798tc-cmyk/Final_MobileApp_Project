import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { isMobile, getResponsivePadding, fs, spacing, cardStyle, safeAreaTop } from '../../utils/responsive';
import { getTenantFinancialSummary, getTenantPaymentHistory } from '../../services/dataService';

export default function TenantDetailFinancial({ route, navigation }) {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const { tenantId } = route.params;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTenantDetails();
  }, [tenantId]);

  const loadTenantDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [summaryData, historyData] = await Promise.all([
        getTenantFinancialSummary(tenantId),
        getTenantPaymentHistory(tenantId),
      ]);
      
      setSummary(summaryData);
      setPaymentHistory(historyData);
    } catch (err) {
      console.error('Error loading tenant details:', err);
      setError('Failed to load tenant financial details.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getMethodIcon = (method) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return 'cash-outline';
      case 'gcash':
        return 'phone-portrait-outline';
      case 'bank_transfer':
        return 'business-outline';
      default:
        return 'wallet-outline';
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ fontSize: fs(15), color: colors.textSecondary, marginTop: 12 }}>Loading details...</Text>
      </View>
    );
  }

  if (error || !summary) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: padding }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: safeAreaTop + 16, marginBottom: 16 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ ...cardStyle, backgroundColor: colors.dangerBg, borderColor: colors.dangerText, padding: 24, alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.dangerText} />
          <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.dangerText, marginTop: 12 }}>
            {error || 'Tenant not found'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: padding, paddingTop: isMobile ? safeAreaTop + 16 : 40, paddingBottom: 100 }}
      >
        {/* Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 16 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Tenant Header */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: fs(28), color: colors.text, fontWeight: '700' }}>{summary.name}</Text>
          <Text style={{ fontSize: fs(15), color: colors.textSecondary, marginTop: 4 }}>
            {summary.roomNumber ? `Room ${summary.roomNumber}` : 'No room assigned'} 
            {summary.roomType && ` • ${summary.roomType}`}
          </Text>
          {summary.leaseStart && (
            <Text style={{ fontSize: fs(13), color: colors.textMuted, marginTop: 2 }}>
              Lease started: {formatDate(summary.leaseStart)}
            </Text>
          )}
        </View>

        {/* Financial Summary Cards */}
        <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {/* Total Collected */}
            <View style={{ ...cardStyle, backgroundColor: colors.successBg, borderColor: colors.successText, padding: 16, flex: 1 }}>
              <Text style={{ fontSize: fs(13), color: colors.successText, marginBottom: 6 }}>Total Collected</Text>
              <Text style={{ fontSize: fs(24), fontWeight: '700', color: colors.successText }}>
                ₱{summary.totalCollected.toLocaleString()}
              </Text>
            </View>

            {/* Outstanding Balance */}
            <View
              style={{
                ...cardStyle,
                backgroundColor: summary.outstandingBalance > 0 ? colors.dangerBg : colors.successBg,
                borderColor: summary.outstandingBalance > 0 ? colors.dangerText : colors.successText,
                padding: 16,
                flex: 1,
              }}
            >
              <Text
                style={{
                  fontSize: fs(13),
                  color: summary.outstandingBalance > 0 ? colors.dangerText : colors.successText,
                  marginBottom: 6,
                }}
              >
                Outstanding
              </Text>
              <Text
                style={{
                  fontSize: fs(24),
                  fontWeight: '700',
                  color: summary.outstandingBalance > 0 ? colors.dangerText : colors.successText,
                }}
              >
                ₱{summary.outstandingBalance.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Security Deposit & Monthly Rent */}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 16, flex: 1 }}>
              <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginBottom: 6 }}>Security Deposit</Text>
              <Text style={{ fontSize: fs(20), fontWeight: '700', color: colors.text }}>
                ₱{summary.securityDeposit.toLocaleString()}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Ionicons
                  name={summary.securityDepositPaid ? 'checkmark-circle' : 'time-outline'}
                  size={14}
                  color={summary.securityDepositPaid ? colors.successText : colors.textMuted}
                />
                <Text style={{ fontSize: fs(12), color: summary.securityDepositPaid ? colors.successText : colors.textMuted }}>
                  {summary.securityDepositPaid ? 'Paid' : 'Pending'}
                </Text>
              </View>
            </View>

            <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 16, flex: 1 }}>
              <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginBottom: 6 }}>Monthly Rent</Text>
              <Text style={{ fontSize: fs(20), fontWeight: '700', color: colors.text }}>
                ₱{summary.monthlyRent.toLocaleString()}
              </Text>
              <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 4 }}>Per month</Text>
            </View>
          </View>
        </View>

        {/* Payment History */}
        <View style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: fs(20), fontWeight: '700', color: colors.text }}>Payment History</Text>
            <Text style={{ fontSize: fs(14), color: colors.textSecondary }}>{paymentHistory.length} payments</Text>
          </View>

          {paymentHistory.length === 0 ? (
            <View
              style={{
                ...cardStyle,
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                padding: 32,
                alignItems: 'center',
              }}
            >
              <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
              <Text style={{ fontSize: fs(15), fontWeight: '600', color: colors.text, marginTop: 12 }}>No Payments Yet</Text>
              <Text style={{ fontSize: fs(13), color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                Payment records will appear here once recorded.
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {paymentHistory.map((payment) => (
                <View
                  key={payment.id}
                  style={{
                    ...cardStyle,
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    padding: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fs(18), fontWeight: '700', color: colors.text }}>
                        ₱{payment.amount.toLocaleString()}
                      </Text>
                      <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginTop: 2 }}>
                        {formatDate(payment.date)}
                      </Text>
                    </View>

                    <View
                      style={{
                        backgroundColor: colors.successBg,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: fs(11), fontWeight: '700', color: colors.successText }}>PAID</Text>
                    </View>
                  </View>

                  <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name={getMethodIcon(payment.method)} size={16} color={colors.textSecondary} />
                      <Text style={{ fontSize: fs(14), color: colors.textSecondary }}>
                        {payment.method?.toUpperCase() || 'CASH'}
                      </Text>
                    </View>

                    {payment.referenceNo && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                        <Text style={{ fontSize: fs(13), color: colors.textMuted }}>Ref: {payment.referenceNo}</Text>
                      </View>
                    )}

                    {payment.billingPeriod && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                        <Text style={{ fontSize: fs(13), color: colors.textMuted }}>Period: {payment.billingPeriod}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Account Status */}
        <View
          style={{
            ...cardStyle,
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            padding: 16,
          }}
        >
          <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text, marginBottom: 12 }}>Account Status</Text>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: fs(14), color: colors.textSecondary }}>Status</Text>
              <View
                style={{
                  backgroundColor: summary.accountStatus === 'approved' ? colors.successBg : '#fef3c7',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: fs(12),
                    fontWeight: '700',
                    color: summary.accountStatus === 'approved' ? colors.successText : '#f59e0b',
                  }}
                >
                  {summary.accountStatus?.toUpperCase() || 'ACTIVE'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: fs(14), color: colors.textSecondary }}>Has Active Lease</Text>
              <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>
                {summary.hasLease ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
