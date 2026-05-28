/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SiteSettings, Product, Category, Coupon, PaymentSettings, Review, DeliveryZone, Order } from './types';

// Simple deterministic hash for password checking
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return 'qf_hash_' + Math.abs(hash).toString(16);
}

// Global default seed data
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  websiteName: 'Fruitopia',
  siteTitle: 'Fruitopia — Fresh Organic Smoothies & Juices',
  logoUrl: '',
  logoEmoji: '',
  loadingEmoji: '🍉',
  loadingName: 'Fruitopia Organic',
  faviconUrl: '',
  heroBadge: 'Deliciously Fresh Menu!',
  heroTitleLine1: 'Treat yourself',
  heroTitleLine2: 'with something fresh & tasty!',
  heroSubtitle: 'Handcrafted with premium organic ingredients, serving smiles with every vibrant drop.',
  heroButtonText: 'SEE MENU & ORDER',
  heroTimeBadge: 'open from 8 am - 10 pm',
  footerText: 'Fruitopia: serving dynamic organic fuel to nourish your daily vibrant self.',
  footerLinks: [
    { label: 'HOME', url: '#' },
    { label: 'MENU', url: '#menu' },
    { label: 'REVIEWS', url: '#reviews' },
    { label: 'NEWSLETTER', url: '#newsletter' }
  ],
  contactPhone: '+880 1711-223344',
  contactEmail: 'hello@fruitopia.com',
  contactAddress: '42 Orchard Lane, Gulshan, Dhaka, Bangladesh',
  socialFacebook: 'https://facebook.com/fruitopia',
  socialInstagram: 'https://instagram.com/fruitopia',
  socialTwitter: 'https://twitter.com/fruitopia',
  promoBannerEnabled: true,
  promoBannerText: '🎉 SPECIAL LAUNCH PROMO: APPLY CODE FRUITY20 TO GET 20% OFF ALL ORDERS!',
  themePrimaryColor: '#00b4d8', // primary brand teal/blue matching the image
  themeBgColor: '#f8f9fa',
  themeHeaderFont: 'Space Grotesk',
  trademarkText: '© 2026 QUIRKY-FRUITY LTD. ALL RIGHTS RESERVED.',
  currency: 'USD',
  currencySymbol: '$',
  currencyPosition: 'before',
  orderTrackerEnabled: true,
  orderTrackerInNavbar: true,

  // Seed default SMTP & resets
  smtpEnabled: false,
  smtpHost: 'smtp.gmail.com',
  smtpPort: '587',
  smtpEmail: 'notifications@fruitopia.com',
  smtpSecret: 'some_google_app_password',
  smtpSenderDisplayName: 'Fruitopia Support',
  emailOtpResetEnabled: true,
  emailOtpExpiryMinutes: 10,
  emailOtpSubject: 'Your OTP Code - Fruitopia',

  // Seed default Twilio & WhatsApp
  twilioEnabled: false,
  twilioSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  twilioToken: 'abcdefxxxxxxxxxxxxxxxxxxxxxxxxxx',
  twilioFromNumber: '+15017122661',
  smsOtpEnabled: true,
  smsOtpExpiryMinutes: 10,
  smsOtpTemplate: '{{code}} is your Fruitopia verification code. Valid for {{expiry}} min.',
  whatsappEnabled: false,
  whatsappPhoneId: '109xxxxxxxxxxxx',
  whatsappToken: 'EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  whatsappTemplateName: 'order_status_update',

  // Tawk.to
  tawkChatEnabled: false,
  tawkPropertyId: '642xxxx/1gxxxxx',

  // Admin and Google Sign-in config options
  googleSignInEnabled: false,
  googleClientId: 'google_oauth_client_id_placeholder',
  adminUsername: 'admin',
  adminPasswordHash: 'qf_hash_4f3bf32c',

  newsletterSectionIconUrl: '',
  testimonialsSectionIconUrl: ''
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-smoothies', name: 'SMOUTHIES', emoji: '🥤', slug: 'smoothies', isVisible: true, isNavbarFeatured: true },
  { id: 'cat-juices', name: 'FRESH JUICE', emoji: '🍹', slug: 'fresh-juice', isVisible: true, isNavbarFeatured: true },
  { id: 'cat-berries', name: 'BERRIES', emoji: '🫐', slug: 'berries', isVisible: true, isNavbarFeatured: false },
  { id: 'cat-snacks', name: 'SNACKS', emoji: '🥗', slug: 'snacks', isVisible: true, isNavbarFeatured: false }
];

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-01',
    name: 'Papaya Smoothie',
    description: 'Creamy master blend of fresh ripe papayas, soy milk, and raw organic honey containing vitalizing fibers.',
    price: 2.30,
    salePrice: null,
    stock: 25,
    image: '🥭',
    category: 'smoothies',
    ingredients: ['Fresh Papaya', 'Raw Honey', 'Soy Milk', 'Chia Seeds'],
    rating: 4.8,
    reviewsCount: 12,
    isFeatured: true,
    isActive: true
  },
  {
    id: 'prod-02',
    name: 'Apple Smoothie',
    description: 'Crisp red apples blended with low-fat organic greek yogurt, fresh oats, and a dash of sweet cinnamon spice.',
    price: 2.30,
    salePrice: null,
    stock: 8,
    image: '🍎',
    category: 'smoothies',
    ingredients: ['Red Apple', 'Oats', 'Greek Yogurt', 'Cinnamon'],
    rating: 4.5,
    reviewsCount: 6,
    isFeatured: true,
    isActive: true
  },
  {
    id: 'prod-03',
    name: 'Pineapple Smoothie',
    description: 'Tropical getaway in a glass. Blended pineapple, organic coconut milk, cream, and frozen bananas.',
    price: 2.30,
    salePrice: 1.99,
    stock: 14,
    image: '🍍',
    category: 'smoothies',
    ingredients: ['Pineapple', 'Coconut Milk', 'Banana'],
    rating: 4.9,
    reviewsCount: 22,
    isFeatured: true,
    isActive: true
  },
  {
    id: 'prod-04',
    name: 'Cherry Smoothie',
    description: 'Indulge in rich sweet cherries blended with nutritious chia seeds, raw almond butter, and clean almond milk.',
    price: 2.30,
    salePrice: null,
    stock: 19,
    image: '🍒',
    category: 'smoothies',
    ingredients: ['Cherries', 'Almond Milk', 'Chia Seeds', 'Almond Butter'],
    rating: 4.7,
    reviewsCount: 15,
    isFeatured: true,
    isActive: true
  },
  {
    id: 'prod-05',
    name: 'Avocado Shake',
    description: 'Ultra-healthy buttery Hass avocado whipped with full-cream dairy or oats cream and organic maple syrup.',
    price: 3.50,
    salePrice: null,
    stock: 12,
    image: '🥑',
    category: 'smoothies',
    ingredients: ['Hass Avocado', 'Oat Cream', 'Maple Syrup'],
    rating: 4.9,
    reviewsCount: 18,
    isFeatured: true,
    isActive: true
  },
  {
    id: 'prod-06',
    name: 'Tropical Orange Juice',
    description: 'Freshly cold-pressed sweet Navel oranges loaded with powerful dynamic Vitamin C defense.',
    price: 1.80,
    salePrice: 1.50,
    stock: 30,
    image: '🍊',
    category: 'fresh-juice',
    ingredients: ['100% Navel Oranges'],
    rating: 4.6,
    reviewsCount: 10,
    isFeatured: false,
    isActive: true
  },
  {
    id: 'prod-07',
    name: 'Fresh Watermelon Splash',
    description: 'Pure cooling hydration cold-pressed from delicious sweet watermelons and a hint of fresh garden mint.',
    price: 1.80,
    salePrice: null,
    stock: 22,
    image: '🍉',
    category: 'fresh-juice',
    ingredients: ['Watermelon', 'Fresh Mint Leaves'],
    rating: 4.8,
    reviewsCount: 28,
    isFeatured: true,
    isActive: true
  }
];

export const DEFAULT_COUPONS: Coupon[] = [
  { id: 'c-1', code: 'FRUITY20', discountPercentage: 20, expiryDate: '2028-12-31', usageLimit: 100, usedCount: 5 },
  { id: 'c-2', code: 'HEALTHY10', discountPercentage: 10, expiryDate: '2028-12-31', usageLimit: 500, usedCount: 12 },
  { id: 'c-3', code: 'FRESH50', discountPercentage: 50, expiryDate: '2028-06-01', usageLimit: 10, usedCount: 2 }
];

export const DEFAULT_REVIEWS: Review[] = [
  {
    id: 'rev-01',
    productId: 'prod-01',
    productName: 'Papaya Smoothie',
    reviewerName: 'CHRISTIAN AMON',
    rating: 5,
    comment: 'Hands down the best smoothies in town! The textures are unbelievably rich and the delivery is always super fast. Truly fresh and tasty! 🌟🌟🌟🌟🌟',
    createdAt: '2026-05-20T10:00:00Z',
    isApproved: true
  },
  {
    id: 'rev-02',
    productId: 'prod-03',
    productName: 'Pineapple Smoothie',
    reviewerName: 'SAMANTHA RAY',
    rating: 5,
    comment: 'The Pineapple Smoothie has a perfect balance of tropical sweetness and citrus punch. Highly recommend this store!',
    createdAt: '2026-05-21T14:30:00Z',
    isApproved: true
  },
  {
    id: 'rev-03',
    productId: 'prod-02',
    productName: 'Apple Smoothie',
    reviewerName: 'DAVID K.',
    rating: 4,
    comment: 'Organic, purely fresh, high quality. No artificial sweeteners. Will order again.',
    createdAt: '2026-05-22T08:15:00Z',
    isApproved: true
  }
];

export const DEFAULT_DELIVERY_ZONES: DeliveryZone[] = [
  { id: 'dz-1', name: 'Dhaka City Core (Express)', keywords: 'Gulshan, Banani, Baridhara, Dhanmondi', fee: 2.00, minDays: 0, maxDays: 1, isActive: true },
  { id: 'dz-2', name: 'Dhaka Outer Suburbs', keywords: 'Uttara, Mirpur, Savar, Gazipur', fee: 5.00, minDays: 1, maxDays: 2, isActive: true },
  { id: 'dz-3', name: 'National Nationwide delivery', keywords: 'Chittagong, Sylhet, Rajshahi, Khulna, Barisal, Rangpur', fee: 10.00, minDays: 2, maxDays: 4, isActive: true }
];

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  codEnabled: true,
  codDisplayName: 'Cash On Delivery',
  codSubtext: 'Pay with cash at your doorstep',
  codColor: '#10b981',

  bkashManualEnabled: true,
  bkashManualDisplayName: 'bKash Wallet',
  bkashManualNumber: '01711000222',
  bkashManualQrUrl: 'https://images.unsplash.com/photo-1595079676339-1534801ad6cf?w=200&q=80', // placeholder qr
  bkashManualInstructions: 'Pay to our Merchant bKash wallet and submit the Transaction ID below.',
  bkashManualColor: '#e11d48',
  bkashManualSubtext: 'bKash mobile wallet',

  nagadManualEnabled: true,
  nagadManualDisplayName: 'Nagad Wallet',
  nagadManualNumber: '01911333444',
  nagadManualQrUrl: '',
  nagadManualInstructions: 'Send Money to our personal Nagad number and input Transaction ID.',
  nagadManualColor: '#ea580c',
  nagadManualSubtext: 'Nagad mobile wallet',

  rocketManualEnabled: false,
  rocketManualDisplayName: 'Rocket Wallet',
  rocketManualNumber: '01511555666_7',
  rocketManualQrUrl: '',
  rocketManualInstructions: 'Send Money to our agent Rocket dial *322# and input Txn Ref.',
  rocketManualColor: '#9333ea',
  rocketManualSubtext: 'Rocket mobile wallet',

  bankEnabled: true,
  bankDisplayName: 'Bank Transfer',
  bankDetails: 'Bank: Dhaka Bank Ltd | Account: 102.345.6789.01 | Title: Fruitopia Solutions Ltd',
  bankAccountNo: '102.345.6789.01',
  bankAccountHolder: 'Fruitopia Solutions Ltd',
  bankLogoEmoji: '🏦',
  bankQrUrl: '',
  bankColor: '#2563eb',
  bankSubtext: 'Direct bank details',

  cardManualEnabled: true,
  cardManualDisplayName: 'Manual Credit Card',
  cardManualInstructions: 'Submit details of bank memo transfer receipt photo or reference number.',
  cardManualRefNo: 'QF-CARD-REF-99',
  cardManualLogoEmoji: '💳',
  cardManualImgUrl: '',
  cardManualColor: '#374151',
  cardManualSubtext: 'Offline credit reference',

  stripeEnabled: true,
  stripeDisplayName: 'Stripe Pay',
  stripePublicKey: 'pk_test_51Oxxxxxxxxxxxxxxxxx',
  stripeSecretKey: 'sk_test_51Oxxxxxxxxxxxxxxxxx',
  stripeSandbox: true,
  stripeColor: '#6366f1',
  stripeSubtext: 'Secure sandbox credit card payment',

  paypalEnabled: false,
  paypalDisplayName: 'PayPal Express',
  paypalClientId: 'sb-paypal-client-id-sample',
  paypalSandbox: true,
  paypalColor: '#1d4ed8',
  paypalSubtext: 'Dynamic sandbox payment gate',

  shippingFee: 5.00,
  taxPercentage: 0.05,

  // Swatch custom colors matching the UI buttons
  colorCod: '#10b981',
  colorBkashManual: '#e11d48',
  colorNagadManual: '#ea580c',
  colorRocketManual: '#9333ea',
  colorBank: '#2563eb',
  colorCreditManual: '#374151',
  colorPaypal: '#1d4ed8',
  colorStripe: '#6366f1',
  colorBkashAuto: '#e11d48',
  colorNagadAuto: '#ea580c',

  // Custom visual labels & logo URLs
  bkashAutoDisplayName: 'bKash Instant (Auto)',
  bkashAutoLogoUrl: '',
  nagadAutoDisplayName: 'Nagad Instant (Auto)',
  nagadAutoLogoUrl: '',

  paypalLogoUrl: '',
  stripeLogoUrl: '',
  codLogoUrl: '',
  bkashManualLogoUrl: '',
  nagadManualLogoUrl: '',
  rocketManualLogoUrl: '',
  bankLogoUrl: '',
  cardManualLogoUrl: '',

  // SSLCommerz
  sslcommerzEnabled: false,
  sslcommerzSandbox: true,
  sslcommerzStoreId: 'fruitopialive001',
  sslcommerzStorePassword: 'xxxxxxxxxxxxx',

  // Razorpay
  razorpayEnabled: false,
  razorpaySandbox: true,
  razorpayKeyId: 'rzp_test_xxxxxxxxxx',
  razorpayKeySecret: 'xxxxxxxxxxxxxxxxxxx',

  // bKash Auto
  bkashAutoEnabled: false,
  bkashAutoSandbox: true,
  bkashAutoAppKey: 'bk_app_key_xxxxxxxx',
  bkashAutoAppSecret: 'bk_app_secret_xxxxxxxx',
  bkashAutoUsername: 'bk_user_xxxxx',
  bkashAutoPassword: 'xxxxxxxxxxxxx',

  // Nagad Auto
  nagadAutoEnabled: false,
  nagadAutoSandbox: true,
  nagadAutoMerchantId: 'ng_mch_xxxxxxxxx',
  nagadAutoPrivateKey: 'ng_priv_xxxxxxxxxx',
  nagadAutoPublicKey: 'ng_pub_xxxxxxxxxxxx'
};

// Seed utility to run on database initialize/installation
export function seedLocalStorage() {
  localStorage.setItem('fruitopia_installed', 'true');
  if (!localStorage.getItem('qf_site_settings')) {
    localStorage.setItem('qf_site_settings', JSON.stringify(DEFAULT_SITE_SETTINGS));
  }
  if (!localStorage.getItem('qf_categories')) {
    localStorage.setItem('qf_categories', JSON.stringify(DEFAULT_CATEGORIES));
  }
  if (!localStorage.getItem('qf_products')) {
    localStorage.setItem('qf_products', JSON.stringify(DEFAULT_PRODUCTS));
  }
  if (!localStorage.getItem('qf_coupons')) {
    localStorage.setItem('qf_coupons', JSON.stringify(DEFAULT_COUPONS));
  }
  if (!localStorage.getItem('qf_reviews')) {
    localStorage.setItem('qf_reviews', JSON.stringify(DEFAULT_REVIEWS));
  }
  if (!localStorage.getItem('qf_delivery_zones')) {
    localStorage.setItem('qf_delivery_zones', JSON.stringify(DEFAULT_DELIVERY_ZONES));
  }
  if (!localStorage.getItem('qf_payment_settings')) {
    localStorage.setItem('qf_payment_settings', JSON.stringify(DEFAULT_PAYMENT_SETTINGS));
  }
  if (!localStorage.getItem('qf_subscribers')) {
    localStorage.setItem('qf_subscribers', JSON.stringify([]));
  }
  if (!localStorage.getItem('qf_orders')) {
    localStorage.setItem('qf_orders', JSON.stringify([]));
  }
  const defaultAdmin = { username: 'admin', passwordHash: simpleHash('admin123') };
  if (!localStorage.getItem('qf_admin_credentials')) {
    localStorage.setItem('qf_admin_credentials', JSON.stringify(defaultAdmin));
  }
}
