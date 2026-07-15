const axios = require("axios");
const dotenv = require("dotenv");
const Account = require("../../models/account");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
dotenv.config();
const { Webhook } = require("discord-webhook-node");
const transactionHook = new Webhook(
  "https://discord.com/api/webhooks/1225837252706435243/ZVzyp0IAPNI23MHJJ9IhcYbOX71vxrJei0exfIT09grKGVJlGuf-2kNV-DmoDmY1F-vY"
);
transactionHook.setUsername("BLOXPVP");
transactionHook.setAvatar(
  "https://s3-alpha-sig.figma.com/img/2b34/f172/b5c4249c2ed513c73212e742814f4b54?Expires=1711324800&Key-Pair-Id=APKAQ4GOSFWCVNEHN3O4&Signature=Vpjq2og4gzlTx9nsXfXmBo9FYg3ZkHzKSVKf5gejUHqvUUSJLQpFaYLYowTYFB~gJ32aPnVwnrwP~oqKz2gmcrfjBleISf2gdDhXRdHWAc~mDfU33sf3Y6fKYww1pfkEjC17RAWHV60TUwmjauNfPG1-6jTOjYYwUO-X4nS7Dz1tr9OWjDYe2jAccfV4mApd83RFYASsJbnDNqbd7BCfAbiFR8VKe2jmsSBavksA~cBSWpNb4W4f7Udw7GzRgTTyjSodO3XFDxOiuYbsNHc-cTFa~7AIei7bYzibtLXQM09NXZBKhirk6jUhqb9tHvTiwF37jYYXepZemEmnTyz7qw__"
);
const { body, validationResult } = require("express-validator");

// https://withdraw-crypto.requestcatcher.com/
exports.sendPayout = [
  body("address").trim().escape(),
  body("amount").trim().escape(),
  body("currency").trim().escape(),
  body("network").trim().escape(),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { address, amount, currency, network } = req.body;
    const amountFloat = parseFloat(amount);

    if (!address || !amount || !currency || !network || Number.isNaN(amountFloat)) {
      return res.status(400).json({
        success: false,
        message: "Address, amount, currency, and network are required.",
      });
    }

    const userAccount = await Account.findById(userId).exec();
    if (!userAccount) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    if (!process.env.PAYOUT_API_KEY) {
      return res.status(500).json({
        success: false,
        message:
          "Missing PAYOUT_API_KEY in Backend/.env. Add your OxaPay payout key and restart the server.",
      });
    }

    const usdBalance = userAccount.balance; // Assuming balance is stored in USD

    const conversionUrl = "https://api.oxapay.com/merchants/rate";
    const conversionData = JSON.stringify({
      fromCurrency: "USD",
      toCurrency: currency.toUpperCase(),
    });

    try {
      const conversionResponse = await axios.post(conversionUrl, conversionData, {
        headers: { "Content-Type": "application/json" },
      });
      const conversionRate = conversionResponse.data.rate;

      if (amountFloat > usdBalance) {
        return res.status(400).json({
          success: false,
          message: "Your account balance is insufficient",
        });
      }

      const payoutData = {
        key: process.env.PAYOUT_API_KEY,
        address,
        amount: amountFloat * conversionRate,
        currency,
        network,
        callbackUrl: "https://api.bloxpvp.com/withdraw/callback",
      };

      const payoutResponse = await axios.post("https://api.oxapay.com/api/send", payoutData, {
        headers: { "Content-Type": "application/json" },
      });

      if (payoutResponse.data && payoutResponse.data.result === 100) {
        await Account.findByIdAndUpdate(userId, {
          $push: { withdrawalWalletAddresses: address },
        }).exec();

        await Account.findByIdAndUpdate(userId, {
          $inc: { balance: -amountFloat, withdrawn: amountFloat },
        }).exec();

        return res.json({
          success: true,
          data: payoutResponse.data,
        });
      }

      const failureMessage = payoutResponse.data?.message || "Payout initiation failed.";
      return res.status(500).json({
        success: false,
        message: failureMessage,
      });
    } catch (error) {
      console.error("Error in payout process:", error.response?.data || error.message || error);
      const errorMessage = error.response?.data?.message || error.message || "There was an error processing your payout.";
      return res.status(error.response?.status || 500).json({
        success: false,
        message: errorMessage,
      });
    }
  }),
];

exports.getBalance = asyncHandler(async (req, res) => {
  try {
    const account = await Account.findById(req.user.id);
    if (!account) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json({ success: true, balance: account.balance });
  } catch (error) {
    console.error("Error fetching balance:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the balance.",
    });
  }
});
