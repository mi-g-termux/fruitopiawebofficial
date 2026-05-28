/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Product, Category, Coupon, SiteSettings, PaymentSettings, Order, Review, DeliveryZone } from '../types';
import {
  Settings,
  ShoppingBag,
  ListFilter,
  CheckCircle,
  Truck,
  Plus,
  Trash2,
  Edit2,
  Ticket,
  Mail,
  X,
  CreditCard,
  Grid,
  MapPin,
  Lock,
  Loader2,
  ExternalLink,
  ShieldEllipsis,
  Eye,
  EyeOff,
  KeyRound,
  UserCog,
  RefreshCw,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { simpleHash } from '../db';

export default function AdminPanel() {
  const {
    adminLoggedIn,
    setAdminLoggedIn,
    siteSettings,
    saveSiteSettings,
    paymentSettings,
    savePaymentSettings,
    products,
    addProduct,
    editProduct,
    deleteProduct,
    saveAdminCredentials,
    resetAdminCredentials,
    getAdminCredentials,
    categories,
    addCategory,
    editCategory,
    deleteCategory,
    orders,
    updateOrderStatus,
    updateOrderPaymentStatus,
    deleteOrder,
    coupons,
    addCoupon,
    deleteCoupon,
    reviews,
    addReview,
    approveReview,
    deleteReview,
    subscribers,
    deleteSubscriber,
    deliveryZones,
    saveDeliveryZonesCtx,
    formatPrice,
    isBackendConnected,
    triggerReboot,
    toast
  } = useApp();

  // Authentication states
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Admin tab panel
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'orders' | 'coupons' | 'reviews' | 'subscribers' | 'settings' | 'gateways'>('products');

  // Edit / Creation modals states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 1.00,
    salePrice: null,
    stock: 10,
    image: '🍊',
    category: 'smoothies',
    isFeatured: true,
    isActive: true
  });
  const [showProductModal, setShowProductModal] = useState(false);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState<Partial<Category>>({
    name: '',
    emoji: '🍉',
    slug: '',
    isVisible: true,
    isNavbarFeatured: true
  });
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [newCoupon, setNewCoupon] = useState<Partial<Coupon>>({
    code: '',
    discountPercentage: 10,
    expiryDate: '2028-12-31',
    usageLimit: 100
  });

  const [showCouponModal, setShowCouponModal] = useState(false);

  // Admin custom review add state
  const [showAddReviewModal, setShowAddReviewModal] = useState(false);
  const [newReview, setNewReview] = useState<Partial<Review & { productId: string }>>({
    reviewerName: '',
    productId: '',
    productName: '',
    rating: 5,
    comment: '',
    isApproved: true
  });

  // ── Custom Confirm Modal (replaces all browser window.confirm popups) ──────
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const showConfirm = (opts: { title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void }) => {
    setConfirmModal({ open: true, ...opts });
  };
  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, open: false }));

  // CMS Settings Editor bindings
  const [cmsSettings, setCmsSettings] = useState<SiteSettings>({ ...siteSettings });
  const [paymentConfig, setPaymentConfig] = useState<PaymentSettings>({ ...paymentSettings });
  const [subTab, setSubTab] = useState<'branding' | 'smtp' | 'sms' | 'checkout' | 'chat' | 'credentials' | 'zones'>('branding');

  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newAdminPassConfirm, setNewAdminPassConfirm] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showNewPassConfirm, setShowNewPassConfirm] = useState(false);
  const [isSavingCreds, setIsSavingCreds] = useState(false);
  const [credSaved, setCredSaved] = useState(false);
  // Current credentials display
  const [currentCredUser, setCurrentCredUser] = useState('');
  const [currentCredPass, setCurrentCredPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [loadingCurrentCreds, setLoadingCurrentCreds] = useState(false);
  const [credsCopied, setCredsCopied] = useState<'user'|'pass'|null>(null);

  const [localZones, setLocalZones] = useState<DeliveryZone[]>([]);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneFee, setNewZoneFee] = useState(5.00);

  useEffect(() => {
    if (deliveryZones) {
      setLocalZones(deliveryZones);
    }
  }, [deliveryZones]);

  useEffect(() => {
    setCmsSettings(siteSettings);
  }, [siteSettings]);

  useEffect(() => {
    setPaymentConfig(paymentSettings);
  }, [paymentSettings]);

  // Logo & Favicon Base64 file uploaders
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Logo image size must be less than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCmsSettings((prev) => ({ ...prev, logoUrl: reader.result as string }));
        toast.success('Custom brand logo uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 512 * 1024) {
        toast.error('Favicon image size must be less than 500KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCmsSettings((prev) => ({ ...prev, faviconUrl: reader.result as string }));
        toast.success('Custom browser favicon loaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  // Modular custom payment logos base64 loader
  const handlePaymentLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldKey: keyof PaymentSettings) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 512 * 1024) {
        toast.error('Payment option logo file size must be less than 500KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentConfig((prev) => ({ ...prev, [fieldKey]: reader.result as string }));
        toast.success(`Logo updated block initialized!`);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Admin Log in
  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      // Always fetch live credentials — Firestore first, localStorage fallback
      const saved = await getAdminCredentials();
      const inputHash = simpleHash(adminPass);
      if (adminUser.trim() === saved.username && inputHash === saved.passwordHash) {
        setAdminLoggedIn(true);
        toast.success('Successfully authorized Master Operations!');
      } else {
        toast.error('Invalid credentials. Check username and password.');
      }
    } catch (err) {
      toast.error('Verification error. Check your connection.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSaveAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUser.trim() || !newAdminPass.trim()) {
      toast.error('Both username and password are required.');
      return;
    }
    if (newAdminPass !== newAdminPassConfirm) {
      toast.error('Passwords do not match. Please re-enter.');
      return;
    }
    if (newAdminPass.length < 4) {
      toast.error('Password must be at least 4 characters.');
      return;
    }
    setIsSavingCreds(true);
    try {
      await saveAdminCredentials(newAdminUser.trim(), newAdminPass.trim());
      // Store plain password so admin can view it in the panel
      localStorage.setItem('qf_admin_plain_pass', newAdminPass.trim());
      setCurrentCredUser(newAdminUser.trim());
      setCurrentCredPass(newAdminPass.trim());
      setNewAdminUser('');
      setNewAdminPass('');
      setNewAdminPassConfirm('');
      setCredSaved(true);
      setTimeout(() => setCredSaved(false), 3000);
    } catch (err) {
      toast.error('Failed to save credentials. Check connection.');
    } finally {
      setIsSavingCreds(false);
    }
  };

  const handleResetAdminCredentials = async () => {
    showConfirm({
      title: 'Reset Admin Credentials',
      message: 'This will reset your username and password back to admin / admin123 and write it to Firebase immediately. You will be logged out.',
      confirmLabel: 'Reset & Logout',
      danger: true,
      onConfirm: async () => {
        try {
          await resetAdminCredentials();
          localStorage.setItem('qf_admin_plain_pass', 'admin123');
          setCurrentCredUser('admin');
          setCurrentCredPass('admin123');
          setAdminLoggedIn(false);
        } catch (err) {
          toast.error('Failed to reset credentials.');
        }
      },
    });
  };

  const handleLoadCurrentCredentials = async () => {
    setLoadingCurrentCreds(true);
    try {
      const saved = await getAdminCredentials();
      setCurrentCredUser(saved.username);
      if (saved.passwordPlain) {
        setCurrentCredPass(saved.passwordPlain);
        localStorage.setItem('qf_admin_plain_pass', saved.passwordPlain);
      } else {
        // Fallback to localStorage cache
        const plain = localStorage.getItem('qf_admin_plain_pass');
        setCurrentCredPass(plain || '(set a new password above to reveal)');
      }
    } catch (err) {
      toast.error('Could not load credentials from Firebase.');
    } finally {
      setLoadingCurrentCreds(false);
    }
  };

  const handleCopyToClipboard = (text: string, type: 'user' | 'pass') => {
    navigator.clipboard.writeText(text).then(() => {
      setCredsCopied(type);
      setTimeout(() => setCredsCopied(null), 2000);
    });
  };

  const triggerImageFileRead = (e: React.ChangeEvent<HTMLInputElement>, isCategory: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (isCategory) {
          if (editingCategory) setEditingCategory({ ...editingCategory, emoji: base64String });
          else setNewCategory({ ...newCategory, emoji: base64String });
        } else {
          if (editingProduct) setEditingProduct({ ...editingProduct, image: base64String });
          else setNewProduct({ ...newProduct, image: base64String });
        }
        toast.success('Image loaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle products edit submit
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await editProduct({ ...editingProduct });
      } else {
        const prodId = 'prod-' + Date.now().toString() + Math.random().toString(36).substring(2, 5);
        await addProduct({
          ...(newProduct as Product),
          id: prodId,
          rating: 5,
          reviewsCount: 0
        });
      }
      setShowProductModal(false);
      setEditingProduct(null);
      // reset
      setNewProduct({
        name: '',
        description: '',
        price: 1.00,
        salePrice: null,
        stock: 10,
        image: '🍊',
        category: 'smoothies',
        isFeatured: true,
        isActive: true
      });
    } catch (err) {
      toast.error('Failed saving product.');
    }
  };

  // Handle categories submit
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await editCategory({ ...editingCategory });
      } else {
        const catId = 'cat-' + (newCategory.slug || Date.now().toString());
        await addCategory({
          ...(newCategory as Category),
          id: catId
        });
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      setNewCategory({
        name: '',
        emoji: '🍉',
        slug: '',
        isVisible: true,
        isNavbarFeatured: true
      });
    } catch (err) {
      toast.error('Failed saving category node.');
    }
  };

  // Handle add Coupon
  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code) return;
    try {
      const cId = 'c_' + Date.now().toString();
      await addCoupon({
        ...(newCoupon as Coupon),
        id: cId,
        usedCount: 0
      });
      setShowCouponModal(false);
      setNewCoupon({
        code: '',
        discountPercentage: 10,
        expiryDate: '2028-12-31',
        usageLimit: 100
      });
    } catch (err) {
      toast.error('Failing configuring promotions voucher.');
    }
  };

  if (!adminLoggedIn) {
    return (
      <div className="min-h-[85vh] bg-slate-50 flex flex-col justify-center items-center px-4 py-20 select-none">
        
        {/* Auth Panel card */}
        <div className="bg-white rounded-3xl border border-slate-100 p-8 w-full max-w-sm shadow-xl text-center space-y-6">
          <div className="space-y-2">
            <span className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl mx-auto">
              🔐
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none pt-2">ADMIN MASTER LOG IN</h1>
            <p className="text-slate-500 text-xs text-center">
              Please enter credentials built during initial setup environment activation.
            </p>
          </div>

          <form onSubmit={handleAdminAuthSubmit} className="space-y-4 text-xs font-semibold text-slate-600">
            <div className="space-y-1 text-left">
              <label>Master Username</label>
              <input
                type="text"
                required
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Username e.g. admin"
              />
            </div>
            <div className="space-y-1 text-left">
              <label>Master Passphrase</label>
              <input
                type="password"
                required
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full h-10 bg-slate-950 tracking-wide text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow"
            >
              {isLoggingIn ? <Loader2 className="w-4.5 h-4.5 animate-spin text-teal-400" /> : 'OPERATIONAL ACCESS BLOCK'}
            </button>
          </form>

          <a href="/" className="text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase block">
            Return to Storefront
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 flex select-none">
      
      {/* Sidebar Nav */}
      <aside className="w-64 bg-slate-900 shrink-0 text-white flex flex-col justify-between p-6">
        <div className="space-y-8">
          <div className="flex items-center gap-2.5 border-b border-white/5 pb-5">
            {siteSettings.logoUrl ? (
              <img
                src={siteSettings.logoUrl}
                alt={siteSettings.websiteName || 'Logo'}
                className="w-8 h-8 object-contain rounded bg-white p-0.5"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-2xl">{siteSettings.logoEmoji || '🥑'}</span>
            )}
            <div>
              <h1 className="text-sm font-black tracking-tight leading-none uppercase">
                {siteSettings.websiteName || 'QUIRKY FRUITY'}
              </h1>
              <span className="text-[10px] text-teal-400 font-semibold uppercase font-mono tracking-wider">Master Control</span>
            </div>
          </div>

          {/* Options List */}
          <nav className="space-y-2 text-xs font-bold text-slate-300">
            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center gap-2.5 px-4 h-11 rounded-lg hover:bg-white/5 transition ${
                activeTab === 'products' ? 'bg-indigo-600 hover:bg-indigo-600 text-white' : ''
              }`}
            >
              <ShoppingBag className="w-4 h-4" /> Products Catalog
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full flex items-center gap-2.5 px-4 h-11 rounded-lg hover:bg-white/5 transition ${
                activeTab === 'categories' ? 'bg-indigo-600 hover:bg-indigo-600 text-white' : ''
              }`}
            >
              <Grid className="w-4 h-4" /> Category Nodes
            </button>
            <button
              id="admin-orders-tab"
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-2.5 px-4 h-11 rounded-lg hover:bg-white/5 transition relative ${
                activeTab === 'orders' ? 'bg-indigo-600 hover:bg-indigo-600 text-white' : ''
              }`}
            >
              <Truck className="w-4 h-4" /> Orders Queue
              {orders.filter((o) => o.orderStatus === 'Pending').length > 0 && (
                <span className="absolute right-4 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-sans flex items-center justify-center font-bold">
                  {orders.filter((o) => o.orderStatus === 'Pending').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('coupons')}
              className={`w-full flex items-center gap-2.5 px-4 h-11 rounded-lg hover:bg-white/5 transition ${
                activeTab === 'coupons' ? 'bg-indigo-600 hover:bg-indigo-600 text-white' : ''
              }`}
            >
              <Ticket className="w-4 h-4" /> Promo Coupons
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`w-full flex items-center gap-2.5 px-4 h-11 rounded-lg hover:bg-white/5 transition relative ${
                activeTab === 'reviews' ? 'bg-indigo-600 hover:bg-indigo-600 text-white' : ''
              }`}
            >
              <ShieldCheckIcon className="w-4 h-4 text-slate-300" /> Moderation Reviews
              {reviews.filter((r) => !r.isApproved).length > 0 && (
                <span className="absolute right-4 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-sans flex items-center justify-center font-bold">
                  {reviews.filter((r) => !r.isApproved).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('subscribers')}
              className={`w-full flex items-center gap-2.5 px-4 h-11 rounded-lg hover:bg-white/5 transition ${
                activeTab === 'subscribers' ? 'bg-indigo-600 hover:bg-indigo-600 text-white' : ''
              }`}
            >
              <Mail className="w-4 h-4" /> Subscribers
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-2.5 px-4 h-11 rounded-lg hover:bg-white/5 transition ${
                activeTab === 'settings' ? 'bg-indigo-600 hover:bg-indigo-600 text-white' : ''
              }`}
            >
              <Settings className="w-4 h-4" /> CMS Settings
            </button>
          </nav>
        </div>

        {/* Footer info logout */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="p-3 bg-white/5 rounded-xl text-[11px] font-mono leading-relaxed">
            <span className="block font-bold">MODE STATUS</span>
            <span className={isBackendConnected ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              {isBackendConnected ? '• FIRESTORE ONLINE' : '• LOCAL MOCK ENGINE'}
            </span>
          </div>

          <button
            onClick={() => setAdminLoggedIn(false)}
            className="w-full h-10 border border-white/10 hover:border-rose-500 text-white hover:bg-rose-600 text-xs font-semibold rounded-lg transition"
          >
            Logout Control
          </button>
        </div>
      </aside>

      {/* Main Board content container */}
      <main className="flex-1 p-10 overflow-y-auto">
        
        {/* Products Manager tab */}
        {activeTab === 'products' && (
          <div className="space-y-6 text-left">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight uppercase">Products inventory catalog</h2>
                <p className="text-slate-400 text-xs">Update your ripe papaya/shake stock quantities.</p>
              </div>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setShowProductModal(true);
                }}
                className="h-10 px-4 bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition hover:bg-indigo-500 cursor-pointer shadow"
              >
                <Plus className="w-4 h-4" /> ADD PRODUCT
              </button>
            </div>

            {/* List Table items */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 uppercase text-slate-400 font-black border-b border-slate-100">
                  <tr>
                    <th className="p-4">Item details</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Retail pricing</th>
                    <th className="p-4">Active Stock</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => {
                    const price = p.salePrice !== null ? p.salePrice : p.price;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="p-4 flex items-center gap-3">
                          <span className="text-4xl bg-slate-100 rounded-xl w-11 h-11 flex items-center justify-center">
                            {p.image.startsWith('data:') || p.image.startsWith('http') ? (
                              <img src={p.image} className="w-8 h-8 object-contain" alt={p.name} />
                            ) : (
                              p.image
                            )}
                          </span>
                          <div>
                            <p className="font-extrabold text-slate-950">{p.name}</p>
                            <p className="text-[10px] text-slate-400 max-w-xs truncate">{p.description}</p>
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-slate-500 uppercase">{p.category}</td>
                        <td className="p-4 font-bold text-slate-800">
                          {formatPrice(p.price)}
                          {p.salePrice !== null && (
                            <span className="text-rose-500 font-bold block">
                              Promo: {formatPrice(p.salePrice)}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            p.stock === 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {p.stock} units
                          </span>
                        </td>
                        <td className="p-4 flex gap-2">
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setShowProductModal(true);
                            }}
                            className="p-1 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition shrink-0 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => showConfirm({
                              title: 'Delete Product',
                              message: `Are you sure you want to delete "${p.name}"? This cannot be undone.`,
                              confirmLabel: 'Delete',
                              danger: true,
                              onConfirm: () => deleteProduct(p.id),
                            })}
                            className="p-1 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 transition shrink-0 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Categories Manager tab */}
        {activeTab === 'categories' && (
          <div className="space-y-6 text-left">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight uppercase">Category directory setup</h2>
                <p className="text-slate-400 text-xs">Configure category nodes and displayed graphics.</p>
              </div>
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setShowCategoryModal(true);
                }}
                className="h-10 px-4 bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition hover:bg-indigo-500 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> ADD CATEGORY
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 uppercase text-slate-400 font-black border-b border-slate-100">
                  <tr>
                    <th className="p-4">Visual Icon</th>
                    <th className="p-4">Node name</th>
                    <th className="p-4">URL Slug</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="p-4">
                        <div className="w-10 h-10 rounded-xl border border-slate-150 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0 text-3xl">
                          {c.emoji.startsWith('data:') || c.emoji.startsWith('http') ? (
                            <img src={c.emoji} className="w-8 h-8 object-contain" alt={c.name} referrerPolicy="no-referrer" />
                          ) : (
                            c.emoji
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-extrabold text-slate-900 uppercase">{c.name}</td>
                      <td className="p-4 font-mono text-slate-400">#/{c.slug}</td>
                      <td className="p-4 flex gap-2">
                        <button
                          onClick={() => {
                            setEditingCategory(c);
                            setShowCategoryModal(true);
                          }}
                          className="p-1 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition shrink-0"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => showConfirm({
                            title: 'Delete Category',
                            message: `Delete category "${c.name}"? Products in this category will become uncategorised.`,
                            confirmLabel: 'Delete',
                            danger: true,
                            onConfirm: () => deleteCategory(c.id),
                          })}
                          className="p-1 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 transition shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders Queue monitoring */}
        {activeTab === 'orders' && (
          <div className="space-y-6 text-left">
            <div className="border-b border-slate-200/60 pb-5">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight uppercase">Orders live progression processing queue</h2>
              <p className="text-slate-400 text-xs">Real-time update order statuses which push notification metrics directly.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 uppercase text-slate-400 font-black border-b border-slate-100">
                  <tr>
                    <th className="p-4">Order references</th>
                    <th className="p-4">Deliver to</th>
                    <th className="p-4">Invoice items</th>
                    <th className="p-4">Status progression</th>
                    <th className="p-4">Payment Log</th>
                    <th className="p-4">Archive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-mono font-extrabold text-slate-950">
                        {o.orderNumber}
                        <span className="text-[10px] text-slate-400 font-sans block font-semibold">
                          {new Date(o.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-4 space-y-0.5">
                        <p className="font-bold text-slate-950">{o.customerName}</p>
                        <p className="text-[10px] text-slate-400">{o.phone}</p>
                        <p className="text-[10px] text-slate-400 max-w-44 truncate">{o.address}, {o.city}</p>
                      </td>
                      <td className="p-4 space-y-1">
                        <strong className="text-emerald-600 block">{formatPrice(o.total)}</strong>
                        <div className="space-y-0.5 text-[9px] text-slate-400 font-semibold max-w-48 overflow-hidden">
                          {o.items.map((i, idx) => (
                            <p key={idx}>{i.name} x {i.quantity}</p>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <select
                          value={o.orderStatus}
                          onChange={(e) => updateOrderStatus(o.id, e.target.value as any)}
                          className="h-8 border border-slate-200 bg-white rounded focus:ring-1 focus:ring-indigo-500 text-xs font-bold font-sans"
                        >
                          <option value="Pending">⌛ Pending</option>
                          <option value="Confirmed">✅ Confirmed</option>
                          <option value="Processing">🥤 Processing</option>
                          <option value="Shipped">🚚 Shipped</option>
                          <option value="Delivered">⭐ Delivered</option>
                          <option value="Cancelled">❌ Cancelled</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <select
                          value={o.paymentStatus}
                          onChange={(e) => updateOrderPaymentStatus(o.id, e.target.value as any)}
                          className={`h-8 border bg-white rounded text-xs font-bold font-sans px-1 ${
                            o.paymentStatus === 'Paid' ? 'border-emerald-200 text-emerald-700' : 'border-rose-200 text-rose-700'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Paid">Paid</option>
                          <option value="Failed">Failed</option>
                        </select>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block pt-1">{o.paymentMethod}</span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => showConfirm({
                            title: 'Delete Order',
                            message: `Permanently delete order #${o.id.slice(-6).toUpperCase()}? This action cannot be undone.`,
                            confirmLabel: 'Delete Permanently',
                            danger: true,
                            onConfirm: () => deleteOrder(o.id),
                          })}
                          className="p-1.5 px-2 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Coupons section */}
        {activeTab === 'coupons' && (
          <div className="space-y-6 text-left">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight uppercase">Promo coupon discounts</h2>
                <p className="text-slate-400 text-xs">Establish checkout coupon rules.</p>
              </div>
              <button
                onClick={() => setShowCouponModal(true)}
                className="h-10 px-4 bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition hover:bg-indigo-500 cursor-pointer shadow"
              >
                <Plus className="w-4 h-4" /> ADD COUPON
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 uppercase text-slate-400 font-black border-b border-slate-100">
                  <tr>
                    <th className="p-4">Coupon Code</th>
                    <th className="p-4">Discount ratio</th>
                    <th className="p-4">Usage stats</th>
                    <th className="p-4">Expiry limit</th>
                    <th className="p-4">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coupons.map((c) => (
                    <tr key={c.id}>
                      <td className="p-4 font-mono font-extrabold text-indigo-600 text-sm">{c.code}</td>
                      <td className="p-4 font-extrabold text-emerald-600">{c.discountPercentage}% OFF</td>
                      <td className="p-4 font-semibold">
                        {c.usedCount} / <span className="text-slate-400 font-medium">{c.usageLimit} maximum</span>
                      </td>
                      <td className="p-4 text-slate-500 font-semibold">{c.expiryDate}</td>
                      <td className="p-4">
                        <button
                          onClick={() => showConfirm({
                            title: 'Remove Coupon',
                            message: `Remove coupon code "${c.code}"? Customers will no longer be able to use it.`,
                            confirmLabel: 'Remove',
                            danger: true,
                            onConfirm: () => deleteCoupon(c.id),
                          })}
                          className="p-1 px-2 rounded bg-rose-50 hover:bg-rose-100 text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reviews tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-6 text-left">
            <div className="border-b border-slate-200/60 pb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight uppercase">Product comments moderation</h2>
                <p className="text-slate-400 text-xs">Approve user submissions or add custom reviews to display on the storefront.</p>
              </div>
              <button
                onClick={() => {
                  setNewReview({ reviewerName: '', productId: products[0]?.id || '', productName: products[0]?.name || '', rating: 5, comment: '', isApproved: true });
                  setShowAddReviewModal(true);
                }}
                className="flex items-center gap-1.5 px-4 h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow"
              >
                <Plus className="w-3.5 h-3.5" /> Add Custom Review
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 uppercase text-slate-400 font-black border-b border-slate-100">
                  <tr>
                    <th className="p-4">Reviewer</th>
                    <th className="p-4">Rating target</th>
                    <th className="p-4">Stars</th>
                    <th className="p-4">Comments/Feedback</th>
                    <th className="p-4">Status moderator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reviews.map((r) => (
                    <tr key={r.id}>
                      <td className="p-4 font-extrabold uppercase text-slate-900">{r.reviewerName}</td>
                      <td className="p-4 font-semibold text-slate-500">{r.productName}</td>
                      <td className="p-4 text-amber-500 font-extrabold">{r.rating} ★</td>
                      <td className="p-4 text-slate-500 italic max-w-xs">{r.comment}</td>
                      <td className="p-4 flex gap-2">
                        {!r.isApproved ? (
                          <button
                            onClick={() => approveReview(r.id)}
                            className="px-3 h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[10px]"
                          >
                            Approve
                          </button>
                        ) : (
                          <span className="text-emerald-600 font-extrabold text-[10px] bg-emerald-50 px-2 py-1 rounded">Approved ✅</span>
                        )}
                        <button
                          onClick={() => showConfirm({
                            title: 'Delete Review',
                            message: `Delete this review by "${r.reviewerName}"? This cannot be undone.`,
                            confirmLabel: 'Delete',
                            danger: true,
                            onConfirm: () => deleteReview(r.id),
                          })}
                          className="p-1 px-2 rounded bg-rose-50 hover:bg-rose-100 text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {reviews.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">No reviews yet. Add a custom review above.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Subscribers tab */}
        {activeTab === 'subscribers' && (
          <div className="space-y-6 text-left">
            <div className="border-b border-slate-200/60 pb-5">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight uppercase">Newsletter subscribers queue</h2>
              <p className="text-slate-400 text-xs">Verify email lists compiled from promotional banner footers.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 uppercase text-slate-400 font-black border-b border-slate-100">
                  <tr>
                    <th className="p-4">Email subscriber index</th>
                    <th className="p-4">Subscribe Date</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscribers.map((s) => (
                    <tr key={s.id}>
                      <td className="p-4 font-extrabold text-slate-900 text-sm">{s.email}</td>
                      <td className="p-4 text-slate-400 text-xs">
                        {new Date(s.subscribedAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => showConfirm({
                            title: 'Remove Subscriber',
                            message: `Remove "${s.email}" from the newsletter list?`,
                            confirmLabel: 'Remove',
                            danger: true,
                            onConfirm: () => deleteSubscriber(s.id),
                          })}
                          className="p-1 px-2 rounded bg-rose-50 hover:bg-rose-100 text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Site settings CMS panel */}
        {activeTab === 'settings' && (
          <div className="space-y-6 text-left max-w-3xl">
            <div className="border-b border-slate-200/60 pb-5">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight uppercase">CMS SITE CONFIGURATIONS</h2>
              <p className="text-slate-400 text-xs text-slate-500">Configure global site typography, branding, gateways, security credentials, and SMTP/Twilio integration instantly.</p>
            </div>

            {/* Sub-tabs header keys */}
            <div className="flex border-b border-slate-200/60 pb-1 mb-6 gap-2 overflow-x-auto scrollbar-none font-sans">
              {[
                { id: 'branding', label: 'SITE BRANDING', icon: Settings },
                { id: 'smtp', label: 'SMTP MAIL KEYS', icon: Mail },
                { id: 'sms', label: 'SMS & VERIFY', icon: ShieldEllipsis },
                { id: 'checkout', label: 'CHECKOUT CHANNELS', icon: CreditCard },
                { id: 'chat', label: 'SUPPORT SERVICES', icon: ExternalLink },
                { id: 'credentials', label: 'CREDENTIALS KEYS', icon: Lock },
                { id: 'zones', label: 'DELIVERY ZONES', icon: MapPin }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSubTab(tab.id as any)}
                    className={`px-4 h-10 rounded-t-xl text-[10px] font-black tracking-wider uppercase border-b-2 flex items-center gap-2 shrink-0 transition ${
                      subTab === tab.id
                        ? 'border-indigo-600 text-indigo-600 font-extrabold bg-indigo-50/50'
                        : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* branding Tab content */}
            {subTab === 'branding' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveSiteSettings(cmsSettings);
                }}
                className="space-y-4 text-xs font-semibold text-slate-600 bg-white border border-slate-100 rounded-3xl p-8 shadow-sm"
              >
                <h3 className="font-extrabold text-slate-900 text-sm border-b pb-2 mb-4">Site Visual branding & Fonts</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2 md:col-span-1">
                    <label>Store Website Name</label>
                    <input
                      type="text"
                      value={cmsSettings.websiteName}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, websiteName: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1 col-span-2 md:col-span-1">
                    <label>Site Browser Tab HTML Title</label>
                    <input
                      type="text"
                      value={cmsSettings.siteTitle || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, siteTitle: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                      placeholder="e.g. Fruitopia - Fresh Organic Juice Delivery"
                    />
                  </div>

                  {/* Brand logo configure and preview */}
                  <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50 col-span-2 md:col-span-1 space-y-2">
                    <label className="text-slate-800 font-extrabold block">Custom Store Logo Image</label>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-2xl overflow-hidden shrink-0">
                        {cmsSettings.logoUrl ? (
                          <img src={cmsSettings.logoUrl} className="w-full h-full object-contain" alt="Store logo" />
                        ) : (
                          <span>{cmsSettings.logoEmoji || '?'}</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="text-[10px] text-slate-500 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-slate-250 file:text-slate-700 hover:file:bg-slate-300"
                        />
                        <input
                          type="text"
                          value={cmsSettings.logoUrl || ''}
                          onChange={(e) => setCmsSettings({ ...cmsSettings, logoUrl: e.target.value })}
                          placeholder="Or paste Logo URL"
                          className="w-full h-7 border border-slate-200 rounded-md px-2 text-[10px] bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Favicon configure and preview */}
                  <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50 col-span-2 md:col-span-1 space-y-2">
                    <label className="text-slate-800 font-extrabold block">Custom Site Tab Favicon Icon</label>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 p-1">
                        {cmsSettings.faviconUrl ? (
                          <img src={cmsSettings.faviconUrl} className="w-10 h-10 object-contain rounded" alt="Favicon preview" />
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">Favicon</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFaviconUpload}
                          className="text-[10px] text-slate-500 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-slate-250 file:text-slate-700 hover:file:bg-slate-300"
                        />
                        <input
                          type="text"
                          value={cmsSettings.faviconUrl || ''}
                          onChange={(e) => setCmsSettings({ ...cmsSettings, faviconUrl: e.target.value })}
                          placeholder="Or paste Favicon URL"
                          className="w-full h-7 border border-slate-200 rounded-md px-2 text-[10px] bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label>Fallback Logo Emoji (when logo URL is missing)</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={cmsSettings.logoEmoji || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, logoEmoji: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-1 bg-slate-50 focus:bg-white"
                      placeholder="e.g. 🍍"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Loading Screen Emoji</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={cmsSettings.loadingEmoji || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, loadingEmoji: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-1 bg-slate-50 focus:bg-white"
                      placeholder="e.g. 🍉"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Loading Screen Brand Name</label>
                    <input
                      type="text"
                      value={cmsSettings.loadingName || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, loadingName: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-1 bg-slate-50 focus:bg-white"
                      placeholder="e.g. Fruitopia Organic"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Display Currency Position</label>
                    <select
                      value={cmsSettings.currencyPosition}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, currencyPosition: e.target.value as any })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-white"
                    >
                      <option value="before">Before Pricing ($10)</option>
                      <option value="after">After Pricing (10$)</option>
                    </select>
                  </div>

                  {/* ── Dynamic Currency Changer ── */}
                  <div className="col-span-2 border border-indigo-100 bg-indigo-50/40 rounded-2xl p-4 space-y-3">
                    <h4 className="font-extrabold text-indigo-700 text-xs uppercase tracking-wide">💱 Dynamic Currency Changer</h4>
                    <p className="text-[10px] text-slate-500">Changes reflect live on the storefront immediately — including all product prices, cart totals, and order summaries.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label>Currency ISO Code</label>
                        <select
                          value={cmsSettings.currency || 'USD'}
                          onChange={(e) => {
                            const presets: Record<string, { symbol: string; position: 'before' | 'after' }> = {
                              USD: { symbol: '$', position: 'before' },
                              BDT: { symbol: '৳', position: 'after' },
                              EUR: { symbol: '€', position: 'before' },
                              GBP: { symbol: '£', position: 'before' },
                              INR: { symbol: '₹', position: 'before' },
                              AED: { symbol: 'AED', position: 'before' },
                              SAR: { symbol: 'SR', position: 'before' },
                              MYR: { symbol: 'RM', position: 'before' },
                              SGD: { symbol: 'S$', position: 'before' },
                              CAD: { symbol: 'CA$', position: 'before' },
                              AUD: { symbol: 'A$', position: 'before' },
                              JPY: { symbol: '¥', position: 'before' },
                              CNY: { symbol: '¥', position: 'before' },
                              OTHER: { symbol: cmsSettings.currencySymbol || '$', position: cmsSettings.currencyPosition || 'before' },
                            };
                            const preset = presets[e.target.value] || presets['OTHER'];
                            setCmsSettings({
                              ...cmsSettings,
                              currency: e.target.value,
                              currencySymbol: preset.symbol,
                              currencyPosition: preset.position
                            });
                          }}
                          className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-white"
                        >
                          <option value="USD">USD – US Dollar</option>
                          <option value="BDT">BDT – Bangladeshi Taka</option>
                          <option value="EUR">EUR – Euro</option>
                          <option value="GBP">GBP – British Pound</option>
                          <option value="INR">INR – Indian Rupee</option>
                          <option value="AED">AED – UAE Dirham</option>
                          <option value="SAR">SAR – Saudi Riyal</option>
                          <option value="MYR">MYR – Malaysian Ringgit</option>
                          <option value="SGD">SGD – Singapore Dollar</option>
                          <option value="CAD">CAD – Canadian Dollar</option>
                          <option value="AUD">AUD – Australian Dollar</option>
                          <option value="JPY">JPY – Japanese Yen</option>
                          <option value="CNY">CNY – Chinese Yuan</option>
                          <option value="OTHER">OTHER – Custom</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label>Currency Symbol</label>
                        <input
                          type="text"
                          value={cmsSettings.currencySymbol || '$'}
                          onChange={(e) => setCmsSettings({ ...cmsSettings, currencySymbol: e.target.value })}
                          className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-slate-50 focus:outline-none focus:bg-white"
                          placeholder="e.g. $, ৳, €, £"
                        />
                      </div>
                      <div className="space-y-1">
                        <label>Symbol Position</label>
                        <select
                          value={cmsSettings.currencyPosition || 'before'}
                          onChange={(e) => setCmsSettings({ ...cmsSettings, currencyPosition: e.target.value as any })}
                          className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-white"
                        >
                          <option value="before">Before price — $10.00</option>
                          <option value="after">After price — 10.00৳</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label>Exchange Rate (from base USD)</label>
                        <input
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          value={cmsSettings.currencyExchangeRate ?? 1}
                          onChange={(e) => setCmsSettings({ ...cmsSettings, currencyExchangeRate: parseFloat(e.target.value) || 1 })}
                          className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-slate-50 focus:outline-none focus:bg-white font-mono"
                          placeholder="e.g. 110 for BDT, 1 for USD"
                        />
                        <p className="text-[9.5px] text-slate-400">All product prices are multiplied by this rate for display. Set to 1 if your prices are already in target currency.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label>Store announcement banner text</label>
                    <input
                      type="text"
                      value={cmsSettings.promoBannerText}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, promoBannerText: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:outline-none bg-slate-50 focus:bg-white"
                    />
                  </div>

                  {/* Order Tracker Toggle */}
                  <div className="col-span-2 border border-indigo-100 rounded-2xl p-4 bg-indigo-50/40 space-y-3">
                    <p className="text-[11px] font-black text-indigo-700 uppercase tracking-wide">📦 Order Tracker Storefront Feature</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="orderTrackerToggle"
                        checked={!!cmsSettings.orderTrackerEnabled}
                        onChange={(e) => setCmsSettings({ ...cmsSettings, orderTrackerEnabled: e.target.checked })}
                        className="w-4 h-4 accent-indigo-600"
                      />
                      <label htmlFor="orderTrackerToggle" className="cursor-pointer text-slate-700 font-bold">
                        Enable Order Tracker on Storefront
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      When enabled, a <strong>Track Shipping</strong> link appears in the navbar and customers can look up their order status at <code className="bg-white border border-indigo-100 px-1 rounded">/tracker</code>. Disable to hide the feature entirely from the storefront.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label>Primary Theme Color hex code</label>
                    <input
                      type="color"
                      value={cmsSettings.themePrimaryColor}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, themePrimaryColor: e.target.value })}
                      className="w-full h-10 border border-slate-200 rounded-lg px-1 bg-white cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Header display Font family</label>
                    <select
                      value={cmsSettings.themeHeaderFont}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, themeHeaderFont: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-white"
                    >
                      <option value="Space Grotesk">Space Grotesk (Tech/Raw)</option>
                      <option value="Outfit">Outfit (Round/Fresh)</option>
                      <option value="Inter">Inter (Swiss Modern)</option>
                      <option value="Playfair Display">Playfair Display (Serif/Organic)</option>
                    </select>
                  </div>

                  <div className="border-t border-slate-100 col-span-2 pt-4">
                    <h4 className="font-extrabold text-slate-900 pb-2 text-xs uppercase text-indigo-600">Hero Segment Copywriting</h4>
                  </div>

                  <div className="space-y-1">
                    <label>Hero Badge tag info</label>
                    <input
                      type="text"
                      value={cmsSettings.heroBadge}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, heroBadge: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-slate-50 goal-focus"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Hero banner button label</label>
                    <input
                      type="text"
                      value={cmsSettings.heroButtonText}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, heroButtonText: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-slate-50"
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label>Hero Title line 1</label>
                    <input
                      type="text"
                      value={cmsSettings.heroTitleLine1 || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, heroTitleLine1: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label>Hero Title line 2</label>
                    <input
                      type="text"
                      value={cmsSettings.heroTitleLine2 || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, heroTitleLine2: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label>Hero subtitle paragraph text</label>
                    <textarea
                      rows={2}
                      value={cmsSettings.heroSubtitle}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, heroSubtitle: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-3 text-xs focus:outline-none bg-slate-50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="h-10 px-6 bg-slate-950 hover:bg-slate-850 text-white font-bold rounded-lg transition text-xs flex items-center justify-center cursor-pointer shadow"
                >
                  SAVE BRANDING CONFIG
                </button>
              </form>
            )}

            {/* smtp Tab content */}
            {subTab === 'smtp' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveSiteSettings(cmsSettings);
                }}
                className="space-y-4 text-xs font-semibold text-slate-600 bg-white border border-slate-100 rounded-3xl p-8 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-4 border-b pb-3.5">
                  <span className="p-1 px-2.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase">SMTP ACTIVE</span>
                  <p className="text-slate-400 text-[10.5px]">Configure your SMTP credentials, sender identity, and email templates for all transactional messages.</p>
                </div>

                {/* SMTP Credentials */}
                <h4 className="font-extrabold text-xs text-slate-900 border-b pb-2 mb-3 text-indigo-700">📡 SMTP Server Credentials</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label>SMTP Host Server Address</label>
                    <input
                      type="text"
                      value={cmsSettings.smtpHost || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, smtpHost: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-slate-50 focus:bg-white focus:outline-none"
                      placeholder="mail.utility.smtp.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>SMTP Port (e.g. 465 or 587)</label>
                    <input
                      type="number"
                      value={cmsSettings.smtpPort || 587}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, smtpPort: parseInt(e.target.value) || 587 })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-slate-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>SMTP Sender Account / Username</label>
                    <input
                      type="email"
                      value={cmsSettings.smtpUser || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, smtpUser: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-slate-50 focus:bg-white focus:outline-none"
                      placeholder="smtp-account@domain.club"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>SMTP Sender Passphrase</label>
                    <input
                      type="password"
                      value={cmsSettings.smtpPass || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, smtpPass: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-slate-50 focus:bg-white focus:outline-none"
                      placeholder="••••••••••••••"
                    />
                  </div>
                </div>

                {/* Sender Identity */}
                <div className="col-span-2 border-t pt-4 mt-2">
                  <h4 className="font-extrabold text-xs text-slate-900 border-b pb-2 mb-3 text-emerald-700">✉️ Email Sender Identity (From Name &amp; Email)</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label>From Name (Display Name)</label>
                    <input
                      type="text"
                      value={cmsSettings.smtpSenderDisplayName || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, smtpSenderDisplayName: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-slate-50 focus:bg-white focus:outline-none"
                      placeholder={`e.g. ${cmsSettings.websiteName || 'Fruitopia'} Support`}
                    />
                    <p className="text-[10px] text-slate-400">Shown as the sender name in recipient's inbox.</p>
                  </div>
                  <div className="space-y-1">
                    <label>From Email Address</label>
                    <input
                      type="email"
                      value={cmsSettings.smtpSenderEmail || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, smtpSenderEmail: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-slate-50 focus:bg-white focus:outline-none"
                      placeholder="noreply@yourdomain.com"
                    />
                    <p className="text-[10px] text-slate-400">Leave blank to use SMTP username as sender email.</p>
                  </div>
                </div>

                {/* Signup email verification toggle */}
                <div className="col-span-2 border-t pt-4 mt-2">
                  <h4 className="font-extrabold text-xs text-slate-900 border-b pb-2 mb-3 text-rose-600">🔐 Email Verification &amp; Templates</h4>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="signupVerifyToggle"
                    checked={!!cmsSettings.emailSignupVerifyEnabled}
                    onChange={(e) => setCmsSettings({ ...cmsSettings, emailSignupVerifyEnabled: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <label htmlFor="signupVerifyToggle" className="cursor-pointer text-slate-700 font-bold">
                    Require Email Verification on Signup (sends OTP before account is created)
                  </label>
                </div>

                {/* Signup Verification Email Template */}
                <div className="border border-indigo-100 rounded-2xl p-4 bg-indigo-50/40 space-y-3">
                  <p className="text-[11px] font-black text-indigo-700 uppercase tracking-wide">📨 Signup / Email Verification Email</p>
                  <div className="space-y-1">
                    <label>Email Subject</label>
                    <input
                      type="text"
                      value={cmsSettings.emailSignupSubject || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, emailSignupSubject: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-white focus:outline-none"
                      placeholder={`Verify your ${cmsSettings.websiteName || 'Fruitopia'} account`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Email Body Template</label>
                    <textarea
                      rows={4}
                      value={cmsSettings.emailSignupBodyTemplate || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, emailSignupBodyTemplate: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none resize-none text-xs leading-relaxed"
                      placeholder={`Hi there!\n\nYour {{store}} verification code is: {{code}}\n\nThis code expires in {{expiry}} minutes.\n\nIf you did not request this, please ignore this email.`}
                    />
                    <p className="text-[10px] text-slate-400">Use <code className="bg-slate-100 px-1 rounded">{'{{code}}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{{store}}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{{expiry}}'}</code> as placeholders.</p>
                  </div>
                </div>

                {/* Forgot Password OTP Email Template */}
                <div className="border border-rose-100 rounded-2xl p-4 bg-rose-50/40 space-y-3">
                  <p className="text-[11px] font-black text-rose-700 uppercase tracking-wide">🔑 Forgot Password / OTP Reset Email</p>
                  <div className="space-y-1">
                    <label>Email Subject</label>
                    <input
                      type="text"
                      value={cmsSettings.emailOtpSubject || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, emailOtpSubject: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-white focus:outline-none"
                      placeholder={`Your ${cmsSettings.websiteName || 'Fruitopia'} password reset code`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Email Body Template</label>
                    <textarea
                      rows={4}
                      value={cmsSettings.emailOtpBodyTemplate || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, emailOtpBodyTemplate: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none resize-none text-xs leading-relaxed"
                      placeholder={`Hi,\n\nYour {{store}} password reset code is: {{code}}\n\nThis code is valid for {{expiry}} minutes.\n\nIf you did not request a password reset, please ignore this email.`}
                    />
                    <p className="text-[10px] text-slate-400">Use <code className="bg-slate-100 px-1 rounded">{'{{code}}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{{store}}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{{expiry}}'}</code> as placeholders.</p>
                  </div>
                  <div className="space-y-1">
                    <label>OTP Code Expiry Limit (Minutes)</label>
                    <input
                      type="number"
                      value={cmsSettings.emailOtpExpiryMinutes || 10}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, emailOtpExpiryMinutes: parseInt(e.target.value) || 10 })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-white"
                    />
                  </div>
                </div>

                {/* Order Notification Emails */}
                <div className="col-span-2 border-t pt-4 mt-2">
                  <h4 className="font-extrabold text-xs text-slate-900 border-b pb-2 mb-3 text-teal-700">📦 Order Notification Emails</h4>
                  <p className="text-[10.5px] text-slate-400 mb-3">When enabled and SMTP is configured, customers and admin receive automatic email notifications for all order events (placed, confirmed, shipped, delivered, cancelled).</p>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="smtpEnabledToggle"
                    checked={!!cmsSettings.smtpEnabled}
                    onChange={(e) => setCmsSettings({ ...cmsSettings, smtpEnabled: e.target.checked })}
                    className="w-4 h-4 accent-teal-600"
                  />
                  <label htmlFor="smtpEnabledToggle" className="cursor-pointer text-slate-700 font-bold">
                    Enable Order Email Notifications (customer confirmation + admin alerts + status updates)
                  </label>
                </div>
                <div className="border border-teal-100 rounded-2xl p-4 bg-teal-50/40 space-y-2 text-[10.5px] text-slate-600">
                  <p className="font-black text-teal-700 text-[11px] uppercase tracking-wide">📧 What gets sent automatically:</p>
                  <ul className="space-y-1 list-none pl-2">
                    <li>✅ <strong>Order Placed</strong> — Customer receives full invoice + QR code. Admin gets alert with order details.</li>
                    <li>✅ <strong>Status Changed</strong> — Customer notified on: Confirmed, Processing, Shipped, Delivered, Cancelled, Refunded.</li>
                    <li>✅ <strong>Admin Order Alert</strong> — Admin email (From Email above) receives every new order and status change.</li>
                  </ul>
                  <p className="text-[10px] text-slate-400 mt-2">Admin notification goes to the "From Email" address configured above. Customer invoice includes a QR code linking to order tracker.</p>
                </div>

                <button
                  type="submit"
                  className="h-10 px-6 bg-slate-950 hover:bg-slate-850 text-white font-bold rounded-lg transition text-xs flex items-center justify-center cursor-pointer shadow"
                >
                  SAVE SMTP CONFIG
                </button>
              </form>
            )}

            {/* sms and verify Tab content */}
            {subTab === 'sms' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveSiteSettings(cmsSettings);
                }}
                className="space-y-4 text-xs font-semibold text-slate-600 bg-white border border-slate-100 rounded-3xl p-8 shadow-sm"
              >
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Twilio SMS Verification API</h3>
                    <p className="text-slate-400 text-[10.5px]">Provide secret credentials to trigger real-time Twilio SMS alerts.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-black text-indigo-600 uppercase">Twilio Enabled</label>
                    <input
                      type="checkbox"
                      checked={cmsSettings.twilioEnabled || false}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, twilioEnabled: e.target.checked })}
                      className="w-5 h-5 rounded hover:bg-slate-100 accent-teal-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label>Twilio Account SID (starts with AC...)</label>
                    <input
                      type="text"
                      value={cmsSettings.twilioSid || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, twilioSid: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-slate-50 text-xs font-mono"
                      placeholder="AC8419f7ccce9dfec9e600..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Twilio Auth Token</label>
                    <input
                      type="password"
                      value={cmsSettings.twilioToken || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, twilioToken: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-slate-50 text-xs"
                      placeholder="••••••••••••••••••••••••"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Twilio Verified Phone Number (sender/virtual)</label>
                    <input
                      type="text"
                      value={cmsSettings.twilioFromNumber || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, twilioFromNumber: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-slate-50 text-xs"
                      placeholder="+1 855 941 223"
                    />
                  </div>

                  <div className="col-span-2 border-t pt-4 mt-2">
                    <h4 className="font-extrabold text-xs text-slate-900 pb-2 mb-3 uppercase text-teal-600">Dynamic SMS Templates</h4>
                    <p className="text-slate-400 font-medium text-[10px] pb-2 leading-normal italic">
                      Use placeholders like <span className="text-pink-600 font-black font-mono">{"{{code}}"}</span>, <span className="text-pink-600 font-black font-mono">{"{{expiry}}"}</span>, or <span className="text-indigo-600 font-bold">{"{{store}}"}</span> to format the custom verification SMS text.
                    </p>
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label>SMS Code Message Template</label>
                    <input
                      type="text"
                      value={cmsSettings.smsOtpTemplate || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, smsOtpTemplate: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-slate-50"
                      placeholder="{{code}} is your Fruitopia verification code. Valid for {{expiry}} min."
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="h-10 px-6 bg-slate-950 hover:bg-slate-850 text-white font-bold rounded-lg transition text-xs flex items-center justify-center cursor-pointer shadow"
                >
                  SAVE SMS VARIABLES
                </button>
              </form>
            )}

            {/* checkout and gateways Tab content */}
            {subTab === 'checkout' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  savePaymentSettings(paymentConfig);
                }}
                className="space-y-6 text-xs font-semibold text-slate-600 bg-white border border-slate-100 rounded-3xl p-8 shadow-sm"
              >
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase">Automatic and Manual Checkout Channels</h3>
                  <p className="text-slate-400 text-[10.5px]">Manage client payment methods, active states, custom brand names, branding colors, and setup credentials.</p>
                </div>

                {/* ==================== 1. Cash On Delivery ==================== */}
                <div className="space-y-3.5 border-b border-slate-100 pb-5">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                    <h4 className="font-extrabold text-sm text-slate-900">Cash On Delivery (COD)</h4>
                    <input
                      type="checkbox"
                      checked={paymentConfig.codEnabled}
                      onChange={(e) => setPaymentConfig({ ...paymentConfig, codEnabled: e.target.checked })}
                      className="w-4.5 h-4.5 text-indigo-600 rounded bg-slate-100 cursor-pointer"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-2">
                    <div className="space-y-1">
                      <label>COD Display Title</label>
                      <input
                        type="text"
                        value={paymentConfig.codDisplayName || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, codDisplayName: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>COD Text Sub-text label info</label>
                      <input
                        type="text"
                        value={paymentConfig.codSubtext || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, codSubtext: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                      />
                    </div>
                    {/* Custom Logo upload block */}
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-slate-700 font-bold text-[11px] block">Cash On Delivery Logo override</label>
                      <div className="flex items-center gap-3 bg-slate-50 p-3.5 border border-slate-100 rounded-xl">
                        <div className="w-14 h-8 bg-white border border-slate-200 flex items-center justify-center p-0.5 rounded overflow-hidden shadow-xs shrink-0">
                          {paymentConfig.codLogoUrl ? (
                            <img src={paymentConfig.codLogoUrl} className="h-full object-contain" alt="COD" />
                          ) : (
                            <div className="text-[10px] text-emerald-600 font-bold uppercase">COD</div>
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <input type="file" accept="image/*" onChange={(e) => handlePaymentLogoUpload(e, 'codLogoUrl')} className="text-[10px] text-slate-500" />
                          <input type="text" placeholder="Or enter Logo link URL" value={paymentConfig.codLogoUrl || ''} onChange={(e) => setPaymentConfig({ ...paymentConfig, codLogoUrl: e.target.value })} className="w-full h-7 border border-slate-200 rounded px-2 text-[10px] bg-white font-mono" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ==================== 2. bKash (Auto) Instant Gateway ==================== */}
                <div className="space-y-3.5 border-b border-slate-100 pb-5">
                  <div className="flex items-center justify-between bg-pink-50 text-pink-900 p-3 rounded-lg">
                    <h4 className="font-extrabold text-sm">bKash (Auto) Instant API Gateway [NEW]</h4>
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] font-black uppercase tracking-wide text-pink-700">Sandbox</label>
                      <input
                        type="checkbox"
                        checked={paymentConfig.bkashAutoSandbox || false}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, bkashAutoSandbox: e.target.checked })}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <input
                        type="checkbox"
                        checked={paymentConfig.bkashAutoEnabled || false}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, bkashAutoEnabled: e.target.checked })}
                        className="w-4.5 h-4.5 text-pink-600 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-2">
                    <div className="space-y-1">
                      <label>Display Display Name Title</label>
                      <input
                        type="text"
                        value={paymentConfig.bkashAutoDisplayName || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, bkashAutoDisplayName: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                        placeholder="e.g. bKash (Auto)"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>API Username (Registered Merchant)</label>
                      <input
                        type="text"
                        value={paymentConfig.bkashAutoUsername || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, bkashAutoUsername: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label>API App Key Credentials</label>
                      <input
                        type="text"
                        value={paymentConfig.bkashAutoAppKey || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, bkashAutoAppKey: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50 font-mono"
                        placeholder="bk_app_key_xxxxxxxx"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>API App Secret Keys</label>
                      <input
                        type="password"
                        value={paymentConfig.bkashAutoAppSecret || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, bkashAutoAppSecret: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                        placeholder="bk_secret_xxxxxxxx"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>API Credentials Password</label>
                      <input
                        type="password"
                        value={paymentConfig.bkashAutoPassword || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, bkashAutoPassword: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                      />
                    </div>
                    {/* Logo upload */}
                    <div className="space-y-1.5 col-span-2 font-bold text-[11px]">
                      <label className="text-slate-700 block">bKash (Auto) Payment Gateway Logo override</label>
                      <div className="flex items-center gap-3 bg-slate-50 p-3.5 border border-slate-100 rounded-xl">
                        <div className="w-14 h-8 bg-white border border-slate-200 flex items-center justify-center p-0.5 rounded overflow-hidden shadow-xs shrink-0">
                          {paymentConfig.bkashAutoLogoUrl ? (
                            <img src={paymentConfig.bkashAutoLogoUrl} className="h-full object-contain" alt="bKash" />
                          ) : (
                            <div className="text-[10px] text-pink-600 font-black uppercase">bKash</div>
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <input type="file" accept="image/*" onChange={(e) => handlePaymentLogoUpload(e, 'bkashAutoLogoUrl')} className="text-[10px] text-slate-500" />
                          <input type="text" placeholder="Or paste bKash Logo URL" value={paymentConfig.bkashAutoLogoUrl || ''} onChange={(e) => setPaymentConfig({ ...paymentConfig, bkashAutoLogoUrl: e.target.value })} className="w-full h-7 border border-slate-200 rounded px-2 text-[10px] bg-white font-mono" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ==================== 3. Nagad (Auto) Instant Gateway ==================== */}
                <div className="space-y-3.5 border-b border-slate-100 pb-5">
                  <div className="flex items-center justify-between bg-orange-50 text-orange-900 p-3 rounded-lg">
                    <h4 className="font-extrabold text-sm">Nagad (Auto) Instant API Gateway [NEW]</h4>
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] font-black uppercase tracking-wide text-orange-700">Sandbox</label>
                      <input
                        type="checkbox"
                        checked={paymentConfig.nagadAutoSandbox || false}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, nagadAutoSandbox: e.target.checked })}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <input
                        type="checkbox"
                        checked={paymentConfig.nagadAutoEnabled || false}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, nagadAutoEnabled: e.target.checked })}
                        className="w-4.5 h-4.5 text-orange-600 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-2">
                    <div className="space-y-1 text-left col-span-2 md:col-span-1">
                      <label>Display Display Name Title</label>
                      <input
                        type="text"
                        value={paymentConfig.nagadAutoDisplayName || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, nagadAutoDisplayName: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                        placeholder="e.g. Nagad (Auto)"
                      />
                    </div>
                    <div className="space-y-1 text-left col-span-2 md:col-span-1">
                      <label>API Merchant ID</label>
                      <input
                        type="text"
                        value={paymentConfig.nagadAutoMerchantId || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, nagadAutoMerchantId: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50 font-mono"
                      />
                    </div>
                    <div className="space-y-1 text-left col-span-2">
                      <label>Private RSA Private Key credentials</label>
                      <textarea
                        rows={2}
                        value={paymentConfig.nagadAutoPrivateKey || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, nagadAutoPrivateKey: e.target.value })}
                        className="w-full border border-slate-200 rounded p-2 text-xs bg-slate-50 font-mono focus:bg-white"
                        placeholder="-----BEGIN RSA PRIVATE KEY-----"
                      />
                    </div>
                    <div className="space-y-1 text-left col-span-2">
                      <label>Merchant RSA Public Key credentials</label>
                      <textarea
                        rows={2}
                        value={paymentConfig.nagadAutoPublicKey || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, nagadAutoPublicKey: e.target.value })}
                        className="w-full border border-slate-200 rounded p-2 text-xs bg-slate-50 font-mono focus:bg-white"
                        placeholder="-----BEGIN PUBLIC KEY-----"
                      />
                    </div>
                    {/* Logo upload */}
                    <div className="space-y-1.5 col-span-2 font-bold text-[11px]">
                      <label className="text-slate-700 block">Nagad (Auto) Payment Gateway Logo override</label>
                      <div className="flex items-center gap-3 bg-slate-50 p-3.5 border border-slate-100 rounded-xl">
                        <div className="w-14 h-8 bg-white border border-slate-200 flex items-center justify-center p-0.5 rounded overflow-hidden shadow-xs shrink-0">
                          {paymentConfig.nagadAutoLogoUrl ? (
                            <img src={paymentConfig.nagadAutoLogoUrl} className="h-full object-contain" alt="Nagad" />
                          ) : (
                            <div className="text-[10px] text-orange-600 font-extrabold uppercase">Nagad</div>
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <input type="file" accept="image/*" onChange={(e) => handlePaymentLogoUpload(e, 'nagadAutoLogoUrl')} className="text-[10px] text-slate-500" />
                          <input type="text" placeholder="Or paste Nagad Logo URL" value={paymentConfig.nagadAutoLogoUrl || ''} onChange={(e) => setPaymentConfig({ ...paymentConfig, nagadAutoLogoUrl: e.target.value })} className="w-full h-7 border border-slate-200 rounded px-2 text-[10px] bg-white font-mono" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ==================== 4. SSLCommerz Real Gateway ==================== */}
                <div className="space-y-3.5 border-b border-slate-100 pb-5">
                  <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                    <h4 className="font-extrabold text-sm text-green-800">SSLCommerz Payment Gateway (Real API)</h4>
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] font-black tracking-wide text-amber-500 uppercase">Sandbox</label>
                      <input type="checkbox" checked={paymentConfig.sslcommerzSandbox || false} onChange={(e) => setPaymentConfig({ ...paymentConfig, sslcommerzSandbox: e.target.checked })} className="accent-amber-500 w-3.5 h-3.5 cursor-pointer" />
                      <label className="text-[9px] font-black tracking-wide text-emerald-600 uppercase">Enabled</label>
                      <input type="checkbox" checked={paymentConfig.sslcommerzEnabled || false} onChange={(e) => setPaymentConfig({ ...paymentConfig, sslcommerzEnabled: e.target.checked })} className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px] font-semibold text-slate-600">
                    <div className="space-y-1">
                      <label>Display Name</label>
                      <input type="text" value={paymentConfig.sslcommerzDisplayName || ''} onChange={(e) => setPaymentConfig({ ...paymentConfig, sslcommerzDisplayName: e.target.value })} className="w-full h-8 border border-slate-200 rounded px-2.5 text-[10px] bg-white" placeholder="e.g. SSLCommerz" />
                    </div>
                    <div className="space-y-1">
                      <label>Store ID</label>
                      <input type="text" value={paymentConfig.sslcommerzStoreId || ''} onChange={(e) => setPaymentConfig({ ...paymentConfig, sslcommerzStoreId: e.target.value })} className="w-full h-8 border border-slate-200 rounded px-2.5 text-[10px] bg-white font-mono" placeholder="Your SSLCommerz Store ID" />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label>Store Password / API Password</label>
                      <input type="password" value={paymentConfig.sslcommerzStorePassword || ''} onChange={(e) => setPaymentConfig({ ...paymentConfig, sslcommerzStorePassword: e.target.value })} className="w-full h-8 border border-slate-200 rounded px-2.5 text-[10px] bg-white font-mono" placeholder="SSLCommerz store password" />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-slate-700 block">SSLCommerz Logo Override</label>
                      <div className="flex items-center gap-2 border border-slate-100 rounded-lg p-2 bg-slate-50">
                        {paymentConfig.sslcommerzLogoUrl ? (
                          <img src={paymentConfig.sslcommerzLogoUrl} className="h-8 object-contain rounded" alt="SSLCommerz" />
                        ) : <span className="text-2xl">🔒</span>}
                        <div className="flex-1 space-y-1">
                          <input type="file" accept="image/*" onChange={(e) => handlePaymentLogoUpload(e, 'sslcommerzLogoUrl')} className="text-[10px] text-slate-500" />
                          <input type="text" placeholder="Or paste logo URL" value={paymentConfig.sslcommerzLogoUrl || ''} onChange={(e) => setPaymentConfig({ ...paymentConfig, sslcommerzLogoUrl: e.target.value })} className="w-full h-7 border border-slate-200 rounded px-2 text-[10px] bg-white font-mono" />
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 text-[10px] text-green-700 bg-green-50 rounded-lg p-2.5 border border-green-100">
                      ✅ <strong>Real SSLCommerz integration.</strong> Customers are redirected to SSLCommerz hosted payment page. After payment, they return to your store automatically. Works with all Bangladeshi banks, bKash, Nagad, Rocket via SSLCommerz network. Get credentials from <span className="font-mono">sslcommerz.com</span>.
                    </div>
                  </div>
                </div>

                {/* ==================== 5. AamarPay Real Gateway ==================== */}
                <div className="space-y-3.5 border-b border-slate-100 pb-5">
                  <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-extrabold text-sm text-blue-800">AamarPay Payment Gateway (Real API)</h4>
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] font-black tracking-wide text-amber-500 uppercase">Sandbox</label>
                      <input type="checkbox" checked={paymentConfig.aamarpaySandbox || false} onChange={(e) => setPaymentConfig({ ...paymentConfig, aamarpaySandbox: e.target.checked })} className="accent-amber-500 w-3.5 h-3.5 cursor-pointer" />
                      <label className="text-[9px] font-black tracking-wide text-blue-600 uppercase">Enabled</label>
                      <input type="checkbox" checked={paymentConfig.aamarpayEnabled || false} onChange={(e) => setPaymentConfig({ ...paymentConfig, aamarpayEnabled: e.target.checked })} className="accent-blue-500 w-3.5 h-3.5 cursor-pointer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px] font-semibold text-slate-600">
                    <div className="space-y-1">
                      <label>Display Name</label>
                      <input type="text" value={paymentConfig.aamarpayDisplayName || ''} onChange={(e) => setPaymentConfig({ ...paymentConfig, aamarpayDisplayName: e.target.value })} className="w-full h-8 border border-slate-200 rounded px-2.5 text-[10px] bg-white" placeholder="e.g. AamarPay" />
                    </div>
                    <div className="space-y-1">
                      <label>Store / Merchant ID</label>
                      <input type="text" value={paymentConfig.aamarpayStoreId || ''} onChange={(e) => setPaymentConfig({ ...paymentConfig, aamarpayStoreId: e.target.value })} className="w-full h-8 border border-slate-200 rounded px-2.5 text-[10px] bg-white font-mono" placeholder="AamarPay store ID" />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label>Signature Key</label>
                      <input type="password" value={paymentConfig.aamarpaySignatureKey || ''} onChange={(e) => setPaymentConfig({ ...paymentConfig, aamarpaySignatureKey: e.target.value })} className="w-full h-8 border border-slate-200 rounded px-2.5 text-[10px] bg-white font-mono" placeholder="AamarPay signature key" />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-slate-700 block">AamarPay Logo Override</label>
                      <div className="flex items-center gap-2 border border-slate-100 rounded-lg p-2 bg-slate-50">
                        {paymentConfig.aamarpayLogoUrl ? (
                          <img src={paymentConfig.aamarpayLogoUrl} className="h-8 object-contain rounded" alt="AamarPay" />
                        ) : <span className="text-2xl">💳</span>}
                        <div className="flex-1 space-y-1">
                          <input type="file" accept="image/*" onChange={(e) => handlePaymentLogoUpload(e, 'aamarpayLogoUrl')} className="text-[10px] text-slate-500" />
                          <input type="text" placeholder="Or paste logo URL" value={paymentConfig.aamarpayLogoUrl || ''} onChange={(e) => setPaymentConfig({ ...paymentConfig, aamarpayLogoUrl: e.target.value })} className="w-full h-7 border border-slate-200 rounded px-2 text-[10px] bg-white font-mono" />
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 text-[10px] text-blue-700 bg-blue-50 rounded-lg p-2.5 border border-blue-100">
                      ✅ <strong>Real AamarPay integration.</strong> Customers are redirected to AamarPay hosted checkout. Supports all major Bangladeshi banks, MFS, and cards. After payment, customers return automatically. Get credentials from <span className="font-mono">aamarpay.com</span>.
                    </div>
                  </div>
                </div>
                <div className="space-y-3.5 border-b border-slate-100 pb-5">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                    <h4 className="font-extrabold text-sm text-slate-900">Stripe Secure Card Payment</h4>
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] font-black tracking-wide text-amber-500 uppercase">Sandbox Mode</label>
                      <input
                        type="checkbox"
                        checked={paymentConfig.stripeSandbox || false}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, stripeSandbox: e.target.checked })}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <input
                        type="checkbox"
                        checked={paymentConfig.stripeEnabled}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, stripeEnabled: e.target.checked })}
                        className="w-4.5 h-4.5 text-indigo-600 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-2">
                    <div className="space-y-1 text-left">
                      <label>Stripe Custom Display Title</label>
                      <input
                        type="text"
                        value={paymentConfig.stripeDisplayName || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, stripeDisplayName: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                        placeholder="e.g. Credit/Debit Card (by Stripe)"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label>Display Block Color (hex)</label>
                      <input
                        type="color"
                        value={paymentConfig.stripeColor || '#4b3ea3'}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, stripeColor: e.target.value })}
                        className="w-full h-10 border border-slate-200 rounded px-1 cursor-pointer bg-white"
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label>Stripe Publishable Token Key (from Stripe dashboard)</label>
                      <input
                        type="text"
                        value={paymentConfig.stripePublicKey || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, stripePublicKey: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50 focus:bg-white font-mono"
                        placeholder="pk_test_..."
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label>Stripe API Secret Key (Keep private, proxied securely)</label>
                      <input
                        type="password"
                        value={paymentConfig.stripeSecretKey || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, stripeSecretKey: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50 focus:bg-white"
                        placeholder="sk_test_••••••••••••"
                      />
                    </div>
                    {/* Logo upload */}
                    <div className="space-y-1.5 col-span-2 font-bold text-[11px]">
                      <label className="text-slate-700 block">Stripe Gateway Brand Logo override</label>
                      <div className="flex items-center gap-3 bg-slate-50 p-3.5 border border-slate-100 rounded-xl">
                        <div className="w-14 h-8 bg-white border border-slate-200 flex items-center justify-center p-0.5 rounded overflow-hidden shadow-xs shrink-0">
                          {paymentConfig.stripeLogoUrl ? (
                            <img src={paymentConfig.stripeLogoUrl} className="h-full object-contain" alt="Stripe" />
                          ) : (
                            <div className="text-[10px] text-indigo-650 font-black uppercase">Stripe</div>
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <input type="file" accept="image/*" onChange={(e) => handlePaymentLogoUpload(e, 'stripeLogoUrl')} className="text-[10px] text-slate-500" />
                          <input type="text" placeholder="Or paste Custom Stripe Logo URL" value={paymentConfig.stripeLogoUrl || ''} onChange={(e) => setPaymentConfig({ ...paymentConfig, stripeLogoUrl: e.target.value })} className="w-full h-7 border border-slate-200 rounded px-2 text-[10px] bg-white font-mono" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ==================== 5. PayPal Pay ==================== */}
                <div className="space-y-3.5 border-b border-slate-100 pb-5">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                    <h4 className="font-extrabold text-sm text-slate-900">PayPal Checkout Integration</h4>
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] text-amber-500 font-extrabold uppercase">Sandbox Mode</label>
                      <input
                        type="checkbox"
                        checked={paymentConfig.paypalSandbox || false}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, paypalSandbox: e.target.checked })}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <input
                        type="checkbox"
                        checked={paymentConfig.paypalEnabled}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, paypalEnabled: e.target.checked })}
                        className="w-4.5 h-4.5 text-indigo-600 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-2">
                    <div className="space-y-1 text-left col-span-2">
                      <label>PayPal Client ID Name Custom Title</label>
                      <input
                        type="text"
                        value={paymentConfig.paypalDisplayName || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, paypalDisplayName: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                        placeholder="PayPal Checkout Secure Gateway"
                      />
                    </div>
                    <div className="space-y-1 col-span-2 text-left">
                      <label>PayPal Client ID (from Developer PayPal panel)</label>
                      <input
                        type="text"
                        value={paymentConfig.paypalClientId || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, paypalClientId: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50 font-mono"
                        placeholder="Client ID..."
                      />
                    </div>
                    {/* Logo upload */}
                    <div className="space-y-1.5 col-span-2 font-bold text-[11px]">
                      <label className="text-slate-700 block">PayPal Logo override</label>
                      <div className="flex items-center gap-3 bg-slate-50 p-3.5 border border-slate-100 rounded-xl">
                        <div className="w-14 h-8 bg-white border border-slate-200 flex items-center justify-center p-0.5 rounded overflow-hidden shadow-xs shrink-0">
                          {paymentConfig.paypalLogoUrl ? (
                            <img src={paymentConfig.paypalLogoUrl} className="h-full object-contain" alt="PayPal" />
                          ) : (
                            <div className="text-[10px] text-blue-800 font-extrabold italic uppercase">PayPal</div>
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <input type="file" accept="image/*" onChange={(e) => handlePaymentLogoUpload(e, 'paypalLogoUrl')} className="text-[10px] text-slate-500" />
                          <input type="text" placeholder="Or paste custom PayPal Logo URL" value={paymentConfig.paypalLogoUrl || ''} onChange={(e) => setPaymentConfig({ ...paymentConfig, paypalLogoUrl: e.target.value })} className="w-full h-7 border border-slate-200 rounded px-2 text-[10px] bg-white font-mono" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ==================== 6. bKash Manual Wallet ==================== */}
                <div className="space-y-3.5 border-b border-slate-100 pb-5">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                    <h4 className="font-extrabold text-sm text-slate-900">bKash Manual wallet payment</h4>
                    <input
                      type="checkbox"
                      checked={paymentConfig.bkashManualEnabled}
                      onChange={(e) => setPaymentConfig({ ...paymentConfig, bkashManualEnabled: e.target.checked })}
                      className="w-4.5 h-4.5 text-indigo-600 rounded cursor-pointer"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-2">
                    <div className="space-y-1 text-left">
                      <label>bKash Merchant wallet phone number</label>
                      <input
                        type="text"
                        value={paymentConfig.bkashManualNumber || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, bkashManualNumber: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                        placeholder="e.g. +880 17..."
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label>bKash Custom display title name</label>
                      <input
                        type="text"
                        value={paymentConfig.bkashManualDisplayName || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, bkashManualDisplayName: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                        placeholder="bKash Wallet transfer"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label>bKash wallet color hex</label>
                      <input
                        type="color"
                        value={paymentConfig.bkashManualColor || '#e2125d'}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, bkashManualColor: e.target.value })}
                        className="w-full h-10 border border-slate-200 rounded px-1 cursor-pointer bg-white"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label>QR Code link URL</label>
                      <input
                        type="text"
                        value={paymentConfig.bkashManualQrUrl || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, bkashManualQrUrl: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                        placeholder="data:image/png;base64,... etc"
                      />
                    </div>
                    {/* Logo upload */}
                    <div className="space-y-1.5 col-span-2 font-bold text-[11px]">
                      <label className="text-slate-700 block">bKash Manual Logo override</label>
                      <div className="flex items-center gap-3 bg-slate-50 p-3.5 border border-slate-100 rounded-xl">
                        <div className="w-14 h-8 bg-white border border-slate-200 flex items-center justify-center p-0.5 rounded overflow-hidden shadow-xs shrink-0">
                          {paymentConfig.bkashManualLogoUrl ? (
                            <img src={paymentConfig.bkashManualLogoUrl} className="h-full object-contain" alt="bKash Manual" />
                          ) : (
                            <div className="text-[10px] text-pink-600 font-bold uppercase">bKash</div>
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <input type="file" accept="image/*" onChange={(e) => handlePaymentLogoUpload(e, 'bkashManualLogoUrl')} className="text-[10px] text-slate-500" />
                          <input type="text" placeholder="Or enter bKash manual Logo URL" value={paymentConfig.bkashManualLogoUrl || ''} onChange={(e) => setPaymentConfig({ ...paymentConfig, bkashManualLogoUrl: e.target.value })} className="w-full h-7 border border-slate-200 rounded px-2 text-[10px] bg-white font-mono" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ==================== 7. Nagad Manual Wallet ==================== */}
                <div className="space-y-3.5 border-b border-slate-100 pb-5">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                    <h4 className="font-extrabold text-sm text-slate-900">Nagad Manual wallet payment</h4>
                    <input
                      type="checkbox"
                      checked={paymentConfig.nagadManualEnabled}
                      onChange={(e) => setPaymentConfig({ ...paymentConfig, nagadManualEnabled: e.target.checked })}
                      className="w-4.5 h-4.5 text-indigo-600 rounded cursor-pointer"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-2">
                    <div className="space-y-1">
                      <label>Nagad Merchant wallet phone number</label>
                      <input
                        type="text"
                        value={paymentConfig.nagadManualNumber || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, nagadManualNumber: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Nagad Custom display title name</label>
                      <input
                        type="text"
                        value={paymentConfig.nagadManualDisplayName || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, nagadManualDisplayName: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                        placeholder="Nagad Express Wallet transfer"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Nagad wallet color hex</label>
                      <input
                        type="color"
                        value={paymentConfig.nagadManualColor || '#f37021'}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, nagadManualColor: e.target.value })}
                        className="w-full h-10 border border-slate-200 rounded px-1 cursor-pointer bg-white"
                      />
                    </div>
                    <div className="space-y-1 col-span-2 md:col-span-1">
                      <label>Nagad QR Code URL/Base64</label>
                      <input
                        type="text"
                        value={paymentConfig.nagadManualQrUrl || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, nagadManualQrUrl: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                        placeholder="Link or base64"
                      />
                    </div>
                    {/* Logo upload */}
                    <div className="space-y-1.5 col-span-2 font-bold text-[11px]">
                      <label className="text-slate-700 block">Nagad Manual Logo override</label>
                      <div className="flex items-center gap-3 bg-slate-50 p-3.5 border border-slate-100 rounded-xl">
                        <div className="w-14 h-8 bg-white border border-slate-200 flex items-center justify-center p-0.5 rounded overflow-hidden shadow-xs shrink-0">
                          {paymentConfig.nagadManualLogoUrl ? (
                            <img src={paymentConfig.nagadManualLogoUrl} className="h-full object-contain" alt="Nagad Manual" />
                          ) : (
                            <div className="text-[10px] text-orange-600 font-bold uppercase">Nagad</div>
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <input type="file" accept="image/*" onChange={(e) => handlePaymentLogoUpload(e, 'nagadManualLogoUrl')} className="text-[10px] text-slate-500" />
                          <input type="text" placeholder="Or enter Nagad manual Logo URL" value={paymentConfig.nagadManualLogoUrl || ''} onChange={(e) => setPaymentConfig({ ...paymentConfig, nagadManualLogoUrl: e.target.value })} className="w-full h-7 border border-slate-200 rounded px-2 text-[10px] bg-white font-mono" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ==================== 8. Rocket Manual Wallet ==================== */}
                <div className="space-y-3.5 border-b border-slate-100 pb-5">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                    <h4 className="font-extrabold text-sm text-slate-900">Rocket Manual wallet payment</h4>
                    <input
                      type="checkbox"
                      checked={paymentConfig.rocketManualEnabled}
                      onChange={(e) => setPaymentConfig({ ...paymentConfig, rocketManualEnabled: e.target.checked })}
                      className="w-4.5 h-4.5 text-indigo-600 rounded cursor-pointer"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-2">
                    <div className="space-y-1">
                      <label>Rocket Merchant wallet phone number</label>
                      <input
                        type="text"
                        value={paymentConfig.rocketManualNumber || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, rocketManualNumber: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Rocket Custom display title name</label>
                      <input
                        type="text"
                        value={paymentConfig.rocketManualDisplayName || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, rocketManualDisplayName: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                        placeholder="Rocket transfer options"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Rocket wallet color hex</label>
                      <input
                        type="color"
                        value={paymentConfig.rocketManualColor || '#8c2d19'}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, rocketManualColor: e.target.value })}
                        className="w-full h-10 border border-slate-200 rounded px-1 cursor-pointer bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Rocket QR Code URL/Base64</label>
                      <input
                        type="text"
                        value={paymentConfig.rocketManualQrUrl || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, rocketManualQrUrl: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                        placeholder="Link or base64"
                      />
                    </div>
                    {/* Logo upload */}
                    <div className="space-y-1.5 col-span-2 font-bold text-[11px]">
                      <label className="text-slate-700 block">Rocket Manual Logo override</label>
                      <div className="flex items-center gap-3 bg-slate-50 p-3.5 border border-slate-100 rounded-xl">
                        <div className="w-14 h-8 bg-white border border-slate-200 flex items-center justify-center p-0.5 rounded overflow-hidden shadow-xs shrink-0">
                          {paymentConfig.rocketManualLogoUrl ? (
                            <img src={paymentConfig.rocketManualLogoUrl} className="h-full object-contain" alt="Rocket Manual" />
                          ) : (
                            <div className="text-[10px] text-purple-600 font-bold uppercase">Rocket</div>
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <input type="file" accept="image/*" onChange={(e) => handlePaymentLogoUpload(e, 'rocketManualLogoUrl')} className="text-[10px] text-slate-500" />
                          <input type="text" placeholder="Or enter Rocket manual Logo URL" value={paymentConfig.rocketManualLogoUrl || ''} onChange={(e) => setPaymentConfig({ ...paymentConfig, rocketManualLogoUrl: e.target.value })} className="w-full h-7 border border-slate-200 rounded px-2 text-[10px] bg-white font-mono" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ==================== 9. Bank Transfer Wire ==================== */}
                <div className="space-y-3.5 border-b border-slate-100 pb-5">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                    <h4 className="font-extrabold text-sm text-slate-900">Bank Transfer Manual gateway</h4>
                    <input
                      type="checkbox"
                      checked={paymentConfig.bankEnabled}
                      onChange={(e) => setPaymentConfig({ ...paymentConfig, bankEnabled: e.target.checked })}
                      className="w-4.5 h-4.5 text-indigo-600 rounded cursor-pointer"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-2">
                    <div className="space-y-1">
                      <label>Bank Custom Display Title</label>
                      <input
                        type="text"
                        value={paymentConfig.bankDisplayName || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, bankDisplayName: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                        placeholder="Corporate Bank Transfer"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Bank account number</label>
                      <input
                        type="text"
                        value={paymentConfig.bankAccountNo || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, bankAccountNo: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                      />
                    </div>
                    <div className="space-y-1 col-span-2 md:col-span-1">
                      <label>Bank account name/holder</label>
                      <input
                        type="text"
                        value={paymentConfig.bankAccountHolder || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, bankAccountHolder: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label>Primary routing details & instructions</label>
                      <textarea
                        rows={2}
                        value={paymentConfig.bankDetails || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, bankDetails: e.target.value })}
                        className="w-full border border-slate-200 rounded p-2 text-xs bg-slate-50 focus:bg-white"
                      />
                    </div>
                    {/* Logo upload */}
                    <div className="space-y-1.5 col-span-2 font-bold text-[11px]">
                      <label className="text-slate-700 block">Bank Transfer Brand Logo override</label>
                      <div className="flex items-center gap-3 bg-slate-50 p-3.5 border border-slate-100 rounded-xl">
                        <div className="w-14 h-8 bg-white border border-slate-200 flex items-center justify-center p-0.5 rounded overflow-hidden shadow-xs shrink-0">
                          {paymentConfig.bankLogoUrl ? (
                            <img src={paymentConfig.bankLogoUrl} className="h-full object-contain" alt="Bank logo" />
                          ) : (
                            <div className="text-[10px] text-blue-600 font-extrabold uppercase">Bank</div>
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <input type="file" accept="image/*" onChange={(e) => handlePaymentLogoUpload(e, 'bankLogoUrl')} className="text-[10px] text-slate-500" />
                          <input type="text" placeholder="Or enter Bank transfer Logo URL" value={paymentConfig.bankLogoUrl || ''} onChange={(e) => setPaymentConfig({ ...paymentConfig, bankLogoUrl: e.target.value })} className="w-full h-7 border border-slate-200 rounded px-2 text-[10px] bg-white font-mono" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ==================== 10. Manual Credit / Debit Card ==================== */}
                <div className="space-y-3.5 border-b border-slate-100 pb-5">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                    <h4 className="font-extrabold text-sm text-slate-900 font-sans">Credit / Debit Card Manual gateway [NEW]</h4>
                    <input
                      type="checkbox"
                      checked={paymentConfig.cardManualEnabled}
                      onChange={(e) => setPaymentConfig({ ...paymentConfig, cardManualEnabled: e.target.checked })}
                      className="w-4.5 h-4.5 text-indigo-600 rounded cursor-pointer"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-2">
                    <div className="space-y-1 col-span-2">
                      <label>Credit / Debit Card custom title display</label>
                      <input
                        type="text"
                        value={paymentConfig.cardManualDisplayName || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, cardManualDisplayName: e.target.value })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50"
                        placeholder="Credit / Debit Card offline payment details"
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label>Offline physical terminal manual guidance notes</label>
                      <textarea
                        rows={2}
                        value={paymentConfig.cardManualDetails || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, cardManualDetails: e.target.value })}
                        className="w-full border border-slate-200 rounded p-2 text-xs bg-slate-50 focus:bg-white"
                        placeholder="Guidance e.g. We will dispatch card swipe terminal to physical delivery location..."
                      />
                    </div>
                    {/* Logo upload */}
                    <div className="space-y-1.5 col-span-2 font-bold text-[11px]">
                      <label className="text-slate-700 block">Offline Card manual option Logo override</label>
                      <div className="flex items-center gap-3 bg-slate-50 p-3.5 border border-slate-100 rounded-xl">
                        <div className="w-14 h-8 bg-white border border-slate-200 flex items-center justify-center p-0.5 rounded overflow-hidden shadow-xs shrink-0">
                          {paymentConfig.cardManualLogoUrl ? (
                            <img src={paymentConfig.cardManualLogoUrl} className="h-full object-contain" alt="Card Manual logo" />
                          ) : (
                            <div className="text-[10px] text-slate-700 font-extrabold uppercase">Card</div>
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <input type="file" accept="image/*" onChange={(e) => handlePaymentLogoUpload(e, 'cardManualLogoUrl')} className="text-[10px] text-slate-500" />
                          <input type="text" placeholder="Or enter manual Card option Logo URL" value={paymentConfig.cardManualLogoUrl || ''} onChange={(e) => setPaymentConfig({ ...paymentConfig, cardManualLogoUrl: e.target.value })} className="w-full h-7 border border-slate-200 rounded px-2 text-[10px] bg-white font-mono" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Global standard delivery rates */}
                <div className="space-y-3.5 pt-2">
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase text-indigo-600 border-b pb-1.5">Taxes & global standard delivery rates</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label>Fallback delivery flat rate (USD)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={paymentConfig.shippingFee}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, shippingFee: parseFloat(e.target.value) })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Global tax percentage (e.g. 0.05 = 5%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={paymentConfig.taxPercentage}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, taxPercentage: parseFloat(e.target.value) })}
                        className="w-full h-9 border border-slate-200 rounded px-2.5"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="h-10 px-6 bg-slate-950 hover:bg-slate-850 text-white font-bold rounded-lg transition text-xs flex items-center justify-center cursor-pointer shadow"
                >
                  SAVE PAYMENTS CONFIGURATION
                </button>
              </form>
            )}

            {/* live support chat Tab content */}
            {subTab === 'chat' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveSiteSettings(cmsSettings);
                }}
                className="space-y-4 text-xs font-semibold text-slate-600 bg-white border border-slate-100 rounded-3xl p-8 shadow-sm"
              >
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Tawk.to Chat Widget</h3>
                    <p className="text-slate-400 text-[10.5px]">Provide your widget property ID to mount chat support directly on client pages.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-black text-indigo-600 uppercase">Live Chat Active</label>
                    <input
                      type="checkbox"
                      checked={cmsSettings.tawkChatEnabled || false}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, tawkChatEnabled: e.target.checked })}
                      className="w-5 h-5 rounded cursor-pointer-check"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2 text-left">
                    <label>Tawk.to Property ID (or dynamic script ID)</label>
                    <input
                      type="text"
                      value={cmsSettings.tawkPropertyId || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, tawkPropertyId: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-slate-50 text-xs text-left"
                      placeholder="63bc19fc4757c112..."
                    />
                  </div>
                </div>

                <div className="col-span-2 border-t pt-5 mt-4">
                  <h4 className="font-extrabold text-xs text-slate-900 border-b pb-2 mb-3 uppercase text-teal-600">Google Sign-In API integration</h4>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl">
                    <p className="font-extrabold text-slate-700 text-xs">Enable instant client login via Google</p>
                    <input
                      type="checkbox"
                      checked={cmsSettings.googleSignInEnabled || false}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, googleSignInEnabled: e.target.checked })}
                      className="w-4.5 h-4.5 text-indigo-600 rounded bg-slate-100 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Google Sign-In OAuth Client ID</label>
                    <input
                      type="text"
                      value={cmsSettings.googleClientId || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, googleClientId: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded px-2.5 bg-slate-50 font-mono text-left"
                      placeholder="XXXXXX-XXXXXX.apps.googleusercontent.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="h-10 px-6 bg-slate-950 hover:bg-slate-850 text-white font-bold rounded-lg transition text-xs flex items-center justify-center cursor-pointer shadow mt-2"
                >
                  SAVE SERVICES SETTINGS
                </button>
              </form>
            )}

            {/* credentials Tab content */}
            {subTab === 'credentials' && (
              <div className="space-y-5">

                {/* ── Current Credentials Viewer ─────────────────────────── */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                      <UserCog className="w-4 h-4 text-teal-400" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm leading-tight">Current Admin Credentials</h3>
                      <p className="text-slate-400 text-[10.5px]">Live credentials pulled directly from Firebase.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLoadCurrentCredentials}
                      disabled={loadingCurrentCreds}
                      className="ml-auto flex items-center gap-1.5 h-8 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition cursor-pointer disabled:opacity-50"
                    >
                      {loadingCurrentCreds
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <RefreshCw className="w-3.5 h-3.5" />}
                      {loadingCurrentCreds ? 'Loading…' : 'Load from Firebase'}
                    </button>
                  </div>

                  {currentCredUser ? (
                    <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-600">
                      {/* Username display */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">Admin Username</label>
                        <div className="flex items-center gap-2 h-10 bg-slate-50 border border-slate-200 rounded-xl px-3">
                          <span className="flex-1 font-mono text-slate-900 font-bold text-sm truncate">{currentCredUser}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyToClipboard(currentCredUser, 'user')}
                            className="shrink-0 text-slate-400 hover:text-teal-600 transition cursor-pointer"
                            title="Copy username"
                          >
                            {credsCopied === 'user'
                              ? <CheckCircle2 className="w-4 h-4 text-teal-500" />
                              : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      {/* Password display */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">Admin Password</label>
                        <div className="flex items-center gap-2 h-10 bg-slate-50 border border-slate-200 rounded-xl px-3">
                          <span className="flex-1 font-mono text-slate-900 font-bold text-sm truncate">
                            {showCurrentPass ? currentCredPass : currentCredPass.startsWith('(') ? currentCredPass : '•'.repeat(Math.min(currentCredPass.length, 16))}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowCurrentPass(v => !v)}
                            className="shrink-0 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                            title={showCurrentPass ? 'Hide password' : 'Show password'}
                          >
                            {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          {!currentCredPass.startsWith('(') && (
                            <button
                              type="button"
                              onClick={() => handleCopyToClipboard(currentCredPass, 'pass')}
                              className="shrink-0 text-slate-400 hover:text-teal-600 transition cursor-pointer"
                              title="Copy password"
                            >
                              {credsCopied === 'pass'
                                ? <CheckCircle2 className="w-4 h-4 text-teal-500" />
                                : <Copy className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                      <KeyRound className="w-8 h-8 text-slate-200" />
                      <p className="text-slate-400 text-xs">Click <strong>Load from Firebase</strong> to view your current admin credentials.</p>
                    </div>
                  )}
                </div>

                {/* ── Change Credentials Form ─────────────────────────────── */}
                <form
                  onSubmit={handleSaveAdminCredentials}
                  className="space-y-5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
                >
                  <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4 text-rose-500" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm leading-tight">Update Admin Credentials</h3>
                      <p className="text-slate-400 text-[10.5px]">Changes sync to Firebase instantly — effective on every device immediately.</p>
                    </div>
                  </div>

                  {/* New Username */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">New Admin Username</label>
                    <input
                      type="text"
                      required
                      value={newAdminUser}
                      onChange={(e) => setNewAdminUser(e.target.value)}
                      className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition text-slate-900 font-mono"
                      placeholder="e.g. StoreOwner"
                      autoComplete="off"
                    />
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">New Password <span className="normal-case font-normal text-slate-300">(min 4 characters)</span></label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        required
                        value={newAdminPass}
                        onChange={(e) => setNewAdminPass(e.target.value)}
                        className="w-full h-10 border border-slate-200 rounded-xl px-3 pr-10 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition text-slate-900 font-mono"
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowNewPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer transition">
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Strength bar */}
                    {newAdminPass.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(4)].map((_, i) => {
                          const score = newAdminPass.length >= 12 ? 4 : newAdminPass.length >= 8 ? 3 : newAdminPass.length >= 6 ? 2 : 1;
                          return <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < score ? (score <= 1 ? 'bg-red-400' : score <= 2 ? 'bg-amber-400' : score <= 3 ? 'bg-teal-400' : 'bg-emerald-500') : 'bg-slate-200'}`} />;
                        })}
                        <span className="text-[10px] text-slate-400 ml-1 font-medium">
                          {newAdminPass.length >= 12 ? 'Strong' : newAdminPass.length >= 8 ? 'Good' : newAdminPass.length >= 6 ? 'OK' : 'Weak'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassConfirm ? 'text' : 'password'}
                        required
                        value={newAdminPassConfirm}
                        onChange={(e) => setNewAdminPassConfirm(e.target.value)}
                        className={`w-full h-10 border rounded-xl px-3 pr-10 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition text-slate-900 font-mono ${newAdminPassConfirm && newAdminPass !== newAdminPassConfirm ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowNewPassConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer transition">
                        {showNewPassConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {newAdminPassConfirm && newAdminPass !== newAdminPassConfirm && (
                      <p className="text-[10px] text-red-500 font-semibold">Passwords do not match.</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingCreds || !newAdminUser.trim() || newAdminPass.length < 4 || newAdminPass !== newAdminPassConfirm}
                    className={`w-full h-11 font-bold rounded-xl transition text-sm cursor-pointer shadow flex items-center justify-center gap-2 ${credSaved ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white'}`}
                  >
                    {isSavingCreds ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saving to Firebase…</>
                    ) : credSaved ? (
                      <><CheckCircle2 className="w-4 h-4" /> Saved! New credentials are live.</>
                    ) : (
                      <><Lock className="w-4 h-4" /> Save New Credentials to Firebase</>
                    )}
                  </button>
                  <p className="text-[10px] text-amber-600 font-semibold text-center">⚠️ After saving, you must use the new credentials to log in on every device.</p>
                </form>

                {/* ── Danger zone ─────────────────────────────────────────── */}
                <div className="bg-red-50 border border-red-200 rounded-3xl p-6 space-y-3">
                  <h4 className="font-extrabold text-red-700 text-xs uppercase tracking-wide flex items-center gap-1.5">
                    <span>⚠️</span> Danger Zone — Reset to Default
                  </h4>
                  <p className="text-red-500 text-[10.5px] leading-relaxed">Resets username and password to <span className="font-mono font-bold bg-red-100 px-1 rounded">admin / admin123</span>. Writes immediately to Firebase. You will be logged out instantly.</p>
                  <button
                    type="button"
                    onClick={handleResetAdminCredentials}
                    className="h-9 px-5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reset Credentials to Default
                  </button>
                </div>
              </div>
            )}

            {/* delivery zones tab */}
            {subTab === 'zones' && (
              <div className="space-y-6 text-slate-600">
                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4 text-xs font-semibold">
                  <h3 className="font-black text-slate-900 text-sm uppercase">Add Regional Shipping Zone & Custom Pricing</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Zone Place Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Dhaka Suburbs"
                        value={newZoneName}
                        onChange={(e) => setNewZoneName(e.target.value)}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-white text-xs text-left font-black"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Zone Specific Fee (USD)</label>
                      <input
                        type="number"
                        value={newZoneFee}
                        onChange={(e) => setNewZoneFee(parseFloat(e.target.value) || 0)}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 bg-white text-xs text-left"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newZoneName.trim()) {
                        toast.error('Shipping region name is required.');
                        return;
                      }
                      const item: DeliveryZone = {
                        id: 'zone-' + Date.now().toString(),
                        name: newZoneName.trim(),
                        keywords: '',
                        fee: newZoneFee,
                        minDays: 1,
                        maxDays: 3,
                        isActive: true
                      };
                      const updated = [...localZones, item];
                      setLocalZones(updated);
                      saveDeliveryZonesCtx(updated);
                      setNewZoneName('');
                      setNewZoneFee(5.00);
                    }}
                    className="h-9 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-xs transition cursor-pointer"
                  >
                    ADD AND PERSIST ZONE
                  </button>
                </div>

                <div className="space-y-3">
                  <h3 className="font-black text-slate-900 text-sm">Currently Active Custom Shipping Surcharges</h3>
                  {localZones.length === 0 ? (
                    <p className="text-slate-400 text-xs italic">No special regions configured. Flat delivery fee fallback utilized.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3.5">
                      {localZones.map((z) => (
                        <div key={z.id} className="flex items-center justify-between border border-slate-200 bg-white p-4 rounded-2xl shadow-xs text-xs">
                          <div>
                            <p className="font-extrabold text-slate-800 text-xs uppercase">{z.name}</p>
                            <p className="text-slate-400 text-[10px]">Active Fee: <span className="text-indigo-600 font-bold">${z.fee.toFixed(2)}</span></p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = localZones.filter((item) => item.id !== z.id);
                              setLocalZones(updated);
                              saveDeliveryZonesCtx(updated);
                            }}
                            className="p-1 px-2.5 hover:bg-rose-100 bg-rose-50 rounded text-rose-500 font-bold transition text-[10px] cursor-pointer"
                          >
                            X Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Edit/Create product popup modal */}
      <AnimatePresence>
        {showProductModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl border border-slate-100 relative text-left"
            >
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setEditingProduct(null);
                }}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900 pb-4 border-b border-slate-100">
                {editingProduct ? 'Edit Catalog Product' : 'Add product item'}
              </h3>

              <form onSubmit={handleProductSubmit} className="space-y-4 pt-4 text-xs font-semibold text-slate-600">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2">
                    <label>Product name *</label>
                    <input
                      type="text"
                      required
                      value={editingProduct ? editingProduct.name : newProduct.name}
                      onChange={(e) => {
                        if (editingProduct) setEditingProduct({ ...editingProduct, name: e.target.value });
                        else setNewProduct({ ...newProduct, name: e.target.value });
                      }}
                      className="w-full h-9 border border-slate-200 rounded px-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label>Short recipe description *</label>
                    <input
                      type="text"
                      required
                      value={editingProduct ? editingProduct.description : newProduct.description}
                      onChange={(e) => {
                        if (editingProduct) setEditingProduct({ ...editingProduct, description: e.target.value });
                        else setNewProduct({ ...newProduct, description: e.target.value });
                      }}
                      className="w-full h-9 border border-slate-200 rounded px-2.5 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Base Retail Price (USD) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingProduct ? editingProduct.price : newProduct.price}
                      onChange={(e) => {
                        if (editingProduct) setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) });
                        else setNewProduct({ ...newProduct, price: parseFloat(e.target.value) });
                      }}
                      className="w-full h-9 border border-slate-200 rounded px-2.5 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Sale Price (USD or blank)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={
                        editingProduct
                          ? editingProduct.salePrice || ''
                          : newProduct.salePrice || ''
                      }
                      onChange={(e) => {
                        const val = e.target.value ? parseFloat(e.target.value) : null;
                        if (editingProduct) setEditingProduct({ ...editingProduct, salePrice: val });
                        else setNewProduct({ ...newProduct, salePrice: val });
                      }}
                      className="w-full h-9 border border-slate-200 rounded px-2.5 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Active Stock units *</label>
                    <input
                      type="number"
                      required
                      value={editingProduct ? editingProduct.stock : newProduct.stock}
                      onChange={(e) => {
                        if (editingProduct) setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) });
                        else setNewProduct({ ...newProduct, stock: parseInt(e.target.value) });
                      }}
                      className="w-full h-9 border border-slate-200 rounded px-2.5 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="block text-xs font-bold text-slate-700">Product Image Upload or Emoji Link *</label>
                    <div className="flex gap-3 items-center mt-1">
                      {/* Thumbnail Preview Area */}
                      <div className="w-16 h-16 rounded-2xl border border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
                        {(() => {
                          const imgVal = editingProduct ? editingProduct.image : newProduct.image;
                          if (imgVal?.startsWith('data:') || imgVal?.startsWith('http')) {
                            return <img src={imgVal} className="w-12 h-12 object-contain" alt="Preview" />;
                          }
                          return <span className="text-3xl">{imgVal || '🍊'}</span>;
                        })()}
                      </div>
                      
                      {/* Interactive Drag & Choose card */}
                      <div className="flex-1 relative border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-4 transition-colors flex flex-col items-center justify-center bg-slate-50/50 cursor-pointer text-[10px] text-slate-500 font-normal">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => triggerImageFileRead(e, false)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <span className="font-bold text-slate-700 block">Click to upload product photo</span>
                        <span>Supports JPG, PNG, WEBP (Max 2MB)</span>
                      </div>
                    </div>
                    {/* Fallback Text Input */}
                    <div className="mt-2.5 font-normal">
                      <label className="text-[10px] text-slate-400">Or type manual emoji / external web URL:</label>
                      <input
                        type="text"
                        value={editingProduct ? editingProduct.image : newProduct.image}
                        onChange={(e) => {
                          if (editingProduct) setEditingProduct({ ...editingProduct, image: e.target.value });
                          else setNewProduct({ ...newProduct, image: e.target.value });
                        }}
                        className="w-full h-9 border border-slate-200 rounded px-2.5 focus:outline-none mt-1 text-xs"
                        placeholder="e.g. 🍒 or https://images.unsplash.com/..."
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label>Parent Category *</label>
                    <select
                      value={editingProduct ? editingProduct.category : newProduct.category}
                      onChange={(e) => {
                        if (editingProduct) setEditingProduct({ ...editingProduct, category: e.target.value });
                        else setNewProduct({ ...newProduct, category: e.target.value });
                      }}
                      className="w-full h-9 border border-slate-200 bg-white rounded px-2.5"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition mt-4 flex items-center justify-center cursor-pointer shadow"
                >
                  SAVE PRODUCT TO DATABASE
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit/Create category popup modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl border border-slate-100 relative text-left"
            >
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                }}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900 pb-4 border-b border-slate-100">
                {editingCategory ? 'Edit Category Node' : 'Add Category'}
              </h3>

              <form onSubmit={handleCategorySubmit} className="space-y-4 pt-4 text-xs font-semibold text-slate-600">
                <div className="space-y-1">
                  <label>Category name *</label>
                  <input
                    type="text"
                    required
                    value={editingCategory ? editingCategory.name : newCategory.name}
                    onChange={(e) => {
                      if (editingCategory) setEditingCategory({ ...editingCategory, name: e.target.value });
                      else setNewCategory({ ...newCategory, name: e.target.value });
                    }}
                    className="w-full h-10 border border-slate-200 rounded px-2.5 focus:outline-none"
                    placeholder="e.g. ORGANIC MIX"
                  />
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Category Cover or Emoji *</label>
                    <div className="flex gap-2.5 items-center mt-1">
                      <div className="w-12 h-12 rounded-xl border border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
                        {(() => {
                          const imgVal = editingCategory ? editingCategory.emoji : newCategory.emoji;
                          if (imgVal?.startsWith('data:') || imgVal?.startsWith('http')) {
                            return <img src={imgVal} className="w-8 h-8 object-contain" alt="Preview" />;
                          }
                          return <span className="text-xl">{imgVal || '🍉'}</span>;
                        })()}
                      </div>
                      <div className="flex-1 relative border border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-2.5 transition-colors flex flex-col items-center justify-center bg-slate-50/50 cursor-pointer text-[9px] text-slate-500 font-normal">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => triggerImageFileRead(e, true)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <span className="font-bold text-slate-700 block">Click to upload icon</span>
                        <span>JPG, PNG (Max 2MB)</span>
                      </div>
                    </div>
                    <div className="mt-2 font-normal">
                      <label className="text-[10px] text-slate-400">Or type manual emoji / web URL:</label>
                      <input
                        type="text"
                        value={editingCategory ? editingCategory.emoji : newCategory.emoji}
                        onChange={(e) => {
                          if (editingCategory) setEditingCategory({ ...editingCategory, emoji: e.target.value });
                          else setNewCategory({ ...newCategory, emoji: e.target.value });
                        }}
                        className="w-full h-8 border border-slate-200 rounded px-2 focus:outline-none mt-1 text-[11px]"
                        placeholder="e.g. 🥤 or URL"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1 pb-1">
                    <label>URL Slug Reference *</label>
                    <input
                      type="text"
                      required
                      value={editingCategory ? editingCategory.slug : newCategory.slug}
                      onChange={(e) => {
                        if (editingCategory) setEditingCategory({ ...editingCategory, slug: e.target.value.toLowerCase() });
                        else setNewCategory({ ...newCategory, slug: e.target.value.toLowerCase() });
                      }}
                      className="w-full h-9 border border-slate-200 rounded px-2.5 focus:outline-none mt-1 text-xs"
                      placeholder="e.g. organic-mix"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition mt-4 flex items-center justify-center cursor-pointer shadow"
                >
                  SAVE CATEGORY NODE
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create coupon popup modal */}
      <AnimatePresence>
        {showCouponModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl border border-slate-100 relative text-left"
            >
              <button
                onClick={() => setShowCouponModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900 pb-4 border-b border-slate-100">
                Add discount promo code
              </h3>

              <form onSubmit={handleCouponSubmit} className="space-y-4 pt-4 text-xs font-semibold text-slate-600">
                <div className="space-y-1">
                  <label>Coupon Code *</label>
                  <input
                    type="text"
                    required
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                    className="w-full h-10 border border-slate-200 rounded px-2.5 focus:outline-none uppercase"
                    placeholder="e.g. SUMMER50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label>Discount percentage *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="100"
                      value={newCoupon.discountPercentage}
                      onChange={(e) => setNewCoupon({ ...newCoupon, discountPercentage: parseInt(e.target.value) })}
                      className="w-full h-9 border border-slate-200 rounded px-2.5 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Limit total usages *</label>
                    <input
                      type="number"
                      required
                      value={newCoupon.usageLimit}
                      onChange={(e) => setNewCoupon({ ...newCoupon, usageLimit: parseInt(e.target.value) })}
                      className="w-full h-9 border border-slate-200 rounded px-2.5 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label>Expiry limit date *</label>
                    <input
                      type="date"
                      required
                      value={newCoupon.expiryDate}
                      onChange={(e) => setNewCoupon({ ...newCoupon, expiryDate: e.target.value })}
                      className="w-full h-9 border border-slate-200 rounded px-2.5 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition mt-4 flex items-center justify-center cursor-pointer shadow"
                >
                  SAVE VOUCHER CODE
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Custom Confirm Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {confirmModal.open && (
          <motion.div
            key="confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            onClick={closeConfirm}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              {/* Icon + Title */}
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${confirmModal.danger ? 'bg-red-50' : 'bg-amber-50'}`}>
                  <Trash2 className={`w-5 h-5 ${confirmModal.danger ? 'text-red-500' : 'text-amber-500'}`} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm leading-tight">{confirmModal.title}</h3>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">{confirmModal.message}</p>
                </div>
              </div>
              {/* Actions */}
              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={closeConfirm}
                  className="flex-1 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    closeConfirm();
                  }}
                  className={`flex-1 h-9 font-bold rounded-xl text-xs text-white transition cursor-pointer ${confirmModal.danger ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-500 hover:bg-amber-400'}`}
                >
                  {confirmModal.confirmLabel || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Custom Review Modal */}
      <AnimatePresence>
        {showAddReviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-6 border-b pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Add Custom Review</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">This review will be saved to Firebase and shown on the storefront.</p>
                </div>
                <button onClick={() => setShowAddReviewModal(false)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4 text-xs font-semibold text-slate-600">
                <div className="space-y-1">
                  <label>Reviewer Name *</label>
                  <input
                    type="text"
                    value={newReview.reviewerName || ''}
                    onChange={(e) => setNewReview({ ...newReview, reviewerName: e.target.value })}
                    className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-slate-50 focus:bg-white focus:outline-none"
                    placeholder="e.g. Sarah M."
                  />
                </div>
                <div className="space-y-1">
                  <label>Product *</label>
                  <select
                    value={newReview.productId || ''}
                    onChange={(e) => {
                      const p = products.find(p => p.id === e.target.value);
                      setNewReview({ ...newReview, productId: e.target.value, productName: p?.name || '' });
                    }}
                    className="w-full h-9 border border-slate-200 rounded-lg px-3 bg-slate-50 focus:bg-white focus:outline-none"
                  >
                    <option value="">Select a product…</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label>Star Rating (1–5) *</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReview({ ...newReview, rating: star })}
                        className={`w-9 h-9 rounded-lg font-bold text-base transition ${newReview.rating === star ? 'bg-amber-400 text-white shadow' : 'bg-slate-100 text-slate-400 hover:bg-amber-100'}`}
                      >
                        {star}★
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label>Review Comment *</label>
                  <textarea
                    rows={3}
                    value={newReview.comment || ''}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none resize-none"
                    placeholder="Write the review comment here…"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="reviewApproved"
                    checked={!!newReview.isApproved}
                    onChange={(e) => setNewReview({ ...newReview, isApproved: e.target.checked })}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <label htmlFor="reviewApproved" className="cursor-pointer text-slate-700">Auto-approve (show immediately on storefront)</label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddReviewModal(false)}
                    className="flex-1 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newReview.reviewerName?.trim() || !newReview.productId || !newReview.comment?.trim()) {
                        toast.error('Please fill in reviewer name, product, and comment.');
                        return;
                      }
                      const review: Review = {
                        id: `rev_${Date.now()}`,
                        productId: newReview.productId!,
                        productName: newReview.productName || '',
                        reviewerName: newReview.reviewerName!.trim(),
                        rating: newReview.rating || 5,
                        comment: newReview.comment!.trim(),
                        createdAt: new Date().toISOString(),
                        isApproved: !!newReview.isApproved
                      };
                      await addReview(review);
                      setShowAddReviewModal(false);
                      setNewReview({ reviewerName: '', productId: '', productName: '', rating: 5, comment: '', isApproved: true });
                    }}
                    className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition"
                  >
                    Save Review to Firebase
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function ShieldCheckIcon(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
