require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

// 🛡️ SECURE GOOGLE PROXY
// This endpoint hides your Google Script URL from the browser
app.all("/sync-google", async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: process.env.GOOGLE_SCRIPT_URL, // Loads from .env
      data: req.body,
      params: req.query
    });
    res.json(response.data);
  } catch (error) {
    console.error("Database Proxy Error:", error.message);
    res.status(500).json({ error: "Secure Database Sync Failed" });
  }
});

app.post("/create-payment-intent", async (req, res) => {
  const { amount } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "aed",
      automatic_payment_methods: { enabled: true },
    });
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Secure Backend running on port ${PORT}`));