/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Order } from '../types';
import { Search, ArrowLeft, Package, RefreshCw, ShieldCheck, Truck, Star, AlertTriangle, XCircle, ChevronRight, MapPin, Phone, Calendar, CreditCard, Hash, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function OrderTrackerPage() {
  const { orders, formatPrice, toast, siteSettings } = useApp();
  const [orderQuery, setOrderQuery] = useState('');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const primary = siteSettings?.themePrimaryColor || '#7c3aed';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderNumberFromUrl = params.get('order');
    if (orderNumberFromUrl) {
      setOrderQuery(orderNumberFromUrl);
      const matched = orders.find((o) => o.orderNumber.toUpperCase() === orderNumberFromUrl.toUpperCase());
      if (matched) {
        setActiveOrder(matched);
      } else {
        const t = setTimeout(() => {
          const m = orders.find((o) => o.orderNumber.toUpperCase() === orderNumberFromUrl.toUpperCase());
          if (m) setActiveOrder(m);
        }, 1500);
        return () => clearTimeout(t);
      }
    }
  }, [orders]);

  const handleSearchOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderQuery.trim()) return;
    setIsSearching(true);
    setTimeout(() => {
      const matched = orders.find(
        (o) => o.orderNumber.trim().toUpperCase() === orderQuery.trim().toUpperCase()
      );
      if (matched) {
        setActiveOrder(matched);
      } else {
        toast.error('No order found with that number.');
        setActiveOrder(null);
      }
      setIsSearching(false);
    }, 600);
  };

  const steps: { label: string; desc: string; status: Order['orderStatus']; icon: React.ElementType }[] = [
    { label: 'Order Placed',  desc: 'Order received & registered',          status: 'Pending',    icon: Package },
    { label: 'Confirmed',     desc: 'Order verified & approved',             status: 'Confirmed',  icon: ShieldCheck },
    { label: 'Processing',    desc: 'Preparing & packing your items',        status: 'Processing', icon: RefreshCw },
    { label: 'Shipped',       desc: 'Out for delivery with courier',         status: 'Shipped',    icon: Truck },
    { label: 'Delivered',     desc: 'Successfully delivered — Enjoy! 🎉',   status: 'Delivered',  icon: Star },
  ];

  const getStepIndex = (status: Order['orderStatus']) =>
    ['Pending','Confirmed','Processing','Shipped','Delivered'].indexOf(status);

  const activeIndex = activeOrder ? getStepIndex(activeOrder.orderStatus) : -1;
  const isCancelled = activeOrder?.orderStatus === 'Cancelled' || activeOrder?.orderStatus === 'Refunded';

  const statusBadgeStyle = (status: Order['orderStatus']) => {
    const map: Record<string, string> = {
      Pending:    'bg-amber-50 text-amber-600 border-amber-200',
      Confirmed:  'bg-blue-50 text-blue-600 border-blue-200',
      Processing: 'bg-violet-50 text-violet-600 border-violet-200',
      Shipped:    'bg-indigo-50 text-indigo-600 border-indigo-200',
      Delivered:  'bg-emerald-50 text-emerald-600 border-emerald-200',
      Cancelled:  'bg-red-50 text-red-600 border-red-200',
      Refunded:   'bg-orange-50 text-orange-600 border-orange-200',
    };
    return map[status] || 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const paymentLabel = (m: string) => {
    const map: Record<string, string> = {
      cod: 'Cash on Delivery', bkash_manual: 'bKash', bkash_auto: 'bKash Auto',
      nagad_manual: 'Nagad', nagad_auto: 'Nagad Auto', rocket_manual: 'Rocket',
      stripe: 'Stripe', paypal: 'PayPal', sslcommerz: 'SSLCommerz',
      aamarpay: 'AamarPay', bank: 'Bank Transfer', card_manual: 'Credit Card',
    };
    return map[m] || m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const storeName = siteSettings?.websiteName || 'Quirky-Fruity';

  return (
    <div className="min-h-screen bg-[#f7f7fb] select-none" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      {/* Top Nav Bar */}
      <nav className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <a href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-semibold transition">
          <ArrowLeft className="w-4 h-4" />
          Back to Store
        </a>
        <span className="font-black text-slate-900 text-sm tracking-tight">{storeName}</span>
        <div className="w-24" />
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="text-center space-y-4"
        >
          {/* Icon badge */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg shadow-violet-200 mb-1"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
            <Package className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Track Your Order</h1>
          <p className="text-slate-500 text-sm">Enter your order number to see real-time status updates</p>
        </motion.div>

        {/* Search Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
        >
          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Order Number</label>
          <form onSubmit={handleSearchOrder} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value.toUpperCase())}
                placeholder="e.g. ORD-123456"
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 text-sm font-mono font-semibold transition"
                style={{ focusRingColor: primary }}
                onFocus={e => e.currentTarget.style.boxShadow = `0 0 0 3px ${primary}22`}
                onBlur={e => e.currentTarget.style.boxShadow = ''}
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="h-12 px-6 rounded-xl text-white text-sm font-bold flex items-center gap-2 transition shadow-sm disabled:opacity-60 cursor-pointer"
              style={{ background: `linear-gradient(135deg, #7c3aed, #6d28d9)` }}
            >
              {isSearching ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Track
            </button>
          </form>
        </motion.div>

        {/* Feature hint cards (shown when no order) */}
        <AnimatePresence>
          {!activeOrder && !isSearching && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              className="grid grid-cols-3 gap-4"
            >
              {[
                { icon: Search,      color: '#7c3aed', bg: '#f5f0ff', label: 'Enter Order #',  desc: 'Type your order number from your confirmation email or receipt' },
                { icon: RefreshCw,   color: '#0ea5e9', bg: '#f0f9ff', label: 'Live Status',    desc: 'See real-time updates as your order moves through processing to delivery' },
                { icon: Package,     color: '#10b981', bg: '#f0fdf4', label: 'Full Details',   desc: 'View items, payment status, delivery address and tracking timeline' },
              ].map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 + i * 0.07 }}
                  className="bg-white rounded-2xl border border-slate-100 p-5 text-center space-y-3 hover:shadow-md transition-shadow cursor-default"
                >
                  <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center" style={{ background: card.bg }}>
                    <card.icon className="w-5 h-5" style={{ color: card.color }} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{card.label}</p>
                    <p className="text-slate-500 text-[11px] leading-relaxed mt-1">{card.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Not found */}
        <AnimatePresence>
          {!activeOrder && orderQuery && !isSearching && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center space-y-3"
            >
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <p className="font-bold text-slate-800">Order not found</p>
              <p className="text-slate-500 text-sm">No order matches <span className="font-mono font-bold text-slate-700">{orderQuery}</span>. Please check the number and try again.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Order Result */}
        <AnimatePresence>
          {activeOrder && (
            <motion.div
              key={activeOrder.orderNumber}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >

              {/* Order Header Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Gradient top strip */}
                <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #7c3aed, #6d28d9, #4f46e5)' }} />
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Order Number</p>
                      <h2 className="font-black text-slate-900 text-xl font-mono tracking-tight">{activeOrder.orderNumber}</h2>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(activeOrder.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${statusBadgeStyle(activeOrder.orderStatus)}`}>
                        {activeOrder.orderStatus === 'Cancelled' && <XCircle className="w-3 h-3" />}
                        {activeOrder.orderStatus}
                      </span>
                      <p className="text-2xl font-black mt-2" style={{ color: '#7c3aed' }}>{formatPrice(activeOrder.total)}</p>
                    </div>
                  </div>

                  {/* Quick meta pills */}
                  <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-slate-100">
                    <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-semibold px-3 py-1.5 rounded-full">
                      <CreditCard className="w-3 h-3" />{paymentLabel(activeOrder.paymentMethod)}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border ${activeOrder.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      <Hash className="w-3 h-3" />{activeOrder.paymentStatus}
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-semibold px-3 py-1.5 rounded-full">
                      <Package className="w-3 h-3" />{activeOrder.items.length} item{activeOrder.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tracking Timeline */}
              {!isCancelled ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                  <h3 className="font-black text-slate-900 text-sm">Delivery Timeline</h3>

                  {/* Progress bar */}
                  <div className="relative">
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, #7c3aed, #4f46e5)' }}
                        initial={{ width: '0%' }}
                        animate={{ width: `${Math.max(5, ((activeIndex + 1) / steps.length) * 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      {steps.map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full mt-[-18px] ${i <= activeIndex ? 'bg-violet-600' : 'bg-slate-300'}`} />
                      ))}
                    </div>
                  </div>

                  {/* Steps list */}
                  <div className="space-y-0">
                    {steps.map((st, sIdx) => {
                      const isDone = sIdx <= activeIndex;
                      const isCurrent = sIdx === activeIndex;
                      const Icon = st.icon;
                      return (
                        <div key={st.status} className="flex items-start gap-4 relative">
                          {/* Connector line */}
                          {sIdx < steps.length - 1 && (
                            <div className={`absolute left-[19px] top-10 w-0.5 h-8 ${sIdx < activeIndex ? 'bg-violet-200' : 'bg-slate-100'}`} />
                          )}
                          {/* Icon circle */}
                          <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                            isDone
                              ? 'shadow-md shadow-violet-100'
                              : 'border border-slate-200 bg-slate-50'
                          } ${isCurrent ? 'ring-4 ring-violet-100' : ''}`}
                            style={isDone ? { background: isCurrent ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)' } : {}}
                          >
                            <Icon className={`w-4 h-4 ${isDone ? 'text-white' : 'text-slate-400'} ${isCurrent ? 'animate-pulse' : ''}`} />
                          </div>
                          {/* Label */}
                          <div className="py-2.5 flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-bold ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>{st.label}</p>
                              {isCurrent && (
                                <span className="bg-violet-100 text-violet-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className={`text-[11px] ${isDone ? 'text-slate-500' : 'text-slate-300'}`}>{st.desc}</p>
                          </div>
                          {isDone && <div className="mt-3 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                          </div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-bold text-red-800">Order {activeOrder.orderStatus}</p>
                    <p className="text-red-600 text-sm mt-1">
                      {activeOrder.orderStatus === 'Cancelled'
                        ? 'This order has been cancelled. Contact support if this was unexpected.'
                        : 'A refund has been initiated for this order.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="font-black text-slate-900 text-sm">Items Ordered</h3>
                <div className="space-y-3">
                  {activeOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-lg shrink-0 overflow-hidden">
                        {item.image && item.image.startsWith('data:') ? (
                          <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                        ) : item.image && item.image.length <= 2 ? (
                          <span>{item.image}</span>
                        ) : (
                          <Package className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                        <p className="text-[11px] text-slate-400">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
                {/* Totals */}
                <div className="border-t border-slate-100 pt-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal</span><span>{formatPrice(activeOrder.subtotal)}</span>
                  </div>
                  {activeOrder.discount > 0 && (
                    <div className="flex justify-between text-xs text-red-500">
                      <span>Discount</span><span>-{formatPrice(activeOrder.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Delivery</span><span>{formatPrice(activeOrder.deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-100">
                    <span>Total</span>
                    <span style={{ color: '#7c3aed' }}>{formatPrice(activeOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="font-black text-slate-900 text-sm">Delivery Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recipient</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{activeOrder.customerName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{activeOrder.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 col-span-2">
                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{activeOrder.address}, {activeOrder.city}{activeOrder.postalCode ? ', ' + activeOrder.postalCode : ''}</p>
                    </div>
                  </div>
                  {activeOrder.deliveryNote && (
                    <div className="flex items-start gap-3 col-span-2">
                      <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Note</p>
                        <p className="font-semibold text-slate-800 mt-0.5">{activeOrder.deliveryNote}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Back CTA */}
              <div className="text-center pt-2 pb-4">
                <a href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-violet-600 transition">
                  <ArrowLeft className="w-4 h-4" /> Continue Shopping <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
