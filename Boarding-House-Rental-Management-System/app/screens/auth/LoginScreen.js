import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isMobile, isDesktop, getResponsivePadding, fs, spacing, cardStyle, cardShadow, safeAreaTop } from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import { loginWithEmail, DEMO_ACCOUNTS } from '../../services/authService';

export default function LoginScreen({ onLoginSuccess }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 480 : '100%';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignIn = async (emailToUse, passToUse) => {
    const targetEmail = emailToUse !== undefined ? emailToUse : email;
    const targetPass = passToUse !== undefined ? passToUse : password;

    if (!targetEmail.trim() || !targetPass.trim()) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const user = await loginWithEmail(targetEmail, targetPass);
      setLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess(user);
      }
    } catch (err) {
      setLoading(false);
      setErrorMessage(err.message || 'Authentication failed');
    }
  };

  const handleQuickFill = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setErrorMessage('');
    handleSignIn(account.email, account.password);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Theme toggle floating button */}
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding,
            paddingTop: isMobile ? safeAreaTop + 40 : 60,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: '100%', maxWidth: containerMaxWidth }}>
            {/* Logo & Branding */}
            <View style={{ alignItems: 'center', marginBottom: 32 }}>
              <View style={{
                width: 68,
                height: 68,
                borderRadius: 20,
                backgroundColor: '#7c3aed',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                ...cardShadow,
              }}>
                <Ionicons name="home" size={32} color="#ffffff" />
              </View>

              <Text style={{
                fontSize: fs(24),
                fontWeight: '900',
                color: colors.text,
                letterSpacing: -0.5,
              }}>
                Neat & Groovy BH
              </Text>
              <Text style={{
                fontSize: fs(13),
                color: colors.textMuted,
                marginTop: 4,
                textAlign: 'center',
              }}>
                Boarding House Management System
              </Text>
            </View>

            {/* Error Message Box */}
            {errorMessage ? (
              <View style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                borderColor: colors.danger,
                borderWidth: 1,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 18,
              }}>
                <Ionicons name="alert-circle" size={20} color={colors.danger} />
                <Text style={{ fontSize: fs(12), color: colors.danger, flex: 1, fontWeight: '600' }}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* Credentials Card */}
            <View style={{
              ...cardStyle,
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              padding: isMobile ? 20 : 28,
              marginBottom: 24,
            }}>
              <Text style={{
                fontSize: fs(18),
                fontWeight: '800',
                color: colors.text,
                marginBottom: 20,
              }}>
                Sign In
              </Text>

              {/* Email Input */}
              <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
                Email Address
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.searchBg,
                borderColor: colors.searchBorder,
                borderWidth: 1,
                borderRadius: 12,
                paddingHorizontal: 14,
                marginBottom: 16,
              }}>
                <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
                <TextInput
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    fontSize: fs(14),
                    color: colors.text,
                  }}
                  placeholder="Enter your email..."
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {/* Password Input */}
              <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
                Password
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.searchBg,
                borderColor: colors.searchBorder,
                borderWidth: 1,
                borderRadius: 12,
                paddingHorizontal: 14,
                marginBottom: 24,
              }}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
                <TextInput
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    fontSize: fs(14),
                    color: colors.text,
                  }}
                  placeholder="Enter your password..."
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={loading}
                onPress={() => handleSignIn()}
                style={{
                  backgroundColor: '#7c3aed',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Text style={{ fontSize: fs(15), fontWeight: '800', color: '#ffffff' }}>
                      Sign In
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Quick Test Accounts Section */}
            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Ionicons name="flash" size={16} color="#fbbf24" />
                <Text style={{
                  fontSize: fs(12),
                  fontWeight: '800',
                  color: colors.textSecondary,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}>
                  Quick Sign-In (For Testing)
                </Text>
              </View>

              <View style={{ gap: 10 }}>
                {DEMO_ACCOUNTS.map((acc) => (
                  <TouchableOpacity
                    key={acc.role}
                    activeOpacity={0.7}
                    onPress={() => handleQuickFill(acc)}
                    style={{
                      ...cardStyle,
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                      padding: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: acc.accent + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Ionicons name={acc.icon} size={20} color={acc.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: fs(14), fontWeight: '800', color: colors.text }}>
                          {acc.name}
                        </Text>
                        <View style={{
                          backgroundColor: acc.accent + '15',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 8,
                        }}>
                          <Text style={{ fontSize: fs(10), fontWeight: '800', color: acc.accent }}>
                            {acc.roleLabel}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: fs(11), color: colors.textMuted, marginTop: 2 }}>
                        {acc.email} · {acc.password}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

