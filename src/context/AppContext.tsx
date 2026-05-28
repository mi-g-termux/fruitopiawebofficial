/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  SiteSettings,
  Product,
  Category,
  Order,
  PaymentSettings,
  Coupon,
  NewsletterSubscriber,
  Review,
  UserProfile,
  DeliveryZone,
  ToastItem,
  OrderItem
} from '../types';
import { isFirebaseConnected, db, auth, getFirestoreDb, initializeDynamicFirebase, FirebaseConfig } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  deleteDoc,
  updateDoc,
  addDoc,
  writeBatch
} from 'firebase/firestore';
import {
  DEFAULT_SITE_SETTINGS,
  DEFAULT_CATEGORIES,
  DEFAULT_PRODUCTS,
  DEFAULT_COUPONS,
  DEFAULT_REVIEWS,
  DEFAULT_DELIVERY_ZONES,
  DEFAULT_PAYMENT_SETTINGS,
  seedLocalStorage,
  simpleHash
} from '../db';
import { sendOrderConfirmationEmails, sendOrderStatusUpdateEmail } from '../emailService';

interface AppContextType {
  siteSettings: SiteSettings;
  categories: Category[];
  products: Product[];
  orders: Order[];
  coupons: Coupon[];
  reviews: Review[];
  subscribers: NewsletterSubscriber[];
  deliveryZones: DeliveryZone[];
  paymentSettings: PaymentSettings;

  // Actions
  saveSiteSettings: (settings: SiteSettings) => Promise<void>;
  savePaymentSettings: (pSettings: PaymentSettings) => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  editProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateProductStock: (id: string, newStock: number) => Promise<void>;

  addCategory: (cat: Category) => Promise<void>;
  editCategory: (cat: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  addCoupon: (coupon: Coupon) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;

  addReview: (review: Review) => Promise<void>;
  approveReview: (id: string) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;

  subscribeNewsletter: (sub: NewsletterSubscriber) => Promise<void>;
  deleteSubscriber: (id: string) => Promise<void>;

  saveDeliveryZonesCtx: (zones: DeliveryZone[]) => Promise<void>;

  placeOrder: (order: Order) => Promise<void>;
  updateOrderStatus: (id: string, status: Order['orderStatus']) => Promise<void>;
  updateOrderPaymentStatus: (id: string, payStatus: Order['paymentStatus']) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;

  // Customer state
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  registerUser: (user: UserProfile) => Promise<boolean>;
  loginUser: (email: string, pass: string) => Promise<boolean>;
  resetPassword: (email: string, newPass: string) => Promise<boolean>;
  logoutUser: () => void;

  // Shopping Cart state
  cart: (OrderItem & { image: string })[];
  addToCart: (prod: Product, qty?: number) => void;
  removeFromCart: (prodId: string) => void;
  updateCartQuantity: (prodId: string, qty: number) => void;
  clearCart: () => void;

  // Utility
  formatPrice: (amount: number) => string;
  isInstalled: boolean;
  isBootstrapping: boolean;
  isBackendConnected: boolean;
  triggerReboot: (config?: FirebaseConfig) => Promise<boolean>;
  adminLoggedIn: boolean;
  setAdminLoggedIn: (val: boolean) => void;
  saveAdminCredentials: (username: string, password: string) => Promise<void>;
  resetAdminCredentials: () => Promise<void>;
  getAdminCredentials: () => Promise<{ username: string; passwordHash: string; passwordPlain?: string }>;

  // Toast System
  toasts: ToastItem[];
  addToast: (type: ToastItem['type'], message: string) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // State variables
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>(DEFAULT_COUPONS);
  const [reviews, setReviews] = useState<Review[]>(DEFAULT_REVIEWS);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>(DEFAULT_DELIVERY_ZONES);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // isInstalled is ALWAYS false on boot — Firebase install_status is the sole authority.
  // localStorage is only written as a cache after Firebase confirms, never read back to skip the installer.
  // This ensures a fresh deploy always shows the installer until real Firebase setup completes.
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(null);
  const [cart, setCart] = useState<(OrderItem & { image: string })[]>([]);
  const [adminLoggedIn, setAdminLoggedInState] = useState<boolean>(false);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  // Firestore Snapshot unsubscribers refs
  const unsubscribersRef = useRef<(() => void)[]>([]);
  // LocalMock Broadcast channel
  const syncChannelRef = useRef<BroadcastChannel | null>(null);

  // Toast notification system helper
  const addToast = (type: ToastItem['type'], message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast = {
    success: (msg: string) => addToast('success', msg),
    error: (msg: string) => addToast('error', msg),
    info: (msg: string) => addToast('info', msg)
  };

  // Format Price utility based on Site Settings
  const formatPrice = (amount: number): string => {
    const symbol = siteSettings?.currencySymbol || '$';
    const position = siteSettings?.currencyPosition || 'before';
    const rate = siteSettings?.currencyExchangeRate && siteSettings.currencyExchangeRate > 0
      ? siteSettings.currencyExchangeRate : 1;
    const converted = parseFloat((amount * rate).toString()).toFixed(2);
    return position === 'before' ? `${symbol}${converted}` : `${converted}${symbol}`;
  };

  // Broadcast channel for sync in Local Mock Mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const channel = new BroadcastChannel('fruitopia_sync');
      channel.onmessage = (event) => {
        if (event.data === 'sync_required') {
          console.log('🔄 Synced state from other tab update');
          loadLocalData();
        }
      };
      syncChannelRef.current = channel;
    }
    return () => {
      syncChannelRef.current?.close();
    };
  }, []);

  // Broadcast trigger
  const broadcastSync = () => {
    if (syncChannelRef.current) {
      syncChannelRef.current.postMessage('sync_required');
    }
  };

  // Check admin login session on mount
  useEffect(() => {
    const sessionStr = localStorage.getItem('qf_admin_session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session.expiresAt > Date.now()) {
          setAdminLoggedInState(true);
        } else {
          localStorage.removeItem('qf_admin_session');
        }
      } catch (e) {
        localStorage.removeItem('qf_admin_session');
      }
    }

    // Check user profile session
    const userStr = localStorage.getItem('qf_current_user');
    if (userStr) {
      try {
        setCurrentUserState(JSON.parse(userStr));
      } catch (e) {
        localStorage.removeItem('qf_current_user');
      }
    }

    // Check cart items
    const cartStr = localStorage.getItem('qf_cart');
    if (cartStr) {
      try {
        setCart(JSON.parse(cartStr));
      } catch (e) {
        localStorage.removeItem('qf_cart');
      }
    }
  }, []);

  // Set admin logged status with local state sync
  const setAdminLoggedIn = (val: boolean) => {
    setAdminLoggedInState(val);
    if (!val) {
      localStorage.removeItem('qf_admin_session');
    } else {
      localStorage.setItem(
        'qf_admin_session',
        JSON.stringify({ token: Math.random().toString(), expiresAt: Date.now() + 8 * 3600 * 1000 })
      );
    }
  };

  // LocalMock loader
  const loadLocalData = () => {
    seedLocalStorage();
    try {
      setSiteSettings(JSON.parse(localStorage.getItem('qf_site_settings') || '{}'));
      setCategories(JSON.parse(localStorage.getItem('qf_categories') || '[]'));
      setProducts(JSON.parse(localStorage.getItem('qf_products') || '[]'));
      setCoupons(JSON.parse(localStorage.getItem('qf_coupons') || '[]'));
      setReviews(JSON.parse(localStorage.getItem('qf_reviews') || '[]'));
      setDeliveryZones(JSON.parse(localStorage.getItem('qf_delivery_zones') || '[]'));
      setPaymentSettings(JSON.parse(localStorage.getItem('qf_payment_settings') || '{}'));
      setSubscribers(JSON.parse(localStorage.getItem('qf_subscribers') || '[]'));
      setOrders(JSON.parse(localStorage.getItem('qf_orders') || '[]'));
      // NOTE: isInstalled is intentionally NOT set from localStorage here.
      // Firebase's install_status document is the sole authority for installation state.
      // loadLocalData() is only for product/settings data, never for install gating.
    } catch (e) {
      console.error('Error loading LocalStorage fallback data:', e);
    }
  };

  // Dynamic real-time listeners for Firebase
  const attachFirebaseListeners = (dbInstance: any) => {
    // Tear down any existing
    unsubscribersRef.current.forEach((unsub) => unsub());
    unsubscribersRef.current = [];

    // Define a unified error handler that falls back to Local Mode if Firebase fails
    let isFallingBack = false;
    const handleListenerError = (err: any, source: string) => {
      console.warn(`⚠️ Firestore listener error on [${source}]:`, err);
      if (!isFallingBack) {
        isFallingBack = true;
        // Clean up listeners
        unsubscribersRef.current.forEach((unsub) => unsub());
        unsubscribersRef.current = [];
        
        setIsBackendConnected(false);
        loadLocalData();
        toast.info(`Database synchronized via Offline Local Storage mode.`);
      }
    };

    // Listener 1: Site Settings
    const unsubSettings = onSnapshot(doc(dbInstance, 'settings', 'site_settings'), (snap) => {
      if (snap.exists()) {
        setSiteSettings(snap.data() as SiteSettings);
      }
    }, (err) => handleListenerError(err, 'Site Settings'));
    unsubscribersRef.current.push(unsubSettings);

    // Listener 2: Payment Settings
    const unsubPayment = onSnapshot(doc(dbInstance, 'settings', 'payment_settings'), (snap) => {
      if (snap.exists()) {
        setPaymentSettings(snap.data() as PaymentSettings);
      }
    }, (err) => handleListenerError(err, 'Payment Settings'));
    unsubscribersRef.current.push(unsubPayment);

    // Listener 3: Products
    const unsubProducts = onSnapshot(collection(dbInstance, 'products'), (snap) => {
      const items: Product[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Product));
      setProducts(items.length > 0 ? items : DEFAULT_PRODUCTS);
    }, (err) => handleListenerError(err, 'Products'));
    unsubscribersRef.current.push(unsubProducts);

    // Listener 4: Categories
    const unsubCategories = onSnapshot(collection(dbInstance, 'categories'), (snap) => {
      const items: Category[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Category));
      setCategories(items.length > 0 ? items : DEFAULT_CATEGORIES);
    }, (err) => handleListenerError(err, 'Categories'));
    unsubscribersRef.current.push(unsubCategories);

    // Listener 5: Orders
    const unsubOrders = onSnapshot(collection(dbInstance, 'orders'), (snap) => {
      const items: Order[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Order));
      setOrders(items);
    }, (err) => handleListenerError(err, 'Orders'));
    unsubscribersRef.current.push(unsubOrders);

    // Listener 6: Reviews
    const unsubReviews = onSnapshot(collection(dbInstance, 'reviews'), (snap) => {
      const items: Review[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Review));
      setReviews(items.length > 0 ? items : DEFAULT_REVIEWS);
    }, (err) => handleListenerError(err, 'Reviews'));
    unsubscribersRef.current.push(unsubReviews);

    // Listener 7: Coupons
    const unsubCoupons = onSnapshot(collection(dbInstance, 'coupons'), (snap) => {
      const items: Coupon[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Coupon));
      setCoupons(items.length > 0 ? items : DEFAULT_COUPONS);
    }, (err) => handleListenerError(err, 'Coupons'));
    unsubscribersRef.current.push(unsubCoupons);

    // Listener 8: Delivery Zones
    const unsubZones = onSnapshot(collection(dbInstance, 'delivery_zones'), (snap) => {
      const items: DeliveryZone[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as DeliveryZone));
      setDeliveryZones(items.length > 0 ? items : DEFAULT_DELIVERY_ZONES);
    }, (err) => handleListenerError(err, 'Delivery Zones'));
    unsubscribersRef.current.push(unsubZones);

    // Listener 9: Newsletter subscribers
    const unsubSubscribers = onSnapshot(collection(dbInstance, 'newsletter'), (snap) => {
      const items: NewsletterSubscriber[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as NewsletterSubscriber));
      setSubscribers(items);
    }, (err) => handleListenerError(err, 'Newsletter Subscribers'));
    unsubscribersRef.current.push(unsubSubscribers);

    // Verify install status in Firestore
    // Firebase install_status document is the SOLE authority.
    const unsubInstallStatus = onSnapshot(doc(dbInstance, 'settings', 'install_status'), (snap) => {
      if (snap.exists() && snap.data()?.installed === true) {
        // Confirmed installed — lock permanently
        setIsInstalled(true);
        localStorage.setItem('fruitopia_installed', 'true');
      } else {
        // Document doesn't exist or installed != true → not yet installed.
        // Clear any stale localStorage flag so the installer shows correctly.
        setIsInstalled(false);
        localStorage.removeItem('fruitopia_installed');
      }
    }, (err) => handleListenerError(err, 'Install Status'));
    unsubscribersRef.current.push(unsubInstallStatus);
  };

  // Bootstrapping function
  const triggerReboot = async (customConfig?: FirebaseConfig): Promise<boolean> => {
    const res = await initializeDynamicFirebase(customConfig);
    if (res.success && res.db) {
      setIsBackendConnected(true);
      attachFirebaseListeners(res.db);
      return true;
    } else {
      setIsBackendConnected(false);
      loadLocalData();
      return false;
    }
  };

  // Run initialization on mount
  useEffect(() => {
    const runBootInit = async () => {
      setIsBootstrapping(true);
      const connected = await triggerReboot();

      if (connected && db) {
        // If Firebase is connected, do a one-time direct read of install_status
        // so we know definitively if installed before showing UI.
        // The onSnapshot listener also covers this, but getDoc ensures we don't flash
        // the installer incorrectly on slow connections.
        try {
          const { getDoc, doc: fsDoc } = await import('firebase/firestore');
          const snap = await getDoc(fsDoc(db, 'settings', 'install_status'));
          if (snap.exists() && snap.data()?.installed === true) {
            setIsInstalled(true);
            localStorage.setItem('fruitopia_installed', 'true');
          } else {
            // Not installed yet — clear any stale localStorage flag
            localStorage.removeItem('fruitopia_installed');
          }
        } catch (e) {
          // If read fails, the onSnapshot listener will eventually set the state.
          // Increase delay to give it more time.
          await new Promise((r) => setTimeout(r, 1200));
        }
      } else {
        // No Firebase — always show installer (user must set up credentials first)
        setIsInstalled(false);
        localStorage.removeItem('fruitopia_installed');
      }

      // Brief final delay to let any remaining snapshot listeners settle
      await new Promise((r) => setTimeout(r, 300));
      setIsBootstrapping(false);
    };
    runBootInit();
    return () => {
      unsubscribersRef.current.forEach((unsub) => unsub());
    };
  }, []);


  // ── Admin Credential Management ────────────────────────────────────────────
  // All credential ops go to Firestore first, localStorage as fallback.
  // This means any device can log in with the latest credentials.

  const getAdminCredentials = async (): Promise<{ username: string; passwordHash: string; passwordPlain?: string }> => {
    const liveDb = getFirestoreDb();
    if (isBackendConnected && liveDb) {
      try {
        const snap = await getDoc(doc(liveDb, 'settings', 'admin_credentials'));
        if (snap.exists()) {
          const d = snap.data();
          const creds = { username: d.username, passwordHash: d.passwordHash, passwordPlain: d.passwordPlain };
          // Cache locally so offline login still works
          localStorage.setItem('qf_admin_credentials', JSON.stringify(creds));
          if (d.passwordPlain) localStorage.setItem('qf_admin_plain_pass', d.passwordPlain);
          return creds;
        }
      } catch (err) {
        console.warn('getAdminCredentials Firestore failed, using localStorage:', err);
      }
    }
    // localStorage fallback
    try {
      const str = localStorage.getItem('qf_admin_credentials');
      if (str) return JSON.parse(str);
    } catch {}
    return { username: 'admin', passwordHash: simpleHash('admin123'), passwordPlain: 'admin123' };
  };

  const saveAdminCredentials = async (username: string, password: string): Promise<void> => {
    const hashed = simpleHash(password);
    const payload = { username: username.trim(), passwordHash: hashed, passwordPlain: password.trim() };
    // Always write to Firestore — Firebase is the authoritative source
    await setDoc(doc(requireDb(), 'settings', 'admin_credentials'), payload);
    // Cache locally for fast offline login fallback read + plain password visibility
    localStorage.setItem('qf_admin_credentials', JSON.stringify(payload));
    localStorage.setItem('qf_admin_plain_pass', password.trim());
    toast.success('Admin credentials saved to Firebase! Works on any device.');
  };

  const resetAdminCredentials = async (): Promise<void> => {
    await saveAdminCredentials('admin', 'admin123');
    toast.info('Admin credentials reset to: admin / admin123');
  };

  // ── Shared Firebase-first write helper ─────────────────────────────────────
  // Every write goes to Firestore unconditionally (Firebase is always the source
  // of truth). localStorage is only updated as a local read-cache so the UI
  // can recover quickly if the page is refreshed while offline. It is NEVER
  // used as the primary store after installation.
  const requireDb = (): import('firebase/firestore').Firestore => {
    const liveDb = getFirestoreDb();
    if (!liveDb) throw new Error('Firebase is not connected. Please check your firebaseconfig.json and reload.');
    return liveDb;
  };

  // CRUD Actions
  const saveSiteSettings = async (settings: SiteSettings) => {
    setSiteSettings(settings); // optimistic UI update
    await setDoc(doc(requireDb(), 'settings', 'site_settings'), settings);
    localStorage.setItem('qf_site_settings', JSON.stringify(settings)); // cache only
    toast.success('Site settings saved to Firebase successfully!');
  };

  const savePaymentSettings = async (pSettings: PaymentSettings) => {
    setPaymentSettings(pSettings);
    await setDoc(doc(requireDb(), 'settings', 'payment_settings'), pSettings);
    localStorage.setItem('qf_payment_settings', JSON.stringify(pSettings));
    toast.success('Payment configuration saved to Firebase!');
  };

  const addProduct = async (prod: Product) => {
    const optimistic = [...products, prod];
    setProducts(optimistic);
    await setDoc(doc(requireDb(), 'products', prod.id), prod);
    localStorage.setItem('qf_products', JSON.stringify(optimistic));
    toast.success(`Product "${prod.name}" added to Firebase.`);
  };

  const editProduct = async (prod: Product) => {
    const optimistic = products.map((p) => (p.id === prod.id ? prod : p));
    setProducts(optimistic);
    await setDoc(doc(requireDb(), 'products', prod.id), prod);
    localStorage.setItem('qf_products', JSON.stringify(optimistic));
    toast.success(`Product "${prod.name}" updated in Firebase.`);
  };

  const deleteProduct = async (id: string) => {
    const optimistic = products.filter((p) => p.id !== id);
    setProducts(optimistic);
    await deleteDoc(doc(requireDb(), 'products', id));
    localStorage.setItem('qf_products', JSON.stringify(optimistic));
    toast.success('Product deleted from Firebase.');
  };

  const updateProductStock = async (id: string, newStock: number) => {
    await updateDoc(doc(requireDb(), 'products', id), { stock: newStock });
    const items = products.map((p) => (p.id === id ? { ...p, stock: newStock } : p));
    localStorage.setItem('qf_products', JSON.stringify(items));
    setProducts(items);
  };

  const addCategory = async (cat: Category) => {
    const optimistic = [...categories, cat];
    setCategories(optimistic);
    await setDoc(doc(requireDb(), 'categories', cat.id), cat);
    localStorage.setItem('qf_categories', JSON.stringify(optimistic));
    toast.success(`Category "${cat.name}" saved to Firebase.`);
  };

  const editCategory = async (cat: Category) => {
    const optimistic = categories.map((c) => (c.id === cat.id ? cat : c));
    setCategories(optimistic);
    await setDoc(doc(requireDb(), 'categories', cat.id), cat);
    localStorage.setItem('qf_categories', JSON.stringify(optimistic));
    toast.success(`Category "${cat.name}" updated in Firebase.`);
  };

  const deleteCategory = async (id: string) => {
    const optimistic = categories.filter((c) => c.id !== id);
    setCategories(optimistic);
    await deleteDoc(doc(requireDb(), 'categories', id));
    localStorage.setItem('qf_categories', JSON.stringify(optimistic));
    toast.success('Category removed from Firebase.');
  };

  const addCoupon = async (coupon: Coupon) => {
    const optimistic = [...coupons, coupon];
    setCoupons(optimistic);
    await setDoc(doc(requireDb(), 'coupons', coupon.id), coupon);
    localStorage.setItem('qf_coupons', JSON.stringify(optimistic));
    toast.success(`Coupon [${coupon.code}] saved to Firebase.`);
  };

  const deleteCoupon = async (id: string) => {
    const optimistic = coupons.filter((c) => c.id !== id);
    setCoupons(optimistic);
    await deleteDoc(doc(requireDb(), 'coupons', id));
    localStorage.setItem('qf_coupons', JSON.stringify(optimistic));
    toast.success('Coupon removed from Firebase.');
  };

  const addReview = async (review: Review) => {
    await setDoc(doc(requireDb(), 'reviews', review.id), review);
    const items = [review, ...reviews];
    localStorage.setItem('qf_reviews', JSON.stringify(items));
    setReviews(items);
    toast.success('Review submitted and saved to Firebase!');
  };

  const approveReview = async (id: string) => {
    await updateDoc(doc(requireDb(), 'reviews', id), { isApproved: true });
    const items = reviews.map((r) => (r.id === id ? { ...r, isApproved: true } : r));
    localStorage.setItem('qf_reviews', JSON.stringify(items));
    setReviews(items);
    toast.success('Review approved in Firebase.');
  };

  const deleteReview = async (id: string) => {
    await deleteDoc(doc(requireDb(), 'reviews', id));
    const items = reviews.filter((r) => r.id !== id);
    localStorage.setItem('qf_reviews', JSON.stringify(items));
    setReviews(items);
    toast.success('Review deleted from Firebase.');
  };

  const subscribeNewsletter = async (sub: NewsletterSubscriber) => {
    await setDoc(doc(requireDb(), 'newsletter', sub.id), sub);
    const items = [sub, ...subscribers];
    localStorage.setItem('qf_subscribers', JSON.stringify(items));
    setSubscribers(items);
    toast.success('Subscription saved to Firebase!');
  };

  const deleteSubscriber = async (id: string) => {
    await deleteDoc(doc(requireDb(), 'newsletter', id));
    const items = subscribers.filter((s) => s.id !== id);
    localStorage.setItem('qf_subscribers', JSON.stringify(items));
    setSubscribers(items);
    toast.success('Subscriber deleted from Firebase.');
  };

  const saveDeliveryZonesCtx = async (zones: DeliveryZone[]) => {
    const liveDb = requireDb();
    const batch = writeBatch(liveDb);
    for (const z of zones) {
      batch.set(doc(liveDb, 'delivery_zones', z.id), z);
    }
    await batch.commit();
    localStorage.setItem('qf_delivery_zones', JSON.stringify(zones));
    setDeliveryZones(zones);
    toast.success('Delivery zones saved to Firebase!');
  };

  const placeOrder = async (order: Order) => {
    await setDoc(doc(requireDb(), 'orders', order.id), order);
    const items = [order, ...orders];
    localStorage.setItem('qf_orders', JSON.stringify(items));
    setOrders(items);
    // Deduct stock for each ordered product
    for (const item of order.items) {
      const targetProd = products.find((p) => p.id === item.productId);
      if (targetProd) {
        const newerStock = Math.max(0, targetProd.stock - item.quantity);
        await updateProductStock(targetProd.id, newerStock);
      }
    }
    // Send order confirmation emails (customer + admin)
    try {
      await sendOrderConfirmationEmails(order, siteSettings);
    } catch (e) {
      console.warn('[Email] Order confirmation email failed:', e);
    }
    toast.success('Order placed and saved to Firebase!');
  };

  const updateOrderStatus = async (id: string, status: Order['orderStatus']) => {
    await updateDoc(doc(requireDb(), 'orders', id), { orderStatus: status });
    const items = orders.map((o) => (o.id === id ? { ...o, orderStatus: status } : o));
    localStorage.setItem('qf_orders', JSON.stringify(items));
    setOrders(items);
    // Send status update email to customer (and admin)
    try {
      const updatedOrder = orders.find((o) => o.id === id);
      if (updatedOrder) {
        await sendOrderStatusUpdateEmail({ ...updatedOrder, orderStatus: status }, status, siteSettings);
      }
    } catch (e) {
      console.warn('[Email] Order status email failed:', e);
    }
    toast.success(`Order status updated to ${status} in Firebase.`);
  };

  const updateOrderPaymentStatus = async (id: string, payStatus: Order['paymentStatus']) => {
    await updateDoc(doc(requireDb(), 'orders', id), { paymentStatus: payStatus });
    const items = orders.map((o) => (o.id === id ? { ...o, paymentStatus: payStatus } : o));
    localStorage.setItem('qf_orders', JSON.stringify(items));
    setOrders(items);
    toast.success(`Payment status updated to ${payStatus} in Firebase.`);
  };

  const deleteOrder = async (id: string) => {
    await deleteDoc(doc(requireDb(), 'orders', id));
    const items = orders.filter((o) => o.id !== id);
    localStorage.setItem('qf_orders', JSON.stringify(items));
    setOrders(items);
    toast.success('Order deleted from Firebase.');
  };

  // User Actions
  const setCurrentUser = (user: UserProfile | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem('qf_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('qf_current_user');
    }
  };

  const registerUser = async (user: UserProfile): Promise<boolean> => {
    if (isBackendConnected && getFirestoreDb()) {
      try {
        const { getDoc, setDoc, doc } = await import('firebase/firestore');
        const docRef = doc(getFirestoreDb()!, 'registered_users', user.email.toLowerCase());
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          toast.error('Email address already registered.');
          return false;
        }
        await setDoc(docRef, user);
        setCurrentUser(user);
        toast.success(`Account registered successfully!`);
        return true;
      } catch (err) {
        console.error('Firestore registration failed:', err);
        toast.error('Firebase connection error. Please check your setup and try again.');
        return false;
      }
    }
    // No Firebase — reject with helpful message
    toast.error('Firebase is not connected. Please complete the setup wizard first.');
    return false;
  };

  const loginUser = async (email: string, pass: string): Promise<boolean> => {
    const hashed = simpleHash(pass);

    if (isBackendConnected && getFirestoreDb()) {
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const docRef = doc(getFirestoreDb()!, 'registered_users', email.toLowerCase());
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const fetchedUser = snap.data() as UserProfile;
          if (fetchedUser.passwordHash === hashed) {
            setCurrentUser(fetchedUser);
            toast.success(`Welcome back, ${fetchedUser.name}!`);
            return true;
          } else {
            toast.error('Invalid email or password.');
            return false;
          }
        } else {
          toast.error('No account found with that email address.');
          return false;
        }
      } catch (err) {
        console.error('Firestore login query failed:', err);
        toast.error('Firebase connection error. Please try again.');
        return false;
      }
    }

    toast.error('Firebase is not connected. Please complete the setup wizard first.');
    return false;
  };

  const resetPassword = async (email: string, newPass: string): Promise<boolean> => {
    const hashed = simpleHash(newPass);

    if (isBackendConnected && getFirestoreDb()) {
      try {
        const { getDoc, updateDoc, doc } = await import('firebase/firestore');
        const docRef = doc(getFirestoreDb()!, 'registered_users', email.toLowerCase());
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          await updateDoc(docRef, { passwordHash: hashed });
          toast.success('Password reset successfully!');
          return true;
        } else {
          toast.error('No account found with that email address.');
          return false;
        }
      } catch (err) {
        console.error('Firestore password reset failed:', err);
        toast.error('Firebase connection error. Please try again.');
        return false;
      }
    }

    toast.error('Firebase is not connected. Please complete the setup wizard first.');
    return false;
  };

  const logoutUser = () => {
    setCurrentUser(null);
    toast.info('You have logged out.');
  };

  // Shopping Cart Actions
  const addToCart = (product: Product, qty: number = 1) => {
    if (product.stock === 0) {
      toast.error('Sorry, this item is out of stock!');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      let updatedCart;
      
      const priceToUse = product.salePrice !== null ? product.salePrice : product.price;

      if (existing) {
        const nextQty = existing.quantity + qty;
        if (nextQty > product.stock) {
          toast.error(`Only ${product.stock} items left in stock.`);
          return prev;
        }
        updatedCart = prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: nextQty } : item
        );
      } else {
        if (qty > product.stock) {
          toast.error(`Only ${product.stock} items left in stock.`);
          return prev;
        }
        updatedCart = [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            price: priceToUse,
            quantity: qty,
            image: product.image
          }
        ];
      }
      localStorage.setItem('qf_cart', JSON.stringify(updatedCart));
      return updatedCart;
    });
    toast.success(`${product.name} added to cart!`);
  };

  const removeFromCart = (prodId: string) => {
    setCart((prev) => {
      const updated = prev.filter((item) => item.productId !== prodId);
      localStorage.setItem('qf_cart', JSON.stringify(updated));
      return updated;
    });
  };

  const updateCartQuantity = (prodId: string, qty: number) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    if (qty > prod.stock) {
      toast.error(`Only ${prod.stock} items left in stock.`);
      return;
    }

    setCart((prev) => {
      const updated = prev.map((item) =>
        item.productId === prodId ? { ...item, quantity: Math.max(1, qty) } : item
      );
      localStorage.setItem('qf_cart', JSON.stringify(updated));
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('qf_cart');
  };

  return (
    <AppContext.Provider
      value={{
        siteSettings,
        categories,
        products,
        orders,
        coupons,
        reviews,
        subscribers,
        deliveryZones,
        paymentSettings,
        saveSiteSettings,
        savePaymentSettings,
        addProduct,
        editProduct,
        deleteProduct,
        updateProductStock,
        addCategory,
        editCategory,
        deleteCategory,
        addCoupon,
        deleteCoupon,
        addReview,
        approveReview,
        deleteReview,
        subscribeNewsletter,
        deleteSubscriber,
        saveDeliveryZonesCtx,
        placeOrder,
        updateOrderStatus,
        updateOrderPaymentStatus,
        deleteOrder,
        currentUser,
        setCurrentUser,
        registerUser,
        loginUser,
        resetPassword,
        logoutUser,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        formatPrice,
        isInstalled,
        isBootstrapping,
        isBackendConnected,
        triggerReboot,
        adminLoggedIn,
        setAdminLoggedIn,
        saveAdminCredentials,
        resetAdminCredentials,
        getAdminCredentials,
        toasts,
        addToast,
        removeToast,
        toast
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside the AppProvider');
  return context;
}
