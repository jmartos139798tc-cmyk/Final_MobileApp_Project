import React, { useState, useEffect } from 'react';
import { View, Text, Image, Modal, Pressable, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { isMobile, fs } from '../../utils/responsive';
import { getVacantRoomsForAssignment, approveTenant } from '../../services/dataService';

export default function TenantApprovalModal({ visible, tenant, onClose, onSuccess }) {
  const { colors } = useTheme();

  const [vacantRooms, setVacantRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [dueDay, setDueDay] = useState('5');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadVacantRooms();
    }
  }, [visible, tenant?.tenantId, tenant?.preferredRoomId]);

  const loadVacantRooms = async () => {
    try {
      setLoadingRooms(true);
      setError('');
      const rooms = await getVacantRoomsForAssignment();
      setVacantRooms(rooms);

      if (rooms.length > 0) {
        const preferredRoom = rooms.find((room) => room.id === tenant?.preferredRoomId);
        const initialRoom = preferredRoom || rooms[0];
        setSelectedRoomId(initialRoom.id);
        setMonthlyRent(String(initialRoom.baseRent));
      } else {
        setError('No vacant rooms available for assignment.');
      }
    } catch (err) {
      console.error('Error loading vacant rooms:', err);
      setError('Failed to load available rooms.');
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleRoomSelect = (room) => {
    setSelectedRoomId(room.id);
    setMonthlyRent(String(room.baseRent));
    setError('');
  };

  const calculateInitialPayment = () => {
    const rent = parseFloat(monthlyRent);
    if (isNaN(rent) || rent <= 0) return 0;
    return rent * 2; // 1 month advance + 1 month security deposit
  };

  const commitApproval = async (rent, day) => {
    setSubmitting(true);
    try {
      await approveTenant({
        tenantId: tenant.tenantId,
        roomId: selectedRoomId,
        monthlyRent: rent,
        dueDay: day,
      });

      if (Platform.OS === 'web') {
        onSuccess?.();
        return;
      }

      Alert.alert('Success', `${tenant.name} has been approved and assigned to the selected room.`, [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      console.error('Approval error:', err);
      setError(err.message || 'Failed to approve tenant. Please try again.');
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    try {
      setError('');

      // Validation
      if (!selectedRoomId) {
        setError('Please select a room');
        return;
      }

      const rent = parseFloat(monthlyRent);
      if (isNaN(rent) || rent <= 0) {
        setError('Please enter a valid monthly rent amount');
        return;
      }

      const day = parseInt(dueDay, 10);
      if (isNaN(day) || day < 1 || day > 31) {
        setError('Due day must be between 1 and 31');
        return;
      }

      const confirmation = `Approve ${tenant.name}?` +
        `\n\nRoom: ${vacantRooms.find((r) => r.id === selectedRoomId)?.displayNumber}` +
        `\nMonthly Rent: PHP ${rent.toLocaleString()}` +
        `\nInitial Payment: PHP ${calculateInitialPayment().toLocaleString()}`;

      // React Native Web's Alert.alert is a no-op. Use browser confirmation on
      // web, while retaining the native confirmation dialog on mobile.
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && !window.confirm(confirmation)) return;
        await commitApproval(rent, day);
        return;
      }

      Alert.alert('Confirm Approval', confirmation, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => commitApproval(rent, day) },
      ]);
    } catch (err) {
      console.error('Validation error:', err);
      setError('An error occurred. Please try again.');
    }
  };

  const preferredRoomAvailable = vacantRooms.some((room) => room.id === tenant?.preferredRoomId);

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
            <Text style={{ fontSize: fs(20), fontWeight: '800', color: colors.text }}>Approve Tenant</Text>
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
              marginBottom: 20,
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
              <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>{tenant.phone}</Text>
            </View>
          </View>

          {!!tenant.preferredRoomNumber && (
            <View style={{ backgroundColor: colors.accentBg, padding: 11, borderRadius: 10, marginTop: -8, marginBottom: 14 }}>
              <Text style={{ fontSize: fs(13), color: colors.accent, fontWeight: '700' }}>
                Tenant preference: Room {tenant.preferredRoomNumber}. {preferredRoomAvailable ? 'It is selected by default; confirm it or choose another vacant room.' : 'It is no longer vacant; choose another vacant room.'}
              </Text>
            </View>
          )}

          {!!tenant.paymentProofUrl && (
            <View style={{ backgroundColor: colors.accentBg, padding: 12, borderRadius: 10, marginBottom: 14 }}>
              <Text style={{ fontSize: fs(13), color: colors.accent, fontWeight: '800', marginBottom: 4 }}>Initial payment proof submitted</Text>
              <Text style={{ fontSize: fs(12), color: colors.textSecondary, marginBottom: 9 }}>
                ₱{Number(tenant.initialPaymentAmount || 0).toLocaleString()} · paid {tenant.paymentDate || 'date not provided'}{tenant.paymentReference ? ` · Ref ${tenant.paymentReference}` : ''}
              </Text>
              <Image source={{ uri: tenant.paymentProofUrl }} resizeMode="contain" style={{ width: '100%', height: 150, borderRadius: 8, backgroundColor: colors.card }} />
              <Text style={{ fontSize: fs(11), color: colors.warningText, fontWeight: '700', marginTop: 7 }}>Verify the receipt before approving the application.</Text>
            </View>
          )}

          {/* Error Display */}
          {!!error && (
            <View style={{ backgroundColor: colors.dangerBg, padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: fs(14), color: colors.dangerText, fontWeight: '600' }}>{error}</Text>
            </View>
          )}

          <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
            {/* Room Selection */}
            <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text, marginBottom: 8 }}>
              Select Room <Text style={{ color: colors.dangerText }}>*</Text>
            </Text>

            {loadingRooms ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={{ fontSize: fs(13), color: colors.textMuted, marginTop: 8 }}>Loading available rooms...</Text>
              </View>
            ) : vacantRooms.length === 0 ? (
              <View
                style={{
                  backgroundColor: colors.bg,
                  padding: 24,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <Ionicons name="bed-outline" size={32} color={colors.textMuted} />
                <Text style={{ fontSize: fs(14), color: colors.textMuted, marginTop: 8, textAlign: 'center' }}>
                  No vacant rooms available.
                </Text>
              </View>
            ) : (
              <View style={{ backgroundColor: colors.bg, borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
                {vacantRooms.map((room, index) => (
                  <TouchableOpacity
                    key={room.id}
                    onPress={() => handleRoomSelect(room)}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 14,
                      borderBottomWidth: index < vacantRooms.length - 1 ? 1 : 0,
                      borderBottomColor: colors.cardBorder,
                      backgroundColor: selectedRoomId === room.id ? colors.accentBg : 'transparent',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }}>
                        Room {room.displayNumber}
                      </Text>
                      <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginTop: 2 }}>
                        {room.type} - ₱{room.baseRent.toLocaleString()}/month
                      </Text>
                    </View>

                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: selectedRoomId === room.id ? colors.accent : colors.cardBorder,
                        backgroundColor: selectedRoomId === room.id ? colors.accent : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {selectedRoomId === room.id && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Monthly Rent */}
            <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text, marginBottom: 8 }}>
              Monthly Rent <Text style={{ color: colors.dangerText }}>*</Text>
            </Text>
            <TextInput
              value={monthlyRent}
              onChangeText={(v) => {
                setMonthlyRent(v);
                setError('');
              }}
              placeholder="2500"
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

            {/* Due Day */}
            <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text, marginBottom: 8 }}>
              Due Day (1-31) <Text style={{ color: colors.dangerText }}>*</Text>
            </Text>
            <TextInput
              value={dueDay}
              onChangeText={(v) => {
                setDueDay(v);
                setError('');
              }}
              placeholder="5"
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
                marginBottom: 20,
              }}
            />

            {/* Payment Summary */}
            {parseFloat(monthlyRent) > 0 && (
              <View
                style={{
                  backgroundColor: colors.successBg,
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.successText, marginBottom: 12 }}>
                  Initial Payment Summary
                </Text>
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: fs(14), color: colors.text }}>1 Month Advance</Text>
                    <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>
                      ₱{parseFloat(monthlyRent).toLocaleString()}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: fs(14), color: colors.text }}>Security Deposit</Text>
                    <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>
                      ₱{parseFloat(monthlyRent).toLocaleString()}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 1,
                      backgroundColor: colors.cardBorder,
                      marginVertical: 4,
                    }}
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text }}>Total Due</Text>
                    <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.successText }}>
                      ₱{calculateInitialPayment().toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
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
              onPress={handleApprove}
              disabled={submitting || vacantRooms.length === 0}
              style={{
                flex: 1,
                backgroundColor: vacantRooms.length === 0 ? colors.textMuted : colors.accent,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ fontSize: fs(15), fontWeight: '700', color: '#fff' }}>Approve & Create Lease</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
