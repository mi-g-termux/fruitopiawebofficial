/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Testimonial() {
  const { reviews } = useApp();
  const [activeIndex, setActiveIndex] = useState(0);

  // Filter approved reviews only
  const approvedReviews = reviews.filter((r) => r.isApproved);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? approvedReviews.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === approvedReviews.length - 1 ? 0 : prev + 1));
  };

  if (approvedReviews.length === 0) return null;

  const currentReview = approvedReviews[activeIndex];

  return (
    <section id="testimonials" className="py-20 bg-white border-b border-slate-100 relative overflow-hidden select-none">
      <div className="absolute right-0 top-0 text-slate-100 pointer-events-none scale-150 rotate-12 opacity-50 select-none">
        <Quote className="w-64 h-64" />
      </div>
      
      <div className="max-w-4xl mx-auto px-4 text-center space-y-8 relative z-10">
        
        {/* Title */}
        <div className="space-y-2">
          <span className="text-emerald-600 font-bold tracking-widest text-[11px] uppercase">
            Client Stories
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            WHAT OUR HEALTHY DRINKERS SAY
          </h2>
          <div className="w-12 h-1 bg-emerald-500 mx-auto rounded-full" />
        </div>

        {/* Swipe cards */}
        <div className="min-h-48 flex flex-col justify-center items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              className="space-y-4 max-w-2xl mx-auto p-4"
            >
              <div className="flex items-center justify-center text-amber-500">
                {Array.from({ length: currentReview.rating }).map((_, idx) => (
                  <Star key={idx} className="w-5 h-5 fill-amber-500 text-amber-500" />
                ))}
              </div>

              <blockquote className="text-slate-600 text-sm md:text-base italic leading-relaxed">
                "{currentReview.comment}"
              </blockquote>

              <div>
                <p className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                  {currentReview.reviewerName}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Verified Shopper • {currentReview.productName}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel controls */}
        {approvedReviews.length > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handlePrev}
              aria-label="Previous Review"
              className="p-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>
            <span className="text-[10px] text-slate-400 font-bold font-mono">
              {activeIndex + 1} / {approvedReviews.length}
            </span>
            <button
              onClick={handleNext}
              aria-label="Next Review"
              className="p-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              <ChevronRight className="w-4.5 h-4.5" />
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
