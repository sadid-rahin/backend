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

// 2. IMPORTANT: Webhook needs RAW body (must come BEFORE express.json())
app.post("/stripe-webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`❌ Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // When payment is successful, send to Google Sheets
  if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
    console.log("💰 Payment successful! Syncing to Google Sheets...");
    
    // Note: You will need a function here to map the Stripe data back to your Sheet format
    // Or ensure your Frontend sends the data via /sync-google as well.
  }

  res.json({ received: true });
});

// Regular JSON parsing for other routes
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

app.post("/create-payment-intent", async (req, res) => {
  const { amount, metadata } = req.body; // Metadata helps track which guest is paying
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "aed",
      metadata: metadata, // Pass Guest Name / Booking ID here
      automatic_payment_methods: { enabled: true },
    });
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`🚀 Elite Backend live on port ${PORT}`));