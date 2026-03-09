require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

// 1. Professional CORS setup
app.use(cors({
  origin: ["https://eliteride.org", "https://www.eliteride.org"],
  methods: ["GET", "POST"],
  credentials: true
}));

// 2. Webhook needs RAW body (MUST come BEFORE express.json)
app.post("/stripe-webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`❌ Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
    console.log("💰 Payment successful! Syncing to Google Sheets...");
  }

  res.json({ received: true });
});

// Regular JSON parsing for all other routes
app.use(express.json());

// 🛡️ THE SHIELD: Forwards data to Google Apps Script
app.all("/sync-google", async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: process.env.GOOGLE_SCRIPT_URL,
      data: req.body, 
      params: req.query
    });
    res.json(response.data);
  } catch (error) {
    console.error("Sync Error:", error.message);
    res.status(500).json({ error: "Sync failed" });
  }
});

// 💳 THE PAYMENT ENGINE: Updated to fix the AED Payment Method Error
app.post("/create-payment-intent", async (req, res) => {
  const { amount, metadata } = req.body; 
  try {
    console.log(`Initiating payment for: ${amount} AED`);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to fils
      currency: "aed",
      metadata: metadata || {}, 
      // Changed to explicitly include card payments for AED compatibility
      payment_method_types: ['card'], 
    });
    
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("❌ STRIPE ERROR:", error.message);
    res.status(500).send({ error: error.message });
  }
});

// 🚀 Fixed PORT for Render (0.0.0.0 is required for public access)
const PORT = process.env.PORT || 4242;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Elite Backend live on port ${PORT}`);
});