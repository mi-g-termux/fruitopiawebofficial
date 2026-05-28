/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export default function Newsletter() {
  const { subscribeNewsletter, toast } = useApp();
  const [emailInput, setEmailInput] = useState('');
  const [isSubbing, setIsSubbing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setIsSubbing(true);
    try {
      const newSub = {
        id: 'sub_' + Date.now().toString() + Math.random().toString(36).substring(2, 6),
        email: emailInput.trim().toLowerCase(),
        subscribedAt: new Date().toISOString()
      };
      await subscribeNewsletter(newSub);
      setEmailInput('');
    } catch (err) {
      toast.error('Failed to register subscription.');
    } finally {
      setIsSubbing(false);
    }
  };

  return (
    <section id="newsletter" className="py-20 bg-emerald-50 border-b border-emerald-100/50 select-none">
      <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
        
        {/* Header */}
        <div className="space-y-2">
          <span className="text-emerald-700 bg-white/60 border border-emerald-100 rounded-full font-bold px-3 py-1.5 text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Newsletter subscription
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            GET FRESH HEALTHY RECIPES MONTHLY
          </h2>
          <p className="text-slate-500 text-xs max-w-sm mx-auto leading-relaxed">
            Blended with absolute health. Get discounts, smoothie recipes, and seasonal organic fruit updates.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto pt-2">
          <div className="relative flex-1">
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter your personal email address..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-xs"
            />
            <Mail className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
          </div>
          <button
            type="submit"
            disabled={isSubbing}
            className="h-11 px-6 bg-slate-950 hover:bg-slate-850 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            {isSubbing ? 'Subscribed' : 'SUBSCRIBE'}
          </button>
        </form>

      </div>
    </section>
  );
}
