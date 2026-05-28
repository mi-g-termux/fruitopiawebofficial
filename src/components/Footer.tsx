/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useApp } from '../context/AppContext';
import { Phone, Mail, MapPin, ArrowUp } from 'lucide-react';

export default function Footer() {
  const { siteSettings } = useApp();

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-white/95 py-16 px-4 selection:bg-teal-500 selection:text-white select-none">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10">
        
        {/* Brand segment */}
        <div className="md:col-span-5 space-y-4 text-left">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-teal-500 rounded-lg flex items-center justify-center text-lg shadow-sm">
              🥑
            </div>
            <span className="font-extrabold text-white tracking-tight">
              {siteSettings.websiteName || 'Fruitopia'}
            </span>
          </div>

          <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
            {siteSettings.footerText ||
              'A modern dynamic organic fruit and smoothie e-commerce store built for vibrant lives.'}
          </p>

          <p className="text-[10px] text-slate-500 font-bold font-mono uppercase">
            {siteSettings.trademarkText || '© 2026 QUIRKY-FRUITY. ALL RIGHTS RESERVED.'}
          </p>
        </div>

        {/* Links Column */}
        <div className="md:col-span-3 text-left space-y-4">
          <h4 className="font-extrabold text-xs tracking-wider text-teal-400 uppercase">Directory</h4>
          <ul className="space-y-2 text-xs font-bold text-slate-300">
            {siteSettings.footerLinks?.map((lnk, idx) => (
              <li key={idx}>
                <a href={lnk.url} className="hover:text-white transition">
                  {lnk.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact info column */}
        <div className="md:col-span-4 text-left space-y-4 text-xs font-medium text-slate-300">
          <h4 className="font-extrabold text-xs tracking-wider text-teal-400 uppercase">CONTACT SUPPORT</h4>
          <div className="space-y-3 font-semibold leading-relaxed">
            <div className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
              <span>{siteSettings.contactPhone || '+880 1711-234567'}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
              <span className="truncate">{siteSettings.contactEmail || 'help@fruitopia.com'}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
              <span className="leading-snug">
                {siteSettings.contactAddress || 'Orchard Lane, Dhaka, Bangladesh'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Back to top row */}
      <div className="max-w-7xl mx-auto border-t border-slate-800 mt-12 pt-6 flex justify-between items-center text-[11px] text-slate-500 font-bold font-mono">
        <span>CRAFTED IN DUO ENGINE CLUSTER</span>
        <button
          onClick={handleScrollTop}
          className="flex items-center gap-1 hover:text-white transition uppercase cursor-pointer"
        >
          TOP <ArrowUp className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
}
