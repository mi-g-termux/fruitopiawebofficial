/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { Heart, Star, ShoppingBag, X, MessageSquare, Info, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FavoritesMenuProps {
  selectedProductFromSearch: Product | null;
  onClearSelectedProduct: () => void;
}

export default function FavoritesMenu({ selectedProductFromSearch, onClearSelectedProduct }: FavoritesMenuProps) {
  const {
    categories,
    products,
    reviews,
    addReview,
    addToCart,
    formatPrice,
    toast
  } = useApp();

  const [activeCategory, setActiveCategory] = useState('all');
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Review submission state
  const [reviewerName, setReviewerName] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Synchronize dynamic search select from Navbar
  useEffect(() => {
    if (selectedProductFromSearch) {
      setSelectedProduct(selectedProductFromSearch);
      onClearSelectedProduct();
    }
  }, [selectedProductFromSearch]);

  // Load wishlist on mount
  useEffect(() => {
    const saved = localStorage.getItem('qf_wishlist');
    if (saved) {
      try {
        setWishlist(JSON.parse(saved));
      } catch (e) {
        setWishlist([]);
      }
    }
  }, []);

  // Filter categories that are marked visible
  const visibleCategories = categories.filter((c) => c.isVisible !== false);

  // Toggle wishlist item
  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated;
    if (wishlist.includes(id)) {
      updated = wishlist.filter((item) => item !== id);
      toast.info('Item removed from wishlist');
    } else {
      updated = [...wishlist, id];
      toast.success('Added item to wishlist!');
    }
    setWishlist(updated);
    localStorage.setItem('qf_wishlist', JSON.stringify(updated));
  };

  // Filter products by selected category tag
  const filteredProducts = products.filter((p) => {
    if (!p.isActive) return false;
    if (activeCategory === 'all') return true;
    
    // Fuzzy category matching (slug or ID)
    const targetSlug = visibleCategories.find((c) => c.id === activeCategory || c.slug === activeCategory)?.slug || '';
    return p.category.toLowerCase() === targetSlug.toLowerCase() || p.category.toLowerCase() === activeCategory.toLowerCase();
  });

  // Submit product review to database
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!reviewerName.trim() || !reviewComment.trim()) {
      toast.error('Please write a name and comments before submitting.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const newReview = {
        id: 'rev_' + Date.now().toString() + Math.random().toString(36).substring(2, 6),
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        reviewerName: reviewerName.trim(),
        rating: reviewRating,
        comment: reviewComment.trim(),
        createdAt: new Date().toISOString(),
        isApproved: false // Admin must approve review
      };

      await addReview(newReview);
      
      // Reset inputs
      setReviewerName('');
      setReviewComment('');
      setReviewRating(5);
    } catch (err) {
      toast.error('Failed to submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Get active product reviews that are approved by Moderator
  const activeProductReviews = selectedProduct
    ? reviews.filter((r) => r.productId === selectedProduct.id && r.isApproved)
    : [];

  return (
    <section id="menu" className="py-20 bg-slate-50 border-t border-b border-slate-100 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Visual Title */}
        <div className="text-center space-y-3">
          <span className="text-emerald-600 font-bold tracking-widest text-[11px] uppercase">
            Fresh from the kitchens
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            ALL TIME FAVORITES
          </h2>
          <div className="w-12 h-1 bg-emerald-500 mx-auto rounded-full" />
        </div>

        {/* Categories Tab Pill Strip */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-wide transition shadow-sm h-10 flex items-center justify-center gap-1.5 border leading-none cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-white border-slate-100 text-slate-500 hover:text-slate-800'
            }`}
          >
            📂 ALL ITEMS ({products.filter(p => p.isActive).length})
          </button>
          
          {visibleCategories.map((c) => {
            const count = products.filter((p) => {
              if (!p.isActive) return false;
              return p.category.toLowerCase() === c.slug.toLowerCase() || p.category.toLowerCase() === c.id.toLowerCase();
            }).length;

            return (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-wide transition shadow-sm h-10 flex items-center justify-center gap-1.5 border leading-none cursor-pointer ${
                  activeCategory === c.id
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-white border-slate-100 text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  {c.emoji.startsWith('data:') || c.emoji.startsWith('http') ? (
                    <img src={c.emoji} className="w-5 h-5 object-contain" alt={c.name} referrerPolicy="no-referrer" />
                  ) : (
                    c.emoji
                  )}
                </span>
                <span>{c.name}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Products Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((p) => {
            const isWishlisted = wishlist.includes(p.id);
            const isOutOfStock = p.stock === 0;
            const priceToUse = p.salePrice !== null ? p.salePrice : p.price;

            return (
              <motion.div
                key={p.id}
                layout
                onClick={() => setSelectedProduct(p)}
                className="bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md hover:border-slate-200/80 transition flex flex-col justify-between overflow-hidden cursor-pointer relative group h-108 select-none"
              >
                {/* Wishlist triggers */}
                <button
                  onClick={(e) => toggleWishlist(p.id, e)}
                  aria-label="Wishlist"
                  className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white border border-slate-100 shadow flex items-center justify-center transition hover:scale-110 shrink-0 cursor-pointer text-slate-400 hover:text-rose-500"
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>

                {/* Sales badge */}
                {p.salePrice !== null && (
                  <span className="absolute top-4 left-4 z-10 bg-amber-500 text-white rounded-lg px-2.5 py-1 text-[9px] uppercase font-bold tracking-wider">
                    Sale!
                  </span>
                )}

                {/* Image panel */}
                <div className="relative bg-slate-50/50 p-6 flex-1 flex items-center justify-center overflow-hidden h-44">
                  <div className="text-7xl group-hover:scale-105 transition duration-350">
                    {p.image.startsWith('data:') || p.image.startsWith('http') ? (
                      <img src={p.image} className="w-24 h-24 object-contain" alt={p.name} />
                    ) : (
                      p.image
                    )}
                  </div>
                </div>

                {/* Detail text metadata */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-3 text-left">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
                      <span>Rating: {p.rating} ★</span>
                      <span>{p.category}</span>
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-sm tracking-tight leading-snug line-clamp-1">{p.name}</h3>
                    <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">{p.description}</p>
                  </div>

                  <div className="space-y-4">
                    {/* stock level */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800">
                        {formatPrice(priceToUse)}
                        {p.salePrice !== null && (
                          <span className="text-[10px] text-slate-400 line-through font-normal ml-1.5">
                            {formatPrice(p.price)}
                          </span>
                        )}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                        isOutOfStock ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {isOutOfStock ? 'Out of Stock' : `• ${p.stock} in stock`}
                      </span>
                    </div>

                    {/* purchase triggers */}
                    <button
                      disabled={isOutOfStock}
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(p, 1);
                      }}
                      className="w-full h-9 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-sm shadow-emerald-50"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      {isOutOfStock ? 'Out of Stock' : 'ADD TO CART'}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Detailed Description modal popup */}
        <AnimatePresence>
          {selectedProduct && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-100 relative text-left"
              >
                {/* Close Button overlay */}
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Modal grid header */}
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="bg-slate-50/50 p-8 flex items-center justify-center overflow-hidden h-64 md:h-auto">
                    <span className="text-[120px]">
                      {selectedProduct.image.startsWith('data:') || selectedProduct.image.startsWith('http') ? (
                        <img src={selectedProduct.image} className="w-48 h-48 object-contain" alt={selectedProduct.name} />
                      ) : (
                        selectedProduct.image
                      )}
                    </span>
                  </div>

                  <div className="p-8 space-y-6">
                    <div className="space-y-2">
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-100 uppercase">
                        {selectedProduct.category} Catalog Item
                      </span>
                      <h3 className="text-2xl font-black text-slate-950 leading-tight">{selectedProduct.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                        <Star className="w-4 h-4 fill-amber-500" />
                        <span>{selectedProduct.rating} ({selectedProduct.reviewsCount} verified ratings)</span>
                      </div>
                    </div>

                    <p className="text-slate-500 text-xs leading-relaxed">{selectedProduct.description}</p>

                    {/* Ingredients labels if listed */}
                    {selectedProduct.ingredients && selectedProduct.ingredients.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Natural Ingredients</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedProduct.ingredients.map((ing, k) => (
                            <span key={k} className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                              {ing}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xl font-black text-slate-900">
                        {formatPrice(selectedProduct.salePrice !== null ? selectedProduct.salePrice : selectedProduct.price)}
                      </span>
                      <button
                        onClick={() => {
                          addToCart(selectedProduct, 1);
                          setSelectedProduct(null);
                        }}
                        disabled={selectedProduct.stock === 0}
                        className="h-10 px-6 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        {selectedProduct.stock === 0 ? 'Out of Stock' : 'ADD TO CART'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Review listings and submision block */}
                <div className="border-t border-slate-100 p-8 space-y-6">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-sm font-bold text-slate-900">Ratings & Client Testimonials</h4>
                  </div>

                  {/* Listings of active reviews */}
                  <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
                    {activeProductReviews.length === 0 ? (
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs text-slate-400">
                        No clients have rated this papaya/smoothie item yet. Be the first to leave comments!
                      </div>
                    ) : (
                      activeProductReviews.map((rev) => (
                        <div key={rev.id} className="p-4 border border-slate-100 rounded-xl space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-800 uppercase">{rev.reviewerName}</span>
                            <div className="flex items-center text-amber-500">
                              {Array.from({ length: rev.rating }).map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                              ))}
                            </div>
                          </div>
                          <p className="text-slate-500 text-xs italic">"{rev.comment}"</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Review Writer Form */}
                  <form onSubmit={handleReviewSubmit} className="space-y-4 pt-4 border-t border-slate-100">
                    <h5 className="text-xs font-bold text-slate-800 uppercase">Write your review</h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Your Full Name *</label>
                        <input
                          type="text"
                          required
                          value={reviewerName}
                          onChange={(e) => setReviewerName(e.target.value)}
                          className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white"
                          placeholder="e.g. Maria S."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Star score *</label>
                        <select
                          value={reviewRating}
                          onChange={(e) => setReviewRating(Number(e.target.value))}
                          className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white"
                        >
                          <option value="5">★★★★★ (5 Stars)</option>
                          <option value="4">★★★★☆ (4 Stars)</option>
                          <option value="3">★★★☆☆ (3 Stars)</option>
                          <option value="2">★★☆☆☆ (2 Stars)</option>
                          <option value="1">★☆☆☆☆ (1 Star)</option>
                        </select>
                      </div>
                      <div className="col-span-1 sm:col-span-2 space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Your review comment *</label>
                        <textarea
                          required
                          rows={2}
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg p-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white"
                          placeholder="Tell other shoppers why you loved our healthy smoothies..."
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="h-10 px-5 rounded-lg bg-slate-900 border border-slate-800 text-white hover:bg-slate-850 text-xs font-bold transition flex items-center justify-center cursor-pointer"
                    >
                      {isSubmittingReview ? 'Submitting...' : 'Submit review for approval'}
                    </button>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}
