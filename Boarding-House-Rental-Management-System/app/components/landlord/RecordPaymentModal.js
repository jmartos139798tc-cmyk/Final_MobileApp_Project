import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { isMobile, fs } from '../../utils/responsive';
import { recordPayment, getTenantFinancialSummary, getNextUnpaidInvoiceForTenant } from '../../services/dataService';

export default function RecordPaymentModal({ visible, tenant, onClose, onSuccess }) {
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [latestInvoiceId, setLatestInvoiceId] = useState(null);
  const [invoiceBalance, setInvoiceBalance] = useState(0);
  
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD format
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && tenant) {
      loadTenantBalance();
    }
  }, [visible, tenant]);

  const loadTenantBalance = async () => {
    try {
      setLoading(true);
      setError('');
      setLatestInvoiceId(null);
      setInvoiceBalance(0);
      setAmount('');
      
      // Get tenant's outstanding balance and latest invoice
      const [summary, invoice] = await Promise.all([
        getTenantFinancialSummary(tenant.tenantId),
        getNextUnpaidInvoiceForTenant(tenant.tenantId),
      ]);
      setOutstandingBalance(summary.outstandingBalance || 0);
      setLatestInvoiceId(invoice?.id || null);
      setInvoiceBalance(invoice?.balance || 0);
      setAmount(invoice ? String(invoice.balance) : '');
      if (!invoice) setError('This tenant has no unpaid invoice to record a payment against.');
    } catch (err) {
      console.error('Error loading balance:', err);
      setError('Failed to load balance information.');
      setOutstandingBalance(tenant.balance || 0);
      setAmount(String(tenant.balance || 0));
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (dateString) => {
    setPaymentDate(dateString);
    setError('');
  };

  const handleRecordPayment = async () => {
    try {
      setError('');

      // Validation
      const paymentAmount = parseFloat(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        setError('Please enter a valid payment amount greater than zero');
        return;
      }

      const selectedDate = new Date(`${paymentDate}T00:00:00`);
      if (Number.isNaN(selectedDate.getTime())) {
        setError('Enter a valid payment date in YYYY-MM-DD format.');
        return;
      }
      if (paymentAmount > invoiceBalance) {
        setError(`Payment cannot exceed this invoice's remaining balance of ${invoiceBalance.toLocaleString()}.`);
        return;
      }
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (selectedDate > today) {
        setError('Payment date cannot be in the future');
        return;
      }

      if (!latestInvoiceId) {
        setError('No unpaid invoice is available for this tenant.');
        return;
      }

      if (!paymentMethod) {
        setError('Please select a payment method');
        return;
      }

      // Confirm payment
      const displayDate = new Date(paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      Alert.alert(
        'Confirm Payment',
        `Record payment for ${tenant.name}?\n\nAmount: ₱${paymentAmount.toLocaleString()}\nDate: ${displayDate}\nMethod: ${paymentMethod.toUpperCase()}\n${referenceNo ? `Reference: ${referenceNo}\n` : ''}${notes ? `Notes: ${notes}` : ''}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Record',
            onPress: async () => {
              setSubmitting(true);
              try {
                await recordPayment({
                  invoiceId: latestInvoiceId,
                  amountPaid: paymentAmount,
                  paymentDate: paymentDate,
                  paymentMethod,
                  referenceNo: referenceNo.trim(),
                  notes: notes.trim(),
                });

                Alert.alert(
                  'Success',
                  `Payment of ₱${paymentAmount.toLocaleString()} has been recorded successfully.`,
                  [{ text: 'OK', onPress: onSuccess }]
                );
              } catch (err) {
                console.error('Payment recording error:', err);
                setError(err.message || 'Failed to record payment. Please try again.');
                setSubmitting(false);
              }
            },
          },
        ]
      );
    } catch (err) {
      console.error('Validation error:', err);
      setError('An error occurred. Please try again.');
    }
  };

  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: 'cash-outline' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !submitting && onClose()}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
        onPress={() => !submitting && onClose()}
      >
        <Pressable
          style={{
            width: isMobile ? '90%' : 520,
            maxHeight: '85%',
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 24,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: fs(20), fontWeight: '800', color: colors.text }}>Record Payment</Text>
            <TouchableOpacity onPress={onClose} disabled={submitting}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Tenant Info */}
          <View
            style={{
              backgroundColor: colors.bg,
              padding: 12,
              borderRadius: 12,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: tenant.color,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: fs(16), fontWeight: '800', color: '#fff' }}>{tenant.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text }}>{tenant.name}</Text>
              <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>Room {tenant.roomNumber}</Text>
            </View>
          </View>

          {/* Outstanding Balance Display */}
          <View
            style={{
              backgroundColor: outstandingBalance > 0 ? colors.dangerBg : colors.successBg,
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginBottom: 4 }}>Outstanding Balance</Text>
            <Text
              style={{
                fontSize: fs(24),
                fontWeight: '700',
                color: outstandingBalance > 0 ? colors.dangerText : colors.successText,
              }}
            >
              ₱{outstandingBalance.toLocaleString()}
            </Text>
          </View>

          {/* Error Display */}
          {error && (
            <View style={{ backgroundColor: colors.dangerBg, padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: fs(14), color: colors.dangerText, fontWeight: '600' }}>{error}</Text>
            </View>
          )}

          <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={{ fontSize: fs(13), color: colors.textMuted, marginTop: 8 }}>Loading...</Text>
              </View>
            ) : (
              <>
                {/* Amount */}
                <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                  Payment Amount <Text style={{ color: colors.dangerText }}>*</Text>
                </Text>
                <TextInput
                  value={amount}
                  onChangeText={(v) => {
                    setAmount(v);
                    setError('');
                  }}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  editable={!submitting}
                  style={{
                    backgroundColor: colors.bg,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    fontSize: fs(15),
                    color: colors.text,
                    marginBottom: 16,
                  }}
                />

                {/* Payment Date */}
                <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                  Payment Date <Text style={{ color: colors.dangerText }}>*</Text>
                </Text>
                <TextInput
                  value={paymentDate}
                  onChangeText={handleDateChange}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  editable={!submitting}
                  style={{
                    backgroundColor: colors.bg,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    fontSize: fs(15),
                    color: colors.text,
                    marginBottom: 16,
                  }}
                />
                <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: -12, marginBottom: 16 }}>
                  Format: YYYY-MM-DD (e.g., {new Date().toISOString().split('T')[0]})
                </Text>

                {/* Payment Method */}
                <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                  Payment Method <Text style={{ color: colors.dangerText }}>*</Text>
                </Text>
                <View style={{ backgroundColor: colors.bg, borderRadius: 8, marginBottom: 16, overflow: 'hidden' }}>
                  {paymentMethods.map((method, index) => (
                    <TouchableOpacity
                      key={method.id}
                      onPress={() => {
                        setPaymentMethod(method.id);
                        setError('');
                      }}
                      disabled={submitting}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 14,
                        borderBottomWidth: index < paymentMethods.length - 1 ? 1 : 0,
                        borderBottomColor: colors.cardBorder,
                        backgroundColor: paymentMethod === method.id ? colors.accentBg : 'transparent',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Ionicons name={method.icon} size={22} color={colors.text} />
                        <Text style={{ fontSize: fs(15), fontWeight: '600', color: colors.text }}>{method.label}</Text>
                      </View>

                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 2,
                          borderColor: paymentMethod === method.id ? colors.accent : colors.cardBorder,
                          backgroundColor: paymentMethod === method.id ? colors.accent : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {paymentMethod === method.id && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Reference Number */}
                <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                  Reference Number (Optional)
                </Text>
                <TextInput
                  value={referenceNo}
                  onChangeText={setReferenceNo}
                  placeholder="e.g., Cash receipt number (optional)"
                  placeholderTextColor={colors.textMuted}
                  editable={!submitting}
                  style={{
                    backgroundColor: colors.bg,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    fontSize: fs(15),
                    color: colors.text,
                    marginBottom: 16,
                  }}
                />

                {/* Notes */}
                <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                  Notes (Optional)
                </Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g., Partial payment, remaining balance to follow..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!submitting}
                  style={{
                    backgroundColor: colors.bg,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    fontSize: fs(15),
                    color: colors.text,
                    marginBottom: 16,
                    minHeight: 80,
                  }}
                />
              </>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity
              onPress={onClose}
              disabled={submitting}
              style={{
                flex: 1,
                backgroundColor: colors.bg,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRecordPayment}
              disabled={submitting || loading || !amount || !latestInvoiceId}
              style={{
                flex: 1,
                backgroundColor: !amount ? colors.textMuted : colors.accent,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ fontSize: fs(15), fontWeight: '700', color: '#fff' }}>Record Payment</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
