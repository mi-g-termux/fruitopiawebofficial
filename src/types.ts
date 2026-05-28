/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SiteSettings {
  websiteName: string;
  siteTitle: string;
  logoUrl?: string;           // base64 or URL
  logoEmoji?: string;         // fallback emoji
  loadingEmoji?: string;      // loading screen emoji (editable from admin)
  loadingName?: string;       // loading screen brand name (editable from admin)
  faviconUrl?: string;        // favicon url or base64
  heroBadge: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroSubtitle: string;
  heroButtonText: string;
  heroTimeBadge: string;
  footerText: string;
  footerLinks: { label: string; url: string }[];
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  socialFacebook?: string;
  socialInstagram?: string;
  socialTwitter?: string;
  promoBannerEnabled: boolean;
  promoBannerText: string;
  themePrimaryColor: string;  // Hex color (e.g. #10B981)
  themeBgColor: string;       // Hex or class
  themeHeaderFont: string;    // Select list
  trademarkText: string;
  currency?: string;          // ISO code e.g. 'USD', 'BDT', 'EUR'
  currencySymbol?: string;    // Display symbol e.g. '$', '৳', '€'
  currencyPosition?: 'before' | 'after';
  currencyExchangeRate?: number; // Multiply base price by this to display in selected currency
  orderTrackerEnabled?: boolean;
  orderTrackerInNavbar?: boolean;

  // SMTP Settings
  smtpEnabled?: boolean;
  smtpHost?: string;
  smtpPort?: string;
  smtpEmail?: string;
  smtpSecret?: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpSenderDisplayName?: string;  // "From Name" displayed to recipient
  smtpSenderEmail?: string;        // "From Email" (if different from smtpUser)
  emailOtpResetEnabled?: boolean;
  emailOtpExpiryMinutes?: number;

  // Editable email templates per event
  emailOtpSubject?: string;          // Subject for password reset OTP
  emailOtpBodyTemplate?: string;     // Body template for password reset OTP
  emailSignupSubject?: string;       // Subject for signup verification
  emailSignupBodyTemplate?: string;  // Body template for signup verification
  emailSignupVerifyEnabled?: boolean; // Whether to require email verify on signup

  // SMS Twilio & Whatsapp Settings
  twilioEnabled?: boolean;
  twilioSid?: string;
  twilioToken?: string;
  twilioFromNumber?: string;
  smsOtpEnabled?: boolean;
  smsOtpExpiryMinutes?: number;
  smsOtpTemplate?: string;
  whatsappEnabled?: boolean;
  whatsappPhoneId?: string;
  whatsappToken?: string;
  whatsappTemplateName?: string;

  // Live Chat Widget Tawk.to
  tawkChatEnabled?: boolean;
  tawkPropertyId?: string;

  // Google Sign-In & Admins Reset options
  googleSignInEnabled?: boolean;
  googleClientId?: string;
  adminUsername?: string;
  adminPasswordHash?: string;

  // Front-end icon parameters
  newsletterSectionIconUrl?: string;
  testimonialsSectionIconUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  salePrice: number | null;
  stock: number;
  image: string;              // base64 data URL or emoji string or standard URL
  category: string;           // Category ID or slug
  ingredients?: string[];
  rating: number;
  reviewsCount: number;
  isFeatured: boolean;
  isActive: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode?: string;
  deliveryNote?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  couponApplied: string | null;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: 'Pending' | 'Paid' | 'Failed';
  orderStatus: 'Pending' | 'Processing' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Refunded';
  createdAt: string;
  transactionId?: string;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  slug: string;
  isVisible: boolean;
  isNavbarFeatured?: boolean;
  imageUrl?: string;          // base64 image overrides emoji
}

export interface PaymentSettings {
  codEnabled: boolean;
  codDisplayName?: string;
  codLogoUrl?: string;
  codSubtext?: string;
  codColor?: string;

  bkashManualEnabled: boolean;
  bkashManualDisplayName?: string;
  bkashManualLogoUrl?: string;
  bkashManualNumber?: string;
  bkashManualQrUrl?: string;
  bkashManualInstructions?: string;
  bkashManualColor?: string;
  bkashManualSubtext?: string;

  nagadManualEnabled: boolean;
  nagadManualDisplayName?: string;
  nagadManualLogoUrl?: string;
  nagadManualNumber?: string;
  nagadManualQrUrl?: string;
  nagadManualInstructions?: string;
  nagadManualColor?: string;
  nagadManualSubtext?: string;

  rocketManualEnabled: boolean;
  rocketManualDisplayName?: string;
  rocketManualLogoUrl?: string;
  rocketManualNumber?: string;
  rocketManualQrUrl?: string;
  rocketManualInstructions?: string;
  rocketManualColor?: string;
  rocketManualSubtext?: string;

  bankEnabled: boolean;
  bankDisplayName?: string;
  bankLogoUrl?: string;
  bankDetails?: string; // instructions
  bankColor?: string;
  bankSubtext?: string;

  cardManualEnabled: boolean;
  cardManualDisplayName?: string;
  cardManualLogoUrl?: string;
  cardManualInstructions?: string;
  cardManualColor?: string;
  cardManualSubtext?: string;

  stripeEnabled: boolean;
  stripeDisplayName?: string;
  stripeLogoUrl?: string;
  stripePublicKey?: string;
  stripeSecretKey?: string;
  stripeColor?: string;
  stripeSubtext?: string;

  paypalEnabled: boolean;
  paypalDisplayName?: string;
  paypalLogoUrl?: string;
  paypalClientId?: string;
  paypalColor?: string;
  paypalSubtext?: string;

  shippingFee: number;
  taxPercentage: number;

  // Swatch colors
  colorCod?: string;
  colorBkashManual?: string;
  colorNagadManual?: string;
  colorRocketManual?: string;
  colorBank?: string;
  colorCreditManual?: string;
  colorPaypal?: string;
  colorStripe?: string;
  colorBkashAuto?: string;
  colorNagadAuto?: string;

  // Individual gateway branding options
  bkashAutoDisplayName?: string;
  bkashAutoLogoUrl?: string;
  nagadAutoDisplayName?: string;
  nagadAutoLogoUrl?: string;

  // Manual additional parameters
  bankAccountNo?: string;
  bankAccountHolder?: string;
  bankLogoEmoji?: string;
  bankQrUrl?: string;
  cardManualRefNo?: string;
  cardManualLogoEmoji?: string;
  cardManualImgUrl?: string;

  // New Automatic gateways fields
  paypalSandbox?: boolean;
  stripeSandbox?: boolean;

  sslcommerzEnabled?: boolean;
  sslcommerzSandbox?: boolean;
  sslcommerzStoreId?: string;
  sslcommerzStorePassword?: string;
  sslcommerzDisplayName?: string;
  sslcommerzLogoUrl?: string;
  sslcommerzColor?: string;
  sslcommerzSubtext?: string;

  razorpayEnabled?: boolean;
  razorpaySandbox?: boolean;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;

  bkashAutoEnabled?: boolean;
  bkashAutoSandbox?: boolean;
  bkashAutoAppKey?: string;
  bkashAutoAppSecret?: string;
  bkashAutoUsername?: string;
  bkashAutoPassword?: string;

  nagadAutoEnabled?: boolean;
  nagadAutoSandbox?: boolean;
  nagadAutoMerchantId?: string;
  nagadAutoPrivateKey?: string;
  nagadAutoPublicKey?: string;

  aamarpayEnabled?: boolean;
  aamarpayDisplayName?: string;
  aamarpayLogoUrl?: string;
  aamarpaySandbox?: boolean;
  aamarpayStoreId?: string;
  aamarpaySignatureKey?: string;
  aamarpayColor?: string;
  aamarpaySubtext?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercentage: number;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  message?: string;
  subscribedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  isApproved: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  passwordHash?: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  keywords: string; // Comma-separated region keywords
  fee: number;
  minDays: number;
  maxDays: number;
  isActive: boolean;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
