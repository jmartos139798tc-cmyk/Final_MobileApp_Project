// Authentication Service Layer
// Integrates Firebase Auth with the 3NF USERS and TENANTS collections.
// Supports live Firebase Auth when configured, with fallback to normalized 3NF demo accounts.

import { auth, db, isFirebaseConfigured } from '../utils/firebase';
import { COLLECTIONS } from './databaseSchema';
import { getNormalizedMockDatabase } from './seedDatabase';

// Pre-defined demo accounts mapped to 3NF users
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

/**
 * Authenticates user credentials and retrieves their 3NF profile
 */
export async function loginWithEmail(email, password) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  // 1. Live Firebase Authentication (When configured)
  if (isFirebaseConfigured && auth) {
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      const fbUser = userCredential.user;

      // Query normalized USERS collection in Firestore
      let userProfile = null;
      if (db) {
        const { doc, getDoc } = await import('firebase/firestore');
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, fbUser.uid));
        if (userDoc.exists()) {
          userProfile = userDoc.data();
        }
      }

      const role = userProfile ? userProfile.role : (cleanEmail.includes('owner') ? 'owner' : cleanEmail.includes('caretaker') ? 'caretaker' : 'tenant');
      const tenantId = userProfile?.tenant_id || (role === 'tenant' ? 'tenant-2' : undefined);

      return {
        uid: fbUser.uid,
        email: fbUser.email,
        name: userProfile?.name || fbUser.displayName || (role === 'tenant' ? 'Ana Reyes' : role.charAt(0).toUpperCase() + role.slice(1)),
        role,
        room: role === 'tenant' ? 2 : undefined,
        tenant_id: tenantId,
      };
    } catch (error) {
      console.warn('Firebase Auth error, checking normalized demo accounts:', error.message);
    }
  }

  // 2. Normalized 3NF Demo Account Verification
  const store = getNormalizedMockDatabase();
  const matchedDemo = DEMO_ACCOUNTS.find(
    (acc) => acc.email.toLowerCase() === cleanEmail && acc.password === cleanPass
  );

  if (matchedDemo) {
    // Lookup user in 3NF USERS table
    const userRecord = store[COLLECTIONS.USERS].find((u) => u.email.toLowerCase() === cleanEmail);
    const tenantId = userRecord?.tenant_id || (matchedDemo.role === 'tenant' ? 'tenant-2' : undefined);

    // If tenant, verify tenant record in 3NF TENANTS table
    let tenantName = matchedDemo.name;
    if (tenantId) {
      const tenantDoc = store[COLLECTIONS.TENANTS].find((t) => t.id === tenantId);
      if (tenantDoc) {
        tenantName = `${tenantDoc.first_name} ${tenantDoc.last_name}`;
      }
    }

    return {
      uid: userRecord ? userRecord.id : `user-${matchedDemo.role}-1`,
      email: matchedDemo.email,
      name: tenantName,
      role: matchedDemo.role,
      room: matchedDemo.role === 'tenant' ? 2 : undefined,
      tenant_id: tenantId,
    };
  }

  // Check if email exists with incorrect password
  const emailExists = DEMO_ACCOUNTS.some((acc) => acc.email.toLowerCase() === cleanEmail);
  if (emailExists) {
    throw new Error('Incorrect password. Check the demo credentials below.');
  }

  throw new Error('Account not found. Please use one of the demo accounts or register in Firebase.');
}

/**
 * Terminates user session
 */
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

/**
 * Registers a new user and creates corresponding 3NF database records
 */
export async function registerUser({ email, password, name, room = 2, phone = '' }) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();
  const cleanName = name.trim();
  // Security Enforcement: Public self-registration is strictly for tenants.
  // Owner and Caretaker accounts are pre-provisioned / migrated in seedDatabase.js.
  const role = 'tenant';

  if (!cleanEmail || !cleanPass || !cleanName) {
    throw new Error('Please fill in all required fields');
  }

  if (cleanPass.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  // Live Firebase Auth Registration (when configured)
  if (isFirebaseConfigured && auth && db) {
    try {
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const { doc, setDoc } = await import('firebase/firestore');

      const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
      const fbUser = userCred.user;
      await updateProfile(fbUser, { displayName: cleanName });

      const newUserId = fbUser.uid;
      const newTenantId = role === 'tenant' ? `tenant-${Date.now()}` : undefined;

      // 1. Write to USERS 3NF collection
      await setDoc(doc(db, COLLECTIONS.USERS, newUserId), {
        id: newUserId,
        email: cleanEmail,
        role,
        name: cleanName,
        tenant_id: newTenantId,
        created_at: new Date().toISOString(),
      });

      // 2. If Tenant, write to TENANTS 3NF collection & create LEASE
      if (role === 'tenant' && newTenantId) {
        const nameParts = cleanName.split(' ');
        const firstName = nameParts[0] || cleanName;
        const lastName = nameParts.slice(1).join(' ') || '';
        const initials = (firstName[0] || '') + (lastName[0] || firstName[1] || 'T').toUpperCase();

        await setDoc(doc(db, COLLECTIONS.TENANTS, newTenantId), {
          id: newTenantId,
          user_id: newUserId,
          first_name: firstName,
          last_name: lastName,
          initials,
          phone: phone || '0917-000-0000',
          avatar_color: '#8b5cf6',
        });

        // Create Lease
        const leaseId = `lease-${Date.now()}`;
        const roomDocId = `room-${parseInt(room, 10) || 2}`;
        await setDoc(doc(db, COLLECTIONS.LEASES, leaseId), {
          id: leaseId,
          tenant_id: newTenantId,
          room_id: roomDocId,
          start_date: new Date().toISOString().split('T')[0],
          agreed_monthly_rent: 2500,
          due_day: 5,
          status: 'active',
        });
      }

      return {
        uid: newUserId,
        email: cleanEmail,
        name: cleanName,
        role,
        room: role === 'tenant' ? (parseInt(room, 10) || 2) : undefined,
        tenant_id: newTenantId,
      };
    } catch (err) {
      console.warn('Firebase registration error, falling back to 3NF store:', err.message);
    }
  }

  // 3NF In-Memory Store Registration
  const store = getNormalizedMockDatabase();

  // Check if user already exists
  const existing = store[COLLECTIONS.USERS].find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    throw new Error('An account with this email already exists. Please sign in.');
  }

  const newUserId = `user-${Date.now()}`;
  const newTenantId = role === 'tenant' ? `tenant-${Date.now()}` : undefined;

  // Insert into USERS
  store[COLLECTIONS.USERS].push({
    id: newUserId,
    email: cleanEmail,
    role,
    name: cleanName,
    tenant_id: newTenantId,
    created_at: new Date().toISOString().split('T')[0],
  });

  // If Tenant, insert into TENANTS and LEASES
  if (role === 'tenant' && newTenantId) {
    const nameParts = cleanName.split(' ');
    const firstName = nameParts[0] || cleanName;
    const lastName = nameParts.slice(1).join(' ') || '';
    const initials = (firstName[0] || '') + (lastName[0] || firstName[1] || 'T').toUpperCase();
    const roomNum = parseInt(room, 10) || 2;
    const roomDocId = `room-${roomNum}`;

    store[COLLECTIONS.TENANTS].push({
      id: newTenantId,
      user_id: newUserId,
      first_name: firstName,
      last_name: lastName,
      initials,
      phone: phone || '0917-000-0000',
      avatar_color: '#8b5cf6',
    });

    store[COLLECTIONS.LEASES].push({
      id: `lease-${Date.now()}`,
      tenant_id: newTenantId,
      room_id: roomDocId,
      start_date: new Date().toISOString().split('T')[0],
      agreed_monthly_rent: 2500,
      due_day: 5,
      status: 'active',
    });
  }

  return {
    uid: newUserId,
    email: cleanEmail,
    name: cleanName,
    role,
    room: role === 'tenant' ? (parseInt(room, 10) || 2) : undefined,
    tenant_id: newTenantId,
  };
}
