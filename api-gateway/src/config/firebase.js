import fs from 'node:fs';
import admin from 'firebase-admin';
import { config } from './env.js';

let app = null;

/**
 * Firebase Admin is optional at boot: the project ships with PLACEHOLDER
 * credentials, so the gateway must still start without them.
 */
export function initFirebase() {
  if (app) return app;
  let credential = null;

  if (config.firebase.serviceAccountJson.trim()) {
    credential = admin.credential.cert(JSON.parse(config.firebase.serviceAccountJson));
  } else if (config.firebase.serviceAccountPath && fs.existsSync(config.firebase.serviceAccountPath)) {
    credential = admin.credential.cert(
      JSON.parse(fs.readFileSync(config.firebase.serviceAccountPath, 'utf8'))
    );
  }

  if (!credential) {
    console.warn('[firebase] no service account configured - token verification disabled');
    return null;
  }

  app = admin.initializeApp({ credential, projectId: config.firebase.projectId || undefined });
  console.log('[firebase] admin initialised');
  return app;
}

export function isFirebaseReady() {
  return app !== null;
}

export async function verifyIdToken(idToken) {
  if (!app) throw new Error('firebase-not-configured');
  return admin.auth().verifyIdToken(idToken);
}
