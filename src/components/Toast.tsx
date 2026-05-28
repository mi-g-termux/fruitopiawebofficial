/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useApp } from '../context/AppContext';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export default function Toast() {
  const { toasts, removeToast } = useApp();

  return (
    <div id="toast-container" className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          let bgClass = 'bg-slate-900/95 border-slate-800 text-white';
          let Icon = Info;

          if (toast.type === 'success') {
            bgClass = 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-emerald-100/50';
            Icon = CheckCircle;
          } else if (toast.type === 'error') {
            bgClass = 'bg-rose-50 border-rose-200 text-rose-800 shadow-rose-100/50';
            Icon = AlertCircle;
          } else if (toast.type === 'info') {
            bgClass = 'bg-sky-50 border-sky-200 text-sky-800 shadow-sky-100/50';
            Icon = Info;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className={`p-4 rounded-xl border flex items-start gap-3 shadow-lg pointer-events-auto ${bgClass}`}
              layout
            >
              <Icon className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm font-medium leading-relaxed">
                {toast.message}
              </div>
              <button
                id={`close-toast-${toast.id}`}
                onClick={() => removeToast(toast.id)}
                className="opacity-60 hover:opacity-100 transition p-0.5 rounded hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
