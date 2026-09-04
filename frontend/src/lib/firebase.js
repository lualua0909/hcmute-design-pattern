import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

/**
 * Firebase config is a PLACEHOLDER until the real project is provisioned.
 * `firebaseReady` stays false while the keys are empty and the app falls back
 * to the gateway's dev-token auth so the whole flow is still demoable.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseReady = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app = null;
if (firebaseReady) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

export const auth = app ? getAuth(app) : null;
export const googleProvider = new GoogleAuthProvider();

/** Registers the browser for FCM and returns the device token (or null). */
export async function requestNotificationToken() {
  if (!app || !(await isSupported().catch(() => false))) return null;
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
  }
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  return getToken(getMessaging(app), {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  }).catch(() => null);
}

/** Foreground push listener; returns an unsubscribe function. */
export function onForegroundMessage(handler) {
  if (!app) return () => {};
  let unsubscribe = () => {};
  isSupported().then((ok) => {
    if (ok) unsubscribe = onMessage(getMessaging(app), handler);
  }).catch(() => {});
  return () => unsubscribe();
}
