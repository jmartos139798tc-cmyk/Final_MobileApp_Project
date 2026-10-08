import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import {
  isMobile,
  isTablet,
  isDesktop,
  getResponsivePadding,
  fs,
  spacing,
  cardStyle,
  cardShadow,
  safeAreaTop,
  getGridColumns,
} from '../../utils/responsive';
import { getRooms } from '../../services/dataService';

export default function RoomsScreen() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState('all');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1400 : '100%';

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

  useEffect(() => {
    let isMounted = true;
    const fetchRooms = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getRooms();
        if (isMounted) {
          setRooms(data);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load rooms. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRooms();
    return () => {
      isMounted = false;
    };
  }, []);

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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg, padding: 20 }}>
        <Text style={{ color: colors.danger, fontSize: fs(16), textAlign: 'center', fontWeight: '600' }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ 
        padding, 
        paddingTop: isMobile ? safeAreaTop + 16 : isDesktop ? 40 : 60,
        alignItems: isDesktop ? 'center' : 'stretch'
      }}>
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          <Text style={{ fontSize: fs(13), color: colors.textMuted, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {totalCount} Total Rooms
          </Text>
          <Text style={{ fontSize: fs(32), color: colors.text, fontWeight: '800', marginTop: 4 }}>
            Rooms
          </Text>

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
                    backgroundColor: isActive ? colors.accent : colors.filterBg,
                    borderWidth: 1,
                    borderColor: isActive ? colors.accent : colors.filterBorder,
                    justifyContent: 'center',
                    alignItems: 'center',
                    ...cardShadow,
                  }}
                >
                  <Text style={{ 
                    fontSize: fs(13), 
                    fontWeight: '700', 
                    color: isActive ? '#ffffff' : colors.textSecondary 
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
              <TouchableOpacity 
                key={room.id}
                activeOpacity={0.7}
                onPress={() => setSelectedRoom(room)}
                style={[
                  cardStyle,
                  { 
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    width: cardWidth,
                    aspectRatio: 1,
                    padding: isDesktop ? 18 : 14,
                    justifyContent: 'space-between',
                    borderTopWidth: 3,
                    borderTopColor: statusColor,
                  },
                  getCardStyle(room.status),
                ]}
              >
                {/* Card Top: Room Number & Status Circle */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ 
                    fontSize: fs(22), 
                    fontWeight: '900', 
                    color: isVacant ? colors.textSecondary : colors.text 
                  }}>
                    {room.number}
                  </Text>
                  <View 
                    style={{ 
                      width: 10, 
                      height: 10, 
                      borderRadius: 5, 
                      backgroundColor: statusColor 
                    }} 
                  />
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
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Room Detail Modal */}
      {selectedRoom && (
        <Modal
          visible={!!selectedRoom}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedRoom(null)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
            onPress={() => setSelectedRoom(null)}
          >
            <Pressable
              style={{
                width: '100%',
                maxWidth: 500,
                backgroundColor: colors.card,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                maxHeight: '90%',
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={{ padding: 24, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 30,
                        backgroundColor: selectedRoom.status === 'paid' ? colors.successBg : selectedRoom.status === 'balance' ? colors.warningBg : colors.infoBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons 
                        name="bed" 
                        size={28} 
                        color={selectedRoom.status === 'paid' ? colors.successText : selectedRoom.status === 'balance' ? colors.warningText : colors.infoText} 
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelectedRoom(null)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="close" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: fs(22), fontWeight: '800', color: colors.text }}>
                    Room {selectedRoom.number}
                  </Text>
                  <Text style={{ fontSize: fs(14), color: colors.textSecondary, marginTop: 4 }}>
                    {selectedRoom.type}
                  </Text>
                </View>

                {/* Details */}
                <View style={{ padding: 24 }}>
                  {/* Status */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
                      Room Status
                    </Text>
                    {selectedRoom.status === 'vacant' ? (
                      <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        gap: 10,
                        backgroundColor: colors.infoBg,
                        padding: 14,
                        borderRadius: 12,
                      }}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.infoText} />
                        <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.infoText }}>
                          Vacant - Available for Lease
                        </Text>
                      </View>
                    ) : (
                      <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        gap: 10,
                        backgroundColor: colors.successBg,
                        padding: 14,
                        borderRadius: 12,
                      }}>
                        <Ionicons name="people" size={24} color={colors.successText} />
                        <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.successText }}>
                          Occupied
                        </Text>
                      </View>
                    )}
                  </View>

                  {selectedRoom.tenant && (
                    <>
                      {/* Tenant Name */}
                      <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
                          Current Tenant
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="person-outline" size={20} color={colors.accent} />
                          </View>
                          <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text }}>
                            {selectedRoom.tenant}
                          </Text>
                        </View>
                      </View>

                      {/* Payment Status */}
                      <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
                          Payment Status
                        </Text>
                        {selectedRoom.balance > 0 ? (
                          <View style={{ 
                            backgroundColor: colors.warningBg,
                            padding: 14,
                            borderRadius: 12,
                          }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                              <Ionicons name="alert-circle" size={24} color={colors.warningText} />
                              <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.warningText }}>
                                Outstanding Balance
                              </Text>
                            </View>
                            <Text style={{ fontSize: fs(20), fontWeight: '800', color: colors.warningText }}>
                              ?{selectedRoom.balance.toLocaleString()}
                            </Text>
                          </View>
                        ) : (
                          <View style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            gap: 10,
                            backgroundColor: colors.successBg,
                            padding: 14,
                            borderRadius: 12,
                          }}>
                            <Ionicons name="checkmark-circle" size={24} color={colors.successText} />
                            <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.successText }}>
                              Paid in Full
                            </Text>
                          </View>
                        )}
                      </View>
                    </>
                  )}

                  {/* Room Type */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
                      Room Type
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.infoBg, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="home-outline" size={20} color={colors.infoText} />
                      </View>
                      <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text }}>
                        {selectedRoom.type}
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}


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
    </View>
  );
}
