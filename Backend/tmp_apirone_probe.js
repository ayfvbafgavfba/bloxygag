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
(async () => {
  try {
    for (const currency of ['LTC','ETH']) {
      const config = APIRONE_CONFIG[currency];
      console.log('===', currency, '===');
      const list = await axios.get(`${config.baseUrl}/wallets/${config.walletId}/addresses`, {
        headers: { 'X-API-KEY': config.transferKey }
      });
      console.log('addresses', JSON.stringify(list.data, null, 2));
      try {
        const txs = await axios.get(`${config.baseUrl}/wallets/${config.walletId}/transactions`, {
          headers: { 'X-API-KEY': config.transferKey }
        });
        console.log('wallet transactions', JSON.stringify(txs.data, null, 2));
      } catch (e) {
        console.log('wallet transactions error', e.response?.status, e.response?.data || e.message);
      }
      try {
        const transfers = await axios.get(`${config.baseUrl}/wallets/${config.walletId}/transfers`, {
          headers: { 'X-API-KEY': config.transferKey }
        });
        console.log('transfers', JSON.stringify(transfers.data, null, 2));
      } catch (e) {
        console.log('transfers error', e.response?.status, e.response?.data || e.message);
      }
    }
  } catch (err) {
    console.error('probe error', err.response?.status, err.response?.data || err.message);
  }
})();