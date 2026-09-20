import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
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
} from '../utils/responsive';

export default function RoomsScreen() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState('all');
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

  const rooms = [
    { id: 1, number: '01', type: 'Single', tenant: 'Maria', status: 'paid', balance: 0 },
    { id: 2, number: '02', type: 'Single', tenant: 'Ana', status: 'balance', balance: 500 },
    { id: 3, number: '03', type: 'Single', tenant: null, status: 'vacant', balance: 0 },
    { id: 4, number: '04', type: 'Single', tenant: 'Joy', status: 'paid', balance: 0 },
    { id: 5, number: '05', type: 'Single', tenant: 'Lyn', status: 'balance', balance: 2500 },
    { id: 6, number: '06', type: 'Single', tenant: null, status: 'vacant', balance: 0 },
    { id: 7, number: '07', type: 'Single', tenant: 'Rose', status: 'paid', balance: 0 },
    { id: 8, number: '08', type: 'Single', tenant: 'Claire', status: 'paid', balance: 0 },
    { id: 9, number: '09', type: 'Single', tenant: 'Beth', status: 'balance', balance: 750 },
    { id: 10, number: '10', type: 'Single', tenant: 'Shei', status: 'paid', balance: 0 },
    { id: 11, number: '11', type: 'Single', tenant: 'Cel', status: 'paid', balance: 0 },
    { id: 12, number: '12', type: 'Single', tenant: 'Diane', status: 'balance', balance: 2500 },
    { id: 13, number: '13', type: 'Double', tenant: 'Tess', status: 'paid', balance: 0 },
    { id: 14, number: '14', type: 'Double', tenant: 'Karen', status: 'balance', balance: 3500 },
    { id: 15, number: '15', type: 'Double', tenant: null, status: 'vacant', balance: 0 },
    { id: 16, number: '16', type: 'Double', tenant: null, status: 'vacant', balance: 0 },
    { id: 17, number: '17', type: 'Double', tenant: 'Lisa', status: 'balance', balance: 1200 },
  ];

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
