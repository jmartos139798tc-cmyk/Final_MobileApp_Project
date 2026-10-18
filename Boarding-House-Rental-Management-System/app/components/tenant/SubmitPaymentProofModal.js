import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Platform, Keyboard, KeyboardAvoidingView, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../utils/ThemeContext';
import { fs } from '../../utils/responsive';
import { submitPaymentProof, uploadPaymentProof } from '../../services/dataService';

export default function SubmitPaymentProofModal({ visible, onClose, invoice, tenantId, onSuccess }) {
  const { colors } = useTheme();
  
  const [amount, setAmount] = useState(invoice?.outstanding?.toString() || '');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const paymentMethod = 'cash';
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setAmount(invoice?.outstanding?.toString() || '');
      setPaymentDate(new Date().toISOString().split('T')[0]);
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
    if (!proofImage) {
      setError('Please upload a clear photo of your cash payment receipt');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError('');

      const imagePath = await uploadPaymentProof({ tenantId, asset: proofImage });

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
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReferenceNo('');
    setNotes('');
    setProofImage(null);
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined} style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
            <Text style={{ fontSize: fs(18), fontWeight: '700', color: colors.text }}>Submit Payment Proof</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.dangerText} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 500 }} contentContainerStyle={{ padding: 20 }}>
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
              <TextInput
                value={paymentDate}
                onChangeText={setPaymentDate}
                placeholder="YYYY-MM-DD"
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
              <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 4 }}>Format: YYYY-MM-DD (e.g., 2026-10-09)</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Ionicons name="cash-outline" size={20} color={colors.accent} />
              <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>Payment method: Cash paid in person</Text>
            </View>

            {/* Reference Number */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, marginBottom: 8 }}>Cash Receipt Number (Optional)</Text>
              <TextInput
                value={referenceNo}
                onChangeText={setReferenceNo}
                placeholder="Enter the number printed on your receipt"
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

            {/* Proof Image */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, marginBottom: 8 }}>Photo of Cash Receipt *</Text>
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
                  <Text style={{ fontSize: fs(13), color: colors.textSecondary, textAlign: 'center' }}>Attach a clear photo of your cash receipt.</Text>
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
            </View>

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
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}
