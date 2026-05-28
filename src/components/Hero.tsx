/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useApp } from '../context/AppContext';
import { ArrowDown, Clock, Leaf, Shield, Flame } from 'lucide-react';
import { motion } from 'motion/react';

export default function Hero() {
  const { siteSettings } = useApp();

  return (
    <section className="relative overflow-hidden bg-white/40 pb-16 pt-16 sm:pb-24 sm:pt-24 select-none">
      {/* Background ambient lighting blur circles */}
      <div className="absolute right-0 top-0 -z-10 h-96 w-96 rounded-full bg-emerald-100/40 blur-3xl" />
      <div className="absolute left-12 bottom-12 -z-10 h-72 w-72 rounded-full bg-sky-100/40 blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Main heading text column */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/50 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mx-auto lg:mx-0"
            >
              <Leaf className="w-3.5 h-3.5" />
              {siteSettings.heroBadge || 'DELICIOUSLY FRESH MENU'}
            </motion.div>

            {/* main high-contrast text */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
              <motion.span
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="block"
              >
                {siteSettings.heroTitleLine1 || 'Treat yourself'}
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="block text-emerald-600 font-black"
                style={{ color: siteSettings.themePrimaryColor }}
              >
                {siteSettings.heroTitleLine2 || 'with something fresh!'}
              </motion.span>
            </h1>

            {/* description paragraph */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-lg mx-auto lg:mx-0"
            >
              {siteSettings.heroSubtitle ||
                'Premium handcrafted recipes blended with handpicked organic produce.'}
            </motion.p>

            {/* active badges & quick metrics */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-semibold text-slate-500 pt-2"
            >
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span>{siteSettings.heroTimeBadge || '8 AM - 10 PM'}</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>100% Organic Guarantees</span>
              </div>
            </motion.div>

            {/* call-to-action button */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="pt-4"
            >
              <a
                href="#menu"
                className="inline-flex h-12 px-8 items-center justify-center gap-2 rounded-xl text-white font-bold text-sm bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-200 cursor-pointer"
                style={{ backgroundColor: siteSettings.themePrimaryColor }}
              >
                {siteSettings.heroButtonText || 'SEE MENU & ORDER'}
                <ArrowDown className="w-4 h-4" />
              </a>
            </motion.div>
          </div>

          {/* Right illustration/graphic column */}
          <div className="lg:col-span-5 flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="relative w-72 h-72 sm:w-80 sm:h-80 bg-white border border-slate-100 rounded-3xl shadow-xl flex items-center justify-center select-none"
            >
              {/* background design circles inside card */}
              <div className="absolute inset-4 rounded-2xl bg-gradient-to-br from-emerald-50/50 to-emerald-100/20" />
              
              {/* actual graphics display */}
              <div className="relative flex flex-col items-center">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                  className="text-[120px] select-none"
                >
                  🥤
                </motion.div>
                
                {/* sticker tag overlay */}
                <span className="absolute -bottom-6 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-lg shadow-slate-100/50 text-[10px] uppercase font-bold py-1.5 px-3 tracking-wider flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" /> Fresh Organic Blends
                </span>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
