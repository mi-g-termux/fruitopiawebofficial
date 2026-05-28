/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order } from './types';
import { SiteSettings } from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateQRUrl(data: string, size = 150): string {
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&bgcolor=ffffff&color=000000&margin=10`;
}

function getTrackerUrl(orderNumber: string): string {
  return `${window.location.origin}/tracker?order=${encodeURIComponent(orderNumber)}`;
}

function formatCurrency(amount: number, settings: SiteSettings): string {
  const sym = settings.currencySymbol || '$';
  const pos = settings.currencyPosition || 'before';
  const rate = settings.currencyExchangeRate || 1;
  const val = (amount * rate).toFixed(2);
  return pos === 'before' ? `${sym}${val}` : `${val}${sym}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function paymentLabel(method: string): string {
  const map: Record<string, string> = {
    cod: 'Cash on Delivery',
    bkash_manual: 'bKash Manual',
    bkash_auto: 'bKash Automatic',
    nagad_manual: 'Nagad Manual',
    nagad_auto: 'Nagad Automatic',
    rocket_manual: 'Rocket Manual',
    stripe: 'Stripe Card',
    paypal: 'PayPal',
    sslcommerz: 'SSLCommerz',
    aamarpay: 'AamarPay',
    bank: 'Bank Transfer',
    card_manual: 'Credit Card',
  };
  return map[method] || method.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Invoice HTML Generator ───────────────────────────────────────────────────

export function generateInvoiceHTML(order: Order, settings: SiteSettings): string {
  const trackerUrl = getTrackerUrl(order.orderNumber);
  const qrUrl = generateQRUrl(trackerUrl, 160);
  const primaryColor = settings.themePrimaryColor || '#10B981';
  const storeName = settings.websiteName || 'Quirky-Fruity';
  const logoUrl = settings.logoUrl || '';

  const itemRows = order.items.map(item => `
    <tr>
      <td style="padding:10px 0; border-bottom:1px dashed #e5e7eb; font-size:13px; color:#374151;">${item.name}</td>
      <td style="padding:10px 0; border-bottom:1px dashed #e5e7eb; font-size:13px; color:#374151; text-align:center;">x${item.quantity}</td>
      <td style="padding:10px 0; border-bottom:1px dashed #e5e7eb; font-size:13px; color:#374151; text-align:right;">${formatCurrency(item.price * item.quantity, settings)}</td>
    </tr>
  `).join('');

  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="${storeName}" style="height:36px; width:auto; object-fit:contain; margin-bottom:2px;" />`
    : `<span style="font-size:22px; font-weight:900; color:${primaryColor}; font-family:sans-serif; letter-spacing:-0.5px;">${storeName}</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice #${order.orderNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc; padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; border:1.5px dashed ${primaryColor}; overflow:hidden; max-width:600px; width:100%;">
          
          <!-- HEADER -->
          <tr>
            <td style="padding:28px 32px 20px; border-bottom:2px solid ${primaryColor};">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top;">
                    ${logoBlock}
                    <div style="font-size:10px; color:#9ca3af; letter-spacing:1.5px; text-transform:uppercase; margin-top:4px;">Sales Receipt</div>
                  </td>
                  <td style="text-align:right; vertical-align:top;">
                    <div style="display:inline-block; background:${primaryColor}20; border:1px solid ${primaryColor}; border-radius:20px; padding:4px 14px; font-size:10px; font-weight:800; color:${primaryColor}; letter-spacing:1px; text-transform:uppercase;">${paymentLabel(order.paymentMethod)}</div>
                    <div style="font-size:11px; color:#6b7280; margin-top:8px; font-weight:600;">NO: <strong style="color:#111827; font-family:monospace;">${order.orderNumber}</strong></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CUSTOMER INFO -->
          <tr>
            <td style="padding:20px 32px; background:#f9fafb; border-bottom:1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="vertical-align:top;">
                    <div style="font-size:10px; color:#9ca3af; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:6px;">Customer</div>
                    <div style="font-size:13px; font-weight:800; color:#111827;">${order.customerName}</div>
                    <div style="font-size:12px; color:#6b7280;">${order.phone}</div>
                  </td>
                  <td width="50%" style="vertical-align:top;">
                    <div style="font-size:10px; color:#9ca3af; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:6px;">Address</div>
                    <div style="font-size:13px; font-weight:700; color:#111827;">${order.address}</div>
                    <div style="font-size:12px; color:#6b7280;">${order.city}${order.postalCode ? ', ' + order.postalCode : ''}</div>
                  </td>
                </tr>
                <tr>
                  <td style="vertical-align:top; padding-top:14px;">
                    <div style="font-size:10px; color:#9ca3af; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:6px;">Date</div>
                    <div style="font-size:13px; font-weight:700; color:#111827;">${formatDate(order.createdAt)}</div>
                  </td>
                  <td style="vertical-align:top; padding-top:14px;">
                    <div style="font-size:10px; color:#9ca3af; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:6px;">Payment</div>
                    <div style="font-size:13px; font-weight:700; color:#111827;">${paymentLabel(order.paymentMethod)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ITEMS TABLE -->
          <tr>
            <td style="padding:24px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <thead>
                  <tr>
                    <th style="text-align:left; font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:${primaryColor}; padding-bottom:10px; border-bottom:2px solid ${primaryColor};">Item</th>
                    <th style="text-align:center; font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:${primaryColor}; padding-bottom:10px; border-bottom:2px solid ${primaryColor};">Qty</th>
                    <th style="text-align:right; font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:${primaryColor}; padding-bottom:10px; border-bottom:2px solid ${primaryColor};">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- TOTALS -->
          <tr>
            <td style="padding:16px 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px; color:#6b7280; padding:4px 0;">Subtotal</td>
                  <td style="font-size:12px; color:#374151; font-weight:600; text-align:right; padding:4px 0;">${formatCurrency(order.subtotal, settings)}</td>
                </tr>
                ${order.discount > 0 ? `
                <tr>
                  <td style="font-size:12px; color:#6b7280; padding:4px 0;">Discount${order.couponApplied ? ` (${order.couponApplied})` : ''}</td>
                  <td style="font-size:12px; color:#ef4444; font-weight:600; text-align:right; padding:4px 0;">-${formatCurrency(order.discount, settings)}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="font-size:12px; color:#6b7280; padding:4px 0; border-bottom:1px dashed #e5e7eb; padding-bottom:12px;">Delivery &amp; Handling</td>
                  <td style="font-size:12px; color:#374151; font-weight:600; text-align:right; padding:4px 0; border-bottom:1px dashed #e5e7eb; padding-bottom:12px;">${formatCurrency(order.deliveryFee, settings)}</td>
                </tr>
                <tr>
                  <td style="font-size:15px; font-weight:900; color:#111827; padding-top:12px;">Grand Total</td>
                  <td style="font-size:16px; font-weight:900; color:${primaryColor}; text-align:right; padding-top:12px;">${formatCurrency(order.total, settings)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- QR CODE -->
          <tr>
            <td style="padding:20px 32px; text-align:center; border-top:1.5px dashed #e5e7eb; background:#fafafa;">
              <img src="${qrUrl}" alt="QR Code" style="width:120px; height:120px; border-radius:10px; border:1px solid #e5e7eb; padding:6px; background:#fff;" />
              <div style="font-size:10px; color:#9ca3af; margin-top:8px;">${trackerUrl}</div>
              <div style="font-size:10px; color:#9ca3af; margin-top:4px;">Scan QR code to view your order status</div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:16px 32px 24px; text-align:center; border-top:1px solid #e5e7eb;">
              <p style="font-size:13px; font-weight:700; color:${primaryColor}; margin:0 0 4px;">Thank you for your order!</p>
              <p style="font-size:10px; color:#9ca3af; margin:0;">&copy; ${new Date().getFullYear()} ${storeName} Ltd. All Rights Reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Email sender ─────────────────────────────────────────────────────────────

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  senderName: string;
  senderEmail: string;
}

async function sendEmail(to: string, subject: string, html: string, smtp: SmtpConfig) {
  const res = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, html, text: html.replace(/<[^>]*>/g, ''), smtp })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Failed to send email');
  }
  return res.json();
}

function buildSmtp(settings: SiteSettings): SmtpConfig | null {
  if (!settings.smtpEnabled || !settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
    return null;
  }
  return {
    host: settings.smtpHost,
    port: Number(settings.smtpPort) || 587,
    user: settings.smtpUser,
    pass: settings.smtpPass,
    senderName: settings.smtpSenderDisplayName || settings.websiteName || 'Store',
    senderEmail: settings.smtpSenderEmail || settings.smtpUser,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send order confirmation email to customer + notification to admin.
 * Call this right after a new order is placed successfully.
 */
export async function sendOrderConfirmationEmails(order: Order, settings: SiteSettings): Promise<void> {
  const smtp = buildSmtp(settings);
  if (!smtp) return; // SMTP not configured, silently skip

  const storeName = settings.websiteName || 'Store';
  const invoiceHtml = generateInvoiceHTML(order, settings);
  const trackerUrl = getTrackerUrl(order.orderNumber);

  // ── Customer email ────────────────────────────────────────────────────────
  const customerSubject = `✅ Order Confirmed! — ${order.orderNumber} | ${storeName}`;
  const customerHtml = `
    <div style="font-family:'Segoe UI',sans-serif; max-width:600px; margin:0 auto; padding:20px;">
      <h2 style="color:#10b981;">Your order has been confirmed! 🎉</h2>
      <p>Hi <strong>${order.customerName}</strong>,</p>
      <p>Thank you for shopping at <strong>${storeName}</strong>! Your order <code>${order.orderNumber}</code> has been successfully placed.</p>
      <p>
        <a href="${trackerUrl}" style="display:inline-block; background:#10b981; color:#fff; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:bold;">
          Track Your Order
        </a>
      </p>
      <p style="color:#6b7280; font-size:13px;">Your full invoice is attached below.</p>
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;" />
      ${invoiceHtml}
    </div>`;

  // ── Admin notification email ──────────────────────────────────────────────
  const adminEmail = settings.smtpSenderEmail || settings.smtpUser || '';
  const adminSubject = `🛒 New Order Received — ${order.orderNumber} | ${storeName}`;
  const adminHtml = `
    <div style="font-family:'Segoe UI',sans-serif; max-width:600px; margin:0 auto; padding:20px;">
      <h2 style="color:#374151;">New Order Received 📦</h2>
      <p>A new order has just been placed on <strong>${storeName}</strong>.</p>
      <table style="font-size:13px; width:100%; border-collapse:collapse;">
        <tr><td style="padding:6px 0; color:#6b7280;">Order No:</td><td style="font-weight:700;">${order.orderNumber}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">Customer:</td><td style="font-weight:700;">${order.customerName}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">Email:</td><td>${order.email}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">Phone:</td><td>${order.phone}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">City:</td><td>${order.city}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">Payment:</td><td style="text-transform:capitalize;">${paymentLabel(order.paymentMethod)}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">Total:</td><td style="font-weight:900; color:#10b981; font-size:15px;">${formatCurrency(order.total, settings)}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">Items:</td><td>${order.items.map(i => `${i.name} x${i.quantity}`).join(', ')}</td></tr>
      </table>
      <p><a href="${trackerUrl}" style="color:#10b981;">View order tracker →</a></p>
    </div>`;

  // Send both concurrently but don't crash if admin email isn't configured
  const promises: Promise<any>[] = [];
  if (order.email) promises.push(sendEmail(order.email, customerSubject, customerHtml, smtp));
  if (adminEmail && adminEmail !== order.email) promises.push(sendEmail(adminEmail, adminSubject, adminHtml, smtp));
  await Promise.allSettled(promises);
}

/**
 * Notify customer (and admin) when order status changes.
 */
export async function sendOrderStatusUpdateEmail(order: Order, newStatus: Order['orderStatus'], settings: SiteSettings): Promise<void> {
  const smtp = buildSmtp(settings);
  if (!smtp || !order.email) return;

  const storeName = settings.websiteName || 'Store';
  const trackerUrl = getTrackerUrl(order.orderNumber);

  const statusMessages: Record<string, { emoji: string; title: string; body: string }> = {
    Confirmed: {
      emoji: '✅',
      title: 'Your order has been confirmed!',
      body: `Great news! We've confirmed your order and our team is preparing it for dispatch.`,
    },
    Processing: {
      emoji: '🥤',
      title: 'Your order is being processed!',
      body: `Your order is now being processed and carefully prepared for you.`,
    },
    Shipped: {
      emoji: '🚚',
      title: 'Your order is on its way!',
      body: `Your order has been shipped and is heading to your delivery address. Track it in real time using the button below.`,
    },
    Delivered: {
      emoji: '⭐',
      title: 'Order delivered successfully!',
      body: `Your order has been delivered! We hope you enjoy it. Don't forget to leave us a review!`,
    },
    Cancelled: {
      emoji: '❌',
      title: 'Your order has been cancelled.',
      body: `We're sorry, but your order #${order.orderNumber} has been cancelled. If you think this is a mistake, please contact our support team.`,
    },
    Refunded: {
      emoji: '💸',
      title: 'Refund initiated for your order.',
      body: `A refund has been initiated for order #${order.orderNumber}. It may take a few business days to appear in your account.`,
    },
  };

  const msg = statusMessages[newStatus];
  if (!msg) return;

  const subject = `${msg.emoji} Order Update: ${newStatus} — ${order.orderNumber} | ${storeName}`;
  const html = `
    <div style="font-family:'Segoe UI',sans-serif; max-width:560px; margin:0 auto; padding:20px;">
      <h2>${msg.emoji} ${msg.title}</h2>
      <p>Hi <strong>${order.customerName}</strong>,</p>
      <p>${msg.body}</p>
      <p style="margin:20px 0;">
        <a href="${trackerUrl}" style="display:inline-block; background:#10b981; color:#fff; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:bold;">
          Track Your Order Live
        </a>
      </p>
      <table style="font-size:12px; color:#6b7280; width:100%; border-collapse:collapse; margin-top:16px;">
        <tr><td style="padding:4px 0;">Order No:</td><td><strong style="color:#111;">${order.orderNumber}</strong></td></tr>
        <tr><td style="padding:4px 0;">Status:</td><td><strong style="color:#10b981;">${newStatus}</strong></td></tr>
        <tr><td style="padding:4px 0;">Total:</td><td><strong>${formatCurrency(order.total, settings)}</strong></td></tr>
      </table>
      <p style="font-size:11px; color:#9ca3af; margin-top:24px;">&copy; ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
    </div>`;

  // Also notify admin
  const adminEmail = settings.smtpSenderEmail || settings.smtpUser || '';
  const adminSubject = `${msg.emoji} Order ${newStatus} — ${order.orderNumber} | ${storeName}`;
  const adminHtml = `
    <div style="font-family:'Segoe UI',sans-serif; max-width:560px; margin:0 auto; padding:20px;">
      <h2>Order Status Updated</h2>
      <p>Order <strong>${order.orderNumber}</strong> has been updated to <strong style="color:#10b981;">${newStatus}</strong>.</p>
      <table style="font-size:13px; width:100%; border-collapse:collapse;">
        <tr><td style="padding:4px 0; color:#6b7280;">Customer:</td><td>${order.customerName}</td></tr>
        <tr><td style="padding:4px 0; color:#6b7280;">Email:</td><td>${order.email}</td></tr>
        <tr><td style="padding:4px 0; color:#6b7280;">Total:</td><td>${formatCurrency(order.total, settings)}</td></tr>
        <tr><td style="padding:4px 0; color:#6b7280;">New Status:</td><td><strong>${newStatus}</strong></td></tr>
      </table>
    </div>`;

  const promises: Promise<any>[] = [sendEmail(order.email, subject, html, smtp)];
  if (adminEmail && adminEmail !== order.email) promises.push(sendEmail(adminEmail, adminSubject, adminHtml, smtp));
  await Promise.allSettled(promises);
}

/**
 * Notify customer and admin when order is cancelled.
 */
export async function sendOrderCancelledEmail(order: Order, settings: SiteSettings): Promise<void> {
  return sendOrderStatusUpdateEmail(order, 'Cancelled', settings);
}
