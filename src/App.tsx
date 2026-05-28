/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import InstallWizard from './components/InstallWizard';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import FavoritesMenu from './components/FavoritesMenu';
import CartModal from './components/CartModal';
import UserAuthModal from './components/UserAuthModal';
import OrderTrackerPage from './components/OrderTrackerPage';
import AdminPanel from './components/AdminPanel';
import Testimonial from './components/Testimonial';
import Newsletter from './components/Newsletter';
import Footer from './components/Footer';
import Toast from './components/Toast';
import { AnimatePresence } from 'motion/react';
import { Product } from './types';

export default function App() {
  const { isInstalled, isBootstrapping, siteSettings, orders, updateOrderStatus, toast } = useApp();

  const [showCart, setShowCart] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [selectedProductSearch, setSelectedProductSearch] = useState<Product | null>(null);

  // Dynamic routing based on URL path/hash references
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  useEffect(() => {
    const handleUrlChange = () => {
      setCurrentPath(window.location.pathname);
      setCurrentHash(window.location.hash);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Handle payment gateway callbacks (SSLCommerz, AamarPay, bKash, Nagad)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sslStatus = params.get('sslcommerz_status');
    const aamarpayStatus = params.get('aamarpay_status');
    const bkashCallback = params.get('bkash_callback');
    const nagadCallback = params.get('nagad_callback');

    if (sslStatus || aamarpayStatus || bkashCallback || nagadCallback) {
      // Clean URL
      window.history.replaceState({}, '', '/');
      if (sslStatus === 'success' || aamarpayStatus === 'success') {
        toast.success('Payment successful! Your order has been confirmed.');
      } else if (sslStatus === 'failed' || aamarpayStatus === 'failed') {
        toast.error('Payment failed. Please try again or choose another method.');
      } else if (sslStatus === 'cancelled' || aamarpayStatus === 'cancelled') {
        toast.info('Payment was cancelled.');
      } else if (bkashCallback === '1' || nagadCallback === '1') {
        toast.success('Payment completed! Your order is being processed.');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update dynamic document Title and customizable Theme styles
  useEffect(() => {
    if (siteSettings) {
      document.title = siteSettings.siteTitle || siteSettings.websiteName || 'Fruitopia — Fresh Organic Juice Bar';
      
      // Inject primary styles
      const primaryHex = siteSettings.themePrimaryColor || '#00b4d8';
      document.documentElement.style.setProperty('--color-primary', primaryHex);

      // Dynamically load custom favicon link in HTML head
      if (siteSettings.faviconUrl) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = siteSettings.faviconUrl;
      }
    }
  }, [siteSettings]);

  // Loading/Bootstrapping Screen to ensure Snapshot Listeners have checked Firestore
  if (isBootstrapping) {
    const loadEmoji = siteSettings?.loadingEmoji || '🍉';
    const loadName  = siteSettings?.loadingName  || siteSettings?.websiteName || 'Fruitopia Organic';
    return (
      <div className="font-sans antialiased min-h-screen bg-slate-950 flex flex-col justify-center items-center">
        <div className="text-center space-y-5">
          <div className="w-16 h-16 bg-teal-500 rounded-3xl flex items-center justify-center text-white text-3xl font-bold animate-bounce mx-auto shadow-xl shadow-teal-500/20">
            {loadEmoji}
          </div>
          <div className="space-y-1">
            <h1 className="text-slate-100 font-extrabold text-lg tracking-tight">{loadName}</h1>
            <p className="text-slate-400 text-xs font-mono animate-pulse">Verifying system config...</p>
          </div>
        </div>
      </div>
    );
  }

  // Gate 1: If application installation is not finished, serve setup installer wizards
  if (!isInstalled) {
    return (
      <div className="font-sans antialiased text-slate-800 min-h-screen bg-slate-50 transition-all duration-300">
        <InstallWizard />
        <Toast />
      </div>
    );
  }

  // Router layout choices
  const isTrackerRoute = currentPath.startsWith('/tracker');
  const isAdminRoute = currentHash === '#admin';

  return (
    <div className="font-sans antialiased text-slate-800 min-h-screen bg-slate-50 relative flex flex-col justify-between">
      
      <div className="flex-1">
        {/* Dynamic header navbar */}
        {!isAdminRoute && (
          <Navbar
            onOpenCart={() => setShowCart(true)}
            onOpenAuth={() => setShowAuth(true)}
            onSelectProduct={(p) => setSelectedProductSearch(p)}
          />
        )}

        {/* Core content body */}
        {isTrackerRoute ? (
          <OrderTrackerPage />
        ) : isAdminRoute ? (
          <AdminPanel />
        ) : (
          /* Main E-Commerce Homepage template */
          <main>
            <Hero />
            <FavoritesMenu
              selectedProductFromSearch={selectedProductSearch}
              onClearSelectedProduct={() => setSelectedProductSearch(null)}
            />
            <Testimonial />
            <Newsletter />
          </main>
        )}
      </div>

      {/* Brand Footer */}
      {!isAdminRoute && <Footer />}

      {/* Popup overlaps overlays */}
      <AnimatePresence>
        {showCart && <CartModal onClose={() => setShowCart(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showAuth && <UserAuthModal onClose={() => setShowAuth(false)} />}
      </AnimatePresence>

      {/* Global notifications toast container */}
      <Toast />
    </div>
  );
}
