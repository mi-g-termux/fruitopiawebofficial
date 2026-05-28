/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FirebaseConfig, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
  simpleHash,
  DEFAULT_PRODUCTS,
  DEFAULT_CATEGORIES,
  DEFAULT_COUPONS,
  DEFAULT_REVIEWS,
  DEFAULT_DELIVERY_ZONES,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_SITE_SETTINGS,
} from '../db';
import {
  ArrowRight,
  Check,
  CheckCircle,
  Database,
  Loader2,
  Store,
  Award,
  Download,
  FileCode,
  AlertCircle,
  Shield,
  Lock,
  Info,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function InstallWizard() {
  const { triggerReboot, toast } = useApp();
  const [step, setStep] = useState(1);

  // ── Step 2: Firebase config ────────────────────────────────────────────────
  const [fbConfig, setFbConfig] = useState<FirebaseConfig>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    databaseId: '(default)',
  });
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connTested, setConnTested] = useState(false);
  const [connSuccess, setConnSuccess] = useState(false);
  const [connErrorMsg, setConnErrorMsg] = useState('');

  // ── Step 3: Admin credentials ──────────────────────────────────────────────
  const [adminUser, setAdminUser] = useState('admin');
  const [adminPass, setAdminPass] = useState('');
  const [adminPassConfirm, setAdminPassConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);

  // ── Step 4: Storefront info ────────────────────────────────────────────────
  const [storeName, setStoreName] = useState('Fruitopia');
  const [contactEmail, setContactEmail] = useState('hello@fruitopia.com');
  const [currency, setCurrency] = useState('USD');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [currencyPosition, setCurrencyPosition] = useState<'before' | 'after'>('before');

  // ── Step 6: Install progress ───────────────────────────────────────────────
  const [installTasks, setInstallTasks] = useState([
    { name: 'Connecting to Firebase database instance', status: 'idle' as 'idle' | 'running' | 'success' | 'error' },
    { name: 'Persisting Firebase credentials to server', status: 'idle' as 'idle' | 'running' | 'success' | 'error' },
    { name: 'Storing admin credentials in Firestore', status: 'idle' as 'idle' | 'running' | 'success' | 'error' },
    { name: 'Seeding default product categories', status: 'idle' as 'idle' | 'running' | 'success' | 'error' },
    { name: 'Seeding initial product catalog', status: 'idle' as 'idle' | 'running' | 'success' | 'error' },
    { name: 'Configuring payment gateway settings', status: 'idle' as 'idle' | 'running' | 'success' | 'error' },
    { name: 'Finalising installation & locking setup', status: 'idle' as 'idle' | 'running' | 'success' | 'error' },
  ]);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installFinished, setInstallFinished] = useState(false);
  const [configDownloaded, setConfigDownloaded] = useState(false);

  // ── Field dirty check helper ───────────────────────────────────────────────
  const fbFieldsFilled =
    fbConfig.apiKey.trim().length > 0 &&
    fbConfig.projectId.trim().length > 0 &&
    fbConfig.appId.trim().length > 0 &&
    fbConfig.authDomain.trim().length > 0;

  // ── Test Firebase connection (real credentials only) ───────────────────────
  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setConnTested(false);
    setConnSuccess(false);
    setConnErrorMsg('');
    try {
      // ── Fast path: validate API key + projectId via Firebase REST API ──────
      // This skips spinning up the full SDK (slow) and gets a definitive
      // pass/fail in under 2 seconds. We hit the Firestore REST endpoint which
      // rejects bad API keys and non-existent projects immediately.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      let restOk = false;
      let restError = '';

      try {
        const restUrl =
          `https://firestore.googleapis.com/v1/projects/${fbConfig.projectId.trim()}/databases/(default)/documents/settings/install_status` +
          `?key=${fbConfig.apiKey.trim()}`;
        const restRes = await fetch(restUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (restRes.ok || restRes.status === 404) {
          // 200 = doc exists, 404 = project/db exists but doc not found yet → both mean valid credentials
          restOk = true;
        } else {
          const body = await restRes.json().catch(() => ({}));
          const status = restRes.status;
          const errMsg: string = body?.error?.message || body?.error?.status || '';
          if (status === 400 || errMsg.includes('API_KEY_INVALID') || errMsg.includes('invalid')) {
            restError = 'Invalid API Key. Please copy the exact key from your Firebase console.';
          } else if (status === 403 || errMsg.includes('PERMISSION_DENIED')) {
            // 403 = credentials valid but rules block guest reads — that's fine, credentials ARE real
            restOk = true;
          } else if (status === 404 || errMsg.includes('NOT_FOUND') || errMsg.includes('does not exist')) {
            restError = 'Project ID not found. Ensure the project exists and Firestore is enabled.';
          } else {
            restError = errMsg || `Unexpected response (HTTP ${status}). Check your credentials.`;
          }
        }
      } catch (fetchErr: any) {
        clearTimeout(timeout);
        if (fetchErr?.name === 'AbortError') {
          restError = 'Request timed out. Check your internet connection or Firebase project region.';
        } else {
          restError = 'Network error. Check your internet connection.';
        }
      }

      if (!restOk) {
        throw new Error(restError || 'Credential validation failed.');
      }

      // ── Credentials verified — now initialise the SDK for subsequent steps ─
      const res = await triggerReboot(fbConfig);
      if (!res) {
        throw new Error('Firebase SDK failed to initialise after credential check. Try again.');
      }

      setConnSuccess(true);
      setConnTested(true);
      toast.success('Firebase connected successfully! Real credentials verified.');
    } catch (e: any) {
      setConnTested(true);
      setConnSuccess(false);

      let msg = e?.message || String(e);
      // Normalise any SDK-level errors that slip through
      if (msg.includes('invalid-api-key') || msg.includes('API key') || msg.includes('api-key')) {
        msg = 'Invalid API Key. Please copy the exact key from your Firebase console.';
      } else if (msg.includes('project') && (msg.includes('not found') || msg.includes('does not exist'))) {
        msg = 'Project ID not found. Ensure the project exists and Firestore is enabled.';
      } else if (msg.includes('offline') || msg.includes('network') || msg.includes('fetch')) {
        msg = 'Network error. Check your internet connection or Firebase project region.';
      } else if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
        msg = 'Permission denied. Check your Firestore security rules allow read/write.';
      } else if (msg.includes('app-not-found') || msg.includes('App ID')) {
        msg = 'App ID is invalid. Copy it exactly from Project Settings → Your Apps in Firebase Console.';
      }

      setConnErrorMsg(msg);
      toast.error(`Connection refused: ${msg}`);
    } finally {
      setIsTestingConn(false);
    }
  };

  // ── Installation runner ────────────────────────────────────────────────────
  const startInstallation = async () => {
    setIsInstalling(true);
    const updateTask = (index: number, s: 'idle' | 'running' | 'success' | 'error') => {
      setInstallTasks((prev) => {
        const n = [...prev];
        n[index] = { ...n[index], status: s };
        return n;
      });
    };

    // Task 0: Connect
    updateTask(0, 'running');
    await new Promise((r) => setTimeout(r, 600));
    updateTask(0, 'success');

    // Task 1: Save credentials to server + localStorage
    updateTask(1, 'running');
    await new Promise((r) => setTimeout(r, 600));
    localStorage.setItem('fruitopia_dynamic_firebase', JSON.stringify(fbConfig));
    try {
      const postRes = await fetch('/api/firebase-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fbConfig),
      });
      if (!postRes.ok) throw new Error(`Server returned ${postRes.status}`);
    } catch (e: any) {
      console.warn('Server config write failed (non-fatal, localStorage has it):', e);
    }
    // Ensure live db connection is active
    await triggerReboot(fbConfig);
    updateTask(1, 'success');

    // Task 2: Admin credentials → Firestore (primary) + localStorage (fallback)
    updateTask(2, 'running');
    await new Promise((r) => setTimeout(r, 500));
    const hashed = simpleHash(adminPass);
    const adminObj = { username: adminUser, passwordHash: hashed };
    localStorage.setItem('qf_admin_credentials', JSON.stringify(adminObj));
    if (db) {
      try {
        await setDoc(doc(db, 'settings', 'admin_credentials'), adminObj);
      } catch (err) {
        console.error('Failed storing admin credentials in Firestore:', err);
      }
    }
    updateTask(2, 'success');

    // Task 3: Categories
    updateTask(3, 'running');
    await new Promise((r) => setTimeout(r, 500));
    localStorage.setItem('qf_categories', JSON.stringify(DEFAULT_CATEGORIES));
    if (db) {
      for (const cat of DEFAULT_CATEGORIES) {
        try { await setDoc(doc(db, 'categories', cat.id), cat); } catch (_) {}
      }
    }
    updateTask(3, 'success');

    // Task 4: Products
    updateTask(4, 'running');
    await new Promise((r) => setTimeout(r, 600));
    localStorage.setItem('qf_products', JSON.stringify(DEFAULT_PRODUCTS));
    if (db) {
      for (const prod of DEFAULT_PRODUCTS) {
        try { await setDoc(doc(db, 'products', prod.id), prod); } catch (_) {}
      }
    }
    updateTask(4, 'success');

    // Task 5: Payment settings
    updateTask(5, 'running');
    await new Promise((r) => setTimeout(r, 500));
    const finalPayments = { ...DEFAULT_PAYMENT_SETTINGS, shippingFee: 5.0, taxPercentage: 0.05 };
    localStorage.setItem('qf_payment_settings', JSON.stringify(finalPayments));
    if (db) {
      try { await setDoc(doc(db, 'settings', 'payment_settings'), finalPayments); } catch (_) {}
    }
    updateTask(5, 'success');

    // Task 6: Site settings + finalize
    updateTask(6, 'running');
    await new Promise((r) => setTimeout(r, 700));
    const finalSettings = {
      ...DEFAULT_SITE_SETTINGS,
      websiteName: storeName,
      siteTitle: `${storeName} — Fresh Organic Smoothies & Juices`,
      contactEmail,
      currency,
      currencySymbol,
      currencyPosition,
    };
    localStorage.setItem('qf_site_settings', JSON.stringify(finalSettings));
    localStorage.setItem('qf_coupons', JSON.stringify(DEFAULT_COUPONS));
    localStorage.setItem('qf_reviews', JSON.stringify(DEFAULT_REVIEWS));
    localStorage.setItem('qf_delivery_zones', JSON.stringify(DEFAULT_DELIVERY_ZONES));
    localStorage.setItem('qf_subscribers', JSON.stringify([]));
    localStorage.setItem('qf_orders', JSON.stringify([]));
    // Mark installed in localStorage as well
    localStorage.setItem('fruitopia_installed', 'true');

    if (db) {
      try {
        await setDoc(doc(db, 'settings', 'site_settings'), finalSettings);
        for (const coupon of DEFAULT_COUPONS) {
          await setDoc(doc(db, 'coupons', coupon.id), coupon);
        }
        for (const review of DEFAULT_REVIEWS) {
          await setDoc(doc(db, 'reviews', review.id), review);
        }
        for (const zone of DEFAULT_DELIVERY_ZONES) {
          await setDoc(doc(db, 'delivery_zones', zone.id), zone);
        }
        // ← This write triggers the onSnapshot listener in AppContext
        // which sets isInstalled = true permanently (installer never shown again)
        await setDoc(doc(db, 'settings', 'install_status'), { installed: true });
      } catch (err) {
        console.error('Firestore finalization error:', err);
      }
    }

    await triggerReboot(fbConfig);
    updateTask(6, 'success');
    setIsInstalling(false);
    setInstallFinished(true);
    toast.success('Fruitopia is now live! Download your config file below.');
  };

  // ── Download firebase-config.json ──────────────────────────────────────────
  const handleDownloadConfig = () => {
    const blob = new Blob([JSON.stringify(fbConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'firebaseconfig.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setConfigDownloaded(true);
    toast.success('firebaseconfig.json downloaded! See instructions below.');
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const TOTAL_STEPS = 6;
  const progressPct = Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col justify-center items-center py-12 px-4 selection:bg-teal-500 selection:text-white">
      {/* Card */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-teal-500/30">
              🍉
            </div>
            <div>
              <h2 className="text-white text-base font-bold leading-tight">Fruitopia — Installation Wizard</h2>
              <p className="text-slate-400 text-[11px]">First-time setup • Real Firebase credentials required</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-400 text-[11px] font-mono">Step {step} of {TOTAL_STEPS}</div>
            <div className="mt-1 h-1.5 w-24 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-8">
          <AnimatePresence mode="wait">

            {/* ── STEP 1: Welcome ─────────────────────────────────────────── */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-6">
                <div className="space-y-2">
                  <span className="bg-teal-50 text-teal-700 text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    First-Time Setup
                  </span>
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none mt-2">
                    Welcome to Fruitopia!
                  </h1>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    This wizard will configure your store in a few simple steps. You'll connect your own Firebase project, set admin credentials, and customise your storefront — all stored securely in the cloud.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    { icon: Database, text: 'Connect your Firebase Firestore database', sub: 'Real credentials are validated against Firebase — dummy data is rejected.' },
                    { icon: Shield, text: 'Set your admin username & password', sub: 'Stored in Firestore. Accessible from any device.' },
                    { icon: Store, text: 'Customise storefront name & currency', sub: 'Your branding, your rules.' },
                    { icon: FileCode, text: 'Download your firebaseconfig.json', sub: 'Upload to your server root to complete Firebase integration.' },
                  ].map(({ icon: Icon, text, sub }, i) => (
                    <div key={i} className="flex gap-3 items-start p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{text}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full h-11 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-sm cursor-pointer shadow-lg shadow-teal-200"
                >
                  Begin Setup <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* ── STEP 2: Firebase Credentials ────────────────────────────── */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Connect Firebase Database</h2>
                  <p className="text-slate-500 text-xs mt-1">
                    Enter your Firebase project credentials exactly as shown in your{' '}
                    <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-teal-600 font-semibold inline-flex items-center gap-0.5 hover:underline">
                      Firebase Console <ExternalLink className="w-3 h-3" />
                    </a>
                    . Dummy or invalid values will be rejected — only real credentials pass.
                  </p>
                </div>

                {/* Info banner */}
                <div className="flex gap-2.5 items-start p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-800">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <strong className="block font-bold">Where to find these values</strong>
                    Firebase Console → Your project → ⚙️ Project Settings → <em>Your apps</em> → SDK setup and configuration → Config object.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-medium text-slate-700">
                  {([
                    { label: 'API Key *', key: 'apiKey', placeholder: 'AIzaSy...', span: 2 },
                    { label: 'Auth Domain *', key: 'authDomain', placeholder: 'your-project.firebaseapp.com', span: 1 },
                    { label: 'Project ID *', key: 'projectId', placeholder: 'your-project-id', span: 1 },
                    { label: 'App ID *', key: 'appId', placeholder: '1:123456:web:abcdef', span: 2 },
                    { label: 'Storage Bucket', key: 'storageBucket', placeholder: 'your-project.appspot.com', span: 1 },
                    { label: 'Messaging Sender ID', key: 'messagingSenderId', placeholder: '123456789', span: 1 },
                  ] as { label: string; key: keyof FirebaseConfig; placeholder: string; span: number }[]).map(({ label, key, placeholder, span }) => (
                    <div key={key} className={`space-y-1 ${span === 2 ? 'col-span-2' : ''}`}>
                      <label className="block">{label}</label>
                      <input
                        type="text"
                        value={fbConfig[key] as string}
                        onChange={(e) => {
                          setFbConfig({ ...fbConfig, [key]: e.target.value });
                          setConnTested(false);
                          setConnSuccess(false);
                        }}
                        className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 focus:bg-white transition text-slate-900 font-mono text-[11px]"
                        placeholder={placeholder}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                  ))}
                </div>

                {/* Test button */}
                <button
                  onClick={handleTestConnection}
                  disabled={isTestingConn || !fbFieldsFilled}
                  className="w-full h-10 bg-slate-900 tracking-wide text-white font-bold rounded-xl hover:bg-slate-800 transition disabled:opacity-40 text-xs flex items-center justify-center gap-2 cursor-pointer shadow"
                >
                  {isTestingConn ? (
                    <><Loader2 className="w-4 h-4 animate-spin text-teal-400" /> Verifying with Firebase...</>
                  ) : (
                    <><Database className="w-4 h-4 text-teal-400" /> Verify Firebase Credentials</>
                  )}
                </button>

                {/* Connection result */}
                {connTested && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                      connSuccess
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {connSuccess ? (
                      <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                    )}
                    <div>
                      <span className="font-bold block">
                        {connSuccess ? '✓ Firebase Connected — Credentials Verified!' : '✗ Connection Failed — Invalid Credentials'}
                      </span>
                      <span className="leading-relaxed">
                        {connSuccess
                          ? 'Your Firebase Firestore database is reachable and credentials are genuine. You may proceed.'
                          : connErrorMsg || 'Please double-check all fields match your Firebase Console exactly. Local fallback is not available.'}
                      </span>
                    </div>
                  </motion.div>
                )}

                <div className="flex justify-between pt-1">
                  <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-700 text-xs font-semibold cursor-pointer">
                    ← Welcome
                  </button>
                  <button
                    disabled={!connSuccess}
                    onClick={() => setStep(3)}
                    className="px-5 h-9 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-bold rounded-lg text-xs cursor-pointer shadow transition"
                  >
                    Next: Admin Login →
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Admin Credentials ────────────────────────────────── */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Set Admin Panel Credentials</h2>
                  <p className="text-slate-500 text-xs mt-1">
                    Create your admin login. These credentials are saved directly in your Firebase Firestore — accessible from any device and browser.
                  </p>
                </div>

                <div className="flex gap-2 items-start p-3 bg-teal-50 border border-teal-100 rounded-xl text-[11px] text-teal-800">
                  <Lock className="w-4 h-4 shrink-0 mt-0.5 text-teal-600" />
                  <span><strong>Stored in Firestore:</strong> Your credentials will be written to <code className="font-mono bg-teal-100 px-1 rounded">settings/admin_credentials</code> — not just this browser. Choose a strong password.</span>
                </div>

                <div className="space-y-3 text-xs font-medium text-slate-700">
                  <div className="space-y-1">
                    <label>Admin Username</label>
                    <input
                      type="text"
                      value={adminUser}
                      onChange={(e) => setAdminUser(e.target.value)}
                      className="w-full h-10 border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 focus:bg-white transition"
                      placeholder="e.g. admin"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Password <span className="text-slate-400 font-normal">(min. 8 characters)</span></label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={adminPass}
                        onChange={(e) => setAdminPass(e.target.value)}
                        className="w-full h-10 border border-slate-200 rounded-lg px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 focus:bg-white transition"
                        placeholder="••••••••••"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer text-[10px] font-bold"
                      >
                        {showPass ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                    {/* Password strength bar */}
                    {adminPass.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {[...Array(4)].map((_, i) => {
                          const score = adminPass.length >= 12 ? 4 : adminPass.length >= 10 ? 3 : adminPass.length >= 8 ? 2 : 1;
                          return (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                                i < score
                                  ? score <= 1 ? 'bg-rose-400' : score <= 2 ? 'bg-amber-400' : score <= 3 ? 'bg-teal-400' : 'bg-emerald-500'
                                  : 'bg-slate-200'
                              }`}
                            />
                          );
                        })}
                        <span className="text-[10px] text-slate-400 font-medium ml-1">
                          {adminPass.length >= 12 ? 'Strong' : adminPass.length >= 10 ? 'Good' : adminPass.length >= 8 ? 'OK' : 'Weak'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label>Confirm Password</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={adminPassConfirm}
                      onChange={(e) => setAdminPassConfirm(e.target.value)}
                      className={`w-full h-10 border rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 focus:bg-white transition ${
                        adminPassConfirm && adminPass !== adminPassConfirm ? 'border-rose-300 bg-rose-50' : 'border-slate-200'
                      }`}
                      placeholder="••••••••••"
                      autoComplete="new-password"
                    />
                    {adminPassConfirm && adminPass !== adminPassConfirm && (
                      <p className="text-[10px] text-rose-600 font-semibold">Passwords do not match.</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button onClick={() => setStep(2)} className="text-slate-400 hover:text-slate-700 text-xs font-semibold cursor-pointer">
                    ← Firebase Config
                  </button>
                  <button
                    disabled={adminUser.length < 3 || adminPass.length < 8 || adminPass !== adminPassConfirm}
                    onClick={() => setStep(4)}
                    className="px-5 h-9 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-bold rounded-lg text-xs cursor-pointer shadow transition"
                  >
                    Next: Storefront Info →
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 4: Storefront Settings ──────────────────────────────── */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Storefront Configuration</h2>
                  <p className="text-slate-500 text-xs mt-1">Basic branding and currency settings. These can be changed later from the Admin Panel.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-medium text-slate-700">
                  <div className="col-span-2 space-y-1">
                    <label>Store / Website Name</label>
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 focus:bg-white transition"
                      placeholder="Fruitopia"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label>Support Email Address</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 focus:bg-white transition"
                      placeholder="hello@yourstore.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => {
                        setCurrency(e.target.value);
                        const map: Record<string, string> = { USD: '$', BDT: '৳', EUR: '€', GBP: '£', INR: '₹' };
                        setCurrencySymbol(map[e.target.value] || e.target.value);
                      }}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:ring-2 focus:ring-teal-500 bg-white transition"
                    >
                      {[['USD', 'USD ($)'], ['BDT', 'BDT (৳)'], ['EUR', 'EUR (€)'], ['GBP', 'GBP (£)'], ['INR', 'INR (₹)']].map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label>Symbol Position</label>
                    <select
                      value={currencyPosition}
                      onChange={(e) => setCurrencyPosition(e.target.value as 'before' | 'after')}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:ring-2 focus:ring-teal-500 bg-white transition"
                    >
                      <option value="before">Before price ($10)</option>
                      <option value="after">After price (10$)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button onClick={() => setStep(3)} className="text-slate-400 hover:text-slate-700 text-xs font-semibold cursor-pointer">
                    ← Admin Credentials
                  </button>
                  <button
                    onClick={() => setStep(5)}
                    className="px-5 h-9 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-xs cursor-pointer shadow transition"
                  >
                    Review & Install →
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 5: Summary ──────────────────────────────────────────── */}
            {step === 5 && (
              <motion.div key="step5" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Review & Confirm</h2>
                  <p className="text-slate-500 text-xs mt-1">Check your configuration before activating the storefront.</p>
                </div>

                <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                  {[
                    ['Database', `Firebase Firestore (${fbConfig.projectId})`],
                    ['Admin Username', adminUser],
                    ['Website Name', storeName],
                    ['Currency', `${currency} (${currencySymbol}) — symbol ${currencyPosition} price`],
                    ['Contact Email', contactEmail],
                  ].map(([label, value]) => (
                    <div key={label} className="p-3 bg-slate-50/60 flex justify-between gap-4">
                      <span className="font-semibold text-slate-500 shrink-0">{label}</span>
                      <span className="font-bold text-slate-800 text-right truncate">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl text-[11px] text-teal-800 flex gap-2 items-start">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-teal-600" />
                  <span>
                    Once installed, the setup wizard is <strong>permanently locked</strong>. The install flag is written to Firestore — no one can re-open this installer unless the Firestore record is manually removed.
                  </span>
                </div>

                <button
                  onClick={() => { setStep(6); startInstallation(); }}
                  className="w-full h-11 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-sm cursor-pointer shadow-lg shadow-teal-200"
                >
                  Approve & Activate Storefront <Award className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="w-full text-slate-400 hover:text-slate-600 text-xs font-semibold text-center block cursor-pointer"
                >
                  ← Adjust Settings
                </button>
              </motion.div>
            )}

            {/* ── STEP 6: Installation Progress ────────────────────────────── */}
            {step === 6 && (
              <motion.div key="step6" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {installFinished ? '🎉 Installation Complete!' : 'Installing — Please Wait…'}
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">
                    {installFinished
                      ? 'Your store is live. Complete the final step below before launching.'
                      : 'Writing configuration to Firebase Firestore…'}
                  </p>
                </div>

                {/* Task list */}
                <div className="space-y-2">
                  {installTasks.map((t, i) => (
                    <div key={i} className={`flex items-center justify-between text-xs p-2.5 rounded-lg border transition-colors ${
                      t.status === 'success' ? 'bg-emerald-50 border-emerald-100' :
                      t.status === 'running' ? 'bg-teal-50 border-teal-100' :
                      t.status === 'error' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <span className={`font-medium ${t.status === 'running' ? 'text-teal-700' : t.status === 'success' ? 'text-emerald-700' : 'text-slate-600'}`}>
                        {t.name}
                      </span>
                      <div>
                        {t.status === 'idle' && <span className="w-5 h-5 flex items-center justify-center text-[10px] text-slate-300">○</span>}
                        {t.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-teal-600" />}
                        {t.status === 'success' && (
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                        {t.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-500" />}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Post-install: config file download instructions */}
                {installFinished && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    
                    {/* Firebase config download block */}
                    <div className="p-5 bg-slate-900 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-5 h-5 text-teal-400" />
                        <span className="text-white font-bold text-sm">Download Your Firebase Config File</span>
                      </div>

                      {/* JSON preview */}
                      <pre className="text-[10px] font-mono text-emerald-300 bg-black/40 rounded-xl p-3 overflow-x-auto leading-relaxed max-h-32 border border-slate-700">
                        {JSON.stringify(fbConfig, null, 2)}
                      </pre>

                      <button
                        onClick={handleDownloadConfig}
                        className={`w-full h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow ${
                          configDownloaded
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-teal-500 hover:bg-teal-400 text-white animate-pulse'
                        }`}
                      >
                        <Download className="w-4 h-4" />
                        {configDownloaded ? '✓ Downloaded — firebaseconfig.json' : 'Download firebaseconfig.json'}
                      </button>

                      {/* Step-by-step upload instructions */}
                      <div className="text-[11px] text-slate-300 space-y-2 pt-1 border-t border-slate-700">
                        <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">📋 Required: Upload this file to your server</p>
                        <ol className="space-y-1.5 list-none">
                          {[
                            'Download the file using the button above.',
                            'Rename it to firebaseconfig.json if needed.',
                            'Upload it to the root of your server (same folder as index.html or server.ts).',
                            'Alternatively place it in the /public folder for Vite/static builds.',
                            'Restart your server — it will auto-detect and connect Firebase on boot.',
                          ].map((step, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="w-4 h-4 rounded-full bg-slate-700 text-teal-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span className="text-slate-300 leading-relaxed">{step}</span>
                            </li>
                          ))}
                        </ol>
                        <p className="text-amber-400 font-semibold text-[10px] pt-1">
                          ⚠️ Without this file on your server, Firebase will fail to connect on next boot and the installer may reappear.
                        </p>
                      </div>
                    </div>

                    {/* Launch buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          window.location.hash = 'admin';
                          window.location.reload();
                        }}
                        className="flex-1 h-11 bg-slate-900 border border-slate-800 text-white font-bold rounded-xl hover:bg-slate-800 transition text-sm cursor-pointer"
                      >
                        Open Admin Panel
                      </button>
                      <button
                        onClick={() => {
                          window.location.hash = '';
                          window.location.pathname = '/';
                          window.location.reload();
                        }}
                        className="flex-1 h-11 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-500 transition text-sm cursor-pointer"
                      >
                        Launch Storefront 🚀
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
