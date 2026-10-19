import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../utils/ThemeContext';
import { cardStyle, fs } from '../../utils/responsive';
import {
  getAvailableRoomsForInitialAssignment,
  getTenantRoomAssignmentRequest,
  submitRoomAssignmentRequest,
  uploadInitialPaymentProof,
} from '../../services/dataService';

const statusPresentation = (status, colors) => {
  if (status === 'approved') return { label: 'Approved', color: colors.successText, background: colors.successBg, icon: 'checkmark-circle' };
  if (status === 'rejected') return { label: 'Not approved', color: colors.dangerText, background: colors.dangerBg, icon: 'close-circle' };
  return { label: 'Pending review', color: colors.warningText, background: colors.warningBg, icon: 'time' };
};

export default function TenantApplicationStatusCard({ tenant, tenantId, refreshKey, onChanged }) {
  const { colors } = useTheme();
  const [request, setRequest] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [showRoomSetupHint, setShowRoomSetupHint] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingStage, setSubmittingStage] = useState('');
  const [error, setError] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [proofImage, setProofImage] = useState(null);

  const loadRequest = async () => {
    if (tenant?.accountStatus !== 'pending') {
      setRequest(null);
      return;
    }

    try {
      setRequest(await getTenantRoomAssignmentRequest(tenantId));
    } catch (loadError) {
      console.warn('Could not load initial room preference:', loadError.message || loadError);
    }
  };

  const openRoomPicker = async () => {
    setShowRoomSetupHint(false);
    setModalVisible(true);
    setLoadingRooms(true);
    setError('');
    try {
      const rooms = await getAvailableRoomsForInitialAssignment(tenantId);
      setAvailableRooms(rooms);
      setSelectedRoomId(request?.requestedRoomId && rooms.some((room) => room.id === request.requestedRoomId)
        ? request.requestedRoomId
        : rooms[0]?.id || '');
      const initialRoom = rooms.find((room) => room.id === (request?.requestedRoomId && rooms.some((room) => room.id === request.requestedRoomId) ? request.requestedRoomId : rooms[0]?.id));
      setPaymentAmount(initialRoom ? String(initialRoom.estimatedRent) : request?.initialPaymentAmount?.toString() || '');
      setPaymentMethod(request?.paymentMethod || 'cash');
      setPaymentDate(request?.paymentDate || new Date().toISOString().slice(0, 10));
      setProofImage(request?.paymentProofUrl ? { uri: request.paymentProofUrl, existingPath: request.paymentProofPath } : null);
      if (rooms.length === 0) setError('There are no vacant rooms available right now. Please check again later.');
    } catch (loadError) {
      setError(loadError.message || 'Could not load available rooms. Please try again.');
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    loadRequest();
  }, [tenantId, refreshKey, tenant?.accountStatus]);

  const pickProofImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Allow photo access to attach your payment proof.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        setProofImage(result.assets[0]);
        setError('');
      }
    } catch (pickError) {
      setError(pickError.message || 'Could not open your photos. Please try again.');
    }
  };

  const saveRoomPreference = async () => {
    if (!selectedRoomId) {
      setError('Choose a vacant room to continue.');
      return;
    }
    const selected = availableRooms.find((room) => room.id === selectedRoomId);
    const expectedAmount = Number(selected?.estimatedRent || 0);
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      setError('Enter the amount paid for one month advance.');
      return;
    }
    if (expectedAmount > 0 && Number(paymentAmount) !== expectedAmount) {
      setError(`The amount for this room should be ₱${expectedAmount.toLocaleString()} (one month advance).`);
      return;
    }
    if (!paymentDate.trim() || !proofImage?.uri) {
      setError('Enter the payment date and attach your payment proof.');
      return;
    }
    setSubmitting(true);
    setSubmittingStage('Compressing receipt photo…');
    setError('');
    try {
      const paymentProofPath = proofImage.existingPath || await uploadInitialPaymentProof({ tenantId, asset: proofImage });
      setSubmittingStage('Saving your room and payment setup…');
      const savedRequest = await submitRoomAssignmentRequest({
        tenantId,
        requestedRoomId: selectedRoomId,
        paymentAmount,
        paymentMethod,
        paymentDate,
        paymentReference: request?.paymentReference || '',
        paymentProofPath,
      });
      setRequest(savedRequest);
      setModalVisible(false);
      onChanged?.();
    } catch (submitError) {
      setError(submitError.message || 'Could not send your room preference. Please try again.');
    } finally {
      setSubmitting(false);
      setSubmittingStage('');
    }
  };

  const status = statusPresentation(tenant.accountStatus, colors);
  const isPending = tenant.accountStatus === 'pending';
  const selectedRoom = availableRooms.find((room) => room.id === selectedRoomId);

  return (
    <>
      <View
        onTouchStart={() => {
          if (isPending && !showRoomSetupHint) setShowRoomSetupHint(true);
        }}
        style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 18, marginHorizontal: 16, marginBottom: 18 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textMuted, fontSize: fs(12), fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Application status
            </Text>
            <Text style={{ color: colors.text, fontSize: fs(17), fontWeight: '800', marginTop: 5 }}>
              {isPending ? 'Your registration is being reviewed' : tenant.accountStatus === 'approved' ? 'Your tenant application is approved' : 'Your application was not approved'}
            </Text>
          </View>
          <View style={{ backgroundColor: status.background, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name={status.icon} size={15} color={status.color} />
            <Text style={{ color: status.color, fontSize: fs(11), fontWeight: '800' }}>{status.label}</Text>
          </View>
        </View>

        {isPending ? (
          <>
            <Text style={{ color: colors.textSecondary, fontSize: fs(13), lineHeight: 20, marginTop: 10 }}>
              Choose a room and submit proof of one month advance. Staff will review your room request and payment proof.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
              <View style={{ flex: 1, paddingVertical: 4, paddingRight: 10, borderRightWidth: 1, borderRightColor: colors.cardBorder }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Ionicons name="bed-outline" size={15} color={colors.accent} />
                  <Text style={{ color: colors.textMuted, fontSize: fs(11), fontWeight: '800', textTransform: 'uppercase' }}>Room</Text>
                </View>
                <Text style={{ color: colors.text, fontSize: fs(14), fontWeight: '800' }} numberOfLines={1}>
                  {request?.roomNumber ? `Room ${request.roomNumber}` : 'Not selected'}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: fs(11), marginTop: 3 }} numberOfLines={1}>
                  {request?.roomType || 'Choose an available room'}
                </Text>
              </View>
              <View style={{ flex: 1, paddingVertical: 4, paddingLeft: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Ionicons name="wallet-outline" size={15} color={colors.accent} />
                  <Text style={{ color: colors.textMuted, fontSize: fs(11), fontWeight: '800', textTransform: 'uppercase' }}>Move-in payment</Text>
                </View>
                <Text style={{ color: colors.text, fontSize: fs(14), fontWeight: '800' }} numberOfLines={1}>
                  {request?.initialPaymentAmount ? `₱${Number(request.initialPaymentAmount).toLocaleString()}` : 'Not submitted'}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: fs(11), marginTop: 3 }} numberOfLines={1}>
                  1 month advance
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 11, paddingHorizontal: 2 }}>
              <Ionicons name={request?.paymentProofUrl ? 'document-text-outline' : 'information-circle-outline'} size={16} color={request?.paymentProofUrl ? colors.warningText : colors.textMuted} />
              <Text style={{ flex: 1, color: request?.paymentProofUrl ? colors.warningText : colors.textSecondary, fontSize: fs(12), fontWeight: '600' }}>
                {request?.paymentProofUrl ? `Payment proof ${request.paymentProofStatus || 'pending review'} · sent to staff` : 'Room and payment setup has not been submitted'}
              </Text>
            </View>
            {request?.paymentDate ? <Text style={{ color: colors.textMuted, fontSize: fs(11), marginTop: 4, marginLeft: 24 }}>Payment method: {request.paymentMethod === 'gcash' ? 'GCash' : 'Cash'} · {request.paymentDate}{request.paymentReference ? ` · Ref ${request.paymentReference}` : ''}</Text> : null}
            <Text style={{ color: colors.textMuted, fontSize: fs(11), marginTop: 8 }}>Your room request does not reserve the room until staff confirms it.</Text>
            {showRoomSetupHint && (
              <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.danger }}>
                <Ionicons name="information-circle-outline" size={17} color={colors.dangerText} />
                <Text style={{ flex: 1, color: colors.dangerText  , fontSize: fs(12), fontWeight: '800' }}>
                  Kindly click the button below to set up your room and payment.
                </Text>
              </View>
            )}
            <TouchableOpacity
              onTouchStart={(event) => event.stopPropagation()}
              onPress={openRoomPicker}
              accessibilityRole="button"
              style={{ backgroundColor: colors.accent, borderRadius: 11, paddingVertical: 12, paddingHorizontal: 15, marginTop: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}
            >
              <Ionicons name="bed-outline" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: fs(14), fontWeight: '800' }}>{request ? 'Update room & payment setup' : 'Set up room & payment'}</Text>
            </TouchableOpacity>
          </>
        ) : tenant.accountStatus === 'approved' ? (
          <Text style={{ color: colors.textSecondary, fontSize: fs(13), lineHeight: 20, marginTop: 10 }}>
            {tenant.roomNumber ? `You are assigned to Room ${tenant.roomNumber}${tenant.roomType ? ` · ${tenant.roomType}` : ''}. Your initial invoice and payment options are available in My Finances.` : 'Your account is approved. Contact staff to confirm your room assignment.'}
          </Text>
        ) : (
          <Text style={{ color: colors.textSecondary, fontSize: fs(13), lineHeight: 20, marginTop: 10 }}>
            {tenant.rejectionReason || 'Please contact the property manager for more information.'}
          </Text>
        )}
        {isPending && (
          <TouchableOpacity
            onPress={async () => { await loadRequest(); onChanged?.(); }}
            accessibilityRole="button"
            style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, marginTop: 5 }}
          >
            <Ionicons name="refresh-outline" size={15} color={colors.accent} />
            <Text style={{ color: colors.accent, fontSize: fs(12), fontWeight: '700' }}>Refresh application status</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => !submitting && setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 18 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 18, maxHeight: '85%', padding: 18 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: colors.text, fontSize: fs(19), fontWeight: '800', flex: 1 }}>Room & payment setup</Text>
              <TouchableOpacity onPress={() => !submitting && setModalVisible(false)} disabled={submitting} accessibilityRole="button" accessibilityLabel="Close room picker">
                <Ionicons name="close" size={24} color={colors.dangerText} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: fs(13), lineHeight: 19, marginBottom: 14 }}>
              Select a vacant room, then submit your receipt for one month advance. Staff will confirm your room and payment. This request does not reserve the room.
            </Text>
            {loadingRooms ? (
              <View style={{ paddingVertical: 8, gap: 10 }}>
                {[0, 1, 2].map((item) => (
                  <View key={item} style={{ height: 62, borderRadius: 11, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder, padding: 13, justifyContent: 'center', gap: 8 }}>
                    <View style={{ width: '36%', height: 11, borderRadius: 6, backgroundColor: colors.cardBorder }} />
                    <View style={{ width: '68%', height: 9, borderRadius: 5, backgroundColor: colors.cardBorder }} />
                  </View>
                ))}
              </View>
            ) : (
              <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled">
                {selectedRoom && (
                  <View style={{ backgroundColor: colors.accentBg, padding: 11, borderRadius: 10, marginBottom: 10 }}>
                    <Text style={{ color: colors.text, fontSize: fs(12), fontWeight: '700' }}>1 month advance</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: fs(12), marginBottom: 5 }}>₱{selectedRoom.estimatedRent.toLocaleString()}</Text>
                  </View>
                )}
                {availableRooms.map((room) => {
                  const selected = selectedRoomId === room.id;
                  return (
                    <TouchableOpacity
                      key={room.id}
                      onPress={() => { setSelectedRoomId(room.id); setPaymentAmount(String(room.estimatedRent)); setError(''); }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 13, marginBottom: 8, borderRadius: 11, borderWidth: 1, borderColor: selected ? colors.accent : colors.cardBorder, backgroundColor: selected ? colors.accentBg : colors.bg }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: fs(14), fontWeight: '800' }}>Room {room.number}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: fs(12), marginTop: 3 }}>{room.type} · estimated rent ₱{room.estimatedRent.toLocaleString()}/month</Text>
                      </View>
                      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={21} color={selected ? colors.accent : colors.textMuted} />
                    </TouchableOpacity>
                  );
                })}
                {availableRooms.length > 0 && (
                  <>
                <Text style={{ color: colors.text, fontSize: fs(13), fontWeight: '700', marginTop: 12, marginBottom: 6 }}>Initial payment: 1 month advance *</Text>
                <TextInput value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="decimal-pad" placeholder="Total amount paid" placeholderTextColor={colors.textMuted} style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, padding: 11, color: colors.text, marginBottom: 9 }} />
                <Text style={{ color: colors.textSecondary, fontSize: fs(12), marginBottom: 6 }}>Payment method *</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  {[
                    { value: 'cash', label: 'Cash', icon: 'cash-outline' },
                    { value: 'gcash', label: 'GCash', icon: 'phone-portrait-outline' },
                  ].map((method) => {
                    const selected = paymentMethod === method.value;
                    return (
                      <TouchableOpacity
                        key={method.value}
                        onPress={() => setPaymentMethod(method.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        style={{ flex: 1, minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: selected ? colors.accent : colors.cardBorder, backgroundColor: selected ? colors.accentBg : colors.bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                      >
                        <Ionicons name={method.icon} size={17} color={selected ? colors.accent : colors.textSecondary} />
                        <Text style={{ color: selected ? colors.accent : colors.text, fontSize: fs(13), fontWeight: '700' }}>{method.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: fs(12), marginBottom: 6 }}>Payment date *</Text>
                <TextInput value={paymentDate} onChangeText={setPaymentDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, padding: 11, color: colors.text, marginBottom: 9 }} />
                <TouchableOpacity onPress={pickProofImage} style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Ionicons name="cloud-upload-outline" size={18} color={colors.accent} />
                  <Text style={{ color: colors.accent, fontSize: fs(13), fontWeight: '700' }}>{proofImage ? 'Replace payment proof photo' : 'Attach payment proof photo *'}</Text>
                </TouchableOpacity>
                {proofImage?.uri ? <Image source={{ uri: proofImage.uri }} style={{ width: '100%', height: 110, borderRadius: 9, marginBottom: 8 }} resizeMode="cover" /> : null}
                  </>
                )}
              </ScrollView>
            )}
            {!!error && <Text style={{ color: colors.dangerText, fontSize: fs(13), marginTop: 8 }}>{error}</Text>}
            <TouchableOpacity
              onPress={saveRoomPreference}
              disabled={loadingRooms || submitting || !selectedRoomId}
              style={{ backgroundColor: colors.successText, opacity: loadingRooms || submitting || !selectedRoomId ? 0.55 : 1, borderRadius: 11, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', marginTop: 14, minHeight: 46 }}
            >
              {submitting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={{ color: '#fff', fontSize: fs(13), fontWeight: '700' }}>{submittingStage}</Text>
                </View>
              ) : <Text style={{ color: '#fff', fontSize: fs(14), fontWeight: '800' }}>Submit room & payment proof</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
