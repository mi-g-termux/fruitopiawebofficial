/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Order, OrderItem } from '../types';
import {
  BKashLogo,
  NagadLogo,
  RocketLogo,
  StripeLogo,
  PayPalLogo,
  BankLogo,
  CodLogo,
  CardManualLogo
} from './PaymentLogos';
import { 
  X, 
  Trash2, 
  Tag, 
  Percent, 
  ArrowRight, 
  Loader2, 
  Sparkles, 
  CheckCircle2, 
  QrCode, 
  Ticket,
  Check,
  CreditCard,
  Wallet,
  Coins,
  Building2,
  Lock,
  Smartphone,
  ShieldCheck,
  CheckCircle,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateInvoiceHTML } from '../emailService';

interface CartModalProps {
  onClose: () => void;
}

export default function CartModal({ onClose }: CartModalProps) {
  const {
    cart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    paymentSettings,
    coupons,
    siteSettings,
    deliveryZones,
    placeOrder,
    formatPrice,
    currentUser,
    toast
  } = useApp();

  // Checkout inputs
  const [custName, setCustName] = useState(currentUser?.name || '');
  const [custEmail, setCustEmail] = useState(currentUser?.email || '');
  const [custPhone, setCustPhone] = useState(currentUser?.phone || '');
  const [custAddress, setCustAddress] = useState(currentUser?.address || '');
  const [custCity, setCustCity] = useState(currentUser?.city || 'Dhaka');
  const [custPostalCode, setCustPostalCode] = useState('');
  const [custNote, setCustNote] = useState('');

  // Selected Payment Method state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cod');

  // Voucher state
  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState<typeof coupons[0] | null>(null);

  // Active step handles
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [placedOrderInfo, setPlacedOrderInfo] = useState<Order | null>(null);

  // Simulated gateway portal overlays state
  const [bkashAutoPortal, setBkashAutoPortal] = useState(false);
  const [bkashPhoneInput, setBkashPhoneInput] = useState('');
  const [bkashOtpInput, setBkashOtpInput] = useState('');
  const [bkashPinInput, setBkashPinInput] = useState('');
  const [bkashStep, setBkashStep] = useState<1 | 2 | 3 | 4>(1); // 1: Phone, 2: OTP, 3: PIN, 4: Handshake/Done

  const [nagadAutoPortal, setNagadAutoPortal] = useState(false);
  const [nagadPhoneInput, setNagadPhoneInput] = useState('');
  const [nagadOtpInput, setNagadOtpInput] = useState('');
  const [nagadPinInput, setNagadPinInput] = useState('');
  const [nagadStep, setNagadStep] = useState<1 | 2 | 3 | 4>(1); // 1: Phone, 2: OTP, 3: PIN, 4: Handshake/Done

  // Calculate delivery fee dynamically matching DeliveryZones
  const getDeliveryDetails = () => {
    let fee = paymentSettings?.shippingFee !== undefined ? paymentSettings.shippingFee : 5.00;
    let desc = 'Rest of Country zone';
    let days = '2-4 days';

    const matchedZone = deliveryZones.find((zone) => {
      if (!zone.isActive) return false;
      const keywordsArray = zone.keywords.split(',').map((k) => k.trim().toLowerCase());
      return (
        custCity.toLowerCase().includes(zone.name.toLowerCase()) ||
        keywordsArray.some((keyword) => custAddress.toLowerCase().includes(keyword) || custCity.toLowerCase().includes(keyword))
      );
    });

    if (matchedZone) {
      fee = matchedZone.fee;
      desc = matchedZone.name;
      days = `${matchedZone.minDays}-${matchedZone.maxDays} days`;
    }

    return { fee, desc, days };
  };

  const delivery = getDeliveryDetails();

  // Pricing calculations
  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountAmount = activeCoupon
    ? (subtotal * activeCoupon.discountPercentage) / 100
    : 0;
  const taxPercentage = paymentSettings?.taxPercentage !== undefined ? paymentSettings.taxPercentage : 0.05;
  const taxAmount = (subtotal - discountAmount) * taxPercentage;
  const totalAmount = subtotal + delivery.fee + taxAmount - discountAmount;

  // Apply voucher coupon code
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    const matched = coupons.find(
      (c) => c.code.toUpperCase() === couponCode.trim().toUpperCase()
    );

    if (matched) {
      const today = new Date().toISOString().split('T')[0];
      if (matched.expiryDate && matched.expiryDate < today) {
        toast.error('This promo voucher code has expired!');
        return;
      }
      if (matched.usedCount >= matched.usageLimit) {
        toast.error('This coupon has reached its usage limit.');
        return;
      }
      setActiveCoupon(matched);
      toast.success(`Coupon "${matched.code}" applied! ${matched.discountPercentage}% discount.`);
    } else {
      toast.error('Invalid promo coupon code.');
    }
  };

  // ── Real bKash Merchant API ──────────────────────────────────────────────────
  const executeBkashAutoSuccess = async () => {
    setProcessingOrder(true);
    try {
      // Step 1: Get token from server
      const tokenRes = await fetch('/api/bkash/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appKey: paymentSettings.bkashAutoAppKey,
          appSecret: paymentSettings.bkashAutoAppSecret,
          username: paymentSettings.bkashAutoUsername,
          password: paymentSettings.bkashAutoPassword,
          sandbox: paymentSettings.bkashAutoSandbox || false
        })
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.token) throw new Error(tokenData.error || 'bKash token failed');

      const orderId = 'ORD-' + Date.now();
      // Step 2: Create payment
      const createRes = await fetch('/api/bkash/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appKey: paymentSettings.bkashAutoAppKey,
          token: tokenData.token,
          amount: totalAmount.toFixed(2),
          orderId,
          callbackUrl: window.location.origin + '/?bkash_callback=1&orderId=' + orderId,
          sandbox: paymentSettings.bkashAutoSandbox || false
        })
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.bkashURL) throw new Error(createData.error || 'bKash create failed');

      // Save pending order to context before redirect
      const pendingOrder: Order = {
        id: 'ord_' + Date.now().toString() + Math.random().toString(36).substring(2, 6),
        orderNumber: orderId,
        customerName: custName.trim(), email: custEmail.trim().toLowerCase(),
        phone: custPhone.trim(), address: custAddress.trim(),
        city: custCity.trim(), postalCode: custPostalCode.trim(), deliveryNote: custNote.trim(),
        items: cart.map((item) => ({ productId: item.productId, name: item.name, price: item.price, quantity: item.quantity, image: item.image })),
        subtotal, deliveryFee: delivery.fee, couponApplied: activeCoupon ? activeCoupon.code : null,
        discount: discountAmount, total: totalAmount,
        paymentMethod: 'bkash_auto', paymentStatus: 'Pending', orderStatus: 'Pending',
        transactionId: createData.paymentID, createdAt: new Date().toISOString()
      };
      await placeOrder(pendingOrder);
      // Redirect to bKash payment page
      window.location.href = createData.bkashURL;
    } catch (err: any) {
      toast.error('bKash payment failed: ' + (err.message || 'Unknown error'));
      setProcessingOrder(false);
      setBkashAutoPortal(false);
      setBkashStep(1);
    }
  };

  // ── Real Nagad Merchant API ──────────────────────────────────────────────────
  const executeNagadAutoSuccess = async () => {
    setProcessingOrder(true);
    try {
      const orderId = 'ORD-' + Date.now();
      const initRes = await fetch('/api/nagad/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: paymentSettings.nagadAutoMerchantId,
          privateKey: paymentSettings.nagadAutoPrivateKey,
          publicKey: paymentSettings.nagadAutoPublicKey,
          orderId,
          amount: totalAmount.toFixed(2),
          callbackUrl: window.location.origin + '/?nagad_callback=1&orderId=' + orderId,
          sandbox: paymentSettings.nagadAutoSandbox || false
        })
      });
      const initData = await initRes.json();
      if (!initRes.ok || !initData.redirectUrl) throw new Error(initData.error || 'Nagad init failed');

      const pendingOrder: Order = {
        id: 'ord_' + Date.now().toString() + Math.random().toString(36).substring(2, 6),
        orderNumber: orderId, customerName: custName.trim(), email: custEmail.trim().toLowerCase(),
        phone: custPhone.trim(), address: custAddress.trim(), city: custCity.trim(),
        postalCode: custPostalCode.trim(), deliveryNote: custNote.trim(),
        items: cart.map((item) => ({ productId: item.productId, name: item.name, price: item.price, quantity: item.quantity, image: item.image })),
        subtotal, deliveryFee: delivery.fee, couponApplied: activeCoupon ? activeCoupon.code : null,
        discount: discountAmount, total: totalAmount,
        paymentMethod: 'nagad_auto', paymentStatus: 'Pending', orderStatus: 'Pending',
        transactionId: orderId, createdAt: new Date().toISOString()
      };
      await placeOrder(pendingOrder);
      window.location.href = initData.redirectUrl;
    } catch (err: any) {
      toast.error('Nagad payment failed: ' + (err.message || 'Unknown error'));
      setProcessingOrder(false);
      setNagadAutoPortal(false);
      setNagadStep(1);
    }
  };

  // Submit final order handler
  const handlePlaceOrderSubmit = async () => {
    if (cart.length === 0) return;
    if (!custName.trim() || !custEmail.trim() || !custPhone.trim() || !custAddress.trim() || !custCity.trim()) {
      toast.error('Please fill in all required delivery details.');
      return;
    }

    // Trigger instant gates
    if (selectedPaymentMethod === 'bkash_auto') {
      if (!paymentSettings.bkashAutoEnabled) {
        toast.error('Instant bKash Automatic gateway is not activated by admin.');
        return;
      }
      setBkashPhoneInput(custPhone);
      setBkashStep(1);
      setBkashAutoPortal(true);
      return;
    }

    if (selectedPaymentMethod === 'nagad_auto') {
      if (!paymentSettings.nagadAutoEnabled) {
        toast.error('Instant Nagad Automatic gateway is not activated by admin.');
        return;
      }
      setNagadPhoneInput(custPhone);
      setNagadStep(1);
      setNagadAutoPortal(true);
      return;
    }

    // ── SSLCommerz real redirect ─────────────────────────────────────────────
    if (selectedPaymentMethod === 'sslcommerz') {
      if (!paymentSettings.sslcommerzEnabled) {
        toast.error('SSLCommerz gateway is not activated by admin.');
        return;
      }
      setProcessingOrder(true);
      try {
        const orderId = 'ORD-' + Date.now();
        const res = await fetch('/api/sslcommerz/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId: paymentSettings.sslcommerzStoreId,
            storePassword: paymentSettings.sslcommerzStorePassword,
            sandbox: paymentSettings.sslcommerzSandbox || false,
            order: {
              orderId, amount: totalAmount.toFixed(2),
              currency: 'BDT',
              customerName: custName.trim(), customerEmail: custEmail.trim(),
              customerPhone: custPhone.trim(), customerAddress: custAddress.trim(),
              customerCity: custCity.trim()
            }
          })
        });
        const data = await res.json();
        if (!res.ok || !data.gatewayPageURL) throw new Error(data.error || 'SSLCommerz init failed');
        // Save pending order
        const pendingOrder: Order = {
          id: 'ord_' + Date.now().toString() + Math.random().toString(36).substring(2, 6),
          orderNumber: orderId, customerName: custName.trim(), email: custEmail.trim().toLowerCase(),
          phone: custPhone.trim(), address: custAddress.trim(), city: custCity.trim(),
          postalCode: custPostalCode.trim(), deliveryNote: custNote.trim(),
          items: cart.map((item) => ({ productId: item.productId, name: item.name, price: item.price, quantity: item.quantity, image: item.image })),
          subtotal, deliveryFee: delivery.fee, couponApplied: activeCoupon ? activeCoupon.code : null,
          discount: discountAmount, total: totalAmount,
          paymentMethod: 'sslcommerz', paymentStatus: 'Pending', orderStatus: 'Pending',
          transactionId: data.sessionkey, createdAt: new Date().toISOString()
        };
        await placeOrder(pendingOrder);
        window.location.href = data.gatewayPageURL;
      } catch (err: any) {
        toast.error('SSLCommerz: ' + (err.message || 'Failed to initiate payment'));
        setProcessingOrder(false);
      }
      return;
    }

    // ── AamarPay real redirect ───────────────────────────────────────────────
    if (selectedPaymentMethod === 'aamarpay') {
      if (!paymentSettings.aamarpayEnabled) {
        toast.error('AamarPay gateway is not activated by admin.');
        return;
      }
      setProcessingOrder(true);
      try {
        const orderId = 'ORD-' + Date.now();
        const res = await fetch('/api/aamarpay/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId: paymentSettings.aamarpayStoreId,
            signatureKey: paymentSettings.aamarpaySignatureKey,
            sandbox: paymentSettings.aamarpaySandbox || false,
            order: {
              orderId, amount: totalAmount.toFixed(2), currency: 'BDT',
              customerName: custName.trim(), customerEmail: custEmail.trim(),
              customerPhone: custPhone.trim(), customerAddress: custAddress.trim(),
              customerCity: custCity.trim()
            }
          })
        });
        const data = await res.json();
        if (!res.ok || !data.payment_url) throw new Error(data.error || 'AamarPay init failed');
        const pendingOrder: Order = {
          id: 'ord_' + Date.now().toString() + Math.random().toString(36).substring(2, 6),
          orderNumber: orderId, customerName: custName.trim(), email: custEmail.trim().toLowerCase(),
          phone: custPhone.trim(), address: custAddress.trim(), city: custCity.trim(),
          postalCode: custPostalCode.trim(), deliveryNote: custNote.trim(),
          items: cart.map((item) => ({ productId: item.productId, name: item.name, price: item.price, quantity: item.quantity, image: item.image })),
          subtotal, deliveryFee: delivery.fee, couponApplied: activeCoupon ? activeCoupon.code : null,
          discount: discountAmount, total: totalAmount,
          paymentMethod: 'aamarpay', paymentStatus: 'Pending', orderStatus: 'Pending',
          transactionId: orderId, createdAt: new Date().toISOString()
        };
        await placeOrder(pendingOrder);
        window.location.href = data.payment_url;
      } catch (err: any) {
        toast.error('AamarPay: ' + (err.message || 'Failed to initiate payment'));
        setProcessingOrder(false);
      }
      return;
    }

    // Normal direct gates
    setProcessingOrder(true);
    try {
      const ordNum = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
      const isPaid = selectedPaymentMethod === 'stripe' || selectedPaymentMethod === 'paypal';
      const newOrder: Order = {
        id: 'ord_' + Date.now().toString() + Math.random().toString(36).substring(2, 6),
        orderNumber: ordNum,
        customerName: custName.trim(),
        email: custEmail.trim().toLowerCase(),
        phone: custPhone.trim(),
        address: custAddress.trim(),
        city: custCity.trim(),
        postalCode: custPostalCode.trim(),
        deliveryNote: custNote.trim(),
        items: cart.map((item) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        })),
        subtotal,
        deliveryFee: delivery.fee,
        couponApplied: activeCoupon ? activeCoupon.code : null,
        discount: discountAmount,
        total: totalAmount,
        paymentMethod: selectedPaymentMethod,
        paymentStatus: isPaid ? 'Paid' : 'Pending',
        orderStatus: 'Pending',
        transactionId: isPaid ? 'SANDBOX-INDEX-' + Math.floor(100000 + Math.random() * 900000) : undefined,
        createdAt: new Date().toISOString()
      };

      await placeOrder(newOrder);
      setPlacedOrderInfo(newOrder);
      clearCart();
      toast.success('Your order has been registered successfully!');
    } catch (err) {
      toast.error('Failing placing order. Try again.');
    } finally {
      setProcessingOrder(false);
    }
  };

  // Helper payment logo custom renderer
  const renderPaymentOptionLogo = (methodKey: string, customUrl?: string) => {
    if (customUrl && customUrl.trim()) {
      return (
        <img
          src={customUrl}
          alt={methodKey}
          className="w-10 h-6 object-contain rounded bg-white p-0.5 border border-slate-200/50"
          referrerPolicy="no-referrer"
        />
      );
    }

    switch (methodKey) {
      case 'bkash_auto':
      case 'bkash_manual':
        return (
          <div className="w-10 h-6.5 rounded-lg bg-[#e11d48] flex items-center justify-center text-[8px] font-black italic text-white uppercase shadow-sm shrink-0">
            bKash
          </div>
        );
      case 'nagad_auto':
      case 'nagad_manual':
        return (
          <div className="w-10 h-6.5 rounded-lg bg-[#ea580c] flex items-center justify-center text-[8.5px] font-extrabold text-white uppercase shadow-sm shrink-0">
            Nagad
          </div>
        );
      case 'paypal':
        return (
          <div className="w-10 h-6.5 rounded-lg bg-[#003087] flex items-center justify-center text-[8px] font-bold italic tracking-tight text-white uppercase shadow-sm shrink-0">
            PayPal
          </div>
        );
      case 'stripe':
        return (
          <div className="w-10 h-6.5 rounded-lg bg-[#6366f1] flex items-center justify-center text-[8px] font-extrabold text-white uppercase shadow-sm shrink-0">
            Stripe
          </div>
        );
      case 'cod':
        return (
          <div className="w-10 h-6.5 rounded-lg bg-[#10b981] flex items-center justify-center text-[8.5px] font-bold text-white uppercase shadow-sm shrink-0">
            COD
          </div>
        );
      case 'rocket_manual':
        return (
          <div className="w-10 h-6.5 rounded-lg bg-[#8b5cf6] flex items-center justify-center text-[8px] font-bold text-white uppercase shadow-sm shrink-0">
            Rocket
          </div>
        );
      case 'bank':
        return (
          <div className="w-10 h-6.5 rounded-lg bg-[#2563eb] flex items-center justify-center text-[8.5px] font-bold text-white uppercase shadow-sm shrink-0">
            BANK
          </div>
        );
      case 'card_manual':
        return (
          <div className="w-10 h-6.5 rounded-lg bg-[#4b5563] flex items-center justify-center text-[8.5px] font-bold text-white uppercase shadow-sm shrink-0">
            CARD
          </div>
        );
      default:
        return (
          <div className="w-10 h-6.5 rounded-lg bg-slate-400 flex items-center justify-center text-[9px] font-bold text-white uppercase shadow-sm shrink-0">
            PAY
          </div>
        );
    }
  };

  return (
    <div id="cart-modal-overlay" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end select-none">
      
      {/* Slide sheet frame container */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="bg-white w-full max-w-lg h-full flex flex-col justify-between shadow-2xl relative select-none"
      >
        {/* Header Ribbon exactly like screenshot */}
        <div className="bg-white text-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-md font-black shadow-sm">
              🛍️
            </span>
            <div>
              <h3 className="font-extrabold text-[13px] text-slate-800 uppercase tracking-wider font-sans">
                {placedOrderInfo ? 'ORDER PLACED' : isCheckingOut ? 'SECURE CHECKOUT' : 'SECURE CHECKOUT'}
              </h3>
              <p className="text-[10px] text-slate-400 leading-tight">
                {placedOrderInfo ? 'Thank you for your business!' : 'Complete your premium juice selection'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step: Order Placed bill output */}
        {placedOrderInfo ? (
          <div className="flex-1 p-6 overflow-y-auto space-y-6 text-center divide-y divide-slate-100 flex flex-col justify-between">
            <div className="space-y-4 pt-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
              <div className="space-y-1">
                <h4 className="text-xl font-black text-slate-900 font-sans tracking-tight">Order Confirmed!</h4>
                <p className="text-slate-500 text-xs">
                  Your transaction has registered as <span className="font-mono font-bold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">{placedOrderInfo.orderNumber}</span>.
                </p>
                {siteSettings.smtpEnabled && (
                  <p className="text-emerald-600 text-[10px] font-semibold mt-1">📧 Invoice sent to {placedOrderInfo.email}</p>
                )}
              </div>
            </div>

            {/* Invoice receipt details */}
            <div className="py-5 space-y-3.5 text-xs text-left">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-800 uppercase tracking-widest text-[9px] font-sans">Invoice Details</p>
                <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">#{placedOrderInfo.orderNumber}</span>
              </div>
              
              <div className="space-y-2 border border-slate-100 p-4 rounded-2xl bg-slate-50/50">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Customer:</span>
                  <span className="font-bold text-slate-900 text-right">{placedOrderInfo.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Phone No:</span>
                  <span className="font-bold text-slate-900 text-right font-mono">{placedOrderInfo.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Address:</span>
                  <span className="font-bold text-slate-900 text-right max-w-48 truncate">{placedOrderInfo.address}, {placedOrderInfo.city}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-slate-200 pt-2">
                  <span className="text-slate-500 font-medium">Payment:</span>
                  <span className="font-bold text-emerald-600 text-right uppercase text-[10px]">{placedOrderInfo.paymentMethod.replace(/_/g, ' ')}</span>
                </div>
                {/* Line items */}
                <div className="border-t border-slate-100 pt-2 space-y-1">
                  {placedOrderInfo.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[10px]">
                      <span className="text-slate-600">{item.name} x{item.quantity}</span>
                      <span className="font-semibold text-slate-800">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-slate-200 pt-2 space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="text-slate-600">{formatPrice(placedOrderInfo.subtotal)}</span>
                  </div>
                  {placedOrderInfo.discount > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Discount</span>
                      <span className="text-red-500">-{formatPrice(placedOrderInfo.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Delivery</span>
                    <span className="text-slate-600">{formatPrice(placedOrderInfo.deliveryFee)}</span>
                  </div>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-sm">
                  <span className="text-slate-800">Grand Total:</span>
                  <span className="text-emerald-600">{formatPrice(placedOrderInfo.total)}</span>
                </div>
                {placedOrderInfo.transactionId && (
                  <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 text-[10px]">
                    <span className="text-slate-400">Transaction ID:</span>
                    <span className="font-mono text-purple-600 font-bold">{placedOrderInfo.transactionId}</span>
                  </div>
                )}
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center pt-3 gap-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(window.location.origin + '/tracker?order=' + placedOrderInfo.orderNumber)}&size=130x130&bgcolor=ffffff&margin=10`}
                  alt="Order QR"
                  className="w-28 h-28 border border-slate-200 bg-white p-1 rounded-xl shadow-sm"
                />
                <span className="text-[9px] text-slate-400 font-mono">Scan to view order status</span>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              {/* Print Invoice button */}
              <button
                onClick={() => {
                  const html = generateInvoiceHTML(placedOrderInfo, siteSettings);
                  const win = window.open('', '_blank');
                  if (win) {
                    win.document.write(html);
                    win.document.close();
                    setTimeout(() => win.print(), 500);
                  }
                }}
                className="w-full h-11 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold rounded-xl transition flex items-center justify-center gap-2 text-xs"
              >
                <Printer className="w-4 h-4" /> Print Invoice
              </button>
              <a
                href={`/tracker?order=${placedOrderInfo.orderNumber}`}
                className="w-full h-11 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-md shadow-teal-50"
              >
                Track Shipping In Realtime <ArrowRight className="w-4 h-4" />
              </a>
              <button
                onClick={onClose}
                className="w-full text-slate-400 font-bold text-xs hover:text-slate-600 uppercase tracking-wider text-[10px]"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        ) : (
          /* Main checkout frame */
          <div className="flex-1 overflow-y-auto flex flex-col justify-between">
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3">
                <span className="text-6xl">🍊</span>
                <p className="font-bold text-slate-800">Your shopping cart is empty!</p>
                <p className="text-slate-400 text-xs text-center">Add high-quality ripe papayas/smoothies to trigger checkouts.</p>
                <button
                  onClick={onClose}
                  className="px-6 h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition mt-2 cursor-pointer"
                >
                  Discover Fresh Menu
                </button>
              </div>
            ) : !isCheckingOut ? (
              /* Step 1: Default Cart state before checking out details */
              <div className="p-6 space-y-6 flex flex-col h-full justify-between">
                <div className="space-y-4 overflow-y-auto max-h-[55vh] pr-1">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center gap-4 bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                      <div className="w-14 h-14 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-3xl shrink-0">
                        {item.image.startsWith('data:') || item.image.startsWith('http') ? (
                          <img src={item.image} className="w-full h-full object-cover rounded-xl" alt={item.name} />
                        ) : (
                          item.image
                        )}
                      </div>

                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="font-bold text-slate-800 text-sm truncate leading-snug">{item.name}</h4>
                        <span className="text-xs font-bold text-teal-600">
                          {formatPrice(item.price)}
                        </span>
                      </div>

                      {/* quantity toggles */}
                      <div className="flex items-center border border-slate-200 rounded-lg bg-white shrink-0">
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                          className="px-2.5 py-1 text-slate-500 font-bold hover:bg-slate-50 border-r border-slate-250 text-xs"
                        >
                          -
                        </button>
                        <span className="px-3 text-xs font-extrabold text-slate-850">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                          className="px-2.5 py-1 text-slate-500 font-bold hover:bg-slate-50"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.productId)}
                        aria-label="Remove item"
                        className="p-1 px-2 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="space-y-1.5 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Total items in basket:</span>
                      <strong className="text-slate-800">{totalCartItems} items</strong>
                    </div>
                    <div className="flex justify-between border-t border-slate-50 pt-2 text-sm font-extrabold text-slate-800">
                      <span>Subtotal:</span>
                      <span className="text-emerald-600">{formatPrice(subtotal)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsCheckingOut(true)}
                    className="w-full h-11 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-md shadow-teal-50 cursor-pointer"
                  >
                    Proceed to Securing Checkout <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Unified checkout screen as requested in the screenshot */
              <div className="flex-1 flex flex-col justify-between h-full relative">
                
                {/* Scrollable integrated view */}
                <div className="flex-1 p-6 overflow-y-auto space-y-6 max-h-[75vh]">
                  
                  <button
                    onClick={() => setIsCheckingOut(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold text-left block"
                  >
                    ← Modify Cart Items
                  </button>

                  {/* Cart review cards at the top */}
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between border border-slate-100 p-3 rounded-xl bg-slate-50/20">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white border border-slate-150 rounded-lg flex items-center justify-center text-xl shrink-0">
                            {item.image.startsWith('data:') || item.image.startsWith('http') ? (
                              <img src={item.image} className="w-full h-full object-cover rounded-lg" alt={item.name} />
                            ) : (
                              item.image
                            )}
                          </div>
                          <div className="text-left">
                            <h4 className="font-extrabold text-xs text-slate-700 leading-tight">{item.name.toUpperCase()}</h4>
                            <span className="text-[10px] text-slate-400 font-medium">{formatPrice(item.price)} EACH</span>
                          </div>
                        </div>

                        {/* Quick +/- and trash on checkout review list */}
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center border border-slate-200 rounded bg-white text-[10px]">
                            <button
                              onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                              className="px-1.5 py-0.5 text-slate-400 hover:bg-slate-50"
                            >
                              -
                            </button>
                            <span className="px-1.5 font-bold text-slate-700">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                              className="px-1.5 py-0.5 text-slate-400 hover:bg-slate-50"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="text-slate-350 hover:text-rose-500 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Promo Banner Discount Voucher field */}
                  <div className="space-y-2 pt-2">
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="ENTER DISCOUNT PROMO CODE"
                          className="w-full h-10 border border-slate-200/80 rounded-xl px-3 text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-5 h-10 bg-slate-900 border border-slate-800 hover:bg-slate-950 text-white font-extrabold rounded-xl text-[10px] tracking-widest transition cursor-pointer uppercase"
                      >
                        apply
                      </button>
                    </form>

                    {activeCoupon && (
                      <div className="p-2.5 bg-teal-50 border border-teal-100 rounded-xl text-[10px] text-teal-800 font-bold flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-teal-600 shrink-0" />
                        <span>Promo Code Applied: <strong>{activeCoupon.code}</strong> yields {activeCoupon.discountPercentage}% off!</span>
                      </div>
                    )}
                  </div>

                  {/* Pricing summaries exact list values */}
                  <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl text-xs text-slate-600 font-semibold space-y-2">
                    <div className="flex justify-between">
                      <span>SUBTOTAL:</span>
                      <span className="text-slate-800 font-bold">{formatPrice(subtotal)}</span>
                    </div>

                    {activeCoupon && (
                      <div className="flex justify-between text-teal-600 font-bold">
                        <span>DISCOUNT VALUE:</span>
                        <span>-{formatPrice(discountAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>SHIPPING & DELIVERY:</span>
                      <span className="text-slate-800 font-bold flex items-center gap-1">
                        {formatPrice(delivery.fee)}
                        <span className="text-[10px] text-amber-600 font-medium flex items-center leading-none">
                          🍁 {delivery.desc}
                        </span>
                      </span>
                    </div>

                    <div className="p-2.5 bg-emerald-50/40 border border-emerald-100/40 rounded-xl text-[10.5px] text-emerald-800 font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1">🟢 EST. DELIVERY:</span>
                      <span>{delivery.days}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>TAX ({(taxPercentage * 100).toFixed(0)}%):</span>
                      <span className="text-slate-800 font-bold">{formatPrice(taxAmount)}</span>
                    </div>

                    <div className="flex justify-between border-t border-slate-150 pt-2 font-black text-slate-900 text-[13px]">
                      <span className="text-slate-850">GRAND TOTAL:</span>
                      <span className="text-emerald-600 font-black font-sans">{formatPrice(totalAmount)}</span>
                    </div>
                  </div>

                  {/* 1. DELIVERY & CONTACT DETAILS */}
                  <div className="space-y-3 pt-2 text-left">
                    <h3 className="text-[10.5px] font-black tracking-widest text-slate-505 border-b pb-1">
                      1. DELIVERY & CONTACT DETAILS
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 font-semibold">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={custName}
                          onChange={(e) => setCustName(e.target.value)}
                          className="w-full h-11 border border-slate-200 rounded-xl px-3 focus:ring-1 focus:ring-teal-500 bg-white"
                          placeholder="e.g. David Bowman"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={custEmail}
                          onChange={(e) => setCustEmail(e.target.value)}
                          className="w-full h-11 border border-slate-200 rounded-xl px-3 focus:ring-1 focus:ring-teal-500 bg-white"
                          placeholder="e.g. david@example.com"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase">Delivery Physical Address *</label>
                        <input
                          type="text"
                          required
                          value={custAddress}
                          onChange={(e) => setCustAddress(e.target.value)}
                          className="w-full h-11 border border-slate-200 rounded-xl px-3 focus:ring-1 focus:ring-teal-500 bg-white"
                          placeholder="e.g. Flat 4B, Plot 23"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase">City *</label>
                        <input
                          type="text"
                          required
                          value={custCity}
                          onChange={(e) => setCustCity(e.target.value)}
                          className="w-full h-11 border border-slate-200 rounded-xl px-3 focus:ring-1 focus:ring-teal-500 bg-white"
                          placeholder="e.g. Dhaka"
                        />
                        <span className="text-[9px] text-emerald-600 block mt-0.5 leading-none font-bold">
                          🍁 Est. delivery: {delivery.days}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase">Contact Phone *</label>
                        <input
                          type="text"
                          required
                          value={custPhone}
                          onChange={(e) => setCustPhone(e.target.value)}
                          className="w-full h-11 border border-slate-200 rounded-xl px-3 focus:ring-1 focus:ring-teal-500 bg-white"
                          placeholder="e.g. +880 17112233"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase">Postal/Zip Code</label>
                        <input
                          type="text"
                          value={custPostalCode}
                          onChange={(e) => setCustPostalCode(e.target.value)}
                          className="w-full h-11 border border-slate-200 rounded-xl px-3 focus:ring-1 focus:ring-teal-500 bg-white"
                          placeholder="e.g. 1212"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase">Delivery Instruction Details (Optional)</label>
                        <input
                          type="text"
                          value={custNote}
                          onChange={(e) => setCustNote(e.target.value)}
                          className="w-full h-11 border border-slate-200 rounded-xl px-3 focus:ring-1 focus:ring-teal-500 bg-white"
                          placeholder="e.g. ring bell twice, deliver to security post"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. SELECT PAYMENT METHOD */}
                  <div className="space-y-4 pt-2 text-left">
                    <h3 className="text-[10.5px] font-black tracking-widest text-[#10b981]- block border-b pb-1">
                      2. SELECT PAYMENT METHOD
                    </h3>

                    {/* Instant payment options */}
                    <div className="space-y-2.5">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#00f5c1]/10 text-[#00bda4] border border-[#00f5c1]/30 text-[9px] font-extrabold uppercase tracking-wider">
                        ⚡ INSTANT PAYMENT
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {/* bkash auto */}
                        {paymentSettings.bkashAutoEnabled && (
                          <div
                            onClick={() => setSelectedPaymentMethod('bkash_auto')}
                            className={`border rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition ${
                              selectedPaymentMethod === 'bkash_auto'
                                ? 'border-pink-500 bg-pink-50/20 shadow-sm'
                                : 'border-slate-200/80 hover:border-slate-350'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {renderPaymentOptionLogo('bkash_auto', paymentSettings.bkashAutoLogoUrl)}
                              <span className="font-extrabold text-xs text-slate-700">
                                {paymentSettings.bkashAutoDisplayName || 'bKash (Auto)'}
                              </span>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                              selectedPaymentMethod === 'bkash_auto'
                                ? 'border-pink-500 bg-pink-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}>
                              {selectedPaymentMethod === 'bkash_auto' && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        )}

                        {/* nagad auto */}
                        {paymentSettings.nagadAutoEnabled && (
                          <div
                            onClick={() => setSelectedPaymentMethod('nagad_auto')}
                            className={`border rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition ${
                              selectedPaymentMethod === 'nagad_auto'
                                ? 'border-orange-500 bg-orange-50/20 shadow-sm'
                                : 'border-slate-200/80 hover:border-slate-350'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {renderPaymentOptionLogo('nagad_auto', paymentSettings.nagadAutoLogoUrl)}
                              <span className="font-extrabold text-xs text-slate-700">
                                {paymentSettings.nagadAutoDisplayName || 'Nagad (Auto)'}
                              </span>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                              selectedPaymentMethod === 'nagad_auto'
                                ? 'border-orange-500 bg-orange-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}>
                              {selectedPaymentMethod === 'nagad_auto' && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        )}

                        {/* SSLCommerz */}
                        {paymentSettings.sslcommerzEnabled && (
                          <div
                            onClick={() => setSelectedPaymentMethod('sslcommerz')}
                            className={`border rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition ${
                              selectedPaymentMethod === 'sslcommerz'
                                ? 'border-green-600 bg-green-50/20 shadow-sm'
                                : 'border-slate-200/80 hover:border-slate-350'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {paymentSettings.sslcommerzLogoUrl
                                ? <img src={paymentSettings.sslcommerzLogoUrl} alt="SSLCommerz" className="w-10 h-6 object-contain rounded bg-white p-0.5 border border-slate-200/50" />
                                : <span className="w-10 h-6 flex items-center justify-center bg-green-100 rounded font-black text-green-700 text-xs">SSL</span>}
                              <span className="font-extrabold text-xs text-slate-700">
                                {paymentSettings.sslcommerzDisplayName || 'SSLCommerz'}
                              </span>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                              selectedPaymentMethod === 'sslcommerz'
                                ? 'border-green-600 bg-green-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}>
                              {selectedPaymentMethod === 'sslcommerz' && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        )}

                        {/* AamarPay */}
                        {paymentSettings.aamarpayEnabled && (
                          <div
                            onClick={() => setSelectedPaymentMethod('aamarpay')}
                            className={`border rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition ${
                              selectedPaymentMethod === 'aamarpay'
                                ? 'border-blue-600 bg-blue-50/20 shadow-sm'
                                : 'border-slate-200/80 hover:border-slate-350'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {paymentSettings.aamarpayLogoUrl
                                ? <img src={paymentSettings.aamarpayLogoUrl} alt="AamarPay" className="w-10 h-6 object-contain rounded bg-white p-0.5 border border-slate-200/50" />
                                : <span className="w-10 h-6 flex items-center justify-center bg-blue-100 rounded font-black text-blue-700 text-xs">AP</span>}
                              <span className="font-extrabold text-xs text-slate-700">
                                {paymentSettings.aamarpayDisplayName || 'AamarPay'}
                              </span>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                              selectedPaymentMethod === 'aamarpay'
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}>
                              {selectedPaymentMethod === 'aamarpay' && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        )}

                        {/* paypal checkbox */}
                        {paymentSettings.paypalEnabled && (
                          <div
                            onClick={() => setSelectedPaymentMethod('paypal')}
                            className={`border rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition ${
                              selectedPaymentMethod === 'paypal'
                                ? 'border-blue-500 bg-blue-50/10 shadow-sm'
                                : 'border-slate-200/80 hover:border-slate-350'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {renderPaymentOptionLogo('paypal', paymentSettings.paypalLogoUrl)}
                              <span className="font-extrabold text-xs text-slate-700">
                                {paymentSettings.paypalDisplayName || 'PayPal'}
                              </span>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                              selectedPaymentMethod === 'paypal'
                                ? 'border-blue-500 bg-blue-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}>
                              {selectedPaymentMethod === 'paypal' && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        )}

                        {/* stripe checkbox */}
                        {paymentSettings.stripeEnabled && (
                          <div
                            onClick={() => setSelectedPaymentMethod('stripe')}
                            className={`border rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition ${
                              selectedPaymentMethod === 'stripe'
                                ? 'border-indigo-500 bg-indigo-50/10 shadow-sm'
                                : 'border-slate-200/80 hover:border-slate-350'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {renderPaymentOptionLogo('stripe', paymentSettings.stripeLogoUrl)}
                              <span className="font-extrabold text-xs text-slate-700">
                                {paymentSettings.stripeDisplayName || 'Stripe Card'}
                              </span>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                              selectedPaymentMethod === 'stripe'
                                ? 'border-indigo-500 bg-indigo-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}>
                              {selectedPaymentMethod === 'stripe' && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Manual payments options */}
                    <div className="space-y-2.5 pt-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-100 text-slate-500 text-[9px] font-extrabold uppercase tracking-wider">
                        🧉 MANUAL TRANSFER
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {/* Cash on delivery */}
                        {paymentSettings.codEnabled && (
                          <div
                            onClick={() => setSelectedPaymentMethod('cod')}
                            className={`border rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition ${
                              selectedPaymentMethod === 'cod'
                                ? 'border-emerald-500 bg-emerald-50/20 shadow-sm'
                                : 'border-slate-200/80 hover:border-slate-350'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {renderPaymentOptionLogo('cod', paymentSettings.codLogoUrl)}
                              <span className="font-extrabold text-xs text-slate-700">
                                {paymentSettings.codDisplayName || 'Cash on Delivery'}
                              </span>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                              selectedPaymentMethod === 'cod'
                                ? 'border-emerald-500 bg-emerald-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}>
                              {selectedPaymentMethod === 'cod' && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        )}

                        {/* bKash Manual wallet */}
                        {paymentSettings.bkashManualEnabled && (
                          <div
                            onClick={() => setSelectedPaymentMethod('bkash_manual')}
                            className={`border rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition ${
                              selectedPaymentMethod === 'bkash_manual'
                                ? 'border-pink-500 bg-pink-50/15 shadow-sm'
                                : 'border-slate-200/80 hover:border-slate-350'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {renderPaymentOptionLogo('bkash_manual', paymentSettings.bkashManualLogoUrl)}
                              <div className="text-left">
                                <span className="font-extrabold text-xs text-slate-700 block leading-tight">
                                  {paymentSettings.bkashManualDisplayName || 'bKash'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">No: {paymentSettings.bkashManualNumber}</span>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                              selectedPaymentMethod === 'bkash_manual'
                                ? 'border-pink-500 bg-pink-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}>
                              {selectedPaymentMethod === 'bkash_manual' && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        )}

                        {/* Nagad Manual wallet */}
                        {paymentSettings.nagadManualEnabled && (
                          <div
                            onClick={() => setSelectedPaymentMethod('nagad_manual')}
                            className={`border rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition ${
                              selectedPaymentMethod === 'nagad_manual'
                                ? 'border-orange-500 bg-orange-50/15 shadow-sm'
                                : 'border-slate-200/80 hover:border-slate-350'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {renderPaymentOptionLogo('nagad_manual', paymentSettings.nagadManualLogoUrl)}
                              <div className="text-left">
                                <span className="font-extrabold text-xs text-slate-700 block leading-tight">
                                  {paymentSettings.nagadManualDisplayName || 'Nagad'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">No: {paymentSettings.nagadManualNumber}</span>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                              selectedPaymentMethod === 'nagad_manual'
                                ? 'border-orange-500 bg-orange-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}>
                              {selectedPaymentMethod === 'nagad_manual' && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        )}

                        {/* Rocket manual */}
                        {paymentSettings.rocketManualEnabled && (
                          <div
                            onClick={() => setSelectedPaymentMethod('rocket_manual')}
                            className={`border rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition ${
                              selectedPaymentMethod === 'rocket_manual'
                                ? 'border-purple-500 bg-purple-50/15 shadow-sm'
                                : 'border-slate-200/80 hover:border-slate-350'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {renderPaymentOptionLogo('rocket_manual', paymentSettings.rocketManualLogoUrl)}
                              <div className="text-left">
                                <span className="font-extrabold text-xs text-slate-700 block leading-tight">
                                  {paymentSettings.rocketManualDisplayName || 'Rocket'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">No: {paymentSettings.rocketManualNumber}</span>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                              selectedPaymentMethod === 'rocket_manual'
                                ? 'border-purple-500 bg-purple-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}>
                              {selectedPaymentMethod === 'rocket_manual' && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        )}

                        {/* Bank Transfer Wire */}
                        {paymentSettings.bankEnabled && (
                          <div
                            onClick={() => setSelectedPaymentMethod('bank')}
                            className={`border rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition ${
                              selectedPaymentMethod === 'bank'
                                ? 'border-blue-500 bg-blue-50/10 shadow-sm'
                                : 'border-slate-200/80 hover:border-slate-350'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {renderPaymentOptionLogo('bank', paymentSettings.bankLogoUrl)}
                              <div className="text-left">
                                <span className="font-extrabold text-xs text-slate-700 block leading-tight">
                                  {paymentSettings.bankDisplayName || 'Bank Transfer'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-serif leading-tight block">{paymentSettings.bankAccountHolder}</span>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                              selectedPaymentMethod === 'bank'
                                ? 'border-blue-500 bg-blue-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}>
                              {selectedPaymentMethod === 'bank' && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        )}

                        {/* Credit / Debit manual card */}
                        {paymentSettings.cardManualEnabled && (
                          <div
                            onClick={() => setSelectedPaymentMethod('card_manual')}
                            className={`border rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition ${
                              selectedPaymentMethod === 'card_manual'
                                ? 'border-slate-700 bg-slate-50/40 shadow-sm'
                                : 'border-slate-200/80 hover:border-slate-350'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {renderPaymentOptionLogo('card_manual', paymentSettings.cardManualLogoUrl)}
                              <span className="font-extrabold text-xs text-slate-700">
                                {paymentSettings.cardManualDisplayName || 'Credit / Debit Card'}
                              </span>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                              selectedPaymentMethod === 'card_manual'
                                ? 'border-slate-700 bg-slate-800 text-white'
                                : 'border-slate-300 bg-white'
                            }`}>
                              {selectedPaymentMethod === 'card_manual' && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* PLACE ORDER button exactly as requested in screenshot */}
                <div className="p-6 border-t border-slate-100 bg-white shrink-0">
                  <button
                    onClick={handlePlaceOrderSubmit}
                    disabled={processingOrder}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer shadow-md shadow-emerald-50"
                  >
                    {processingOrder ? (
                      <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-white/90" />
                        PLACE ORDER ({formatPrice(totalAmount)})
                      </>
                    )}
                  </button>
                </div>

              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ==================== bKash Automatic Gateway Dialog Overlay ==================== */}
      <AnimatePresence>
        {bkashAutoPortal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#e11d48] w-full max-w-[350px] rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl text-white font-sans text-center"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/10 flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-white text-[#e11d48] flex items-center justify-center font-black text-xl italic shadow">
                  bk
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wide">bKash Merchant Pay</h3>
                  <p className="text-[10px] text-white/80 uppercase font-bold mt-0.5">{siteSettings.websiteName || 'Fruitopia Store'}</p>
                </div>
              </div>

              {/* Steps views */}
              <div className="p-6 space-y-5">
                <div className="bg-black/10 py-2.5 px-4 rounded-xl inline-block">
                  <span className="text-[11px] text-white/70 block uppercase font-bold">TOTAL AMOUNT TO CHARGE</span>
                  <span className="text-xl font-mono font-black">{formatPrice(totalAmount)}</span>
                </div>

                {bkashStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider block">Enter Your bKash Wallet Number</label>
                      <input
                        type="tel"
                        required
                        value={bkashPhoneInput}
                        onChange={(e) => setBkashPhoneInput(e.target.value)}
                        className="w-full text-center tracking-widest font-mono text-sm h-11 border border-white/20 rounded-xl bg-white/10 text-white focus:outline-none focus:border-white font-black"
                        placeholder="e.g. 017XXXXXXXX"
                      />
                    </div>
                    <p className="text-[10px] text-white/75 leading-relaxed">By clicking proceed you accept the integrated automated Sandbox API gateway policy regulations.</p>
                  </div>
                )}

                {bkashStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider block">Verification OTP Code (123456)</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={bkashOtpInput}
                        onChange={(e) => setBkashOtpInput(e.target.value)}
                        className="w-full text-center tracking-widest font-mono text-lg h-11 border border-white/20 rounded-xl bg-white/10 text-white focus:outline-none focus:border-white font-black"
                        placeholder="••••••"
                      />
                    </div>
                    <p className="text-[9.5px] text-rose-100 font-bold">A mock SMS OTP authentication code was dispatched to {bkashPhoneInput}</p>
                  </div>
                )}

                {bkashStep === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider block">Enter 4-Digit Security PIN</label>
                      <input
                        type="password"
                        required
                        maxLength={4}
                        value={bkashPinInput}
                        onChange={(e) => setBkashPinInput(e.target.value)}
                        className="w-full text-center tracking-widest font-mono text-xl h-11 border border-white/20 rounded-xl bg-white/10 text-white focus:outline-none focus:border-white font-black"
                        placeholder="••••"
                      />
                    </div>
                    <p className="text-[9.5px] text-white/80">Secured sandbox API encryption protects your PIN values.</p>
                  </div>
                )}

                {bkashStep === 4 && (
                  <div className="py-6 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-white" />
                    <span className="text-xs tracking-wider animate-pulse">AUTHORIZING MERCHANDISE TRANSFER...</span>
                  </div>
                )}
              </div>

              {/* Footer controls */}
              {bkashStep !== 4 && (
                <div className="bg-black/10 p-4 border-t border-white/5 flex gap-3 text-xs font-bold">
                  <button
                    onClick={() => {
                      setBkashAutoPortal(false);
                      setBkashStep(1);
                    }}
                    className="flex-1 py-2.5 rounded-lg border border-white/25 hover:bg-white/5 transition uppercase text-[10px]"
                  >
                    CLOSE
                  </button>
                  <button
                    onClick={() => {
                      if (bkashStep === 1) {
                        if (!bkashPhoneInput.trim()) {
                          toast.error('Wallet phone is required!');
                          return;
                        }
                        setBkashStep(2);
                      } else if (bkashStep === 2) {
                        if (!bkashOtpInput.trim()) {
                          toast.error('Verification code must be entered!');
                          return;
                        }
                        setBkashStep(3);
                      } else if (bkashStep === 3) {
                        if (bkashPinInput.length < 4) {
                          toast.error('Please input complete 4 digit PIN code!');
                          return;
                        }
                        setBkashStep(4);
                        setTimeout(() => {
                          executeBkashAutoSuccess();
                        }, 2200);
                      }
                    }}
                    className="flex-1 py-2.5 rounded-lg bg-white text-[#e11d48] hover:bg-rose-50 transition uppercase text-[10px] font-black"
                  >
                    PROCEED
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== Nagad Automatic Gateway Dialog Overlay ==================== */}
      <AnimatePresence>
        {nagadAutoPortal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#ea580c] w-full max-w-[350px] rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl text-white font-sans text-center"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/10 flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-white text-[#ea580c] flex items-center justify-center font-black text-xl italic shadow-sm">
                  ng
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wide">Nagad Instant Checkout</h3>
                  <p className="text-[10px] text-white/80 uppercase font-bold mt-0.5">{siteSettings.websiteName || 'Fruitopia Store'}</p>
                </div>
              </div>

              {/* Step rendering */}
              <div className="p-6 space-y-5">
                <div className="bg-black/10 py-2.5 px-4 rounded-xl inline-block">
                  <span className="text-[11px] text-white/70 block uppercase font-bold">MERCHANT TRANSACTION CHARGE</span>
                  <span className="text-xl font-mono font-black">{formatPrice(totalAmount)}</span>
                </div>

                {nagadStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider block">Your Mobile Account Phone</label>
                      <input
                        type="tel"
                        required
                        value={nagadPhoneInput}
                        onChange={(e) => setNagadPhoneInput(e.target.value)}
                        className="w-full text-center tracking-widest font-mono text-sm h-11 border border-white/20 rounded-xl bg-white/10 text-white focus:outline-none focus:border-white font-black"
                        placeholder="e.g. 019XXXXXXXX"
                      />
                    </div>
                    <p className="text-[10px] text-white/75 leading-relaxed">Authentic sandbox gateway protocols ensure secure credentials handling.</p>
                  </div>
                )}

                {nagadStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider block">Input OTP Verification Token</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={nagadOtpInput}
                        onChange={(e) => setNagadOtpInput(e.target.value)}
                        className="w-full text-center tracking-widest font-mono text-lg h-11 border border-white/20 rounded-xl bg-white/10 text-white focus:outline-none focus:border-white font-black"
                        placeholder="••••••"
                      />
                    </div>
                    <p className="text-[9.5px] text-orange-100 font-bold">Secured verification token dispatched via SMS network to {nagadPhoneInput}</p>
                  </div>
                )}

                {nagadStep === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider block">Security Password PIN Code</label>
                      <input
                        type="password"
                        required
                        maxLength={4}
                        value={nagadPinInput}
                        onChange={(e) => setNagadPinInput(e.target.value)}
                        className="w-full text-center tracking-widest font-mono text-xl h-11 border border-white/20 rounded-xl bg-white/10 text-white focus:outline-none focus:border-white font-black"
                        placeholder="••••"
                      />
                    </div>
                    <p className="text-[9.5px] text-white/80">Never share your sandbox PIN credentials with others.</p>
                  </div>
                )}

                {nagadStep === 4 && (
                  <div className="py-6 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-white" />
                    <span className="text-xs tracking-wider animate-pulse font-bold">VERIFYING PORTAL SECURE HANDSHAKE...</span>
                  </div>
                )}
              </div>

              {/* Footer controls */}
              {nagadStep !== 4 && (
                <div className="bg-black/10 p-4 border-t border-white/5 flex gap-3 text-xs font-bold">
                  <button
                    onClick={() => {
                      setNagadAutoPortal(false);
                      setNagadStep(1);
                    }}
                    className="flex-1 py-2.5 rounded-lg border border-white/25 hover:bg-white/5 transition uppercase text-[10px]"
                  >
                    CLOSE
                  </button>
                  <button
                    onClick={() => {
                      if (nagadStep === 1) {
                        if (!nagadPhoneInput.trim()) {
                          toast.error('Mobile account is required!');
                          return;
                        }
                        setNagadStep(2);
                      } else if (nagadStep === 2) {
                        if (!nagadOtpInput.trim()) {
                          toast.error('OTP code must be entered!');
                          return;
                        }
                        setNagadStep(3);
                      } else if (nagadStep === 3) {
                        if (nagadPinInput.length < 4) {
                          toast.error('PIN code is required to complete transaction!');
                          return;
                        }
                        setNagadStep(4);
                        setTimeout(() => {
                          executeNagadAutoSuccess();
                        }, 2200);
                      }
                    }}
                    className="flex-1 py-2.5 rounded-lg bg-white text-[#ea580c] hover:bg-orange-50 transition uppercase text-[10px] font-black"
                  >
                    PROCEED
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
