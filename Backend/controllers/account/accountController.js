const asyncHandler = require("express-async-handler");
const { validationResult, body } = require("express-validator");
const Account = require("../../models/account");
const noblox = require("noblox.js");
const InventoryItem = require("../../models/inventoryItem");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const crypto = require("crypto");
const randomWords = require("random-words");
const PromoCode = require("../../models/promoCode");
const {
  JWT_SECRET,
  OWNER_ROBLOX_ID,
  OWNER_ROBLOX_USERNAME,
} = require("../../config");
dotenv.config();

exports.authenticateToken = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : req.cookies?.jwt || null;

  if (!token) return res.sendStatus(401);

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.error("Error verifying token:", err);
    return res.status(403).json({
      success: false,
      message: "Unauthorized",
    });
  }

  if (!payload?.id) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const account = await Account.findById(payload.id);
  if (!account) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - account not found. Please log in again.",
    });
  }

  req.user = {
    id: account._id.toString(),
    username: account.username,
    robloxId: account.robloxId,
    rank: account.rank || "User",
  };
  next();
});

exports.auto_login = asyncHandler(async (req, res) => {
  try {
    const userData = await Account.findOne(
      { _id: req.user.id },
      { ips: 0, _id: 0, __v: 0, password: 0, withdrawalWalletAddresses: 0 }
    );

      if (!userData) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - account not found. Please log in again.",
        });
      }

    res.status(200).send(userData);
  } catch (error) {
    console.error("Error retrieving user data:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

exports.load_inventory = asyncHandler(async (req, res) => {
  try {
    const userItems = await InventoryItem.find({
      owner: req.user.id,
      locked: false,
    })
      .populate("item")
      .sort({ "item.item_value": -1 })
      .lean()
      .exec();

    const validItems = userItems.filter((userItem) => userItem.item);
    const totalValue = validItems.reduce(
      (acc, userItem) => acc + Number(userItem.item?.item_value || 0),
      0
    );

    const inventoryInfo = {
      totalValue,
      userItems: validItems,
    };

    res.send(inventoryInfo);
  } catch (error) {
    console.error("Error loading inventory items:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

exports.connect_roblox = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Your username must be between 3 and 20 characters")
    .escape(),
  body("referrer").trim().escape(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      console.log(errors.array());
      return res.status(400).send(errors.array());
    }

    try {
      // Allow the client to send either a username or a numeric Roblox id.
      let userId = null;
      const supplied = String(req.body.username || "").trim();

      const isNumeric = /^\d+$/.test(supplied);
      if (isNumeric) {
        userId = supplied;
      } else {
        // Retry noblox lookup once if it fails due to transient errors
        try {
          userId = await noblox.getIdFromUsername(supplied);
        } catch (e) {
          try {
            userId = await noblox.getIdFromUsername(supplied);
          } catch (e2) {
            console.warn("noblox.getIdFromUsername failed, falling back to Roblox API:", e2?.message || e?.message);
            // Fallback: call Roblox public API to resolve username
            try {
              const fetchLib = global.fetch || require('node-fetch');
              const body = JSON.stringify({usernames:[supplied], excludeBannedUsers:true});
              const resp = await fetchLib('https://users.roblox.com/v1/usernames/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
              });
              const json = await resp.json();
              if (json && Array.isArray(json.data) && json.data[0] && json.data[0].id) {
                userId = String(json.data[0].id);
              }
            } catch (e3) {
              console.error('Roblox API fallback failed:', e3?.message || e3);
            }
            if (!userId) {
              return res.status(503).json({ success: false, message: 'Roblox lookup failed, please try again' });
            }
          }
        }
      }

      const accountData = await Account.findOne({ robloxId: userId });
      const ownerUsername = OWNER_ROBLOX_USERNAME?.trim()?.toLowerCase();
      const ownerUserId = OWNER_ROBLOX_ID?.trim();
      const isOwner =
        (ownerUserId && ownerUserId === String(userId)) ||
        (ownerUsername && req.body.username.trim().toLowerCase() === ownerUsername);

      // Fetch player info and thumbnail with a retry in case of transient failures
      let userData;
      try {
        userData = await noblox.getPlayerInfo(userId);
      } catch (e) {
        console.warn('noblox.getPlayerInfo failed, falling back to Roblox API:', e?.message || e);
        try {
          const fetchLib = global.fetch || require('node-fetch');
          const resp = await fetchLib(`https://users.roblox.com/v1/users/${userId}`);
          if (resp.ok) {
            userData = await resp.json();
          }
        } catch (e2) {
          console.error('Roblox API playerInfo fallback failed:', e2?.message || e2);
        }
        if (!userData) {
          return res.status(503).json({ success: false, message: 'Roblox lookup failed, please try again' });
        }
      }

      let userThumbnail;
      try {
        userThumbnail = await noblox.getPlayerThumbnail(userId, 420, "png", false, "Headshot");
      } catch (e) {
        userThumbnail = [{ imageUrl: "" }];
      }

      if (accountData) {
        if (isOwner && accountData.rank !== "Owner") {
          await Account.updateOne({ robloxId: userId }, { rank: "Owner" });
        }

        if (!isOwner && accountData.rank === "Owner") {
          await Account.updateOne({ robloxId: userId }, { rank: "Owner" });
        }

        const existingDescription = accountData.description;
        const isLegacyDescription =
          !existingDescription || !existingDescription.startsWith("BloxyGAG |");
        const descriptionToUse =
          isLegacyDescription || !existingDescription
            ? generateRandomDescription()
            : existingDescription;
        const bioText = String(userData.blurb || userData.description || "").trim();
        const bioMatchesCode = bioContainsCode(bioText, descriptionToUse);

        if (bioMatchesCode) {
          const token = jwt.sign(
            { id: accountData._id, username: accountData.username },
            JWT_SECRET
          );

          await Account.updateOne(
            { robloxId: userId },
            {
              $push: { ips: { ip: req.ip } },
              thumbnail: userThumbnail[0].imageUrl,
              description: descriptionToUse,
            }
          );

          return res.status(200).send(token);
        }

        const updatePayload = {
          $push: { ips: { ip: req.ip } },
          thumbnail: userThumbnail[0].imageUrl,
          description: descriptionToUse,
        };

        await Account.updateOne({ robloxId: userId }, updatePayload);

        return res.status(200).send(descriptionToUse);
      }

      const randomDescription = generateRandomDescription();
      const checkReferrer = await Account.findOne({ robloxId: req.body.referrer });
      const validReferrer = checkReferrer != null ? checkReferrer.username : null;

      if (validReferrer != null) {
        await Account.updateOne(
          { username: validReferrer },
          {
            description: randomDescription,
            $push: {
              affiliate: {
                referrals: {
                  robloxId: userId,
                  wagered: 0,
                },
              },
            },
          }
        );
      }

      const account = new Account({
        robloxId: userId,
        username: userData.username,
        displayName: userData.displayName,
        description: randomDescription,
        thumbnail: userThumbnail[0].imageUrl,
        rank: isOwner ? "Owner" : "User",
        level: 0,
        deposited: 0,
        withdrawn: 0,
        wagered: 0,
        BTCAddress: "",
        ETHAddress: "",
        LTCAddress: "",
        BNBAddress: "",
        USDTAddress: "",
        diceClientSeed: generateClientSeed(),
        limboClientSeed: generateClientSeed(),
        minesClientSeed: generateClientSeed(),
        blackjackClientSeed: generateClientSeed(),
        diceServerSeed: generateServerSeed(),
        limboServerSeed: generateServerSeed(),
        minesServerSeed: generateServerSeed(),
        blackjackServerSeed: generateServerSeed(),
        diceHistory: [],
        limboHistory: [],
        minesHistory: [],
        blackjackHistory: [],
        balance: 0,
        withdrawalWalletAddresses: [],
        ips: [],
        joinDate: new Date(),
        referrer: validReferrer,
        lastMessage: new Date(),
        totalBets: 0,
        gamesWon: 0,
        affiliate: {
          wagered: 0,
          totalEarnings: 0,
          balance: 0,
          referrals: [],
        },
      });

      await account.save();
      return res.status(200).send(randomDescription);
    } catch (error) {
      console.error("Error in connect_roblox:", error);
      try {
        console.error("connect_roblox req.body:", JSON.stringify(req.body));
      } catch (e) {
        console.error("Failed to stringify req.body", e);
      }
      console.error("connect_roblox req.ip:", req.ip);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }),
];

exports.roblox_auth_check = asyncHandler(async (req, res, next) => {
  const account = await Account.findOne({ _id: req.user.id });
  if (!account.robloxId) {
    return res.status(401).json({ success: false, message: "You have not connected your Roblox account" });
  }
  next();
});

exports.get_profile = [
  body("userId").trim().escape(),
  asyncHandler(async (req, res) => {
    const userData = await Account.findOne({ robloxId: req.body.userId });

    if (!userData) {
      return res.status(404).json({ success: false, message: "User was not found" });
    }

    const nextLevel = Math.ceil(userData.level);
    const nextLevelXP = Math.pow(nextLevel / 0.04, 2);

    const toReturn = {
      totalBets: userData.totalBets,
      gamesWon: userData.gameWins,
      wagered: userData.wagered,
      profit: userData.withdrawn - userData.deposited,
      username: userData.username,
      xp: userData.wagered,
      xpMax: nextLevelXP,
      level: userData.level,
      thumbnail: userData.thumbnail,
      joinDate: userData.joinDate,
    };

    res.status(200).send(toReturn);
  }),
];

function generateServerSeed() {
  return crypto.randomBytes(20).toString("hex");
}

function generateClientSeed() {
  return crypto.randomBytes(20).toString("hex");
}

function generateRandomDescription() {
  const prefix = "BloxyGAG |";
  const numWords = Math.floor(Math.random() * 4) + 6; // 6-9 words
  const words = [];
  for (let i = 0; i < numWords; i++) {
    words.push(randomWords());
  }
  // Ensure the description is reasonably short
  return `${prefix} ${words.join(" ")}`;
}

function bioContainsCode(bioText, codeText) {
  const normalize = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const normalizedBio = normalize(bioText);
  const normalizedCode = normalize(codeText);

  if (!normalizedBio || !normalizedCode) return false;
  return normalizedBio.includes(normalizedCode);
}

function bioContainsCode(bioText, codeText) {
  const normalize = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const normalizedBio = normalize(bioText);
  const normalizedCode = normalize(codeText);

  if (!normalizedBio || !normalizedCode) return false;
  return normalizedBio.includes(normalizedCode);
}
