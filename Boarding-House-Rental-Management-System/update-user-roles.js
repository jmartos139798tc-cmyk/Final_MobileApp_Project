/**
 * Update User Roles Script
 * 
 * This script helps update existing user roles in Firestore to the new 'landlord' role
 * or verify that owner/caretaker roles are properly set.
 * 
 * Usage:
 *   node update-user-roles.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json'); // You need to download this from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listAllUsers() {
  console.log('\n=== Current Users in Firestore ===\n');
  
  const usersSnapshot = await db.collection('users').get();
  
  if (usersSnapshot.empty) {
    console.log('No users found in Firestore.');
    return [];
  }
  
  const users = [];
  usersSnapshot.forEach(doc => {
    const user = { id: doc.id, ...doc.data() };
    users.push(user);
    console.log(`User ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log('---');
  });
  
  return users;
}

async function updateUserRole(userId, newRole) {
  try {
    await db.collection('users').doc(userId).update({
      role: newRole
    });
    console.log(`? Updated user ${userId} to role: ${newRole}`);
  } catch (error) {
    console.error(`? Failed to update user ${userId}:`, error.message);
  }
}

async function updateAllOwnerCaretakerToLandlord() {
  console.log('\n=== Updating owner/caretaker roles to landlord ===\n');
  
  const usersSnapshot = await db.collection('users')
    .where('role', 'in', ['owner', 'caretaker'])
    .get();
  
  if (usersSnapshot.empty) {
    console.log('No owner or caretaker users found.');
    return;
  }
  
  const batch = db.batch();
  let count = 0;
  
  usersSnapshot.forEach(doc => {
    const userRef = db.collection('users').doc(doc.id);
    batch.update(userRef, { role: 'landlord' });
    count++;
    console.log(`Queued: ${doc.data().email} (${doc.data().role} ? landlord)`);
  });
  
  await batch.commit();
  console.log(`\n? Successfully updated ${count} users to landlord role`);
}

async function main() {
  console.log('Firebase Firestore User Role Updater');
  console.log('====================================');
  
  try {
    // First, list all users
    await listAllUsers();
    
    // Ask user what they want to do
    console.log('\nOptions:');
    console.log('1. Update all owner/caretaker roles to "landlord"');
    console.log('2. Keep current roles (owner/caretaker work with backward compatibility)');
    console.log('\nThe app supports both approaches:');
    console.log('- New approach: role = "landlord"');
    console.log('- Legacy approach: role = "owner" or "caretaker"');
    console.log('\nTo update roles, uncomment the line below:\n');
    
    // Uncomment this line to actually update the roles
    // await updateAllOwnerCaretakerToLandlord();
    
    console.log('Script complete. No changes made (safety mode).');
    console.log('To update roles, edit this file and uncomment the update function.');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

main();
