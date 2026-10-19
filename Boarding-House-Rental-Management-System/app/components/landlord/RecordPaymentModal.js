import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { isMobile, fs } from '../../utils/responsive';
import { recordPayment, updatePayment, getTenantFinancialSummary, getNextUnpaidInvoiceForTenant, getInvoiceWithPayments } from '../../services/dataService';

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function RecordPaymentModal({ visible, tenant, paymentToEdit = null, onClose, onSuccess }) {
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [latestInvoiceId, setLatestInvoiceId] = useState(null);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [invoiceBalance, setInvoiceBalance] = useState(0);
  
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(getLocalDateString());
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (visible && tenant) {
      loadTenantBalance();
    }
  }, [visible, tenant, paymentToEdit?.id]);

  const loadTenantBalance = async () => {
    try {
      setLoading(true);
      setError('');
      setConfirming(false);
      setLatestInvoiceId(null);
      setEditingPaymentId(paymentToEdit?.id || null);
      setInvoiceBalance(0);
      setAmount('');
      setNotes('');
      setPaymentDate(getLocalDateString());
      
      // Get tenant's outstanding balance and latest invoice
      const summary = await getTenantFinancialSummary(tenant.tenantId);
      const invoice = paymentToEdit
        ? await getInvoiceWithPayments(paymentToEdit.invoiceId, paymentToEdit.id)
        : await getNextUnpaidInvoiceForTenant(tenant.tenantId);
      setOutstandingBalance(Number(summary.outstandingBalance) || 0);
      setLatestInvoiceId(invoice?.id || null);
      setInvoiceBalance(Number(invoice?.balance) || 0);
      setAmount(paymentToEdit ? String(Number(paymentToEdit.amount) || '') : invoice ? String(Number(invoice.balance) || 0) : '');
      if (!invoice) setError(paymentToEdit ? 'The invoice for this payment could not be loaded.' : 'This tenant has no unpaid invoice to record a payment against.');
      if (paymentToEdit) {
        setPaymentDate(String(paymentToEdit.date || getLocalDateString()).slice(0, 10));
        setPaymentMethod(paymentToEdit.method === 'gcash' ? 'gcash' : 'cash');
        setNotes(paymentToEdit.notes || '');
      }
    } catch (err) {
      console.error('Error loading balance:', err);
      setError('Failed to load balance information.');
      setOutstandingBalance(tenant.balance || 0);
      setAmount('');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (dateString) => {
    setPaymentDate(dateString);
    setError('');
    setConfirming(false);
  };

  const validatePayment = () => {
    const normalizedAmount = amount.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(normalizedAmount)) {
      setError('Enter a valid amount using up to two decimal places.');
      return null;
    }

    const paymentAmount = Number(normalizedAmount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return null;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
      setError('Enter a valid payment date in YYYY-MM-DD format.');
      return null;
    }

    const [year, month, day] = paymentDate.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    if (selectedDate.getFullYear() !== year || selectedDate.getMonth() !== month - 1 || selectedDate.getDate() !== day) {
      setError('Enter a valid payment date in YYYY-MM-DD format.');
      return null;
    }
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (selectedDate > today) {
      setError('Payment date cannot be in the future.');
      return null;
    }
    if (paymentAmount > invoiceBalance) {
      setError(`Payment cannot exceed this invoice's remaining balance of ${invoiceBalance.toLocaleString()}.`);
      return null;
    }
    if (!latestInvoiceId) {
      setError('No unpaid invoice is available for this tenant.');
      return null;
    }
    if (!['cash', 'gcash'].includes(paymentMethod)) {
      setError('Please select Cash or GCash as the payment method.');
      return null;
    }
    return paymentAmount;
  };

  const handleReviewPayment = () => {
    setError('');
    if (validatePayment() !== null) setConfirming(true);
  };

  const handleConfirmPayment = async () => {
    const paymentAmount = validatePayment();
    if (paymentAmount === null) {
      setConfirming(false);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      if (editingPaymentId) {
        await updatePayment({
          paymentId: editingPaymentId,
          amountPaid: paymentAmount,
          paymentDate,
          paymentMethod,
          chargeType: 'unallocated',
          notes: notes.trim(),
        });
      } else {
        await recordPayment({
          invoiceId: latestInvoiceId,
          amountPaid: paymentAmount,
          paymentDate,
          paymentMethod,
          chargeType: 'unallocated',
          notes: notes.trim(),
        });
      }
      setSubmitting(false);
      setConfirming(false);
      onSuccess?.();
    } catch (err) {
      console.error('Payment recording error:', err);
      setError(err.message || 'Failed to record payment. Please try again.');
      setConfirming(false);
      setSubmitting(false);
    }
  };

  const handleRecordPayment = () => {
    if (confirming) {
      handleConfirmPayment();
    } else {
      handleReviewPayment();
    }
  };

  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: 'cash-outline' },
    { id: 'gcash', label: 'GCash', icon: 'phone-portrait-outline' },
  ];

  if (!tenant) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !submitting && onClose()}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View
          style={{
            width: isMobile ? '90%' : 520,
            maxHeight: '85%',
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 24,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: fs(20), fontWeight: '800', color: colors.text }}>{editingPaymentId ? 'Edit Payment' : 'Record Payment'}</Text>
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
                backgroundColor: tenant.color || colors.accent,
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
              backgroundColor: outstandingBalance > 0 ? colors.infoBg : colors.successBg,
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
                color: outstandingBalance > 0 ? colors.infoText : colors.successText,
              }}
            >
              ₱{outstandingBalance.toLocaleString()}
            </Text>
          </View>

          {/* Error Display */}
          {!!error && (
            <View style={{ backgroundColor: colors.dangerBg, padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: fs(14), color: colors.dangerText, fontWeight: '600' }}>{error}</Text>
            </View>
          )}

          {confirming && !loading && (
            <View style={{ backgroundColor: colors.accentBg, padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: fs(14), color: colors.text, fontWeight: '700', marginBottom: 4 }}>{editingPaymentId ? 'Confirm changes' : 'Confirm payment'}</Text>
              <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>
                {editingPaymentId ? 'Update' : 'Record'} ₱{Number(amount).toLocaleString()} via {paymentMethod === 'gcash' ? 'GCash' : 'cash'} for {tenant.name} on {paymentDate}?
              </Text>
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
                  Amount Paid <Text style={{ color: colors.dangerText }}>*</Text>
                </Text>
                <TextInput
                  value={amount}
                  onChangeText={(v) => {
                    setAmount(v);
                    setError('');
                    setConfirming(false);
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
                <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: -10, marginBottom: 16 }}>
                  Invoice balance: ₱{invoiceBalance.toLocaleString()}. Partial payments are allowed.
                </Text>

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
                  Format: YYYY-MM-DD (e.g., {getLocalDateString()})
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
                backgroundColor: colors.dangerText,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: fs(15), fontWeight: '700', color: '#fff' }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRecordPayment}
              disabled={submitting || loading || !amount || !latestInvoiceId}
              style={{
                flex: 1,
                backgroundColor: !amount || loading || !latestInvoiceId ? colors.textMuted : colors.successText,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ fontSize: fs(15), fontWeight: '700', color: '#fff' }}>
                  {confirming ? (editingPaymentId ? 'Save Changes' : 'Confirm Payment') : (editingPaymentId ? 'Review Changes' : 'Review Payment')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
