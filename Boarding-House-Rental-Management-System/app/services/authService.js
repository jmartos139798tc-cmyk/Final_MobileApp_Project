// Authentication Service Layer
// Integrates Firebase Auth with the 3NF USERS and TENANTS collections.
// Accounts are authenticated with Firebase and profiles are stored in Firestore.

import { auth, db, isFirebaseConfigured } from '../utils/firebase';
import { COLLECTIONS } from './databaseSchema';

function getFriendlyAuthError(error, action) {
  switch (error?.code) {
    case 'auth/email-already-in-use':
      return new Error('An account already exists for this email. Please sign in instead, or use Forgot password if you cannot access it.');
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return new Error('Email or password is incorrect. Please try again or use Forgot password.');
    case 'auth/user-not-found':
      return new Error('No account exists for this email. Check the address or contact the property administrator.');
    case 'auth/configuration-not-found':
      return new Error('Firebase Authentication is not configured for this project. Enable Email/Password in Firebase Console.');
    case 'auth/weak-password':
      return new Error('Choose a password with at least 6 characters.');
    case 'auth/invalid-email':
      return new Error('Enter a valid email address.');
    case 'permission-denied':
    case 'firestore/permission-denied':
      return new Error('Firestore rejected this request. Publish the project Firestore rules, then try again.');
    case 'auth/network-request-failed':
      return new Error('Could not connect to Firebase. Check your internet connection and try again.');
    default:
      return new Error(`Could not ${action}. Please check your connection and try again.`);
  }
}

async function getUserSessionFromFirebaseUser(fbUser) {
  if (!fbUser || !db) return null;

  const { doc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');
  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, fbUser.uid));
  const userProfile = userDoc.exists() ? userDoc.data() : null;

  if (!userProfile?.role) {
    throw new Error('Your account is missing its profile. Please contact the property administrator.');
  }

  const role = userProfile.role;
  let profile = null;
  let tenantId;

  if (role === 'tenant') {
    if (userProfile.tenant_id) {
      tenantId = userProfile.tenant_id;
      const tenantDoc = await getDoc(doc(db, COLLECTIONS.TENANTS, tenantId));
      if (tenantDoc.exists()) profile = tenantDoc.data();
    } else {
      const tenantQuery = query(collection(db, COLLECTIONS.TENANTS), where('user_id', '==', fbUser.uid));
      const tenantSnapshot = await getDocs(tenantQuery);
      const tenantDoc = tenantSnapshot.docs[0];
      if (tenantDoc) {
        profile = tenantDoc.data();
        tenantId = tenantDoc.id;
      }
    }
  } else if (role === 'landlord') {
    // Landlord role only
    const staffDoc = await getDoc(doc(db, COLLECTIONS.STAFF_PROFILES, fbUser.uid));
    if (staffDoc.exists()) profile = staffDoc.data();
  }

  if (!profile && !userProfile.name) {
    throw new Error('Your account is missing its role profile. Ask the property owner to finish setting it up.');
  }

  const name = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : userProfile.name;

  return {
    uid: fbUser.uid,
    email: fbUser.email,
    name: name || fbUser.displayName || fbUser.email,
    role,
    room: role === 'tenant' ? 2 : undefined,
    tenant_id: tenantId,
  };
}

/**
 * Authenticates user credentials and retrieves their 3NF profile
 */
export async function loginWithEmail(email, password) {
  const cleanEmail = email.trim().toLowerCase();
  const enteredPass = password.trim();
  const passwordCandidates = [...new Set([
    enteredPass.toLowerCase(),
    enteredPass.toUpperCase(),
    enteredPass,
  ])];

  if (!isFirebaseConfigured || !auth || !db) {
    throw new Error('Online sign-in is unavailable right now. Please try again later.');
  }

  // 1. Live Firebase Authentication (When configured)
  if (isFirebaseConfigured && auth) {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    let lastCredentialError;
    for (const candidate of passwordCandidates) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, candidate);
        return getUserSessionFromFirebaseUser(userCredential.user);
      } catch (error) {
        if (!['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(error?.code)) {
          throw getFriendlyAuthError(error, 'sign in');
        }
        lastCredentialError = error;
      }
    }
    throw getFriendlyAuthError(lastCredentialError, 'sign in');
  }

  throw new Error('Could not sign in. Please check your email and password.');
}

/** Sends a secure password-reset link through Firebase Authentication. */
export async function sendPasswordReset(email) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) throw new Error('Enter the email address for your account.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Enter a valid email address.');
  }
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Password recovery is unavailable right now. Please try again later.');
  }

  try {
    const { sendPasswordResetEmail } = await import('firebase/auth');
    await sendPasswordResetEmail(auth, cleanEmail);
  } catch (error) {
    // Keep the response the same for unknown accounts to avoid exposing which
    // email addresses are registered in the app.
    if (error?.code === 'auth/user-not-found') return;
    if (error?.code === 'auth/invalid-email') throw new Error('Enter a valid email address.');
    if (error?.code === 'auth/too-many-requests') throw new Error('Too many reset attempts. Wait a little and try again.');
    if (error?.code === 'auth/network-request-failed') throw new Error('Could not connect to Firebase. Check your internet connection and try again.');
    if (error?.code === 'auth/operation-not-allowed') throw new Error('Password reset is disabled for this Firebase project. Enable Email/Password sign-in in Firebase Console.');
    console.warn('Firebase password reset failed:', error.message || error);
    throw new Error('Could not send the reset email. Check your connection and try again.');
  }
}

/**
 * Restores the persisted Firebase session after app reload.
 */
export async function getCurrentUserSession() {
  if (!isFirebaseConfigured || !auth || !db || !auth.currentUser) {
    return null;
  }

  return getUserSessionFromFirebaseUser(auth.currentUser);
}

/**
 * Watches Firebase Auth so refresh/reload keeps the app authenticated.
 */
export async function subscribeToCurrentUser(onUser, onError) {
  if (!isFirebaseConfigured || !auth || !db) {
    onUser(null);
    return () => {};
  }

  const { onAuthStateChanged } = await import('firebase/auth');
  return onAuthStateChanged(auth, async (fbUser) => {
    try {
      if (!fbUser) {
        onUser(null);
        return;
      }
      const session = await getUserSessionFromFirebaseUser(fbUser);
      onUser(session);
    } catch (error) {
      console.warn('Could not restore Firebase session:', error.message);
      // If profile is missing, sign out and let user re-register or contact admin
      if (error.message.includes('missing its profile') || error.message.includes('missing its role profile')) {
        try {
          const { signOut } = await import('firebase/auth');
          await signOut(auth);
        } catch (signOutErr) {
          console.error('Could not sign out incomplete account:', signOutErr);
        }
      }
      if (onError) onError(error);
      onUser(null);
    }
  });
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
export async function registerUser({ email, password, name, phone = '', roomNumber = '' }) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim().toLowerCase();
  const cleanName = name.trim();
  // Public self-registration is restricted to tenants. Staff roles are provisioned
  // by trusted administration in Firebase Authentication and Firestore.
  const role = 'tenant';

  if (!cleanEmail || !cleanPass || !cleanName) {
    throw new Error('Please fill in all required fields');
  }

  if (cleanPass.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  if (!isFirebaseConfigured || !auth || !db) {
    throw new Error('Online registration is unavailable right now. Please try again later.');
  }

  // Live Firebase Auth Registration (when configured)
  if (isFirebaseConfigured && auth && db) {
    try {
      const { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const { doc, getDoc, writeBatch } = await import('firebase/firestore');

      let fbUser;
      try {
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
        fbUser = userCred.user;
      } catch (createError) {
        // Auth can succeed before a Firestore rule/network error. Allow retry only for
        // an existing tenant Auth account whose tenant profile is still missing.
        if (createError.code !== 'auth/email-already-in-use') throw createError;
        const existingCred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        fbUser = existingCred.user;
        const existingProfile = await getDoc(doc(db, COLLECTIONS.USERS, fbUser.uid));
        if (existingProfile.exists()) {
          if (existingProfile.data().role !== 'tenant') {
            throw new Error('This email already has an account. Please sign in instead.');
          }
          const existingTenant = await getDoc(doc(db, COLLECTIONS.TENANTS, `tenant-${fbUser.uid}`));
          if (existingTenant.exists()) {
            throw new Error('This email already has an account. Please sign in instead.');
          }
        }
      }

      await updateProfile(fbUser, { displayName: cleanName });

      const newUserId = fbUser.uid;
      // Stable IDs make retrying a partially completed signup safe and idempotent.
      const newTenantId = `tenant-${newUserId}`;

      // Keep the account and its tenant profile in sync in one Firestore commit.
      const batch = writeBatch(db);
      batch.set(doc(db, COLLECTIONS.USERS, newUserId), {
        id: newUserId,
        email: cleanEmail,
        role,
        created_at: new Date().toISOString(),
      });

      // Room assignment is handled by property staff after approval.
      if (role === 'tenant' && newTenantId) {
        const nameParts = cleanName.split(' ');
        const firstName = nameParts[0] || cleanName;
        const lastName = nameParts.slice(1).join(' ') || '';
        const initials = (firstName[0] || '') + (lastName[0] || firstName[1] || 'T').toUpperCase();

        batch.set(doc(db, COLLECTIONS.TENANTS, newTenantId), {
          id: newTenantId,
          user_id: newUserId,
          first_name: firstName,
          last_name: lastName,
          initials,
          phone: phone || '0917-000-0000',
          avatar_color: '#8b5cf6',
          account_status: 'pending',
          registered_at: new Date().toISOString(),
        });

      }
      await batch.commit();

      return {
        uid: newUserId,
        email: cleanEmail,
        name: cleanName,
        role,
        tenant_id: newTenantId,
      };
    } catch (err) {
      console.warn('Firebase registration failed:', err.message);
      if (err.message === 'This email already has an account. Please sign in instead.') throw err;
      throw getFriendlyAuthError(err, 'create your account');
    }
  }

}
