import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Modal, Pressable, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { isMobile, fs } from '../../utils/responsive';
import { getVacantRoomsForAssignment, approveTenant } from '../../services/dataService';

export default function TenantApprovalModal({ visible, tenant, onClose, onSuccess }) {
  const { colors } = useTheme();

  const [vacantRooms, setVacantRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomLoadFailed, setRoomLoadFailed] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [dueDay, setDueDay] = useState('5');
  const [dueDate, setDueDate] = useState(() => {
    const today = new Date();
    const date = new Date(today.getFullYear(), today.getMonth() + 1, 5);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  const [dueCalendarVisible, setDueCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 1);
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [receiptViewerVisible, setReceiptViewerVisible] = useState(false);
  const [receiptZoom, setReceiptZoom] = useState(1);
  const pinchDistance = useRef(null);

  useEffect(() => {
    if (visible) {
      loadVacantRooms();
    }
  }, [visible, tenant?.tenantId, tenant?.preferredRoomId]);

  const loadVacantRooms = async () => {
    try {
      setLoadingRooms(true);
      setRoomLoadFailed(false);
      setError('');
      const rooms = await getVacantRoomsForAssignment();
      setVacantRooms(rooms);

      if (rooms.length > 0) {
        const preferredRoom = rooms.find((room) => room.id === tenant?.preferredRoomId);
        const initialRoom = preferredRoom || rooms[0];
        setSelectedRoomId(initialRoom.id);
        setMonthlyRent(String(initialRoom.baseRent));
      } else {
        setError('No available rooms for assignment.');
      }
    } catch (err) {
      console.error('Error loading vacant rooms:', err);
      setRoomLoadFailed(true);
      setError(err.message || 'Failed to load available rooms.');
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
    return rent; // 1 month advance only
  };

  const commitApproval = async (rent, day) => {
    setSubmitting(true);
    try {
      await approveTenant({
        tenantId: tenant.tenantId,
        roomId: selectedRoomId,
        monthlyRent: rent,
        dueDay: day,
        dueDate,
        initialPaymentAmount: tenant.initialPaymentAmount,
        initialPaymentMethod: tenant.paymentMethod,
        initialPaymentDate: tenant.paymentDate,
        initialPaymentReference: tenant.paymentReference,
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

      setShowConfirmation(true);
    } catch (err) {
      console.error('Validation error:', err);
      setError('An error occurred. Please try again.');
    }
  };

  const confirmApproval = async () => {
    setShowConfirmation(false);
    await commitApproval(parseFloat(monthlyRent), parseInt(dueDay, 10));
  };

  const preferredRoomAvailable = vacantRooms.some((room) => room.id === tenant?.preferredRoomId);
  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();
  const calendarDays = [
    ...Array(new Date(calendarYear, calendarMonthIndex, 1).getDay()).fill(null),
    ...Array.from({ length: new Date(calendarYear, calendarMonthIndex + 1, 0).getDate() }, (_, index) => index + 1),
  ];

  const formatLocalDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const parseLocalDate = (value) => {
    const [year, month, day] = String(value || '').split('-').map(Number);
    return year && month && day ? new Date(year, month - 1, day) : new Date();
  };

  const getTouchDistance = (touches) => {
    if (!touches || touches.length < 2) return null;
    const [first, second] = touches;
    return Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY);
  };

  const handleReceiptTouchStart = (event) => {
    pinchDistance.current = getTouchDistance(event.nativeEvent.touches);
  };

  const handleReceiptTouchMove = (event) => {
    const distance = getTouchDistance(event.nativeEvent.touches);
    if (!distance || !pinchDistance.current) return;
    const ratio = distance / pinchDistance.current;
    pinchDistance.current = distance;
    setReceiptZoom((zoom) => Math.max(1, Math.min(4, zoom * ratio)));
  };

  const openReceiptViewer = () => {
    setReceiptZoom(1);
    setReceiptViewerVisible(true);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !submitting && onClose()}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close approval dialog"
          disabled={submitting}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={onClose}
        />
        <View
          style={{
            width: isMobile ? '100%' : 520,
            height: isMobile ? '94%' : undefined,
            maxHeight: isMobile ? '96%' : '92%',
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: isMobile ? 16 : 24,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: fs(20), fontWeight: '800', color: colors.text }}>Approve Tenant</Text>
            <TouchableOpacity onPress={onClose} disabled={submitting}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >

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
                Tenant preference: Room {tenant.preferredRoomNumber}. {preferredRoomAvailable ? 'It is selected by default; confirm it or choose another available room.' : 'It is full or unavailable; choose another available room.'}
              </Text>
            </View>
          )}

          {!!tenant.initialPaymentAmount && (
            <View style={{ backgroundColor: colors.accentBg, padding: 12, borderRadius: 10, marginBottom: 14 }}>
              <Text style={{ fontSize: fs(13), color: colors.accent, fontWeight: '800', marginBottom: 4 }}>
                {tenant.paymentProofUrl ? 'Initial payment proof submitted' : 'Initial cash payment reported'}
              </Text>
              <Text style={{ fontSize: fs(12), color: colors.textSecondary, marginBottom: 9 }}>
                ₱{Number(tenant.initialPaymentAmount || 0).toLocaleString()} · paid {tenant.paymentDate || 'date not provided'}{tenant.paymentReference ? ` · Ref ${tenant.paymentReference}` : ''}
              </Text>
              <Text style={{ fontSize: fs(12), color: colors.textSecondary, marginBottom: 9 }}>
                Payment method: {tenant.paymentMethod === 'gcash' ? 'GCash' : 'Cash'}
              </Text>
              {tenant.paymentProofUrl ? (
                <>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Open payment proof image to zoom"
                    onPress={openReceiptViewer}
                    style={{ height: 150, borderRadius: 8, backgroundColor: colors.card, overflow: 'hidden' }}
                  >
                    <Image source={{ uri: tenant.paymentProofUrl }} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
                    <View style={{ position: 'absolute', right: 8, bottom: 8, backgroundColor: 'rgba(0,0,0,0.62)', borderRadius: 16, padding: 7 }}>
                      <Ionicons name="expand-outline" size={17} color="#fff" />
                    </View>
                  </TouchableOpacity>
                  <Text style={{ fontSize: fs(11), color: colors.warningText, fontWeight: '700', marginTop: 7 }}>Verify the receipt before approving the application.</Text>
                </>
              ) : (
                <Text style={{ fontSize: fs(11), color: colors.warningText, fontWeight: '700', marginTop: 3 }}>
                  Confirm that the cash was received before approving the application.
                </Text>
              )}
            </View>
          )}

          {/* Error Display */}
          {!!error && (
            <View style={{ backgroundColor: colors.dangerBg, padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: fs(14), color: colors.dangerText, fontWeight: '600' }}>{error}</Text>
            </View>
          )}

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
                  {roomLoadFailed ? 'Could not load available rooms.' : 'No available rooms.'}
                </Text>
                {roomLoadFailed && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={loadVacantRooms}
                    disabled={loadingRooms || submitting}
                    style={{ minHeight: 40, marginTop: 12, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontSize: fs(13), fontWeight: '700' }}>Retry loading rooms</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={{ backgroundColor: colors.bg, borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
                {vacantRooms.map((room, index) => (
                  <TouchableOpacity
                    key={room.id}
                    onPress={() => handleRoomSelect(room)}
                    disabled={submitting || loadingRooms}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedRoomId === room.id, disabled: submitting || loadingRooms }}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 14,
                      borderBottomWidth: index < vacantRooms.length - 1 ? 1 : 0,
                      borderBottomColor: colors.cardBorder,
                      backgroundColor: selectedRoomId === room.id ? colors.accentBg : 'transparent',
                      opacity: submitting || loadingRooms ? 0.6 : 1,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }}>
                        Room {room.displayNumber}
                      </Text>
                      <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginTop: 2 }}>
                        {room.type} · {room.occupancy}/{room.maxCapacity} occupants · ₱{room.baseRent.toLocaleString()}/tenant/month
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

            {/* Initial invoice due date */}
            <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text, marginBottom: 8 }}>
              Initial Payment Due Date <Text style={{ color: colors.dangerText }}>*</Text>
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Due date: ${parseLocalDate(dueDate).toLocaleDateString()}. Choose date`}
              onPress={() => setDueCalendarVisible((isVisible) => !isVisible)}
              disabled={submitting}
              style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, marginBottom: dueCalendarVisible ? 8 : 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Text style={{ color: colors.text, fontSize: fs(15) }}>{parseLocalDate(dueDate).toLocaleDateString()}</Text>
              <Ionicons name="calendar-outline" size={19} color={colors.accent} />
            </TouchableOpacity>
            {dueCalendarVisible && (
              <View style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, padding: 10, marginBottom: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                    onPress={() => setCalendarMonth(new Date(calendarYear, calendarMonthIndex - 1, 1))}
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="chevron-back" size={18} color={colors.accent} />
                  </TouchableOpacity>
                  <Text style={{ color: colors.text, fontSize: fs(13), fontWeight: '700' }}>
                    {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Next month"
                    onPress={() => setCalendarMonth(new Date(calendarYear, calendarMonthIndex + 1, 1))}
                    style={{ padding: 6 }}
                  >
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
                    const selected = dueDate === formatLocalDate(date);
                    return (
                      <TouchableOpacity
                        key={day}
                        accessibilityRole="button"
                        accessibilityLabel={date.toLocaleDateString()}
                        accessibilityState={{ selected }}
                        onPress={() => {
                          setDueDate(formatLocalDate(date));
                          setDueDay(String(day));
                          setDueCalendarVisible(false);
                          setError('');
                        }}
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
                    <Text style={{ fontSize: fs(14), color: colors.text }}>One month rent</Text>
                    <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>
                      ₱{parseFloat(monthlyRent).toLocaleString()}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: fs(14), color: colors.text }}>Tenant payment submitted</Text>
                    <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>
                      ₱{Number(tenant.initialPaymentAmount || 0).toLocaleString()}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ flex: 1, marginRight: 8, fontSize: fs(14), color: colors.text }}>Remaining rent if approved</Text>
                    <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>
                      ₱{Math.max(0, parseFloat(monthlyRent) - Number(tenant.initialPaymentAmount || 0)).toLocaleString()}
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
                    <Text style={{ flex: 1, marginRight: 8, fontSize: fs(15), fontWeight: '700', color: colors.text }}>Total Due (1 month advance)</Text>
                    <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.successText }}>
                      ₱{calculateInitialPayment().toLocaleString()}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: fs(11), color: colors.textSecondary, lineHeight: 16, marginTop: 10 }}>
                  If approved, the payment is credited to the initial invoice. Any remaining rent, Wi-Fi, and other initial charges stay in the tenant&apos;s balance.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity
              onPress={onClose}
              disabled={submitting}
              activeOpacity={0.8}
              style={{
                flex: 1,
                minHeight: 52,
                paddingHorizontal: 12,
                backgroundColor: colors.dangerText,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: fs(15), fontWeight: '700', color: '#fff', textAlign: 'center' }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleApprove}
              disabled={submitting || vacantRooms.length === 0}
              activeOpacity={0.8}
              style={{
                flex: 1.5,
                minHeight: 52,
                paddingHorizontal: 12,
                backgroundColor: vacantRooms.length === 0 ? colors.textMuted : colors.successText,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text numberOfLines={2} style={{ fontSize: fs(15), fontWeight: '700', color: '#fff', textAlign: 'center' }}>
                  Approve
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal
        visible={receiptViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptViewerVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.96)' }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close payment proof viewer"
            onPress={() => setReceiptViewerVisible(false)}
            style={{ position: 'absolute', top: 42, right: 18, zIndex: 2, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="close" size={25} color="#fff" />
          </TouchableOpacity>
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
            onTouchStart={handleReceiptTouchStart}
            onTouchMove={handleReceiptTouchMove}
            onTouchEnd={() => { pinchDistance.current = null; }}
          >
            <Image
              source={{ uri: tenant.paymentProofUrl }}
              resizeMode="contain"
              style={{ width: '100%', height: '82%', transform: [{ scale: receiptZoom }] }}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 32 }}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Zoom out"
              onPress={() => setReceiptZoom((zoom) => Math.max(1, zoom - 0.5))}
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="remove" size={25} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Reset zoom"
              onPress={() => setReceiptZoom(1)}
              style={{ minWidth: 72, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}
            >
              <Text style={{ color: '#fff', fontSize: fs(13), fontWeight: '700' }}>{Math.round(receiptZoom * 100)}%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
              onPress={() => setReceiptZoom((zoom) => Math.min(4, zoom + 0.5))}
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="add" size={25} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showConfirmation}
        transparent
        animationType="fade"
        onRequestClose={() => !submitting && setShowConfirmation(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.58)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
          onPress={() => !submitting && setShowConfirmation(false)}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              width: isMobile ? '100%' : 420,
              backgroundColor: colors.card,
              borderRadius: 18,
              padding: 24,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              elevation: 12,
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 12 },
            }}
          >
            <View style={{ alignItems: 'center', marginBottom: 18 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Ionicons name="person-add-outline" size={25} color={colors.accent} />
              </View>
              <Text style={{ fontSize: fs(20), fontWeight: '800', color: colors.text, textAlign: 'center' }}>Approve tenant?</Text>
              <Text style={{ fontSize: fs(14), color: colors.textSecondary, textAlign: 'center', marginTop: 6 }}>
                {tenant.name} will be assigned to the selected room.
              </Text>
            </View>

            <View style={{ backgroundColor: colors.bg, borderRadius: 12, padding: 14, gap: 11, marginBottom: 20 }}>
              {[
                ['Room', `Room ${vacantRooms.find((room) => room.id === selectedRoomId)?.displayNumber || ''}`],
                ['Monthly rent', `PHP ${parseFloat(monthlyRent).toLocaleString()}`],
                ['Initial payment', `PHP ${calculateInitialPayment().toLocaleString()}`],
                ['Payment due', dueDate],
              ].map(([label, value]) => (
                <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Text style={{ fontSize: fs(14), color: colors.textSecondary }}>{label}</Text>
                  <Text style={{ flexShrink: 1, fontSize: fs(14), fontWeight: '700', color: colors.text, textAlign: 'right' }}>{value}</Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowConfirmation(false)}
                disabled={submitting}
                style={{ flex: 1, minHeight: 48, borderRadius: 11, backgroundColor: colors.dangerText, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: fs(14), fontWeight: '700', color: '#fff' }}>Go back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmApproval}
                disabled={submitting}
                style={{ flex: 1.25, minHeight: 48, borderRadius: 11, backgroundColor: colors.successText, alignItems: 'center', justifyContent: 'center' }}
              >
                {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontSize: fs(14), fontWeight: '700', color: '#fff' }}>Confirm approval</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}
