import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut as fbSignOut,
} from 'firebase/auth';
import { toast } from 'sonner';
import { auth, firebaseReady, googleProvider, requestNotificationToken, onForegroundMessage } from '@/lib/firebase';
import { api, setTokenProvider } from '@/lib/api';

const AuthContext = createContext(null);
const DEV_KEY = 'pokeshop.devUser';
const devBypass = String(import.meta.env.VITE_AUTH_DEV_BYPASS) === 'true';

/**
 * Two auth paths behind one API:
 *  - Firebase Auth when the web config is filled in (production path)
 *  - the gateway's dev token while the Firebase keys are still PLACEHOLDER
 */
export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [devUser, setDevUser] = useState(() => {
    const raw = localStorage.getItem(DEV_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  // Feed the API client with whichever token is currently valid.
  useEffect(() => {
    setTokenProvider(async () => {
      if (firebaseReady && auth?.currentUser) return auth.currentUser.getIdToken();
      if (devUser) return `dev:${devUser.uid}:${devUser.role}`;
      return null;
    });
  }, [devUser, firebaseUser]);

  const syncProfile = useCallback(async () => {
    try {
      const me = await api.users.me();
      setProfile(me);
      return me;
    } catch (err) {
      setProfile(null);
      if (err.status !== 401) toast.error(err.message);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!firebaseReady || !auth) {
      // Dev path: restore the session from localStorage.
      if (devUser) syncProfile().finally(() => setLoading(false));
      else setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      // No Firebase session but a dev session exists: keep the dev profile.
      if (user || devUser) await syncProfile();
      else setProfile(null);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devUser]);

  // Register the browser for push and hand the token to the gateway.
  useEffect(() => {
    if (!profile || !firebaseReady) return;
    requestNotificationToken()
      .then((token) => token && api.users.saveFcmToken(token))
      .catch(() => {});
    return onForegroundMessage((payload) => {
      toast(payload.notification?.title || 'PokeShop', { description: payload.notification?.body });
    });
  }, [profile]);

  const signInWithGoogle = useCallback(async () => {
    if (!firebaseReady) throw new Error('Firebase is not configured yet');
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    if (!firebaseReady) throw new Error('Firebase is not configured yet');
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const registerWithEmail = useCallback(async (email, password) => {
    if (!firebaseReady) throw new Error('Firebase is not configured yet');
    await createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const signInAsDev = useCallback(async (uid, role = 'customer') => {
    const next = { uid, role };
    localStorage.setItem(DEV_KEY, JSON.stringify(next));
    setDevUser(next);
    setTokenProvider(async () => `dev:${uid}:${role}`);
    const me = await api.users.me();
    setProfile(me);
    return me;
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(DEV_KEY);
    setDevUser(null);
    setProfile(null);
    if (firebaseReady && auth) await fbSignOut(auth);
  }, []);

  const value = useMemo(() => ({
    profile,
    loading,
    firebaseReady,
    devBypass,
    isAuthenticated: Boolean(profile),
    isAdmin: profile?.role === 'admin',
    signInWithGoogle, signInWithEmail, registerWithEmail, signInAsDev, signOut, syncProfile,
  }), [profile, loading, signInWithGoogle, signInWithEmail, registerWithEmail, signInAsDev, signOut, syncProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
