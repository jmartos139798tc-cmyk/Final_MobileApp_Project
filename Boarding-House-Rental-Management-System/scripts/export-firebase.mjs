import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const credentialPath = process.argv[2];
if (!credentialPath) {
  console.error('Usage: node scripts/export-firebase.mjs <path-to-firebase-service-account.json>');
  process.exit(1);
}

const credential = JSON.parse(await readFile(path.resolve(credentialPath), 'utf8'));
if (!credential.project_id || !credential.client_email || !credential.private_key) {
  throw new Error('The JSON file is not a Firebase Admin service-account key.');
}

initializeApp({ credential: cert(credential), projectId: credential.project_id });
const firestore = getFirestore();
const auth = getAuth();
const outputDirectory = path.resolve('.migration-data');
await mkdir(outputDirectory, { recursive: true });

function normalize(value) {
  if (value == null || typeof value !== 'object') return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
}

const collections = await firestore.listCollections();
for (const collection of collections) {
  const snapshot = await collection.get();
  const rows = snapshot.docs.map((document) => ({ ...normalize(document.data()), id: document.id }));
  const outputPath = path.join(outputDirectory, `${collection.id}.json`);
  await writeFile(outputPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
  console.log(`Exported ${rows.length} documents from ${collection.id}`);
}

const authUsers = [];
let pageToken;
do {
  const page = await auth.listUsers(1000, pageToken);
  authUsers.push(...page.users.map((user) => ({
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    emailVerified: user.emailVerified,
    disabled: user.disabled,
    createdAt: user.metadata.creationTime || null,
  })));
  pageToken = page.pageToken;
} while (pageToken);

await writeFile(
  path.join(outputDirectory, 'firebase-auth-users.json'),
  `${JSON.stringify(authUsers, null, 2)}\n`,
  'utf8'
);
console.log(`Exported ${authUsers.length} Firebase Auth users (passwords are not exported).`);
console.log(`Local export directory: ${outputDirectory}`);
