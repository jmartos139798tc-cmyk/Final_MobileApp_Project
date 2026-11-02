import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { getTenantMoveOutRequest, getTenantMoveOutFinancialSummary, submitTenantMoveOutRequest } from '../../services/dataService';
import { getResponsivePadding } from '../../utils/responsive';
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export default function TenantMoveOutScreen({ user, onBack }) {
  const { colors } = useTheme();
  const [request, setRequest] = useState(null);
  const [moveInPayments, setMoveInPayments] = useState(null);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [refreshVersion, setRefreshVersion] = useState(0);

  useRealtimeRefresh(`tenant-move-out-${user?.tenant_id || 'unknown'}`, [
    { table: 'tenant_move_out_requests', filter: `tenant_id=eq.${user?.tenant_id || ''}` },
  ], () => setRefreshVersion((version) => version + 1), Boolean(user?.tenant_id));

  useEffect(() => {
    let active = true;
    Promise.all([
      getTenantMoveOutRequest(user?.tenant_id),
      getTenantMoveOutFinancialSummary(user?.tenant_id),
    ])
      .then(([item, summary]) => {
        if (!active) return;
        setRequest(item);
        setMoveInPayments(summary);
      })
      .catch((loadError) => { if (active) setError(loadError?.message || 'Could not load your move-out request.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.tenant_id, refreshVersion]);

  const submit = async () => {
    setError('');
    setSuccess('');
    const parts = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const selectedDate = parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
    if (!selectedDate || selectedDate.getFullYear() !== Number(parts[1]) || selectedDate.getMonth() !== Number(parts[2]) - 1 || selectedDate.getDate() !== Number(parts[3])) {
      setError('Choose a valid move-out date.');
      return;
    }
    if (date <= todayIso()) {
      setError('The move-out date must be after today.');
      return;
    }
    setSaving(true);
    try {
      const saved = await submitTenantMoveOutRequest({ tenantId: user?.tenant_id, moveOutDate: date });
      setRequest(saved);
      setSuccess('Your move-out request was sent to the landlord.');
    } catch (submitError) {
      setError(submitError?.message || 'Could not send your move-out request.');
    } finally {
      setSaving(false);
    }
  };

  const isPending = request?.status === 'pending';
  const isApproved = request?.status === 'approved';
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const calendarCells = [
    ...Array(calendarMonth.getDay()).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (calendarCells.length % 7) calendarCells.push(null);
  const inputStyle = {
    color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 16, minHeight: 50,
  };

  return (
    <ScrollView contentContainerStyle={{ padding: getResponsivePadding(), paddingBottom: 28 }}>
      <View style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 18, padding: 20 }}>
        <View style={{ width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentBg, marginBottom: 14 }}>
          <Ionicons name="calendar-outline" size={23} color={colors.accent} />
        </View>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Request to move out</Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 7 }}>
          Choose the date you plan to leave. Your landlord will review the request.
        </Text>

        {moveInPayments && (
          <View style={{ backgroundColor: colors.bg, borderRadius: 12, padding: 14, marginTop: 18 }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 10 }}>Move-in payment record</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 5 }}>
              <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 13 }}>1 month advance paid</Text>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>₱{Number(moveInPayments.advancePaid).toLocaleString()} / ₱{Number(moveInPayments.advanceTotal).toLocaleString()}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 5 }}>
              <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 13 }}>Security deposit paid</Text>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>₱{Number(moveInPayments.securityDepositPaid).toLocaleString()} / ₱{Number(moveInPayments.securityDepositTotal).toLocaleString()}</Text>
            </View>
          </View>
        )}

        {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} /> : (
          <>
            {request && (
              <View style={{ backgroundColor: colors.bg, borderRadius: 12, padding: 14, marginTop: 18 }}>
                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700' }}>LATEST REQUEST</Text>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 6 }}>
                  Leaving date: {request.requested_move_out_date}
                </Text>
                <Text style={{ color: isApproved ? colors.successText : colors.textSecondary, fontSize: 13, fontWeight: '700', marginTop: 4, textTransform: 'capitalize' }}>
                  Status: {request.status}
                </Text>
              </View>
            )}

            {!isPending && !isApproved && (
              <View style={{ marginTop: 22 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 7 }}>Planned move-out date</Text>
                {Platform.OS === 'web' ? (
                  <TextInput
                    value={date}
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textMuted}
                    style={inputStyle}
                    accessibilityLabel="Planned move-out date"
                    type="date"
                    min={todayIso()}
                  />
                ) : (
                  <TouchableOpacity onPress={() => setCalendarVisible(true)} accessibilityRole="button" accessibilityLabel="Choose move-out date" style={{ ...inputStyle, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: date ? colors.text : colors.textMuted, fontSize: 16 }}>{date || 'Choose a date'}</Text>
                    <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={submit}
                  disabled={saving}
                  accessibilityRole="button"
                  style={{ minHeight: 48, backgroundColor: colors.accent, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 18, opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Send move-out request</Text>}
                </TouchableOpacity>
              </View>
            )}
            {isPending && <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 14 }}>Your request is waiting for landlord review.</Text>}
            {isApproved && <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 14 }}>This move-out request has been approved.</Text>}
          </>
        )}
        {!!error && <Text accessibilityRole="alert" style={{ color: colors.dangerText, fontSize: 13, marginTop: 12 }}>{error}</Text>}
        {!!success && <Text accessibilityRole="alert" style={{ color: colors.successText, fontSize: 13, marginTop: 12 }}>{success}</Text>}
        {!!onBack && <TouchableOpacity onPress={onBack} style={{ alignSelf: 'flex-start', paddingVertical: 12, marginTop: 6 }}><Text style={{ color: colors.accent, fontWeight: '700' }}>Back to home</Text></TouchableOpacity>}
      </View>
      <Modal visible={calendarVisible} transparent animationType="fade" onRequestClose={() => setCalendarVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(15, 23, 42, 0.45)' }}>
          <View style={{ width: '100%', maxWidth: 380, alignSelf: 'center', backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder, padding: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <TouchableOpacity onPress={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} accessibilityLabel="Previous month" style={{ padding: 8 }}><Ionicons name="chevron-back" size={20} color={colors.text} /></TouchableOpacity>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
              <TouchableOpacity onPress={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} accessibilityLabel="Next month" style={{ padding: 8 }}><Ionicons name="chevron-forward" size={20} color={colors.text} /></TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 5 }}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <Text key={day} style={{ flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 12, fontWeight: '700', paddingVertical: 7 }}>{day}</Text>)}
            </View>
            {Array.from({ length: calendarCells.length / 7 }, (_, week) => (
              <View key={week} style={{ flexDirection: 'row' }}>
                {calendarCells.slice(week * 7, week * 7 + 7).map((day, weekday) => {
                  if (!day) return <View key={`empty-${week}-${weekday}`} style={{ flex: 1, height: 42 }} />;
                  const key = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const disabled = key <= todayIso();
                  const selected = date === key;
                  return <TouchableOpacity key={key} disabled={disabled} onPress={() => { setDate(key); setCalendarVisible(false); }} style={{ flex: 1, height: 42, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.accent : 'transparent' }}><Text style={{ color: disabled ? colors.textMuted : selected ? '#fff' : colors.text, fontWeight: selected ? '800' : '500', opacity: disabled ? 0.4 : 1 }}>{day}</Text></View></TouchableOpacity>;
                })}
              </View>
            ))}
            <TouchableOpacity onPress={() => setCalendarVisible(false)} style={{ alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 10, marginTop: 12 }}><Text style={{ color: colors.accent, fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
