import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import crypto from "crypto";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── Firebase config ──────────────────────────────────────────────────────────
  const configPath = path.join(process.cwd(), 'firebase-config.json');

  app.get('/api/firebase-config', (req, res) => {
    try {
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf8');
        return res.json(JSON.parse(data));
      }
      return res.json({ status: 'not_configured' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/firebase-config', (req, res) => {
    try {
      const config = req.body;
      if (!config || !config.apiKey) return res.status(400).json({ error: 'Invalid configuration' });
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // ── SMTP email ───────────────────────────────────────────────────────────────
  app.post('/api/send-email', async (req, res) => {
    const { to, subject, text, html, smtp } = req.body;
    if (!to || !subject || (!text && !html)) return res.status(400).json({ error: 'Missing to, subject, or body (text/html)' });
    if (!smtp?.host || !smtp?.user || !smtp?.pass) return res.status(400).json({ error: 'SMTP settings missing' });
    try {
      const transporter = nodemailer.createTransport({
        host: smtp.host, port: Number(smtp.port) || 587,
        secure: Number(smtp.port) === 465,
        auth: { user: smtp.user, pass: smtp.pass },
        tls: { rejectUnauthorized: false }
      });
      const info = await transporter.sendMail({
        from: `"${smtp.senderName || 'Store'}" <${smtp.senderEmail || smtp.user}>`,
        to, subject,
        text: text || (html ? html.replace(/<[^>]*>/g, '') : ''),
        html: html || (text ? text.replace(/\n/g, '<br />') : '')
      });
      return res.json({ success: true, messageId: info.messageId });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── bKash Merchant API (real) ────────────────────────────────────────────────
  // Step 1: Get bKash token
  app.post('/api/bkash/token', async (req, res) => {
    const { appKey, appSecret, username, password, sandbox } = req.body;
    const base = sandbox
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta';
    try {
      const r = await fetch(`${base}/tokenized/checkout/token/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          username, password
        },
        body: JSON.stringify({ app_key: appKey, app_secret: appSecret })
      });
      const data = await r.json() as any;
      if (data.statusCode !== '0000') {
        return res.status(400).json({ error: data.statusMessage || 'bKash token failed' });
      }
      return res.json({ token: data.id_token });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Step 2: Create bKash payment
  app.post('/api/bkash/create', async (req, res) => {
    const { appKey, token, amount, orderId, callbackUrl, sandbox } = req.body;
    const base = sandbox
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta';
    try {
      const r = await fetch(`${base}/tokenized/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
          'X-APP-Key': appKey
        },
        body: JSON.stringify({
          mode: '0011',
          payerReference: orderId,
          callbackURL: callbackUrl,
          amount: String(amount),
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: orderId
        })
      });
      const data = await r.json() as any;
      if (data.statusCode !== '0000') {
        return res.status(400).json({ error: data.statusMessage || 'bKash create failed' });
      }
      return res.json({ bkashURL: data.bkashURL, paymentID: data.paymentID });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Step 3: Execute bKash payment (called after user returns from bKash)
  app.post('/api/bkash/execute', async (req, res) => {
    const { appKey, token, paymentID, sandbox } = req.body;
    const base = sandbox
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta';
    try {
      const r = await fetch(`${base}/tokenized/checkout/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
          'X-APP-Key': appKey
        },
        body: JSON.stringify({ paymentID })
      });
      const data = await r.json() as any;
      if (data.statusCode !== '0000') {
        return res.status(400).json({ error: data.statusMessage || 'bKash execute failed' });
      }
      return res.json({ success: true, trxID: data.trxID, paymentID: data.paymentID });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Nagad Merchant API (real) ────────────────────────────────────────────────
  // Nagad requires RSA-encrypted sensitive info
  function encryptNagad(data: string, publicKey: string): string {
    const buf = Buffer.from(data);
    const enc = crypto.publicEncrypt(
      { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
      buf
    );
    return enc.toString('base64');
  }

  function signNagad(data: string, privateKey: string): string {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    return sign.sign(privateKey, 'base64');
  }

  app.post('/api/nagad/init', async (req, res) => {
    const { merchantId, privateKey, publicKey, orderId, amount, callbackUrl, sandbox } = req.body;
    const base = sandbox
      ? 'https://sandbox.mynagad.com:10080/remote-payment-gateway-1.0'
      : 'https://api.mynagad.com';
    const datetime = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    try {
      const sensitiveData = JSON.stringify({ merchantId, datetime, orderId, challenge: crypto.randomBytes(16).toString('hex') });
      const encData = encryptNagad(sensitiveData, publicKey);
      const signature = signNagad(sensitiveData, privateKey);
      const r = await fetch(`${base}/api/dfs/check-out/initialize/${merchantId}/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-KM-IP-V4': '127.0.0.1', 'X-KM-Client-Type': 'PC_WEB', 'X-KM-Api-Version': 'v-0.2.0', datetime },
        body: JSON.stringify({ merchantId, datetime, orderId, challenge: encData, merchantCallbackURL: callbackUrl })
      });
      const data = await r.json() as any;
      if (!data.sensitiveData) return res.status(400).json({ error: data.message || 'Nagad init failed', raw: data });
      // Complete payment init
      const completeBody = {
        sensitiveData: encryptNagad(JSON.stringify({ merchantId, orderId, amount: String(amount), currencyCode: '050', challenge: data.challenge }), publicKey),
        signature: signNagad(JSON.stringify({ merchantId, orderId, amount: String(amount), currencyCode: '050' }), privateKey),
        merchantCallbackURL: callbackUrl,
        additionalMerchantInfo: {}
      };
      const r2 = await fetch(`${base}/api/dfs/check-out/complete/${data.paymentReferenceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-KM-IP-V4': '127.0.0.1', 'X-KM-Client-Type': 'PC_WEB', 'X-KM-Api-Version': 'v-0.2.0', datetime },
        body: JSON.stringify(completeBody)
      });
      const data2 = await r2.json() as any;
      if (!data2.callBackUrl) return res.status(400).json({ error: data2.message || 'Nagad complete failed', raw: data2 });
      return res.json({ redirectUrl: data2.callBackUrl });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/nagad/verify', async (req, res) => {
    const { merchantId, privateKey, paymentRefId, sandbox } = req.body;
    const base = sandbox
      ? 'https://sandbox.mynagad.com:10080/remote-payment-gateway-1.0'
      : 'https://api.mynagad.com';
    try {
      const r = await fetch(`${base}/api/dfs/verify/payment/${paymentRefId}`, {
        headers: { 'Content-Type': 'application/json', 'X-KM-Api-Version': 'v-0.2.0' }
      });
      const data = await r.json() as any;
      if (data.status !== 'Success') return res.status(400).json({ error: data.message || 'Nagad verify failed' });
      return res.json({ success: true, trxId: data.merchantOrderId });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── SSLCommerz (real) ────────────────────────────────────────────────────────
  app.post('/api/sslcommerz/init', async (req, res) => {
    const { storeId, storePassword, sandbox, order } = req.body;
    const base = sandbox
      ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
      : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';
    const origin = req.headers.origin || `http://localhost:3000`;
    const params = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePassword,
      total_amount: String(order.amount),
      currency: order.currency || 'BDT',
      tran_id: order.orderId,
      success_url: `${origin}/api/sslcommerz/success`,
      fail_url: `${origin}/api/sslcommerz/fail`,
      cancel_url: `${origin}/api/sslcommerz/cancel`,
      ipn_url: `${origin}/api/sslcommerz/ipn`,
      cus_name: order.customerName,
      cus_email: order.customerEmail,
      cus_phone: order.customerPhone,
      cus_add1: order.customerAddress,
      cus_city: order.customerCity,
      cus_country: 'Bangladesh',
      shipping_method: 'NO',
      product_name: 'Order',
      product_category: 'Food',
      product_profile: 'general'
    });
    try {
      const r = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const data = await r.json() as any;
      if (data.status !== 'SUCCESS') return res.status(400).json({ error: data.failedreason || 'SSLCommerz init failed' });
      return res.json({ gatewayPageURL: data.GatewayPageURL, sessionkey: data.sessionkey });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sslcommerz/validate', async (req, res) => {
    const { storeId, storePassword, sandbox, val_id } = req.body;
    const base = sandbox
      ? 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'
      : 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php';
    try {
      const url = `${base}?val_id=${val_id}&store_id=${storeId}&store_passwd=${storePassword}&v=1&format=json`;
      const r = await fetch(url);
      const data = await r.json() as any;
      if (data.status !== 'VALID' && data.status !== 'VALIDATED') return res.status(400).json({ error: 'SSLCommerz validation failed', status: data.status });
      return res.json({ success: true, bank_tran_id: data.bank_tran_id, tran_id: data.tran_id });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // SSLCommerz callback endpoints (receive POST from gateway)
  app.post('/api/sslcommerz/success', (req, res) => {
    const { tran_id, val_id } = req.body;
    return res.redirect(`/?sslcommerz_status=success&tran_id=${tran_id}&val_id=${val_id}`);
  });
  app.post('/api/sslcommerz/fail', (req, res) => {
    const { tran_id } = req.body;
    return res.redirect(`/?sslcommerz_status=failed&tran_id=${tran_id}`);
  });
  app.post('/api/sslcommerz/cancel', (req, res) => {
    return res.redirect(`/?sslcommerz_status=cancelled`);
  });
  app.post('/api/sslcommerz/ipn', (req, res) => {
    console.log('SSLCommerz IPN:', req.body);
    return res.json({ received: true });
  });

  // ── AamarPay (real) ──────────────────────────────────────────────────────────
  app.post('/api/aamarpay/init', async (req, res) => {
    const { storeId, signatureKey, sandbox, order } = req.body;
    const base = sandbox
      ? 'https://sandbox.aamarpay.com/jsonpost.php'
      : 'https://secure.aamarpay.com/jsonpost.php';
    const origin = req.headers.origin || `http://localhost:3000`;
    const payload = {
      store_id: storeId,
      tran_id: order.orderId,
      success_url: `${origin}/?aamarpay_status=success&tran_id=${order.orderId}`,
      fail_url: `${origin}/?aamarpay_status=failed&tran_id=${order.orderId}`,
      cancel_url: `${origin}/?aamarpay_status=cancelled`,
      amount: String(order.amount),
      currency: order.currency || 'BDT',
      signature_key: signatureKey,
      desc: `Order ${order.orderId}`,
      cus_name: order.customerName,
      cus_email: order.customerEmail,
      cus_phone: order.customerPhone,
      cus_add1: order.customerAddress,
      cus_add2: '',
      cus_city: order.customerCity,
      cus_country: 'Bangladesh',
      type: 'json'
    };
    try {
      const r = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await r.json() as any;
      if (!data.payment_url) return res.status(400).json({ error: data.error_message || 'AamarPay init failed', raw: data });
      return res.json({ payment_url: data.payment_url });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/aamarpay/verify', async (req, res) => {
    const { storeId, signatureKey, sandbox, tranId } = req.body;
    const base = sandbox
      ? 'https://sandbox.aamarpay.com/api/v1/trxcheck/request.php'
      : 'https://secure.aamarpay.com/api/v1/trxcheck/request.php';
    try {
      const url = `${base}?store_id=${storeId}&request_id=${tranId}&signature_key=${signatureKey}&type=json`;
      const r = await fetch(url);
      const data = await r.json() as any;
      if (data.pay_status !== 'Successful') return res.status(400).json({ error: 'AamarPay payment not successful', status: data.pay_status });
      return res.json({ success: true, mer_txnid: data.mer_txnid });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer();
