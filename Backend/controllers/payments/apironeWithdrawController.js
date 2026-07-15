const axios = require("axios");
const { body } = require("express-validator");
const asyncHandler = require("express-async-handler");
const Account = require("../../models/account");

const APIRONE_CONFIG = {
  LTC: {
    walletId: "ltc-5a419029fddc7d70fcdf65c017a60caf",
    transferKey: "5783WsEMSMikcSCNokHW40kuqz0IFvqD",
    baseUrl: "https://apirone.com/api/v2",
  },
  ETH: {
    walletId: "eth-4581363dc6769871bde070c956887a04",
    transferKey: "NLbwQXLiPoWLcNYjGApfCbTpTbaOa8Av",
    baseUrl: "https://apirone.com/api/v2",
  },
};

const UNIT_MULTIPLIERS = {
  LTC: 1e8,
  ETH: 1e18,
};

const TICKER_URL = "https://apirone.com/api/v2/ticker";

exports.sendPayout = [
  body("address").trim().escape(),
  body("amount").trim().escape(),
  body("currency").trim().escape(),
  body("network").trim().escape(),
  asyncHandler(async (req, res) => {
    const userId = req.user?.id || req.user?._id;
    const { address, amount, currency } = req.body;
    const amountFloat = parseFloat(amount);

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!address || !amount || !currency || Number.isNaN(amountFloat)) {
      return res.status(400).json({
        success: false,
        message: "Address, amount, and currency are required.",
      });
    }

    const chosenCurrency = currency.toUpperCase();
    if (!["LTC", "ETH"].includes(chosenCurrency)) {
      return res.status(400).json({
        success: false,
        message: "Only LTC and ETH withdrawals are supported.",
      });
    }

    const userAccount = await Account.findById(userId).exec();
    if (!userAccount) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    if (amountFloat > userAccount.balance) {
      return res.status(400).json({
        success: false,
        message: "Your account balance is insufficient.",
      });
    }

    const config = APIRONE_CONFIG[chosenCurrency];
    if (!config) {
      return res.status(500).json({
        success: false,
        message: "Apirone configuration missing for the requested currency.",
      });
    }

    try {
      const tickerResponse = await axios.get(`${TICKER_URL}?currency=${chosenCurrency.toLowerCase()}&fiat=usd`);
      const tickerData = tickerResponse.data;
      const currencyTicker = tickerData?.[chosenCurrency.toLowerCase()];
      const usdRate = parseFloat(currencyTicker?.usd || currencyTicker?.USD);

      if (!usdRate || Number.isNaN(usdRate) || usdRate <= 0) {
        return res.status(500).json({
          success: false,
          message: "Unable to determine Apirone exchange rate for the selected currency.",
        });
      }

      const cryptoAmount = amountFloat / usdRate;
      const multiplier = UNIT_MULTIPLIERS[chosenCurrency];
      const transferAmount = BigInt(Math.floor(cryptoAmount * multiplier));

      if (transferAmount <= 0n) {
        return res.status(400).json({
          success: false,
          message: "The requested withdrawal amount is too small for the selected currency.",
        });
      }

      const transferPayload = {
        "transfer-key": config.transferKey,
        currency: chosenCurrency.toLowerCase(),
        destinations: [
          {
            address,
            amount: transferAmount.toString(),
          },
        ],
        fee: "normal",
        "subtract-fee-from-amount": false,
      };

      const transferResponse = await axios.post(
        `${config.baseUrl}/wallets/${config.walletId}/transfer`,
        transferPayload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      await Account.findByIdAndUpdate(userId, {
        $push: { withdrawalWalletAddresses: address },
        $inc: { balance: -amountFloat, withdrawn: amountFloat },
      }).exec();

      return res.json({
        success: true,
        data: transferResponse.data,
      });
    } catch (error) {
      console.error("Apirone payout error:", error.response?.data || error.message || error);
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error ||
        error.message ||
        "There was an error processing your Apirone withdrawal.";
      return res.status(error.response?.status || 500).json({
        success: false,
        message: errorMessage,
      });
    }
  }),
];
