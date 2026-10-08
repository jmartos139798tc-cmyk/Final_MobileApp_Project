import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { isMobile, getResponsivePadding, fs, spacing, cardStyle } from '../../utils/responsive';
import { getAllTenantsForManagement, addTenant, updateTenant, deleteTenant, getVacantRoomsForAssignment, createLease, terminateLease } from '../../services/dataService';

export default function OwnerTenants() {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantModalVisible, setTenantModalVisible] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assigningTenant, setAssigningTenant] = useState(null);
  const [vacantRooms, setVacantRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [dueDay, setDueDay] = useState('5');
  const [assignError, setAssignError] = useState('');
  const [assigning, setAssigning] = useState(false);

  const loadTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllTenantsForManagement();
      setTenants(data);
    } catch (err) {
      setError('Failed to load tenants.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTenants(); }, []);

  const openAddTenant = () => {
    setEditingTenant(null);
    setFirstName('');
    setLastName('');
    setPhone('');
    setFormError('');
    setTenantModalVisible(true);
  };

  const handleSaveTenant = async () => {
    try {
      setSaving(true);
      setFormError('');
      if (editingTenant) {
        await updateTenant(editingTenant.id, { firstName, lastName, phone });
        setTenants(prev => prev.map(t => t.id === editingTenant.id ? { ...t, firstName, lastName, phone, fullName: firstName + ' ' + lastName } : t));
      } else {
        const newTenant = await addTenant({ firstName, lastName, phone });
        setTenants(prev => [...prev, newTenant]);
      }
      setTenantModalVisible(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save tenant.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTenant = (tenant) => {
    if (tenant.leaseStatus === 'active') {
      Alert.alert('Cannot Delete', 'This tenant has an active lease.', [{ text: 'OK' }]);
      return;
    }
    Alert.alert('Delete Tenant', 'Delete ' + tenant.fullName + '?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteTenant(tenant.id);
          setTenants(prev => prev.filter(t => t.id !== tenant.id));
        } catch (err) {
          Alert.alert('Error', err.message);
        }
      }}
    ]);
  };

  const openAssignRoom = async (tenant) => {
    setAssigningTenant(tenant);
    setSelectedRoomId('');
    setMonthlyRent('');
    setDueDay('5');
    setAssignError('');
    setAssignModalVisible(true);
    try {
      const rooms = await getVacantRoomsForAssignment();
      setVacantRooms(rooms);
      if (rooms.length > 0) {
        setSelectedRoomId(rooms[0].id);
        setMonthlyRent(String(rooms[0].baseRent));
      }
    } catch (err) {
      setAssignError('Failed to load rooms.');
    }
  };

  const handleAssignRoom = async () => {
    try {
      setAssigning(true);
      setAssignError('');
      await createLease({ tenantId: assigningTenant.id, roomId: selectedRoomId, monthlyRent: parseFloat(monthlyRent), dueDay: parseInt(dueDay, 10) });
      await loadTenants();
      setAssignModalVisible(false);
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleTerminateLease = (tenant) => {
    Alert.alert('Terminate Lease', 'Terminate lease for ' + tenant.fullName + '?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Terminate', style: 'destructive', onPress: async () => {
        try {
          await terminateLease(tenant.leaseId);
          await loadTenants();
        } catch (err) {
          Alert.alert('Error', err.message);
        }
      }}
    ]);
  };

  if (loading) return (<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}><ActivityIndicator size="large" color={colors.accent} /></View>);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: padding, paddingTop: isMobile ? 16 : 24, paddingBottom: 24 }}>
        <View style={{ flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: 14, marginBottom: spacing.lg }}>
          <View>
            <Text style={{ fontSize: fs(12), color: colors.textMuted, fontWeight: '800', letterSpacing: 1, marginBottom: 4 }}>OWNER PORTAL</Text>
            <Text style={{ fontSize: fs(isMobile ? 27 : 32), color: colors.text, fontWeight: '800' }}>Tenant Management</Text>
            <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginTop: 4 }}>{tenants.length} {tenants.length === 1 ? 'tenant' : 'tenants'} registered</Text>
          </View>
          <TouchableOpacity onPress={openAddTenant} style={{ backgroundColor: colors.accent, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46 }}>
            <Ionicons name="person-add" size={20} color="#fff" />
            <Text style={{ fontSize: fs(15), fontWeight: '700', color: '#fff' }}>Add Tenant</Text>
          </TouchableOpacity>
        </View>
        <View style={{ gap: spacing.sm }}>
          {tenants.map(tenant => (
            <View key={tenant.id} style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 16, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View style={{ width: 50, height: 50, borderRadius: 17, backgroundColor: tenant.color || colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: fs(16), fontWeight: '800', color: '#fff' }}>{tenant.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fs(16), fontWeight: '800', color: colors.text }}>{tenant.fullName}</Text>
                  <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginTop: 2 }}>{tenant.phone || 'No phone number'}</Text>
                  {tenant.roomNumber ? (
                    <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 4 }}>Room {tenant.roomNumber} · ₱{Number(tenant.monthlyRent || 0).toLocaleString()}/month</Text>
                  ) : (
                    <Text style={{ fontSize: fs(12), color: colors.warningText, marginTop: 4 }}>No room assigned</Text>
                  )}
                </View>
                {isMobile && (
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete ${tenant.fullName}`} onPress={() => handleDeleteTenant(tenant)} style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.dangerBg, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="trash-outline" size={17} color={colors.dangerText} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, width: isMobile ? '100%' : undefined }}>
                {tenant.leaseStatus === 'active' ? (
                  <TouchableOpacity onPress={() => handleTerminateLease(tenant)} style={{ flex: isMobile ? 1 : undefined, alignItems: 'center', overflow: 'hidden', backgroundColor: colors.dangerBg, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 }}>
                    <Text style={{ fontSize: fs(13), fontWeight: '600', color: colors.dangerText }}>End Lease</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => openAssignRoom(tenant)} style={{ flex: isMobile ? 1 : undefined, alignItems: 'center', overflow: 'hidden', backgroundColor: colors.successBg, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 }}>
                    <Text style={{ fontSize: fs(13), fontWeight: '600', color: colors.successText }}>Assign Room</Text>
                  </TouchableOpacity>
                )}
                {!isMobile && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete ${tenant.fullName}`} onPress={() => handleDeleteTenant(tenant)} style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.dangerBg, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="trash-outline" size={16} color={colors.dangerText} />
                </TouchableOpacity>}
              </View>
            </View>
          ))}
          {tenants.length === 0 && (
            <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 32, alignItems: 'center' }}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={{ fontSize: fs(15), color: colors.textMuted, marginTop: 12 }}>No tenants yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>
      <Modal visible={tenantModalVisible} transparent animationType="fade" onRequestClose={() => !saving && setTenantModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => !saving && setTenantModalVisible(false)}>
          <Pressable style={{ width: isMobile ? '90%' : 480, backgroundColor: colors.card, borderRadius: 16, padding: 24 }} onPress={e => e.stopPropagation()}>
            <Text style={{ fontSize: fs(20), fontWeight: '800', color: colors.text, marginBottom: 20 }}>{editingTenant ? 'Edit Tenant' : 'Add Tenant'}</Text>
            {formError ? <View style={{ backgroundColor: colors.dangerBg, padding: 12, borderRadius: 8, marginBottom: 16 }}><Text style={{ fontSize: fs(14), color: colors.dangerText, fontWeight: '600' }}>{formError}</Text></View> : null}
            <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, marginBottom: 8 }}>First Name *</Text>
            <TextInput value={firstName} onChangeText={v => { setFirstName(v); setFormError(''); }} placeholder="Maria" placeholderTextColor={colors.textMuted} style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: fs(15), color: colors.text, marginBottom: 16 }} />
            <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, marginBottom: 8 }}>Last Name *</Text>
            <TextInput value={lastName} onChangeText={v => { setLastName(v); setFormError(''); }} placeholder="Santos" placeholderTextColor={colors.textMuted} style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: fs(15), color: colors.text, marginBottom: 16 }} />
            <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, marginBottom: 8 }}>Phone *</Text>
            <TextInput value={phone} onChangeText={v => { setPhone(v); setFormError(''); }} placeholder="09171234567" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: fs(15), color: colors.text, marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity onPress={() => !saving && setTenantModalVisible(false)} disabled={saving} style={{ flex: 1, backgroundColor: colors.bg, paddingVertical: 14, borderRadius: 999, overflow: 'hidden', alignItems: 'center' }}>
                <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveTenant} disabled={saving} style={{ flex: 1, backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 999, overflow: 'hidden', alignItems: 'center' }}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontSize: fs(15), fontWeight: '700', color: '#fff' }}>{editingTenant ? 'Save' : 'Add'}</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={assignModalVisible} transparent animationType="fade" onRequestClose={() => !assigning && setAssignModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => !assigning && setAssignModalVisible(false)}>
          <Pressable style={{ width: isMobile ? '90%' : 480, backgroundColor: colors.card, borderRadius: 16, padding: 24 }} onPress={e => e.stopPropagation()}>
            <Text style={{ fontSize: fs(20), fontWeight: '800', color: colors.text, marginBottom: 20 }}>Assign Room</Text>
            {assignError ? <View style={{ backgroundColor: colors.dangerBg, padding: 12, borderRadius: 8, marginBottom: 16 }}><Text style={{ fontSize: fs(14), color: colors.dangerText, fontWeight: '600' }}>{assignError}</Text></View> : null}
            {vacantRooms.length === 0 ? (
              <Text style={{ fontSize: fs(15), color: colors.textMuted, padding: 32, textAlign: 'center' }}>No vacant rooms available.</Text>
            ) : (
              <>
                <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, marginBottom: 8 }}>Select Room</Text>
                <View style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                  {vacantRooms.map(room => (
                    <TouchableOpacity key={room.id} onPress={() => { setSelectedRoomId(room.id); setMonthlyRent(String(room.baseRent)); }} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
                      <View>
                        <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }}>Room {room.displayNumber}</Text>
                        <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>{room.type} - P{room.baseRent.toLocaleString()}</Text>
                      </View>
                      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: selectedRoomId === room.id ? colors.accent : colors.cardBorder, backgroundColor: selectedRoomId === room.id ? colors.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        {selectedRoomId === room.id && <Ionicons name="checkmark" size={12} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, marginBottom: 8 }}>Monthly Rent</Text>
                <TextInput value={monthlyRent} onChangeText={v => { setMonthlyRent(v); setAssignError(''); }} placeholder="2500" placeholderTextColor={colors.textMuted} keyboardType="numeric" style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: fs(15), color: colors.text, marginBottom: 16 }} />
                <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, marginBottom: 8 }}>Due Day (1-31)</Text>
                <TextInput value={dueDay} onChangeText={v => { setDueDay(v); setAssignError(''); }} placeholder="5" placeholderTextColor={colors.textMuted} keyboardType="numeric" style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: fs(15), color: colors.text, marginBottom: 16 }} />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={() => !assigning && setAssignModalVisible(false)} disabled={assigning} style={{ flex: 1, backgroundColor: colors.bg, paddingVertical: 14, borderRadius: 999, overflow: 'hidden', alignItems: 'center' }}>
                    <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleAssignRoom} disabled={assigning} style={{ flex: 1, backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 999, overflow: 'hidden', alignItems: 'center' }}>
                    {assigning ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontSize: fs(15), fontWeight: '700', color: '#fff' }}>Assign</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
