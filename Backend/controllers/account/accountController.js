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
let userStore = []
dotenv.config();

exports.authenticateToken = asyncHandler(async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

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
    return res.status(403).json({
      success: false,
      message: "Unauthorized",
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
      return res.status(404).json({
        success: false,
        message: "User not found",
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

    let userId = await noblox.getIdFromUsername(req.body.username);
    const accountData = await Account.findOne({ robloxId: userId });
    const ownerUsername = OWNER_ROBLOX_USERNAME?.trim()?.toLowerCase();
    const ownerUserId = OWNER_ROBLOX_ID?.trim();
    const isOwner =
      (ownerUserId && ownerUserId === String(userId)) ||
      (ownerUsername && req.body.username.trim().toLowerCase() === ownerUsername);

    let randomDescription;

    if (accountData != null) {
      if (isOwner && accountData.rank !== "Owner") {
        await Account.updateOne({ robloxId: userId }, { rank: "Owner" });
      }

      if (!isOwner && accountData.rank === "Owner") {
        // preserve owner status if this account was previously promoted.
        // If an owner account logs in with a different username case, still keep the rank.
        await Account.updateOne({ robloxId: userId }, { rank: "Owner" });
      }

      if (userStore[userId]?.descriptionSet === true) {
        delete userStore[userId];

        const userData = await noblox.getPlayerInfo(userId);
        const userThumbnail = await noblox.getPlayerThumbnail(
          userId,
          420,
          "png",
          false,
          "Headshot"
        );

        if (userData.blurb == accountData.description) {
          console.log("Phrase and description are the same :D ");

          randomDescription = generateRandomDescription();

          await Account.updateOne({ robloxId: userId }, { description: randomDescription });

          await Account.updateOne(
            { username: req.body.username },
            {
              $push: {
                ips: {
                  ip: req.ip,
                },
              },
              thumbnail: userThumbnail[0].imageUrl,
            }
          );

          const token = jwt.sign({ id: accountData._id, username: accountData.username }, JWT_SECRET);
          console.log('Roblox' + token);
          return res.send(token);
        } else if (userData.blurb != accountData.description) {
          delete userStore[userId];
          return res.status(400).send("Description does not match");
        }
      } else {
        randomDescription = generateRandomDescription();

        await Account.updateOne({ robloxId: userId }, { description: randomDescription });

        userStore[userId] = { descriptionSet: true };

        return res.status(200).send(randomDescription);
      }
    } else {
      if (userId == null) {
        console.log(`id: ${userId}, nameEntered: ${req.body.username}`);
        return res.status(404).send("Invalid Username");
      }

      delete userStore[userId];

      const userData = await noblox.getPlayerInfo(userId);
      const userThumbnail = await noblox.getPlayerThumbnail(
        userId,
        420,
        "png",
        false,
        "Headshot"
      );
      randomDescription = generateRandomDescription();

      const checkReferrer = await Account.findOne({ robloxId: req.body.referrer });
      const validReferrer = checkReferrer != null ? checkReferrer.username : null;

      if (validReferrer != null) {
        await Account.updateOne(
          { username: validReferrer },
          {
            description: { randomDescription },
            affiliate: {
              $push: {
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
        balance: 0,
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
      userStore[userId] = { descriptionSet: true };
      console.log("await account save is called here the page is reloading? maybe here");
      res.status(200).send(randomDescription);
    }
  }),
];

exports.roblox_auth_check = asyncHandler(async (req, res, next) => {
  const account = await Account.findOne({ _id: req.user.id });
  if (!account.robloxId) {
    return res.status(401).send("You have not connected your Roblox account");
  }
  next();
});

exports.get_profile = [
  body("userId").trim().escape(),
  asyncHandler(async (req, res) => {
    const userData = await Account.findOne({ robloxId: req.body.userId });

    if (!userData) {
      return res.status(404).send("User was not found");
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
  const phrase = ["losers"];
  const numWords = Math.floor(Math.random() * 4) + 10;

  for (let i = 0; i < numWords; i++) {
    const randomWord = randomWords(); 
    phrase.push(randomWord);
  }

  return phrase.join(" ");
}
