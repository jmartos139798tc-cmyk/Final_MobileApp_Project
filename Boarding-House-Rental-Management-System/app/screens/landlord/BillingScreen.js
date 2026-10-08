import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  isMobile, 
  isTablet, 
  isDesktop, 
  getResponsivePadding, 
  fs, 
  spacing, 
  cardStyle, 
  cardShadow, 
  safeAreaTop 
} from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import { getRentBilling, getUtilityBills } from '../../services/dataService';

export default function BillingScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('rent');
  const [rentBilling, setRentBilling] = useState([]);
  const [utilityBills, setUtilityBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1400 : '100%';

  useEffect(() => {
    let isMounted = true;
    const fetchBillingData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [rentData, utilityData] = await Promise.all([
          getRentBilling(),
          getUtilityBills(),
        ]);
        if (isMounted) {
          setRentBilling(rentData);
          setUtilityBills(utilityData);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load billing records. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBillingData();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalCollected = rentBilling
    .filter((item) => item.status === 'paid')
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  const totalOutstanding = rentBilling
    .filter((item) => item.status !== 'paid')
    .reduce((sum, item) => sum + (item.amount || 0), 0);

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
        paddingHorizontal: padding, 
        paddingTop: isMobile ? safeAreaTop + 16 : isDesktop ? 40 : 60,
        paddingBottom: spacing.sm,
        alignItems: isDesktop ? 'center' : 'stretch'
      }}>
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          <Text style={{ fontSize: fs(13), color: colors.textMuted, fontWeight: '500' }}>September 2026</Text>
          <Text style={{ fontSize: fs(32), color: colors.text, fontWeight: '700', marginTop: 4 }}>Billing</Text>

          {/* Summary Card */}
          <View style={{ 
            ...cardStyle, 
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            padding: isDesktop ? 20 : 16,
            marginTop: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {/* Collected Stat */}
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: colors.iconBgGreen,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  fontSize: fs(11), 
                  fontWeight: '600', 
                  color: colors.textSecondary, 
                  textTransform: 'uppercase', 
                  letterSpacing: 0.5 
                }} numberOfLines={1}>
                  Collected
                </Text>
                <Text style={{ 
                  fontSize: fs(18), 
                  fontWeight: '800', 
                  color: colors.success, 
                  marginTop: 2 
                }} numberOfLines={1}>
                  ₱{totalCollected.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View style={{ width: 1, height: 36, backgroundColor: colors.cardBorder, marginHorizontal: spacing.sm }} />

            {/* Outstanding Stat */}
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: colors.iconBgYellow,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Ionicons name="time" size={20} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  fontSize: fs(11), 
                  fontWeight: '600', 
                  color: colors.textSecondary, 
                  textTransform: 'uppercase', 
                  letterSpacing: 0.5 
                }} numberOfLines={1}>
                  Outstanding
                </Text>
                <Text style={{ 
                  fontSize: fs(18), 
                  fontWeight: '800', 
                  color: colors.warning, 
                  marginTop: 2 
                }} numberOfLines={1}>
                  ₱{totalOutstanding.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Toggle Tabs */}
          <View style={{ 
            flexDirection: 'row', 
            backgroundColor: colors.toggleBg, 
            borderRadius: 12, 
            padding: 4, 
            marginTop: spacing.md,
            borderWidth: 1,
            borderColor: colors.toggleBorder,
            ...cardShadow,
          }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveTab('rent')}
              style={{
                flex: 1,
                minHeight: 44,
                paddingVertical: isDesktop ? 14 : 12,
                borderRadius: 10,
                backgroundColor: activeTab === 'rent' ? colors.accent : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ 
                fontSize: fs(14), 
                fontWeight: '700', 
                color: activeTab === 'rent' ? '#ffffff' : colors.textMuted 
              }}>
                Rent Billing
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveTab('utility')}
              style={{
                flex: 1,
                minHeight: 44,
                paddingVertical: isDesktop ? 14 : 12,
                borderRadius: 10,
                backgroundColor: activeTab === 'utility' ? colors.accent : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ 
                fontSize: fs(14), 
                fontWeight: '700', 
                color: activeTab === 'utility' ? '#ffffff' : colors.textMuted 
              }}>
                Utility Bills
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main Content List */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingHorizontal: padding, 
          paddingTop: spacing.xs,
          paddingBottom: 20,
          gap: spacing.md,
          alignItems: isDesktop ? 'center' : 'stretch'
        }}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%', gap: spacing.md }}>
          {/* Section Header */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: spacing.xs,
          }}>
            <Text style={{ 
              fontSize: fs(13), 
              fontWeight: '700', 
              color: colors.textSecondary, 
              letterSpacing: 0.5,
              textTransform: 'uppercase'
            }}>
              {activeTab === 'rent' ? `Rent Billing (${rentBilling.length})` : `Utility Bills (${utilityBills.length})`}
            </Text>
          </View>

          {activeTab === 'rent' ? (
            // Rent Billing List
            rentBilling.length === 0 ? (
              <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 24, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: fs(14) }}>No rent billing records found.</Text>
              </View>
            ) : (
              rentBilling.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  activeOpacity={0.7}
                  style={{ 
                    ...cardStyle,
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    padding: isDesktop ? 20 : 16, 
                    flexDirection: 'row', 
                    alignItems: 'center',
                    borderLeftWidth: 3,
                    borderLeftColor: item.status === 'paid' ? colors.success : colors.danger,
                  }}
                >
                  {/* Avatar */}
                  <View style={{ 
                    width: isDesktop ? 48 : 44, 
                    height: isDesktop ? 48 : 44, 
                    borderRadius: 12, 
                    backgroundColor: item.color, 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginRight: spacing.md 
                  }}>
                    <Text style={{ fontSize: fs(15), fontWeight: '800', color: '#ffffff' }}>{item.initials}</Text>
                  </View>

                  {/* Tenant & Room Info */}
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: fs(12), fontWeight: '500', color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                      {item.room} · Due {item.dueDate}
                    </Text>
                  </View>

                  {/* Amount & Status Badge */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: fs(17), fontWeight: '800', color: colors.text }}>
                      ₱{item.amount.toLocaleString()}
                    </Text>
                    <View style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      gap: 4, 
                      backgroundColor: item.status === 'paid' ? colors.iconBgGreen : colors.iconBgRed,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12,
                      marginTop: 4,
                    }}>
                      <Ionicons 
                        name={item.status === 'paid' ? 'checkmark-circle' : 'close-circle'} 
                        size={12} 
                        color={item.status === 'paid' ? colors.success : colors.danger} 
                      />
                      <Text style={{ 
                        fontSize: fs(11), 
                        fontWeight: '700', 
                        color: item.status === 'paid' ? colors.success : colors.danger,
                        textTransform: 'capitalize' 
                      }}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )
          ) : (
            // Utility Bills List
            utilityBills.length === 0 ? (
              <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 24, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: fs(14) }}>No utility bills found.</Text>
              </View>
            ) : (
              utilityBills.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  activeOpacity={0.7}
                  style={{ 
                    ...cardStyle,
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    padding: isDesktop ? 22 : 16,
                    borderLeftWidth: 3,
                    borderLeftColor: colors.info,
                  }}
                >
                  {/* Header: Avatar, Name, Amount */}
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    marginBottom: spacing.md 
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, marginRight: spacing.sm }}>
                      <View style={{ 
                        width: isDesktop ? 48 : 44, 
                        height: isDesktop ? 48 : 44, 
                        borderRadius: 12, 
                        backgroundColor: item.color, 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <Text style={{ fontSize: fs(15), fontWeight: '800', color: '#ffffff' }}>{item.initials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text }} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={{ fontSize: fs(12), fontWeight: '500', color: colors.textMuted, marginTop: 2 }}>
                          Electricity Bill
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: fs(18), fontWeight: '800', color: colors.text }}>₱{item.amount.toLocaleString()}</Text>
                      <Text style={{ fontSize: fs(11), fontWeight: '600', color: colors.textMuted, marginTop: 2 }}>Current charge</Text>
                    </View>
                  </View>

                  {/* kWh Stats Row */}
                  <View style={{ 
                    flexDirection: 'row', 
                    gap: spacing.sm, 
                    paddingTop: spacing.md, 
                    borderTopWidth: 1, 
                    borderTopColor: colors.cardBorder 
                  }}>
                    <View style={{ 
                      flex: 1, 
                      backgroundColor: colors.bg, 
                      borderRadius: 10, 
                      paddingVertical: 10, 
                      paddingHorizontal: 8, 
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: colors.cardBorder
                    }}>
                      <Text style={{ fontSize: fs(10), fontWeight: '600', color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase' }}>Prev kWh</Text>
                      <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.textSecondary }}>{item.prevKwh}</Text>
                    </View>
                    <View style={{ 
                      flex: 1, 
                      backgroundColor: colors.bg, 
                      borderRadius: 10, 
                      paddingVertical: 10, 
                      paddingHorizontal: 8, 
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: colors.cardBorder
                    }}>
                      <Text style={{ fontSize: fs(10), fontWeight: '600', color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase' }}>Curr kWh</Text>
                      <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.textSecondary }}>{item.currKwh}</Text>
                    </View>
                    <View style={{ 
                      flex: 1.2, 
                      backgroundColor: colors.iconBgYellow, 
                      borderRadius: 10, 
                      paddingVertical: 10, 
                      paddingHorizontal: 8, 
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: colors.warning
                    }}>
                      <Text style={{ fontSize: fs(10), fontWeight: '700', color: colors.warning, marginBottom: 4, textTransform: 'uppercase' }}>Usage</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="flash" size={16} color={colors.warning} style={{ marginRight: 3 }} />
                        <Text style={{ fontSize: fs(14), fontWeight: '800', color: colors.text }}>{item.usage} kWh</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
}
