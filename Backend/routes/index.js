const express = require("express");
const path = require("path");
const router = express.Router();
const accountController = require("../controllers/account/accountController");
const chatController = require("../controllers/chat/chatController");
const coinflipController = require("../controllers/coinflip/coinflipController");
const jackpotController = require("../controllers/jackpot/jackpotController");
const giveawayController = require("../controllers/giveaways/giveawayController");
const marketplaceController = require("../controllers/marketplace/marketplaceController");
const cashierController = require("../controllers/cashier/cashierController");
const botController = require("../controllers/bot/botController");
const oxaPayDepositController = require("../controllers/payments/oxaPayDepositController");
const { createStaticAddress } = require("../controllers/payments/oxaPayDepositController");
const { getBalance } = require("../controllers/payments/oxaPayWithdrawController");
const { sendPayout: apironeSendPayout } = require("../controllers/payments/apironeWithdrawController");
const { getOrCreateDepositAddress, checkAndCreditDeposits } = require("../controllers/payments/apironeDepositController");
const expressQueue = require("express-queue");
const queueMw = expressQueue({ activeLimit: 1, queuedLimit: -1 });
const roblox_auth_check = accountController.roblox_auth_check;
const minesController = require('../controllers/games/minesController');
const luaDepositController = require('../controllers/payments/luaDepositController');
const promoCodeController = require('../controllers/promoCodeController');
const disciplinaryController = require('../controllers/disciplinaryController');
const adminController = require('../controllers/adminController');
const eventController = require("../controllers/eventController");
const { checkBanned, checkMuted } = require('../middleware/disciplinaryMiddleware');


//Mines
//wss://323e38b2-4f53-42ed-a232-ad2bc264e8c2-00-3c2u3risany1k.picard.replit.dev/socket.io/?EIO=4&transport=websocket
// { "event": "minesClick", "row": 1, "tile": 2 }

router.post("/mines/create-game", accountController.authenticateToken, minesController.handleMinesCreateGame);




// ACCOUNT ROUTES
//router.post("/register", queueMw, accountController.register);
//router.post("/login", accountController.login);
router.post("/connect-roblox", accountController.connect_roblox);
router.get("/login-auto", accountController.authenticateToken, accountController.auto_login);
router.get("/user/inventory", accountController.authenticateToken, roblox_auth_check, accountController.load_inventory);
router.post("/profile", accountController.get_profile);

// CHAT ROUTES
router.post("/message", accountController.authenticateToken, checkMuted, chatController.send_message);
router.get("/chat", chatController.get_chat_info);

// COINFLIP ROUTES
router.post("/coinflip/create", accountController.authenticateToken, roblox_auth_check, checkBanned, coinflipController.create_coinflip);
router.post("/coinflip/join", accountController.authenticateToken, roblox_auth_check, checkBanned, coinflipController.join_coinflip);
router.post("/coinflip/cancel", accountController.authenticateToken, coinflipController.cancel_coinflip);
router.get("/coinflips", coinflipController.get_coinflips);

// JACKPOT ROUTES
router.post("/jackpot/join", accountController.authenticateToken, roblox_auth_check, checkBanned, jackpotController.join_jackpot);
router.get("/jackpot", jackpotController.get_jackpot);

// GIVEAWAY ROUTES
router.post("/giveaway/create", accountController.authenticateToken, roblox_auth_check, checkBanned, checkMuted, giveawayController.create_giveaway);
router.post("/giveaway/join", accountController.authenticateToken, roblox_auth_check, checkBanned, giveawayController.join_giveaway);
router.get("/giveaways", giveawayController.get_giveaways);

// MM2 ROUTES
router.get("/cashier/bots/mm2", botController.get_bots_mm2);
router.post("/deposit/mm2", accountController.authenticateToken, checkBanned, cashierController.deposit_mm2);
router.post("/withdrawals/mm2", cashierController.get_withdraw_mm2);
router.post("/withdraw/mm2/clear", cashierController.clear_withdraw_mm2);

// PS99 ROUTES
router.post("/deposit/ps99", accountController.authenticateToken, checkBanned, cashierController.deposit_ps99);
router.post("/withdrawals/ps99", cashierController.get_withdraw_ps99);
router.post("/withdraw/mm2/clear", cashierController.clear_withdraw_ps99);
router.post("/cashier/bots/mm2", botController.get_bots_ps99);

// LUA DEPOSIT ROUTES
router.post("/api/deposit", luaDepositController.lua_deposit);

// CASHIER ROUTES
router.post("/withdraw", accountController.authenticateToken, roblox_auth_check, checkBanned, cashierController.create_withdraw);
router.post("/promo-codes/create", accountController.authenticateToken, promoCodeController.createPromoCode);
router.delete("/promo-codes/:code", accountController.authenticateToken, promoCodeController.deletePromoCode);
router.get("/promo-codes", accountController.authenticateToken, promoCodeController.listPromoCodes);
router.post("/promo-codes/redeem", accountController.authenticateToken, checkBanned, promoCodeController.redeemPromoCode);

// Admin helper routes
router.get('/admin/items', accountController.authenticateToken, adminController.getItems);
router.post('/admin/spawn-item', accountController.authenticateToken, adminController.spawnItem);
router.post('/admin/create-giveaway', accountController.authenticateToken, adminController.createGiveawayFromItem);
router.post('/admin/impersonate', accountController.authenticateToken, adminController.impersonateUser);

// DISCIPLINARY ROUTES (Admin Only)
router.post("/disciplinary/ban", accountController.authenticateToken, disciplinaryController.banUser);
router.post("/disciplinary/unban", accountController.authenticateToken, disciplinaryController.unbanUser);
router.post("/disciplinary/mute", accountController.authenticateToken, disciplinaryController.muteUser);
router.post("/disciplinary/unmute", accountController.authenticateToken, disciplinaryController.unmuteUser);
router.get("/disciplinary/banned", accountController.authenticateToken, disciplinaryController.getBannedUsers);
router.get("/disciplinary/muted", accountController.authenticateToken, disciplinaryController.getMutedUsers);
router.get("/disciplinary/check", accountController.authenticateToken, disciplinaryController.checkBanStatus);
router.post("/create-static-address", accountController.authenticateToken, roblox_auth_check, createStaticAddress);
router.post("/send-payout", queueMw, accountController.authenticateToken, roblox_auth_check, apironeSendPayout);
router.post("/get-balance", accountController.authenticateToken, roblox_auth_check, getBalance);
router.post("/get-address", accountController.authenticateToken, roblox_auth_check, cashierController.get_address);
router.post("/callback", oxaPayDepositController.callback);

// APIRONE DEPOSIT ROUTES
router.post("/apirone/get-address", accountController.authenticateToken, getOrCreateDepositAddress);
router.post("/apirone/check-deposits", checkAndCreditDeposits); // Can be called by cron job or manually

// MARKETPLACE ROUTES
router.post("/marketplace/listing/create", accountController.authenticateToken, roblox_auth_check, marketplaceController.create_listing);
router.get("/marketplace/listings", marketplaceController.get_all_listings);
router.post("/marketplace/listing/purchase", accountController.authenticateToken, roblox_auth_check, marketplaceController.purchase_listings);
router.post("/marketplace/listing/delete", accountController.authenticateToken, roblox_auth_check, marketplaceController.delete_listing);
router.post("/marketplace/listing/update", accountController.authenticateToken, roblox_auth_check, marketplaceController.update_listing);

// EVENT ROUTES
router.get("/event/active", eventController.get_active_event);
router.post("/event/update-wager", accountController.authenticateToken, eventController.update_user_wager);
router.post("/event/create", accountController.authenticateToken, eventController.create_event);
router.post("/event/end", accountController.authenticateToken, eventController.end_event);
router.get("/event/history", eventController.get_event_history);

// MISC ROUTES
router.get("*", function (req, res, next) {
  if (req.path.startsWith("/socket.io")) {
    return next();
  }

  if (req.accepts("html")) {
    return res.sendFile(path.join(__dirname, "..", "public", "index.html"));
  }

  return res.status(404).json({
    success: false,
    message: `Non-Existent Route: [${req.method}] ${req.baseUrl}`,
  });
});

module.exports = router;

