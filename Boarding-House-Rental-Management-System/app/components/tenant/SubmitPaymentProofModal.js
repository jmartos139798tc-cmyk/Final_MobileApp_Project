import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../utils/ThemeContext';
import { fs, spacing } from '../../utils/responsive';
import { submitPaymentProof } from '../../services/dataService';

export default function SubmitPaymentProofModal({ visible, onClose, invoice, tenantId, onSuccess }) {
  const { colors } = useTheme();
  
  const [amount, setAmount] = useState(invoice?.outstanding?.toString() || '');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos to upload payment proof.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow camera access to take a photo of your payment proof.');
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
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleImageOptions = () => {
    Alert.alert(
      'Upload Payment Proof',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Gallery', onPress: handlePickImage },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
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
    if (!paymentMethod) {
      setError('Please select payment method');
      return false;
    }
    if (!proofImage) {
      setError('Please upload proof of payment (screenshot or receipt)');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError('');

      // In a real app, you'd upload the image to cloud storage (Firebase Storage, AWS S3, etc.)
      // For now, we'll store the local URI (in production, replace with actual upload)
      const imageUrl = proofImage.uri; // In production: await uploadImageToStorage(proofImage.uri);

      await submitPaymentProof({
        tenantId,
        invoiceId: invoice.id,
        amount: parseFloat(amount),
        paymentDate,
        paymentMethod,
        referenceNo: referenceNo.trim(),
        proofImageUrl: imageUrl,
        notes: notes.trim(),
      });

      Alert.alert(
        'Success',
        'Payment proof submitted successfully! The landlord will review and verify your payment.',
        [{ text: 'OK', onPress: () => {
          onSuccess?.();
          handleClose();
        }}]
      );
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
    setPaymentMethod('gcash');
    setReferenceNo('');
    setNotes('');
    setProofImage(null);
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
            <Text style={{ fontSize: fs(18), fontWeight: '700', color: colors.text }}>Submit Payment Proof</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
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

            {/* Payment Method */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, marginBottom: 8 }}>Payment Method *</Text>
              <View style={{ gap: 10 }}>
                {[
                  { value: 'gcash', label: 'GCash', icon: 'phone-portrait-outline' },
                  { value: 'bank_transfer', label: 'Bank Transfer', icon: 'business-outline' },
                  { value: 'cash', label: 'Cash', icon: 'cash-outline' },
                ].map((method) => (
                  <TouchableOpacity
                    key={method.value}
                    onPress={() => setPaymentMethod(method.value)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      borderWidth: 1.5,
                      borderColor: paymentMethod === method.value ? colors.accent : colors.cardBorder,
                      borderRadius: 10,
                      backgroundColor: paymentMethod === method.value ? colors.accentBg : colors.bg,
                    }}
                  >
                    <Ionicons name={method.icon} size={20} color={paymentMethod === method.value ? colors.accent : colors.textSecondary} />
                    <Text style={{ flex: 1, fontSize: fs(15), fontWeight: '600', color: paymentMethod === method.value ? colors.accent : colors.text }}>
                      {method.label}
                    </Text>
                    <Ionicons
                      name={paymentMethod === method.value ? 'radio-button-on' : 'radio-button-off'}
                      size={22}
                      color={paymentMethod === method.value ? colors.accent : colors.textMuted}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Reference Number */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, marginBottom: 8 }}>Reference Number</Text>
              <TextInput
                value={referenceNo}
                onChangeText={setReferenceNo}
                placeholder="Transaction/Reference number (optional)"
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
              <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, marginBottom: 8 }}>Proof of Payment *</Text>
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
                <TouchableOpacity
                  onPress={handleImageOptions}
                  style={{
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: colors.cardBorder,
                    borderRadius: 10,
                    padding: 20,
                    alignItems: 'center',
                    backgroundColor: colors.bg,
                  }}
                >
                  <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
                  <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, marginTop: 8 }}>Upload Payment Proof</Text>
                  <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                    Take a photo or choose from gallery
                  </Text>
                </TouchableOpacity>
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
                backgroundColor: colors.primary,
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
    </Modal>
  );
}
