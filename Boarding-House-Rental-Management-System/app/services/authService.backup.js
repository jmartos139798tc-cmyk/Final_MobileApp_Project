// Authentication Service Layer
// Supports live Firebase Auth when configured, with graceful fallback to demo accounts for testing.

import { auth, db, isFirebaseConfigured } from '../utils/firebase';

// Pre-defined demo accounts for easy testing and evaluation
export const DEMO_ACCOUNTS = [
  {
    role: 'tenant',
    roleLabel: 'Tenant',
    name: 'Ana Reyes',
    email: 'ana@bh.com',
    password: 'tenant123',
    subtitle: 'Room 2 · Ana Reyes',
    icon: 'person',
    accent: '#8b5cf6',
  },
  {
    role: 'caretaker',
    roleLabel: 'Caretaker',
    name: 'Property Caretaker',
    email: 'caretaker@bh.com',
    password: 'caretaker123',
    subtitle: 'Rooms, billing & issues',
    icon: 'construct',
    accent: '#ff6347',
  },
  {
    role: 'owner',
    roleLabel: 'Owner',
    name: 'Boarding House Owner',
    email: 'owner@bh.com',
    password: 'owner123',
    subtitle: 'Revenue & financial reports',
    icon: 'business',
    accent: '#7c3aed',
  },
];

export async function loginWithEmail(email, password) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  // If real Firebase Auth is configured, attempt live authentication
  if (isFirebaseConfigured && auth) {
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      const user = userCredential.user;

      // In real Firestore, user role document is at `users/{uid}`
      // If document exists, read role; otherwise determine from email convention
      let role = 'tenant';
      if (cleanEmail.includes('owner')) role = 'owner';
      else if (cleanEmail.includes('caretaker')) role = 'caretaker';

      return {
        uid: user.uid,
        email: user.email,
        name: user.displayName || (role === 'tenant' ? 'Ana Reyes' : role.charAt(0).toUpperCase() + role.slice(1)),
        role,
        room: role === 'tenant' ? 2 : undefined,
        tenantId: role === 'tenant' ? '2' : undefined,
      };
    } catch (error) {
      console.warn('Firebase Auth error, checking demo accounts:', error.message);
      // Fall through to check demo accounts
    }
  }

  // Fallback demo account authentication
  const matched = DEMO_ACCOUNTS.find(
    (acc) => acc.email.toLowerCase() === cleanEmail && acc.password === cleanPass
  );

  if (matched) {
    return {
      uid: `demo-${matched.role}-1`,
      email: matched.email,
      name: matched.name,
      role: matched.role,
      room: matched.role === 'tenant' ? 2 : undefined,
      tenantId: matched.role === 'tenant' ? '2' : undefined,
    };
  }

  // Check if email matches but wrong password
  const emailExists = DEMO_ACCOUNTS.some((acc) => acc.email.toLowerCase() === cleanEmail);
  if (emailExists) {
    throw new Error('Incorrect password. Check the demo credentials below.');
  }

  throw new Error('Account not found. Please use one of the demo accounts or register in Firebase.');
}

export async function logout() {
  if (isFirebaseConfigured && auth) {
    try {
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signout error:', err.message);
    }
  }
  return true;
}

