const Account = require('../models/account');
const { ADMIN_ALLOWLIST } = require('../config');

const normalizeName = (value) => (value || '').toString().trim().toLowerCase();

const isAllowlistedAdmin = (username) => {
  const normalized = normalizeName(username);
  return ADMIN_ALLOWLIST.includes(normalized);
};

const isAdminRank = (rank) => {
  if (!rank) return false;
  const normalizedRank = rank.toString().trim().toLowerCase();
  // Only explicit elevated ranks are considered admin
  return normalizedRank === 'admin' || normalizedRank === 'owner';
};

module.exports = async function adminOnly(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const account = await Account.findById(req.user.id).lean();
  if (!account) {
    return res.status(401).json({ success: false, message: 'Account not found' });
  }

  if (isAdminRank(account.rank) || isAllowlistedAdmin(account.username)) {
    return next();
  }

  return res.status(403).json({ success: false, message: 'Admin access required' });
};
