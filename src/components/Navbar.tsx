/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { ShoppingCart, User, Search, MapPin, Menu, X, ArrowUpRight, ChevronDown, Sparkles } from 'lucide-react';

interface NavbarProps {
  onOpenCart: () => void;
  onOpenAuth: () => void;
  onSelectProduct: (product: Product) => void;
}

export default function Navbar({ onOpenCart, onOpenAuth, onSelectProduct }: NavbarProps) {
  const {
    siteSettings,
    cart,
    currentUser,
    logoutUser,
    products,
    formatPrice
  } = useApp();

  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter products by search query
  const filteredSearch = searchQuery.trim()
    ? products
        .filter(
          (p) =>
            p.isActive &&
            (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.category.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .slice(0, 6)
    : [];

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <>
      {/* Sticky Header promo alert banner */}
      {siteSettings.promoBannerEnabled && (
        <div id="promo-banner" className="bg-slate-900 border-b border-white/5 py-2 px-4 text-center sticky top-0 z-50 text-[11px] md:text-xs">
          <p className="tracking-wide text-white/90 font-medium flex items-center justify-center gap-2">
            <span className="inline-flex animate-bounce">📣</span> {siteSettings.promoBannerText}
          </p>
        </div>
      )}

      {/* Main navigation header */}
      <header className="sticky top-[37px] z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          
          {/* Logo Brand Segment */}
          <a href="#" className="flex items-center gap-2 shrink-0 group">
            {siteSettings.logoUrl ? (
              <img
                src={siteSettings.logoUrl}
                alt="Store Logo"
                className="h-10 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-xl shadow-md group-hover:scale-105 transition">
                {siteSettings.logoEmoji || '🥑'}
              </div>
            )}
            <span className="font-extrabold text-slate-800 tracking-tight text-lg group-hover:text-emerald-600 transition">
              {siteSettings.websiteName || 'Fruitopia'}
            </span>
          </a>

          {/* Core Desktop Navigation Menu */}
          <div className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <a href="#" className="hover:text-emerald-600 transition">Home</a>
            <a href="#menu" className="hover:text-emerald-600 transition">Menu</a>
            <a href="#testimonials" className="hover:text-emerald-600 transition">Reviews</a>
            <a href="#newsletter" className="hover:text-emerald-600 transition">Newsletter</a>
            {siteSettings.orderTrackerEnabled && (
              <a
                href="/tracker"
                className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-bold transition"
              >
                Track Shipping <ArrowUpRight className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Live Product Search Box */}
          <div ref={dropdownRef} className="hidden md:block relative max-w-xs w-full">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setShowSearchDropdown(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                placeholder="Search fresh products..."
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white text-xs transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>

            {/* Results Dropdown */}
            {showSearchDropdown && filteredSearch.length > 0 && (
              <div className="absolute top-11 left-0 right-0 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-50 z-50">
                {filteredSearch.map((product) => {
                  const price = product.salePrice !== null ? product.salePrice : product.price;
                  return (
                    <button
                      key={product.id}
                      onClick={() => {
                        onSelectProduct(product);
                        setShowSearchDropdown(false);
                        setSearchQuery('');
                      }}
                      className="w-full text-left p-3 hover:bg-slate-50 flex items-center gap-3 transition"
                    >
                      <div className="w-10 h-10 rounded-lg bg-emerald-50/50 flex items-center justify-center border border-slate-100 overflow-hidden text-lg shrink-0">
                        {product.image.startsWith('data:') || product.image.startsWith('http') ? (
                          <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
                        ) : (
                          product.image
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-xs truncate leading-snug">{product.name}</p>
                        <p className="text-[10px] text-slate-400 truncate leading-snug">{product.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-slate-800 text-xs text-emerald-600 block">
                          {formatPrice(price)}
                        </span>
                        {product.salePrice !== null && (
                          <span className="text-[9px] text-slate-400 line-through">
                            {formatPrice(product.price)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Buttons and Profiles controls */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Shopping Cart button with count badge */}
            <button
              id="navbar-cart-toggle"
              onClick={onOpenCart}
              className="relative p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalCartItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 bg-teal-500 text-white rounded-full flex items-center justify-center text-[10px] px-1 font-bold shadow-sm animate-pulse">
                  {totalCartItems}
                </span>
              )}
            </button>

            {/* User Profile sign-in or dropdown menu item */}
            {currentUser ? (
              <div className="relative group">
                <button
                  id="profile-dropdown-btn"
                  className="flex items-center gap-1.5 p-1.5 pr-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                >
                  <div className="w-7 h-7 bg-emerald-500 text-white rounded-lg flex items-center justify-center text-xs font-bold leading-none capitalize">
                    {currentUser.name.charAt(0)}
                  </div>
                  <span className="text-xs font-extrabold text-slate-700 max-w-16 truncate hidden sm:inline">
                    {currentUser.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown overlay */}
                <div className="absolute right-0 mt-1.5 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden w-48 z-50 py-1 hidden group-hover:block hover:block">
                  <div className="px-4 py-2 border-b border-slate-50">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Logged in as</p>
                    <p className="text-xs font-bold text-slate-800 truncate">{currentUser.email}</p>
                  </div>
                  <button
                    onClick={logoutUser}
                    className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-2 transition"
                  >
                    Logout Account
                  </button>
                </div>
              </div>
            ) : (
              <button
                id="sign-in-btn"
                onClick={onOpenAuth}
                className="h-10 px-4 rounded-xl font-bold text-slate-700 hover:bg-slate-50 border border-slate-200 text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <User className="w-4 h-4" />
                Sign In
              </button>
            )}

            {/* Mobile Nav Button */}
            <button
              onClick={() => setIsOpenMobile((prev) => !prev)}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition lg:hidden cursor-pointer"
            >
              {isOpenMobile ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile menu block */}
        {isOpenMobile && (
          <div className="border-t border-slate-100 bg-white p-4 flex flex-col gap-3 lg:hidden text-sm font-semibold text-slate-700">
            <a href="#" onClick={() => setIsOpenMobile(false)} className="py-2 hover:text-emerald-600 transition">
              Home
            </a>
            <a href="#menu" onClick={() => setIsOpenMobile(false)} className="py-2 hover:text-emerald-600 transition">
              Menu Items Catalog
            </a>
            <a href="#testimonials" onClick={() => setIsOpenMobile(false)} className="py-2 hover:text-emerald-600 transition">
              Reviews & Testimonials
            </a>
            <a href="#newsletter" onClick={() => setIsOpenMobile(false)} className="py-2 hover:text-emerald-600 transition">
              Subscribe Newsletter
            </a>
            {siteSettings.orderTrackerEnabled && (
              <a
                href="/tracker"
                onClick={() => setIsOpenMobile(false)}
                className="py-2 text-indigo-600 font-bold flex items-center gap-1"
              >
                Track Invoices <ArrowUpRight className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
      </header>
    </>
  );
}
