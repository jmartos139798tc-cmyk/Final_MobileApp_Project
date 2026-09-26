import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isMobile, isDesktop, getResponsivePadding, fs, spacing, cardStyle, cardShadow, safeAreaTop } from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import { loginWithEmail, registerUser, DEMO_ACCOUNTS } from '../../services/authService';

export default function LoginScreen({ onLoginSuccess }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 500 : '100%';

  // Active form mode: 'login' | 'register'
  const [formMode, setFormMode] = useState('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState('tenant'); // 'tenant' | 'caretaker' | 'owner'
  const [regRoom, setRegRoom] = useState('02');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Sign In handler
  const handleSignIn = async (emailToUse, passToUse) => {
    const targetEmail = emailToUse !== undefined ? emailToUse : email;
    const targetPass = passToUse !== undefined ? passToUse : password;

    if (!targetEmail.trim() || !targetPass.trim()) {
      setErrorMessage('Please enter both email and password');
      setSuccessMessage('');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
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

  // Register handler
  const handleRegister = async () => {
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMessage('Please fill in your name, email, and password');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const newUser = await registerUser({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword.trim(),
        phone: regPhone.trim(),
        room: regRoom,
      });

      setLoading(false);
      setSuccessMessage('Tenant account created successfully! Signing you in...');
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess(newUser);
      }, 700);
    } catch (err) {
      setLoading(false);
      setErrorMessage(err.message || 'Registration failed');
    }
  };

  const handleQuickFill = (account) => {
    setFormMode('login');
    setEmail(account.email);
    setPassword(account.password);
    setErrorMessage('');
    setSuccessMessage('');
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
            paddingTop: isMobile ? safeAreaTop + 36 : 50,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: '100%', maxWidth: containerMaxWidth }}>
            {/* Logo & Branding */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: '#7c3aed',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
                ...cardShadow,
              }}>
                <Ionicons name="home" size={30} color="#ffffff" />
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
                fontSize: fs(12),
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
                marginBottom: 16,
              }}>
                <Ionicons name="alert-circle" size={20} color={colors.danger} />
                <Text style={{ fontSize: fs(12), color: colors.danger, flex: 1, fontWeight: '600' }}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* Success Message Box */}
            {successMessage ? (
              <View style={{
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                borderColor: colors.success,
                borderWidth: 1,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={{ fontSize: fs(12), color: colors.success, flex: 1, fontWeight: '600' }}>
                  {successMessage}
                </Text>
              </View>
            ) : null}

            {/* Auth Form Card */}
            <View style={{
              ...cardStyle,
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              padding: isMobile ? 20 : 28,
              marginBottom: 20,
            }}>
              {/* Form Mode Selector: Sign In / Create Account */}
              <View style={{
                flexDirection: 'row',
                backgroundColor: colors.bg,
                borderRadius: 12,
                padding: 4,
                marginBottom: 20,
              }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setFormMode('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: formMode === 'login' ? '#7c3aed' : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: fs(13),
                    fontWeight: '800',
                    color: formMode === 'login' ? '#ffffff' : colors.textMuted,
                  }}>
                    Sign In
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setFormMode('register');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: formMode === 'register' ? '#7c3aed' : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: fs(13),
                    fontWeight: '800',
                    color: formMode === 'register' ? '#ffffff' : colors.textMuted,
                  }}>
                    Tenant Sign Up
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ─── Sign In Form ────────────────────────────── */}
              {formMode === 'login' ? (
                <View>
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
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textSecondary }}>
                      Password
                    </Text>
                    <TouchableOpacity onPress={() => setShowForgotModal(true)}>
                      <Text style={{ fontSize: fs(11), color: '#8b5cf6', fontWeight: '700' }}>
                        Forgot?
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.searchBg,
                    borderColor: colors.searchBorder,
                    borderWidth: 1,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    marginBottom: 20,
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
              ) : (
                /* ─── Create Account / Registration Form ─────────── */
                <View>
                  {/* Full Name */}
                  <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
                    Full Name *
                  </Text>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.searchBg,
                    borderColor: colors.searchBorder,
                    borderWidth: 1,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    marginBottom: 14,
                  }}>
                    <Ionicons name="person-outline" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
                    <TextInput
                      style={{ flex: 1, paddingVertical: 12, fontSize: fs(14), color: colors.text }}
                      placeholder="e.g. Juan Dela Cruz"
                      placeholderTextColor={colors.textMuted}
                      value={regName}
                      onChangeText={setRegName}
                    />
                  </View>

                  {/* Email */}
                  <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
                    Email Address *
                  </Text>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.searchBg,
                    borderColor: colors.searchBorder,
                    borderWidth: 1,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    marginBottom: 14,
                  }}>
                    <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
                    <TextInput
                      style={{ flex: 1, paddingVertical: 12, fontSize: fs(14), color: colors.text }}
                      placeholder="e.g. juan@gmail.com"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={regEmail}
                      onChangeText={setRegEmail}
                    />
                  </View>

                  {/* Security Notice: Owner/Caretaker are pre-provisioned */}
                  <View style={{
                    backgroundColor: 'rgba(124, 58, 237, 0.08)',
                    borderColor: 'rgba(124, 58, 237, 0.25)',
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                    <Ionicons name="shield-checkmark" size={22} color="#8b5cf6" />
                    <Text style={{ fontSize: fs(11), color: colors.textSecondary, flex: 1, lineHeight: 16 }}>
                      <Text style={{ fontWeight: '800', color: colors.text }}>Tenant Self-Registration</Text>
                      {'\n'}For boarders of Neat & Groovy BH. Owner & Caretaker accounts are pre-migrated by administration.
                    </Text>
                  </View>

                  {/* Contact Number */}
                  <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
                    Contact Number
                  </Text>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.searchBg,
                    borderColor: colors.searchBorder,
                    borderWidth: 1,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    marginBottom: 14,
                  }}>
                    <Ionicons name="call-outline" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
                    <TextInput
                      style={{ flex: 1, paddingVertical: 12, fontSize: fs(14), color: colors.text }}
                      placeholder="e.g. 0917-123-4567"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="phone-pad"
                      maxLength={11}
                      value={regPhone}
                      onChangeText={(text) => setRegPhone(text.replace(/[^0-9]/g, '').slice(0, 11))}
                    />
                  </View>

                  {/* Assigned Room */}
                  <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
                    Assigned Room (01 – 17) *
                  </Text>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.searchBg,
                    borderColor: colors.searchBorder,
                    borderWidth: 1,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    marginBottom: 14,
                  }}>
                    <Ionicons name="bed-outline" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
                    <TextInput
                      style={{ flex: 1, paddingVertical: 12, fontSize: fs(14), color: colors.text }}
                      placeholder="Room number (e.g. 03)"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={regRoom}
                      onChangeText={setRegRoom}
                    />
                  </View>

                  {/* Password */}
                  <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
                    Create Password *
                  </Text>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.searchBg,
                    borderColor: colors.searchBorder,
                    borderWidth: 1,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    marginBottom: 14,
                  }}>
                    <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
                    <TextInput
                      style={{ flex: 1, paddingVertical: 12, fontSize: fs(14), color: colors.text }}
                      placeholder="At least 6 characters..."
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showRegPassword}
                      value={regPassword}
                      onChangeText={setRegPassword}
                    />
                    <TouchableOpacity onPress={() => setShowRegPassword(!showRegPassword)}>
                      <Ionicons
                        name={showRegPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Confirm Password */}
                  <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
                    Confirm Password *
                  </Text>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.searchBg,
                    borderColor: colors.searchBorder,
                    borderWidth: 1,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    marginBottom: 20,
                  }}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
                    <TextInput
                      style={{ flex: 1, paddingVertical: 12, fontSize: fs(14), color: colors.text }}
                      placeholder="Re-enter your password..."
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showRegPassword}
                      value={regConfirmPassword}
                      onChangeText={setRegConfirmPassword}
                    />
                  </View>

                  {/* Register Button */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={loading}
                    onPress={handleRegister}
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
                          Register as Tenant
                        </Text>
                        <Ionicons name="checkmark-done" size={18} color="#ffffff" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Quick Test Accounts Section */}
            <View style={{ marginTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Ionicons name="flash" size={16} color="#fbbf24" />
                <View>
                  <Text style={{
                    fontSize: fs(11),
                    fontWeight: '800',
                    color: colors.textSecondary,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}>
                    Quick Sign-In
                  </Text>
                  <Text style={{ fontSize: fs(10), color: colors.textMuted }}>
                    Pre-Migrated Administrative & Demo Accounts
                  </Text>
                </View>
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
                      padding: 13,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <View style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: acc.accent + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Ionicons name={acc.icon} size={19} color={acc.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: fs(13), fontWeight: '800', color: colors.text }}>
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

      {/* ── Forgot Password Modal ────────────────────── */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}>
          <View style={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: colors.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: 24,
            ...cardShadow,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: fs(18), fontWeight: '800', color: colors.text }}>
                Password Recovery
              </Text>
              <TouchableOpacity onPress={() => setShowForgotModal(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginBottom: 16, lineHeight: 20 }}>
              For security, password resets are coordinated with the property caretaker.
              Please reach out to the caretaker office or test with the pre-set demo passwords.
            </Text>

            <TouchableOpacity
              onPress={() => setShowForgotModal(false)}
              style={{
                backgroundColor: '#7c3aed',
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '800' }}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
