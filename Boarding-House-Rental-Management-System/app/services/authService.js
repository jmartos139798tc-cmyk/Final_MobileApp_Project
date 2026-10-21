import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { Platform } from 'react-native';

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then restart the app.');
  }
}

function getFriendlyAuthError(error, action) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('already registered') || message.includes('already been registered')) {
    return new Error('An account already exists for this email. Please sign in instead, or use Forgot password.');
  }
  if (message.includes('invalid login credentials')) {
    return new Error('Email or password is incorrect. Please try again or use Forgot password.');
  }
  if (message.includes('email not confirmed')) {
    return new Error('Confirm your email using the link we sent, then sign in.');
  }
  if (message.includes('password should be at least')) {
    return new Error('Choose a password with at least 6 characters.');
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return new Error('There have been too many attempts. Wait a while, then try again.');
  }
  console.warn(`Supabase ${action} failed:`, error?.code || 'unknown error', error?.message || error);
  return new Error(`Supabase could not ${action}. ${error?.message || 'Check your connection and try again.'}`);
}

async function getUserSessionFromSupabaseUser(authUser) {
  if (!authUser || !supabase) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', authUser.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile?.role) {
    const error = new Error('Your account profile is not ready yet. Please try signing in again.');
    error.code = 'app/profile-missing';
    throw error;
  }

  const role = profile.role;
  let roleProfile = null;
  let tenantId;
  if (role === 'tenant') {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, first_name, last_name, account_status')
      .eq('user_id', authUser.id)
      .maybeSingle();
    if (error) throw error;
    roleProfile = data;
    tenantId = data?.id;
  } else if (['landlord', 'owner', 'caretaker'].includes(role)) {
    const { data, error } = await supabase
      .from('staff_profiles')
      .select('first_name, last_name')
      .eq('user_id', authUser.id)
      .maybeSingle();
    if (error) throw error;
    roleProfile = data;
  }

  if (!roleProfile) {
    const error = new Error('Your account is missing its role profile. Ask the property owner to finish setting it up.');
    error.code = 'app/role-profile-missing';
    throw error;
  }

  const name = `${roleProfile.first_name || ''} ${roleProfile.last_name || ''}`.trim();
  return {
    uid: authUser.id,
    email: authUser.email || profile.email,
    name: name || authUser.user_metadata?.full_name || authUser.email,
    role: role === 'owner' || role === 'caretaker' ? 'landlord' : role,
    tenant_id: tenantId,
  };
}

export async function loginWithEmail(email, password) {
  requireSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: String(password ?? ''),
  });
  if (error) throw getFriendlyAuthError(error, 'sign in');
  try {
    return await getUserSessionFromSupabaseUser(data.user);
  } catch (profileError) {
    await supabase.auth.signOut();
    throw profileError;
  }
}

export async function sendPasswordReset(email) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) throw new Error('Enter the email address for your account.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error('Enter a valid email address.');
  requireSupabase();
  const webRedirect = Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : null;
  const redirectTo = process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL || webRedirect || 'boardinghouse://auth/reset-password';
  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
  if (error) throw getFriendlyAuthError(error, 'send the reset email');
}

export async function handleAuthRedirect(url) {
  if (!url || !supabase) return false;
  let callback;
  try {
    callback = new URL(url);
  } catch {
    return false;
  }

  const fragment = new URLSearchParams(callback.hash.replace(/^#/, ''));
  const type = fragment.get('type') || callback.searchParams.get('type');
  const isRecovery = type === 'recovery' || callback.pathname.includes('reset-password');
  const accessToken = fragment.get('access_token');
  const refreshToken = fragment.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
    return isRecovery;
  }

  const code = callback.searchParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return isRecovery;
  }
  return false;
}

export async function completePasswordRecovery(password) {
  requireSupabase();
  if (String(password ?? '').length < 6) throw new Error('Choose a password with at least 6 characters.');
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw getFriendlyAuthError(error, 'update your password');
  return getUserSessionFromSupabaseUser(data.user);
}

export async function getCurrentUserSession() {
  requireSupabase();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session?.user ? getUserSessionFromSupabaseUser(session.user) : null;
}

export async function subscribeToCurrentUser(onUser, onError, onPasswordRecovery) {
  if (!isSupabaseConfigured || !supabase) {
    onUser(null);
    return () => {};
  }

  let active = true;
  let revision = 0;
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') onPasswordRecovery?.();
    const currentRevision = ++revision;
    Promise.resolve().then(async () => {
      try {
        const user = session?.user ? await getUserSessionFromSupabaseUser(session.user) : null;
        if (active && currentRevision === revision) onUser(user);
      } catch (error) {
        if (active && currentRevision === revision) {
          if (onError) onError(error);
          onUser(null);
        }
      }
    });
  });

  return () => {
    active = false;
    subscription.unsubscribe();
  };
}

export async function logout() {
  if (!isSupabaseConfigured || !supabase) return true;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  return true;
}

export async function updateTenantAccount({
  tenantId,
  firstName,
  lastName,
  phone = '',
  emergencyContact = '',
  newPassword = '',
}) {
  requireSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Your session has expired. Sign in again and retry.');

  const cleanFirstName = String(firstName || '').trim();
  const cleanLastName = String(lastName || '').trim();
  const cleanPhone = String(phone || '').trim();
  const cleanEmergencyContact = String(emergencyContact || '').trim();
  const cleanNewPassword = String(newPassword ?? '').trim();
  if (!cleanFirstName) throw new Error('Enter your full name.');
  if (cleanNewPassword && cleanNewPassword.length < 6) throw new Error('Your new password must have at least 6 characters.');

  const fullName = `${cleanFirstName} ${cleanLastName}`;
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .update({
      first_name: cleanFirstName,
      last_name: cleanLastName,
      initials: `${cleanFirstName[0]}${cleanLastName[0] || cleanFirstName[0]}`.toUpperCase(),
      phone: cleanPhone,
      emergency_contact: cleanEmergencyContact,
    })
    .eq('id', tenantId)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();
  if (tenantError) throw tenantError;
  if (!tenant) throw new Error('Your tenant profile could not be verified. Contact the property administrator.');

  const { error: metadataError } = await supabase.auth.updateUser({ data: { full_name: fullName } });
  if (metadataError) throw new Error(`Your profile was saved, but account details could not be updated: ${metadataError.message}`);
  if (cleanNewPassword) {
    const { error: passwordError } = await supabase.auth.updateUser({ password: cleanNewPassword });
    if (passwordError) throw new Error(`Your profile was saved, but the password could not be changed: ${passwordError.message}`);
  }

  return { uid: user.id, name: fullName, tenant_id: tenant.id };
}

export async function registerUser({ email, password, name, phone = '' }) {
  requireSupabase();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = String(password ?? '');
  const cleanName = name.trim();
  if (!cleanEmail || !cleanPassword.trim() || !cleanName) throw new Error('Please fill in all required fields');
  if (cleanPassword.length < 6) throw new Error('Password must be at least 6 characters');

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: cleanPassword,
    options: {
      data: { full_name: cleanName, phone: phone.trim() },
      emailRedirectTo: 'boardinghouse://auth/confirm-email',
    },
  });
  if (error) throw getFriendlyAuthError(error, 'create your account');

  // With email confirmation enabled, Supabase obfuscates duplicate confirmed
  // accounts instead of returning a "User already registered" error.
  if (data.user?.identities?.length === 0) {
    throw new Error('An account with this email already exists. Sign in or use Forgot password.');
  }

  if (!data.session) {
    return { requiresEmailConfirmation: true, email: cleanEmail };
  }

  return getUserSessionFromSupabaseUser(data.user);
}
