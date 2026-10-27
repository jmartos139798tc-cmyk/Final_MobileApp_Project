import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../utils/ThemeContext';
import { fs } from '../../utils/responsive';
import { submitPaymentProof, uploadPaymentProof } from '../../services/dataService';

const toLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return new Date();
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1])
    && date.getMonth() === Number(match[2]) - 1
    && date.getDate() === Number(match[3])
    ? date
    : new Date();
};

export default function SubmitPaymentProofModal({ visible, onClose, invoice, tenantId, onSuccess }) {
  const { colors } = useTheme();
  
  const [amount, setAmount] = useState(invoice?.outstanding?.toString() || '');
  const [paymentDate, setPaymentDate] = useState(toLocalDateString(new Date()));
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setAmount(invoice?.outstanding?.toString() || '');
      setPaymentDate(toLocalDateString(new Date()));
      setCalendarMonth(new Date());
      setCalendarVisible(false);
      setPaymentMethod('cash');
      setReferenceNo('');
      setNotes('');
      setProofImage(null);
      setError('');
    }
  }, [visible, invoice?.id, invoice?.outstanding]);

  const handlePickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          setError('Please allow photo access to upload your payment receipt.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProofImage(result.assets[0]);
        setError('');
      }
    } catch (err) {
      console.error('Error picking image:', err);
      setError('Failed to choose an image. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        setError('Please allow camera access to take a photo of your payment receipt.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProofImage(result.assets[0]);
        setError('');
      }
    } catch (err) {
      console.error('Error taking photo:', err);
      setError('Failed to take a photo. Please try again.');
    }
  };

  const validateForm = () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    if (!paymentDate) {
      setError('Please enter payment date');
      return false;
    }
    if (!invoice?.id) {
      setError('There is no invoice available for this payment. Refresh your finances and try again.');
      return false;
    }
    if (Number(amount) > Number(invoice.outstanding || 0)) {
      setError('The payment amount cannot be greater than the current balance.');
      return false;
    }
    if (paymentMethod === 'gcash' && !proofImage) {
      setError('Please upload a clear photo of your GCash receipt');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError('');

      const imagePath = paymentMethod === 'gcash' && proofImage
        ? await uploadPaymentProof({ tenantId, asset: proofImage })
        : null;

      await submitPaymentProof({
        tenantId,
        invoiceId: invoice.id,
        amount: parseFloat(amount),
        paymentDate,
        paymentMethod,
        referenceNo: referenceNo.trim(),
        proofImageUrl: imagePath,
        notes: notes.trim(),
      });

      await onSuccess?.();
      if (Platform.OS === 'web') {
        handleClose();
      } else {
        Alert.alert('Submitted', 'Your receipt has been sent for verification.', [
          { text: 'OK', onPress: handleClose },
        ]);
      }
    } catch (err) {
      console.error('Error submitting payment proof:', err);
      setError(err.message || 'Failed to submit payment proof. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setAmount(invoice?.outstanding?.toString() || '');
    setPaymentDate(toLocalDateString(new Date()));
    setCalendarMonth(new Date());
    setCalendarVisible(false);
    setReferenceNo('');
    setNotes('');
    setProofImage(null);
    setError('');
    onClose();
  };

  const ModalKeyboardWrapper = Platform.OS === 'web' ? View : KeyboardAvoidingView;
  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();
  const calendarDays = [
    ...Array(new Date(calendarYear, calendarMonthIndex, 1).getDay()).fill(null),
    ...Array.from({ length: new Date(calendarYear, calendarMonthIndex + 1, 0).getDate() }, (_, index) => index + 1),
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <ModalKeyboardWrapper
        {...(Platform.OS === 'web' ? {} : { behavior: Platform.OS === 'ios' ? 'padding' : 'height' })}
        style={{ flex: 1 }}
      >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', flexShrink: 1 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
            <Text style={{ fontSize: fs(18), fontWeight: '700', color: colors.text }}>Submit Payment Proof</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.dangerText} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ padding: 20 }}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator
          >
            {/* Invoice Info */}
            {invoice && (
              <View style={{ backgroundColor: colors.accentBg, padding: 14, borderRadius: 12, marginBottom: 20 }}>
                <Text style={{ fontSize: fs(13), color: colors.accent, fontWeight: '600' }}>
                  Invoice: {invoice.period || 'Current'} • Balance: ₱{invoice.outstanding?.toLocaleString() || '0'}
                </Text>
              </View>
            )}

            {/* Amount */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, marginBottom: 8 }}>Amount Paid *</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="Enter amount"
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: colors.bg,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  borderRadius: 10,
                  padding: 12,
                  fontSize: fs(15),
                  color: colors.text,
                }}
              />
            </View>

            {/* Payment Date */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, marginBottom: 8 }}>Payment Date *</Text>
              <TouchableOpacity
                onPress={() => setCalendarVisible((current) => !current)}
                accessibilityRole="button"
                accessibilityLabel={`Payment date: ${parseLocalDate(paymentDate).toLocaleDateString()}. Choose date`}
                style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Text style={{ fontSize: fs(15), color: colors.text }}>{parseLocalDate(paymentDate).toLocaleDateString()}</Text>
                <Ionicons name="calendar-outline" size={19} color={colors.accent} />
              </TouchableOpacity>
              {calendarVisible && (
                <View style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, padding: 10, marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <TouchableOpacity onPress={() => setCalendarMonth(new Date(calendarYear, calendarMonthIndex - 1, 1))} accessibilityRole="button" accessibilityLabel="Previous month" style={{ padding: 6 }}>
                      <Ionicons name="chevron-back" size={18} color={colors.accent} />
                    </TouchableOpacity>
                    <Text style={{ color: colors.text, fontSize: fs(13), fontWeight: '700' }}>{calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
                    <TouchableOpacity onPress={() => setCalendarMonth(new Date(calendarYear, calendarMonthIndex + 1, 1))} accessibilityRole="button" accessibilityLabel="Next month" style={{ padding: 6 }}>
                      <Ionicons name="chevron-forward" size={18} color={colors.accent} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <Text key={day} style={{ flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: fs(10), fontWeight: '700', paddingVertical: 5 }}>{day}</Text>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {calendarDays.map((day, index) => {
                      if (!day) return <View key={`empty-${index}`} style={{ width: '14.2857%', height: 38 }} />;
                      const date = new Date(calendarYear, calendarMonthIndex, day);
                      const selected = paymentDate === toLocalDateString(date);
                      return (
                        <TouchableOpacity
                          key={day}
                          onPress={() => {
                            setPaymentDate(toLocalDateString(date));
                            setCalendarVisible(false);
                            setError('');
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={date.toLocaleDateString()}
                          accessibilityState={{ selected }}
                          style={{ width: '14.2857%', height: 38, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.accent : 'transparent' }}>
                            <Text style={{ color: selected ? '#fff' : colors.text, fontSize: fs(12), fontWeight: selected ? '800' : '500' }}>{day}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, marginBottom: 8 }}>Payment Method *</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[
                  { value: 'gcash', label: 'GCash', icon: 'phone-portrait-outline' },
                  { value: 'cash', label: 'Cash', icon: 'cash-outline' },
                ].map((method) => {
                  const selected = paymentMethod === method.value;
                  return (
                    <TouchableOpacity
                      key={method.value}
                      onPress={() => {
                        setPaymentMethod(method.value);
                        if (method.value === 'cash') setProofImage(null);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderWidth: 1, borderColor: selected ? colors.accent : colors.cardBorder, borderRadius: 10, backgroundColor: selected ? colors.accentBg : colors.bg }}
                    >
                      <Ionicons name={method.icon} size={19} color={selected ? colors.accent : colors.textSecondary} />
                      <Text style={{ fontSize: fs(14), fontWeight: '700', color: selected ? colors.accent : colors.text }}>{method.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 6 }}>
                {paymentMethod === 'gcash' ? 'Payment made through GCash.' : 'Cash paid in person.'}
              </Text>
            </View>

            {/* Reference Number */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, marginBottom: 8 }}>{paymentMethod === 'gcash' ? 'GCash Reference Number' : 'Cash Receipt Number'} (Optional)</Text>
              <TextInput
                value={referenceNo}
                onChangeText={setReferenceNo}
                placeholder={paymentMethod === 'gcash' ? 'Enter your GCash reference number' : 'Enter the number printed on your receipt'}
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: colors.bg,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  borderRadius: 10,
                  padding: 12,
                  fontSize: fs(15),
                  color: colors.text,
                }}
              />
            </View>

            {/* GCash receipt photo */}
            {paymentMethod === 'gcash' && <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, marginBottom: 8 }}>Photo of GCash Receipt *</Text>
              {proofImage ? (
                <View style={{ borderWidth: 1, borderColor: colors.successText, borderRadius: 10, padding: 12, backgroundColor: colors.successBg }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.successText} />
                    <Text style={{ flex: 1, fontSize: fs(14), color: colors.successText, fontWeight: '600' }}>Image attached</Text>
                    <TouchableOpacity onPress={() => setProofImage(null)}>
                      <Ionicons name="close-circle" size={20} color={colors.successText} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, padding: 14, backgroundColor: colors.bg, gap: 10 }}>
                  <Text style={{ fontSize: fs(13), color: colors.textSecondary, textAlign: 'center' }}>Attach a clear photo of your GCash receipt.</Text>
                  {Platform.OS !== 'web' && (
                    <TouchableOpacity onPress={handleTakePhoto} style={{ padding: 12, borderRadius: 9, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <Ionicons name="camera-outline" size={19} color={colors.text} />
                      <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>Take photo</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={handlePickImage} style={{ padding: 12, borderRadius: 9, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Ionicons name="image-outline" size={19} color="#fff" />
                    <Text style={{ fontSize: fs(14), fontWeight: '600', color: '#fff' }}>Choose receipt photo</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>}

            {/* Notes */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, marginBottom: 8 }}>Notes (Optional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional notes..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{
                  backgroundColor: colors.bg,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  borderRadius: 10,
                  padding: 12,
                  fontSize: fs(15),
                  color: colors.text,
                  minHeight: 80,
                }}
              />
            </View>

            {/* Error Message */}
            {error ? (
              <View style={{ backgroundColor: colors.dangerBg, padding: 12, borderRadius: 10, marginBottom: 16, flexDirection: 'row', gap: 10 }}>
                <Ionicons name="alert-circle" size={20} color={colors.dangerText} />
                <Text style={{ flex: 1, fontSize: fs(13), color: colors.dangerText, fontWeight: '600' }}>{error}</Text>
              </View>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={{
                backgroundColor: colors.successText,
                padding: 16,
                borderRadius: 12,
                alignItems: 'center',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.onPrimary }}>Submit for Verification</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
      </ModalKeyboardWrapper>
    </Modal>
  );
}
