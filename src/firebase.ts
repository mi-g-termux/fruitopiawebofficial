/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  databaseId?: string;
}

export let firebaseAppInstance: FirebaseApp | null = null;
export let db: Firestore | null = null;
export let auth: Auth | null = null;
export let isFirebaseConnected = false;

/** Always returns the LIVE db instance — safe to call any time after init */
export function getFirestoreDb(): import('firebase/firestore').Firestore | null { return db; }

// Priority config resolver
export async function resolveFirebaseConfig(): Promise<FirebaseConfig | null> {
  // 1. Check local storage first (allows hot swaps during Wizard setup or dev)
  const hotSwap = localStorage.getItem('fruitopia_dynamic_firebase');
  if (hotSwap) {
    try {
      const parsed = JSON.parse(hotSwap) as FirebaseConfig;
      if (parsed.apiKey) return parsed;
    } catch (e) {
      console.error('Failed to parse hot-swap firebase config:', e);
    }
  }

  // 2. Fetch runtime config from server root (/firebase-config.json)
  let data: FirebaseConfig | null = null;
  try {
    const res = await fetch('/firebase-config.json');
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && !contentType.includes('text/html')) {
      data = await res.json() as FirebaseConfig;
    }
  } catch (e) {
    console.warn('Failed parsing /firebase-config.json, trying API route:', e);
  }

  if (!data || !data.apiKey) {
    try {
      const res = await fetch('/api/firebase-config');
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          data = await res.json() as FirebaseConfig;
        }
      }
    } catch (e) {
      console.warn('Failed parsing /api/firebase-config:', e);
    }
  }

  if (data && data.apiKey) {
    return data;
  }

  // 3. Fallback to build-time environment variable declarations
  const env = (import.meta as any).env || {};
  const envConfig: FirebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY || '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: env.VITE_FIREBASE_APP_ID || '',
    databaseId: env.VITE_FIREBASE_DATABASE_ID,
  };

  if (envConfig.apiKey) {
    return envConfig;
  }

  // 4. Try loading from workspace default configuration using fetch
  try {
    const res = await fetch('/firebase-applet-config.json');
    if (res.ok) {
      const defaultJson = await res.json() as FirebaseConfig;
      if (defaultJson && defaultJson.apiKey) {
        return defaultJson;
      }
    }
  } catch (e) {
    // Expected if file doesn't exist
  }

  return null;
}

// Bootstrap function
export async function initializeDynamicFirebase(customConfig?: FirebaseConfig): Promise<{
  success: boolean;
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
  error?: string;
}> {
  try {
    const config = customConfig || (await resolveFirebaseConfig());
    if (!config || !config.apiKey) {
      throw new Error('No valid Firebase API Key found in configuration chain.');
    }

    // Clean up existing apps to prevent "Duplicate App" errors
    const existingApps = getApps();
    if (existingApps.length > 0) {
      firebaseAppInstance = existingApps[0];
    } else {
      firebaseAppInstance = initializeApp(config);
    }

    db = getFirestore(firebaseAppInstance, config.databaseId || undefined);
    auth = getAuth(firebaseAppInstance);
    isFirebaseConnected = true;

    console.log('🔥 Dynamic Firebase successfully initialized!');
    return {
      success: true,
      app: firebaseAppInstance,
      db: db,
      auth: auth
    };
  } catch (err: any) {
    console.warn('⚠️ Running in Local Mock Mode:', err.message);
    isFirebaseConnected = false;
    db = null;
    auth = null;
    return {
      success: false,
      app: null,
      db: null,
      auth: null,
      error: err.message
    };
  }
}
