import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import {
  isMobile,
  isDesktop,
  getResponsivePadding,
  fs,
  spacing,
  cardStyle,
  safeAreaTop,
  getGridColumns,
} from '../../utils/responsive';
import { addRoom, getRooms, getRoomTypes } from '../../services/dataService';

export default function RoomsScreen() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState('all');
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1180 : '100%';

  const columns = getGridColumns();
  const gap = spacing.sm;

  // Responsive card width calculation based on columns
  const getCardWidth = () => {
    if (columns === 2) return '48.5%';
    if (columns === 3) return '31.8%';
    if (columns === 4) return '23.5%';
    return '18.4%';
  };
  const cardWidth = getCardWidth();

  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [roomsData, typesData] = await Promise.all([getRooms(), getRoomTypes()]);
        setRooms(roomsData);
        setRoomTypes(typesData);
        setSelectedTypeId(typesData[0]?.id || '');
      } catch (err) {
        setError('Failed to load rooms data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const saveRoom = async () => {
    setFormError('');
    setSaving(true);
    try {
      await addRoom({ roomNumber, typeId: selectedTypeId });
      setRooms(await getRooms());
      setRoomNumber('');
      setCreateModalVisible(false);
    } catch (err) {
      setFormError(err.message || 'Could not create this room.');
    } finally {
      setSaving(false);
    }
  };

  const totalCount = rooms.length;
  const occupiedCount = rooms.filter((r) => r.tenant !== null).length;
  const vacantCount = rooms.filter((r) => r.tenant === null).length;

  const filterOptions = [
    { key: 'all', label: `All (${totalCount})` },
    { key: 'occupied', label: `Occupied (${occupiedCount})` },
    { key: 'vacant', label: `Vacant (${vacantCount})` },
  ];

  const filteredRooms = rooms.filter((room) => {
    if (filter === 'all') return true;
    if (filter === 'occupied') return room.tenant !== null;
    if (filter === 'vacant') return room.tenant === null;
    return true;
  });

  const getStatusColor = (status) => {
    if (status === 'paid') return colors.success;
    if (status === 'balance') return colors.warning;
    return colors.vacantBorder;
  };

  const getCardStyle = (status) => {
    if (status === 'paid') {
      return { backgroundColor: colors.roomPaid };
    }
    if (status === 'balance') {
      return { backgroundColor: colors.roomBalance, borderColor: colors.roomBalanceBorder };
    }
    return { backgroundColor: colors.roomVacant };
  };

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}><ActivityIndicator size="large" color={colors.accent} /></View>;
  if (error) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}><Text style={{ color: colors.danger, fontSize: 16 }}>{error}</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ 
        padding, 
        paddingTop: isMobile ? safeAreaTop + 62 : isDesktop ? 68 : 64,
        alignItems: isDesktop ? 'center' : 'stretch'
      }}>
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          <Text style={{ fontSize: fs(12), color: colors.textMuted, fontWeight: '800', letterSpacing: 1, marginBottom: 5 }}>OWNER PORTAL</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fs(30), color: colors.text, fontWeight: '900', letterSpacing: -0.5 }}>Rooms</Text>
              <Text style={{ fontSize: fs(14), color: colors.textSecondary, marginTop: 5, lineHeight: 20 }}>Room availability and tenant payment status.</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Create room"
              onPress={() => { setFormError(''); setCreateModalVisible(true); }}
              style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 13, backgroundColor: colors.ownerAccent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}
            >
              <Ionicons name="add" size={19} color={colors.onPrimary || '#ffffff'} />
              <Text style={{ color: colors.onPrimary || '#ffffff', fontWeight: '800', fontSize: fs(13) }}>Add room</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
            {[
              { label: 'Total', value: totalCount, icon: 'grid-outline', color: colors.ownerAccent },
              { label: 'Occupied', value: occupiedCount, icon: 'people-outline', color: colors.infoText },
              { label: 'Vacant', value: vacantCount, icon: 'bed-outline', color: colors.successText },
            ].map((item) => (
              <View key={item.label} style={{ flex: 1, minWidth: 0, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 15, padding: isMobile ? 11 : 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name={item.icon} size={15} color={item.color} />
                  <Text style={{ fontSize: fs(11), color: colors.textMuted, fontWeight: '700' }}>{item.label}</Text>
                </View>
                <Text style={{ fontSize: fs(22), color: colors.text, fontWeight: '900', marginTop: 4 }}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Filter Tabs Section Label */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            gap: 6, 
            marginTop: spacing.lg, 
            marginBottom: spacing.sm 
          }}>
            <Ionicons name="filter" size={16} color={colors.textSecondary} />
            <Text style={{ 
              fontSize: fs(13), 
              fontWeight: '700', 
              color: colors.textSecondary, 
              letterSpacing: 0.5,
              textTransform: 'uppercase'
            }}>
              Filter Rooms
            </Text>
          </View>

          {/* Filter Pills */}
          <View style={{ 
            flexDirection: 'row', 
            gap: spacing.sm, 
            flexWrap: 'wrap'
          }}>
            {filterOptions.map((tab) => {
              const isActive = filter === tab.key;
              return (
                <TouchableOpacity 
                  key={tab.key}
                  activeOpacity={0.7}
                  onPress={() => setFilter(tab.key)} 
                  style={{ 
                    minHeight: 40,
                    paddingHorizontal: isDesktop ? 22 : 16, 
                    paddingVertical: isDesktop ? 10 : 8, 
                    borderRadius: 20, 
                    backgroundColor: isActive ? colors.ownerAccentBg : colors.filterBg,
                    borderWidth: 1,
                    borderColor: isActive ? colors.ownerAccent : colors.filterBorder,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={{ 
                    fontSize: fs(13), 
                    fontWeight: '700', 
                    color: isActive ? colors.ownerAccent : colors.textSecondary
                  }}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Room Grid */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingHorizontal: padding,
          paddingBottom: 20,
          alignItems: isDesktop ? 'center' : 'stretch',
        }}
      >
        <View style={{ 
          maxWidth: containerMaxWidth, 
          width: '100%',
          flexDirection: 'row', 
          flexWrap: 'wrap',
          gap
        }}>
          {filteredRooms.map((room) => {
            const statusColor = getStatusColor(room.status);
            const isVacant = room.status === 'vacant';

            return (
              <View
                key={room.id}
                style={[
                  cardStyle,
                  { 
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    width: cardWidth,
                    aspectRatio: isMobile ? 0.94 : 1.08,
                    padding: isDesktop ? 18 : 14,
                    justifyContent: 'space-between',
                    borderTopWidth: 3,
                    borderTopColor: statusColor,
                  },
                  getCardStyle(room.status),
                ]}
              >
                {/* Card Top: Room number and payment status */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ 
                    fontSize: fs(22), 
                    fontWeight: '900', 
                    color: isVacant ? colors.textSecondary : colors.text 
                  }}>
                    {room.number}
                  </Text>
                  <View style={{ backgroundColor: !room.tenant ? colors.infoBg : room.status === 'balance' ? colors.warningBg : colors.successBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ color: !room.tenant ? colors.infoText : room.status === 'balance' ? colors.warningText : colors.successText, fontSize: fs(9), fontWeight: '800' }}>
                      {!room.tenant ? 'VACANT' : room.status === 'balance' ? 'BALANCE' : 'PAID'}
                    </Text>
                  </View>
                </View>

                {/* Card Bottom: Type, Tenant & Balance/Status */}
                <View>
                  <Text 
                    numberOfLines={1} 
                    style={{ 
                      fontSize: fs(11), 
                      fontWeight: '600', 
                      color: isVacant ? colors.textMuted : colors.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5
                    }}
                  >
                    {room.type}
                  </Text>

                  {room.tenant ? (
                    <>
                      <Text 
                        numberOfLines={1} 
                        style={{ 
                          fontSize: fs(14), 
                          fontWeight: '700', 
                          color: colors.text, 
                          marginTop: 3 
                        }}
                      >
                        {room.tenant}
                      </Text>
                      {room.balance > 0 ? (
                        <Text 
                          numberOfLines={1} 
                          style={{ 
                            fontSize: fs(15), 
                            fontWeight: '800', 
                            color: colors.warning, 
                            marginTop: 2 
                          }}
                        >
                          ₱{room.balance.toLocaleString()}
                        </Text>
                      ) : (
                        <Text 
                          numberOfLines={1} 
                          style={{ 
                            fontSize: fs(12), 
                            fontWeight: '600', 
                            color: colors.success, 
                            marginTop: 2 
                          }}
                        >
                          Paid
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text 
                      numberOfLines={1} 
                      style={{ 
                        fontSize: fs(13), 
                        fontWeight: '600', 
                        color: colors.textMuted, 
                        marginTop: 3 
                      }}
                    >
                      Vacant
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={{ 
        backgroundColor: colors.bg, 
        paddingVertical: spacing.md, 
        paddingHorizontal: padding,
        borderTopWidth: 1, 
        borderTopColor: colors.cardBorder,
        alignItems: 'center',
      }}>
        <View style={{ 
          maxWidth: containerMaxWidth, 
          width: '100%',
          flexDirection: 'row', 
          justifyContent: 'center', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          gap: isMobile ? spacing.md : spacing.xl,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success }} />
            <Text style={{ fontSize: fs(12), color: colors.textSecondary, fontWeight: '600' }}>Paid</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.warning }} />
            <Text style={{ fontSize: fs(12), color: colors.textSecondary, fontWeight: '600' }}>Balance</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.vacantBorder }} />
            <Text style={{ fontSize: fs(12), color: colors.textSecondary, fontWeight: '600' }}>Vacant</Text>
          </View>
        </View>
      </View>

      <Modal visible={createModalVisible} transparent animationType="fade" onRequestClose={() => setCreateModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 440, backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 22, padding: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: fs(21), color: colors.text, fontWeight: '900' }}>Add a room</Text>
                <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginTop: 4 }}>New rooms start as vacant.</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={() => setCreateModalVisible(false)} style={{ padding: 8 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={{ marginTop: 20, marginBottom: 7, color: colors.textSecondary, fontSize: fs(13), fontWeight: '700' }}>Room number</Text>
            <TextInput
              value={roomNumber}
              onChangeText={(value) => { setRoomNumber(value); setFormError(''); }}
              placeholder="e.g. 18"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={4}
              style={{ minHeight: 48, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, color: colors.text, backgroundColor: colors.bg, fontSize: fs(15) }}
            />

            <Text style={{ marginTop: 17, marginBottom: 8, color: colors.textSecondary, fontSize: fs(13), fontWeight: '700' }}>Room type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {roomTypes.map((type) => {
                const active = selectedTypeId === type.id;
                return <TouchableOpacity key={type.id} onPress={() => setSelectedTypeId(type.id)} accessibilityRole="button" accessibilityState={{ selected: active }} style={{ paddingHorizontal: 13, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: active ? colors.ownerAccent : colors.cardBorder, backgroundColor: active ? colors.ownerAccentBg : colors.bg }}>
                  <Text style={{ fontSize: fs(13), fontWeight: '700', color: active ? colors.ownerAccent : colors.textSecondary }}>{type.name}</Text>
                </TouchableOpacity>;
              })}
            </View>

            {!!formError && <Text accessibilityRole="alert" style={{ color: colors.danger, marginTop: 13, fontSize: fs(13), fontWeight: '600' }}>{formError}</Text>}
            <TouchableOpacity disabled={saving || roomTypes.length === 0} onPress={saveRoom} style={{ minHeight: 48, marginTop: 20, borderRadius: 13, backgroundColor: colors.ownerAccent, alignItems: 'center', justifyContent: 'center', opacity: saving || roomTypes.length === 0 ? 0.6 : 1 }}>
              {saving ? <ActivityIndicator color={colors.onPrimary || '#ffffff'} /> : <Text style={{ color: colors.onPrimary || '#ffffff', fontSize: fs(14), fontWeight: '800' }}>Create room</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
