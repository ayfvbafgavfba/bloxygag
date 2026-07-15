const Account = require('../../models/account');
const ApironeDeposit = require('../../models/apironeDeposit');
const axios = require('axios');

const APIRONE_CONFIG = {
  LTC: {
    walletId: 'ltc-5a419029fddc7d70fcdf65c017a60caf',
    transferKey: '5783WsEMSMikcSCNokHW40kuqz0IFvqD',
    baseUrl: 'https://apirone.com/api/v2'
  },
  ETH: {
    walletId: 'eth-4581363dc6769871bde070c956887a04',
    transferKey: 'NLbwQXLiPoWLcNYjGApfCbTpTbaOa8Av',
    baseUrl: 'https://apirone.com/api/v2'
  }
};

// Get or create a unique deposit address for user
const getOrCreateDepositAddress = async (req, res) => {
  try {
    const { currency } = req.body;
    const userId = req.user?.id || req.user?._id;
    let robloxId = req.user?.robloxId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!robloxId) {
      const account = await Account.findById(userId).select('robloxId').lean();
      if (!account) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      robloxId = account.robloxId;
    }

    if (!['LTC', 'ETH'].includes(currency)) {
      return res.status(400).json({ success: false, message: 'Invalid currency' });
    }

    // Check if user already has a deposit address for this currency
    let depositRecord = await ApironeDeposit.findOne({
      userId,
      currency,
      credited: false
    });

    if (depositRecord) {
      return res.status(200).json({
        success: true,
        address: depositRecord.address,
        currency: depositRecord.currency,
        walletId: depositRecord.walletId
      });
    }

    // Get config
    const config = APIRONE_CONFIG[currency];

    // Fetch addresses from Apirone
    try {
      const response = await axios.get(
        `${config.baseUrl}/wallets/${config.walletId}/addresses`,
        {
          headers: {
            'X-API-KEY': config.transferKey,
          },
        }
      );

      let address =
        response.data?.addresses?.[0]?.address ||
        response.data?.data?.[0]?.address ||
        response.data?.address;
      if (!address) {
        const createResponse = await axios.post(
          `${config.baseUrl}/wallets/${config.walletId}/addresses`,
          {},
          {
            headers: {
              'X-API-KEY': config.transferKey,
            },
          }
        );

        address =
          createResponse.data?.data?.address ||
          createResponse.data?.address ||
          createResponse.data?.data?.[0]?.address;
      }

      if (address) {
        const newDeposit = new ApironeDeposit({
          userId,
          robloxId,
          currency,
          address,
          walletId: config.walletId,
        });

        await newDeposit.save();

        return res.status(200).json({
          success: true,
          address,
          currency,
          walletId: config.walletId,
        });
      }

      return res.status(400).json({
        success: false,
        message: 'No addresses available from Apirone',
      });
    } catch (error) {
      console.error('Apirone fetch error:', error.response?.data || error.message || error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch address from Apirone',
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Check for deposits and credit users
const checkAndCreditDeposits = async (req, res) => {
  try {
    // Get all non-credited deposits
    const deposits = await ApironeDeposit.find({ credited: false });

    for (const deposit of deposits) {
      const config = APIRONE_CONFIG[deposit.currency];

      try {
        // Get wallet balance/transactions
        const response = await axios.get(
          `${config.baseUrl}/wallets/${config.walletId}/addresses/${deposit.address}/transactions`,
          {
            headers: {
              'X-API-KEY': config.transferKey
            }
          }
        );

        const transactions = response.data.data || [];

        // Find confirmed incoming transactions
        const incomingTx = transactions.find(tx => 
          tx.status === 'confirmed' && 
          tx.address === deposit.address && 
          tx.type === 'incoming'
        );

        if (incomingTx && incomingTx.amount > 0) {
          // Convert to USD (simplified - you may want to use a price API)
          const conversionRates = {
            LTC: 250, // Approximate USD value
            ETH: 3000 // Approximate USD value
          };

          const usdAmount = incomingTx.amount * (conversionRates[deposit.currency] || 100);

          // Credit user
          const account = await Account.findById(deposit.userId);
          if (account) {
            account.balance += usdAmount;
            account.deposited += usdAmount;
            await account.save();

            // Update deposit record
            deposit.credited = true;
            deposit.amount = usdAmount;
            deposit.transactionId = incomingTx.txid;
            deposit.updatedAt = new Date();
            await deposit.save();

            console.log(`Credited ${account.username} with ${usdAmount} USD for ${deposit.currency} deposit`);
          }
        }
      } catch (error) {
        console.error(`Error checking deposit ${deposit._id}:`, error);
      }
    }

    if (res) {
      return res.status(200).json({ success: true, message: 'Deposits checked and credited' });
    }
  } catch (error) {
    console.error('Error checking deposits:', error);
    if (res) {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
};

module.exports = {
  getOrCreateDepositAddress,
  checkAndCreditDeposits
};
