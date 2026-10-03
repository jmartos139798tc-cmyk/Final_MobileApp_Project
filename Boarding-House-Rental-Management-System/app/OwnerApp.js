import React, { useState } from 'react';
import { View, StatusBar, TouchableOpacity, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isDesktop, isMobile, safeAreaTop, cardShadow } from './utils/responsive';
import { useTheme } from './utils/ThemeContext';

import OwnerDashboard from './screens/owner/OwnerDashboard';
import OwnerRooms from './screens/owner/OwnerRooms';
import OwnerReports from './screens/owner/OwnerReports';
import OwnerBottomNav from './components/OwnerBottomNav';
import { db, isFirebaseConfigured } from './utils/firebase';
import { seedFirestoreDatabase } from './services/dataService';

export default function OwnerApp({ user, onLogout }) {
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const { isDark, toggleTheme, colors } = useTheme();

  const confirmSeedDatabase = () => {
    if (!isFirebaseConfigured || !db) {
      Alert.alert('Firebase not configured', 'Connect this app to Firebase before uploading sample data.');
      return;
    }

    Alert.alert(
      'Upload sample data?',
      'This uploads demo boarding-house records to Firestore and overwrites documents with matching IDs. Continue only if that is intended.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upload',
          style: 'destructive',
          onPress: async () => {
            try {
              await seedFirestoreDatabase(db);
              Alert.alert('Upload complete', 'Sample data was uploaded to Firestore.');
            } catch (error) {
              console.error('Firestore seed failed:', error);
              Alert.alert('Upload failed', error?.message || 'Could not upload sample data.');
            }
          },
        },
      ]
    );
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <OwnerDashboard />;
      case 'reports':
        return <OwnerReports />;
      case 'rooms':
        return <OwnerRooms />;
      default:
        return <OwnerDashboard />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />

      {/* Theme toggle */}
      <TouchableOpacity
        onPress={confirmSeedDatabase}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Upload sample data to Firebase"
        style={{
          position: 'absolute',
          top: isMobile ? safeAreaTop + 8 : 16,
          right: 112,
          height: 40,
          paddingHorizontal: 12,
          borderRadius: 20,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          ...cardShadow,
        }}
      >
        <Ionicons name="cloud-upload-outline" size={18} color={colors.primary || '#6366f1'} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={toggleTheme}
        activeOpacity={0.7}
        style={{
          position: 'absolute',
          top: isMobile ? safeAreaTop + 8 : 16,
          right: 16,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          ...cardShadow,
        }}
      >
        <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color={isDark ? '#fbbf24' : '#6366f1'} />
      </TouchableOpacity>

      {/* Log out button */}
      {onLogout && (
        <TouchableOpacity
          onPress={onLogout}
          activeOpacity={0.7}
          style={{
            position: 'absolute',
            top: isMobile ? safeAreaTop + 8 : 16,
            right: 64,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            ...cardShadow,
          }}
        >
          <Ionicons name="log-out-outline" size={19} color={colors.danger} />
        </TouchableOpacity>
      )}

      {isDesktop ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <OwnerBottomNav activeScreen={activeScreen} onNavigate={setActiveScreen} />
          <View style={{ flex: 1 }}>{renderScreen()}</View>
        </View>
      ) : (
        <>
          <View style={{ flex: 1 }}>{renderScreen()}</View>
          <OwnerBottomNav activeScreen={activeScreen} onNavigate={setActiveScreen} />
        </>
      )}
    </View>
  );
}
