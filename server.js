require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

// 🛡️ THE SHIELD: Forwards data exactly as it receives it
app.all("/sync-google", async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: process.env.GOOGLE_SCRIPT_URL,
      data: req.body, // This sends your exact Guest_name, Pickup, etc.
      params: req.query
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Sync failed" });
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
app.listen(PORT, () => console.log(`Backend running on ${PORT}`));