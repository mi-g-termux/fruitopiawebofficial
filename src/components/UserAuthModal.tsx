/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { simpleHash } from '../db';
import { X, UserPlus, LogIn, Lock, Mail, Compass, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

interface UserAuthModalProps {
  onClose: () => void;
}

// Helper: send email via backend SMTP API
async function sendSmtpEmail(opts: {
  to: string;
  subject: string;
  body: string;
  smtp: { host: string; port: number; user: string; pass: string; senderName: string; senderEmail: string };
}) {
  const res = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: opts.to,
      subject: opts.subject,
      text: opts.body,
      smtp: opts.smtp
    })
  });
  return res.ok;
}

export default function UserAuthModal({ onClose }: UserAuthModalProps) {
  const { registerUser, loginUser, resetPassword, siteSettings, toast } = useApp();

  // Mode flags
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStage, setForgotStage] = useState<'email' | 'otp' | 'reset'>('email');

  // Signup verification state (when emailSignupVerifyEnabled)
  const [signupStage, setSignupStage] = useState<'form' | 'verify'>('form');
  const [signupOtp, setSignupOtp] = useState('');
  const [signupEnteredOtp, setSignupEnteredOtp] = useState('');
  const [pendingUser, setPendingUser] = useState<any>(null);

  // General inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Dhaka');

  // Forgot password states
  const [resetEmail, setResetEmail] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [userEnteredOtp, setUserEnteredOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Simulated device overlay
  const [showSimulatedDevice, setShowSimulatedDevice] = useState(false);
  const [simulatedContent, setSimulatedContent] = useState({ subject: '', body: '', targetEmail: '' });

  // Build SMTP config from siteSettings
  const buildSmtpConfig = () => ({
    host: siteSettings.smtpHost || '',
    port: Number(siteSettings.smtpPort) || 587,
    user: siteSettings.smtpUser || '',
    pass: siteSettings.smtpPass || '',
    senderName: siteSettings.smtpSenderDisplayName || siteSettings.websiteName || 'Fruitopia',
    senderEmail: siteSettings.smtpSenderEmail || siteSettings.smtpUser || ''
  });

  const isSmtpConfigured = () => {
    const s = siteSettings;
    return !!(s.smtpHost && s.smtpUser && s.smtpPass);
  };

  const buildEmailBody = (template: string, code: string) => {
    const storeName = siteSettings.websiteName || 'Fruitopia';
    const expiry = siteSettings.emailOtpExpiryMinutes || 10;
    return template
      .replace(/\{\{code\}\}/g, code)
      .replace(/\{\{store\}\}/g, storeName)
      .replace(/\{\{expiry\}\}/g, String(expiry));
  };

  // ─── SIGNUP ────────────────────────────────────────────────────────────────
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Email and password fields are required.');
      return;
    }

    if (isRegistering) {
      if (!name.trim() || !phone.trim() || !address.trim()) {
        toast.error('Please fill in name, phone, and shipping address.');
        return;
      }

      const userPayload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        passwordHash: simpleHash(password)
      };

      // If admin has enabled signup email verification
      if (siteSettings.emailSignupVerifyEnabled) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        setSignupOtp(otp);
        setPendingUser(userPayload);

        const storeName = siteSettings.websiteName || 'Fruitopia';
        const subject = siteSettings.emailSignupSubject || `Verify your ${storeName} account`;
        const bodyTemplate = siteSettings.emailSignupBodyTemplate ||
          `Hi there!\n\nYour ${storeName} verification code is: {{code}}\n\nThis code expires in {{expiry}} minutes.\n\nIf you did not request this, please ignore this email.`;
        const body = buildEmailBody(bodyTemplate, otp);

        setSimulatedContent({ subject, body, targetEmail: email.trim() });
        setShowSimulatedDevice(true);

        if (isSmtpConfigured()) {
          try {
            const ok = await sendSmtpEmail({ to: email.trim(), subject, body, smtp: buildSmtpConfig() });
            if (ok) {
              toast.success(`Verification email sent to ${email.trim()}!`);
            } else {
              toast.warn('SMTP send failed. Check the code in the simulated panel.');
            }
          } catch {
            toast.warn('SMTP error. Showing code in simulated panel.');
          }
        } else {
          toast.info('SMTP not configured. Showing code in simulated panel.');
        }

        setSignupStage('verify');
      } else {
        // No verification required, register directly
        const success = await registerUser(userPayload);
        if (success) onClose();
      }
    } else {
      // Sign-in
      const success = await loginUser(email.trim(), password);
      if (success) onClose();
    }
  };

  // ─── SIGNUP OTP VERIFY ────────────────────────────────────────────────────
  const handleSignupOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupEnteredOtp.trim() !== signupOtp) {
      toast.error('Invalid verification code. Please try again.');
      return;
    }
    if (!pendingUser) return;
    const success = await registerUser(pendingUser);
    if (success) {
      toast.success('Email verified! Account created successfully.');
      onClose();
    }
  };

  // ─── FORGOT PASSWORD ──────────────────────────────────────────────────────
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error('Please input your registered email address.');
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);

    const storeName = siteSettings.websiteName || 'Fruitopia';
    const subject = siteSettings.emailOtpSubject || `Your ${storeName} password reset code`;
    const bodyTemplate = siteSettings.emailOtpBodyTemplate ||
      siteSettings.smsOtpTemplate ||
      `Hi,\n\nYour ${storeName} password reset code is: {{code}}\n\nThis code is valid for {{expiry}} minutes.\n\nIf you did not request a password reset, please ignore this email.`;
    const body = buildEmailBody(bodyTemplate, otp);

    setSimulatedContent({ subject, body, targetEmail: resetEmail.trim() });
    setShowSimulatedDevice(true);
    toast.success('OTP triggered! Check the simulated panel or your inbox.');

    if (isSmtpConfigured()) {
      try {
        const ok = await sendSmtpEmail({ to: resetEmail.trim(), subject, body, smtp: buildSmtpConfig() });
        if (ok) {
          toast.success(`Reset email sent to ${resetEmail.trim()}!`);
        } else {
          toast.warn('SMTP send failed. Check the code in the simulated panel.');
        }
      } catch {
        toast.warn('SMTP error. Showing code in simulated panel.');
      }
    } else {
      toast.info('SMTP not configured. Showing code in simulated panel.');
    }

    setForgotStage('otp');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (userEnteredOtp.trim() === generatedOtp) {
      toast.success('OTP verified! Set your new password.');
      setForgotStage('reset');
    } else {
      toast.error('Invalid verification code. Please re-enter.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      toast.error('Password must be at least 4 characters.');
      return;
    }
    const success = await resetPassword(resetEmail.trim().toLowerCase(), newPassword);
    if (success) {
      setIsForgotPassword(false);
      setForgotStage('email');
      setEmail(resetEmail);
      toast.success('Password updated! You can now sign in.');
    }
  };

  return (
    <div id="auth-modal-overlay" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">

      {/* Simulation Box */}
      {showSimulatedDevice && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-teal-500/30 z-[60] text-xs font-mono select-all"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
            <span className="text-teal-400 font-bold uppercase tracking-wider text-[10px]">
              📡 SMTP EMAIL SIMULATOR
            </span>
            <button onClick={() => setShowSimulatedDevice(false)} className="text-white hover:text-rose-400 font-bold">[X]</button>
          </div>
          <div className="space-y-1.5 leading-relaxed text-left">
            <p><span className="text-slate-400">TO:</span> <span className="text-amber-300 font-bold">{simulatedContent.targetEmail}</span></p>
            <p><span className="text-slate-400">FROM:</span> <span className="text-slate-300">{siteSettings.smtpSenderDisplayName || siteSettings.websiteName || 'Fruitopia'} &lt;{siteSettings.smtpSenderEmail || siteSettings.smtpUser || 'noreply@store.com'}&gt;</span></p>
            <p><span className="text-slate-400">SUBJECT:</span> <span className="text-white font-bold font-sans">{simulatedContent.subject}</span></p>
            <div className="border border-white/5 bg-black/60 rounded-lg p-3 text-[11px] text-teal-300 leading-normal font-sans py-2.5 mt-2 whitespace-pre-line">
              {simulatedContent.body}
            </div>
            <p className="text-[10px] text-slate-400 text-center pt-2 italic">Copy the OTP code above and enter it below.</p>
          </div>
        </motion.div>
      )}

      {/* Container card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl border border-slate-100 relative text-left select-none"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* FORGOT PASSWORD FLOW */}
        {isForgotPassword ? (
          <div className="space-y-5">
            <div className="text-center space-y-2 pb-5 border-b border-slate-100">
              <span className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center text-xl mx-auto">🔑</span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">Forgot Passphrase</h3>
              <p className="text-slate-400 text-xs">
                {forgotStage === 'email' && 'Enter your email to receive a reset code.'}
                {forgotStage === 'otp' && 'Check your inbox or the simulated panel for the code.'}
                {forgotStage === 'reset' && 'Enter your new password below.'}
              </p>
            </div>

            {forgotStage === 'email' && (
              <form onSubmit={handleRequestOtp} className="space-y-4 pt-1 text-xs font-semibold text-slate-600">
                <div className="space-y-1">
                  <label>Your Registered Email</label>
                  <input type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-rose-500 bg-slate-50 focus:bg-white text-xs"
                    placeholder="e.g. buyer@example.com" />
                </div>
                <button type="submit" className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition">
                  SEND RESET CODE
                </button>
              </form>
            )}

            {forgotStage === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4 pt-1 text-xs font-semibold text-slate-600">
                <div className="space-y-1">
                  <label>Enter 6-Digit Verification Code</label>
                  <input type="text" required maxLength={6} value={userEnteredOtp} onChange={(e) => setUserEnteredOtp(e.target.value)}
                    className="w-full h-11 border border-slate-200 rounded-lg px-3 tracking-widest text-center text-lg font-bold focus:outline-none focus:ring-1 focus:ring-rose-500 bg-slate-50"
                    placeholder="000000" />
                </div>
                <button type="submit" className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition">
                  VERIFY CODE
                </button>
                <div className="text-center">
                  <button type="button" onClick={() => setForgotStage('email')} className="text-slate-400 hover:text-slate-600 text-[10px]">
                    Change Email
                  </button>
                </div>
              </form>
            )}

            {forgotStage === 'reset' && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4 pt-1 text-xs font-semibold text-slate-600">
                <div className="space-y-1">
                  <label>New Password</label>
                  <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50"
                    placeholder="Min 4 characters…" />
                </div>
                <button type="submit" className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition">
                  UPDATE PASSWORD
                </button>
              </form>
            )}

            <div className="pt-2 text-center">
              <button onClick={() => setIsForgotPassword(false)} className="text-slate-500 hover:text-slate-800 font-bold text-xs">
                Back to Sign In
              </button>
            </div>
          </div>

        ) : isRegistering && signupStage === 'verify' ? (
          /* EMAIL VERIFICATION STAGE FOR SIGNUP */
          <div className="space-y-5">
            <div className="text-center space-y-2 pb-5 border-b border-slate-100">
              <span className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-xl mx-auto">📧</span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">Verify Your Email</h3>
              <p className="text-slate-400 text-xs">A 6-digit code was sent to <strong>{email}</strong>. Enter it to complete registration.</p>
            </div>
            <form onSubmit={handleSignupOtpVerify} className="space-y-4 pt-1 text-xs font-semibold text-slate-600">
              <div className="space-y-1">
                <label>6-Digit Verification Code</label>
                <input type="text" required maxLength={6} value={signupEnteredOtp} onChange={(e) => setSignupEnteredOtp(e.target.value)}
                  className="w-full h-11 border border-slate-200 rounded-lg px-3 tracking-widest text-center text-lg font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                  placeholder="000000" />
              </div>
              <button type="submit" className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition">
                VERIFY & CREATE ACCOUNT
              </button>
              <div className="text-center">
                <button type="button" onClick={() => { setSignupStage('form'); setShowSimulatedDevice(false); }} className="text-slate-400 hover:text-slate-600 text-[10px]">
                  Go back and edit details
                </button>
              </div>
            </form>
          </div>

        ) : (
          /* STANDARD SIGN IN / REGISTER FORM */
          <>
            <div className="text-center space-y-2 pb-5 border-b border-slate-150">
              <span className="w-11 h-11 bg-teal-50 rounded-xl flex items-center justify-center text-xl mx-auto">
                {isRegistering ? '🌱' : '🌸'}
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">
                {isRegistering ? 'Register Account' : 'Customer Sign In'}
              </h3>
              <p className="text-slate-400 text-xs">
                {isRegistering ? 'Save shipping parameters for quick future checkouts.' : 'Access order histories and checkout faster.'}
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4 pt-5 text-xs font-semibold text-slate-600">
              <div className="space-y-1">
                <label>Email Address *</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50 focus:bg-white text-xs"
                  placeholder="you@email.com" />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label>Passphrase *</label>
                  {!isRegistering && (
                    <button type="button" onClick={() => { setIsForgotPassword(true); setForgotStage('email'); setResetEmail(email); }}
                      className="text-teal-600 hover:text-teal-700 font-bold text-[10px]">
                      Forgot Password?
                    </button>
                  )}
                </div>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50 focus:bg-white text-xs"
                  placeholder="••••••••••••" />
              </div>

              {isRegistering && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="space-y-1">
                    <label>Recipient Name *</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:outline-none text-xs" placeholder="e.g. Maria S." />
                  </div>
                  <div className="space-y-1">
                    <label>Contact Phone *</label>
                    <input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:outline-none text-xs" placeholder="e.g. +880 17…" />
                  </div>
                  <div className="space-y-1">
                    <label>Delivery Home Address *</label>
                    <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:outline-none text-xs" placeholder="House, road, sector…" />
                  </div>
                  <div className="space-y-1">
                    <label>Delivery City / Region *</label>
                    <input type="text" required value={city} onChange={(e) => setCity(e.target.value)}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 focus:outline-none text-xs" placeholder="Dhaka" />
                  </div>
                  {siteSettings.emailSignupVerifyEnabled && (
                    <div className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[10px] font-bold">Email verification required — a code will be sent to your email.</span>
                    </div>
                  )}
                </motion.div>
              )}

              <button type="submit"
                className="w-full h-10 bg-slate-900 tracking-wide text-white text-xs font-bold rounded-lg hover:bg-slate-850 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                {isRegistering ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                {isRegistering
                  ? (siteSettings.emailSignupVerifyEnabled ? 'CONTINUE TO VERIFICATION' : 'CREATE ACCOUNT')
                  : 'SECURE SIGN IN'}
              </button>
            </form>

            <div className="pt-4 text-center">
              <button onClick={() => { setIsRegistering((prev) => !prev); setSignupStage('form'); }}
                className="text-teal-600 hover:text-teal-700 font-bold text-xs">
                {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
