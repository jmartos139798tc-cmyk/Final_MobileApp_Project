import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const credentialPath = process.argv[2];
if (!credentialPath) {
  console.error('Usage: node scripts/configure-firebase-supabase-claims.mjs <path-to-firebase-service-account.json>');
  process.exit(1);
}

const credential = JSON.parse(await readFile(path.resolve(credentialPath), 'utf8'));
if (credential.project_id !== 'boardinghouse-rental-mgt') {
  throw new Error('This service account must belong to the boardinghouse-rental-mgt Firebase project.');
}

initializeApp({ credential: cert(credential), projectId: credential.project_id });
const auth = getAuth();
const firestore = getFirestore();
const staffRoles = new Set(['owner', 'landlord', 'caretaker']);
let pageToken;
let updated = 0;

do {
  const page = await auth.listUsers(1000, pageToken);
  for (const user of page.users) {
    const userSnapshot = await firestore.collection('users').doc(user.uid).get();
    const appRole = userSnapshot.exists ? userSnapshot.data().role : null;
    const claims = { ...(user.customClaims || {}), role: 'authenticated' };
    delete claims.app_role;
    if (staffRoles.has(appRole)) claims.app_role = appRole;
    await auth.setCustomUserClaims(user.uid, claims);
    updated += 1;
  }
  pageToken = page.pageToken;
} while (pageToken);

console.log(`Configured Supabase Firebase-auth claims for ${updated} Firebase users.`);
console.log('Users must refresh their Firebase ID token (sign out and back in) before Supabase requests will use the new claims.');
