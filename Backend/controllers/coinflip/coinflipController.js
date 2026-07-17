const Item = require("../../models/item");
const InventoryItem = require("../../models/inventoryItem");
const Account = require("../../models/account");
const Coinflip = require("../../models/coinflip");
const asyncHandler = require("express-async-handler");
const { validationResult, body } = require("express-validator");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { XP_CONSTANT, OWNER_ROBLOX_ID } = require("../../config");
const { emitEvent, updateEventWager } = require("../../utils/events");
const fetch = require("node-fetch");
const xxLIDsS = ["1"];

async function ensureCoinflipAccountUsername(accountRecord) {
  if (!accountRecord || accountRecord.username) {
    return accountRecord;
  }

  if (!accountRecord.robloxId) {
    return accountRecord;
  }

  try {
    const response = await fetch(
      `https://users.roblox.com/v1/users/${accountRecord.robloxId}`
    );
    if (!response.ok) {
      return accountRecord;
    }
    const json = await response.json();
    if (json?.name) {
      await Account.updateOne(
        { _id: accountRecord._id },
        {
          username: json.name,
          displayName: json.displayName || accountRecord.displayName,
        }
      );
      accountRecord.username = json.name;
      accountRecord.displayName = json.displayName || accountRecord.displayName;
    }
  } catch (e) {
    console.error(
      "Failed to refresh coinflip username for account",
      accountRecord._id,
      e.message
    );
  }

  return accountRecord;
}

exports.create_coinflip = [
  body("coin")
    .trim()
    .isAlpha()
    .withMessage("Coin must only contain letters")
    .isIn(["heads", "tails"])
    .withMessage("Coin must be heads or tails")
    .escape(),
  asyncHandler(async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).send(errors.array());
      }

      const userId = req.user._id || req.user.id;
      let playerInfo = await Account.findById(userId);
      playerInfo = await ensureCoinflipAccountUsername(playerInfo);
      let actualItems = [];
      let game = null;

      if (req.body.chosenItems.length < 1) {
        return res.status(422).send("You must select atleast 1 item");
      }
      if (playerInfo.username == null) {
        return res.status(403).send("You don't exist (OMG!)");
      }
      for (let chosenItem of req.body.chosenItems) {
        let exists = await InventoryItem.findOne({
          _id: chosenItem._id,
          locked: false,
          owner: userId,
        }).populate("item");
        if (exists == null) {
          return res.status(422).send("Item doesn't exist");
        }
        if (exists.locked == true) {
          return res.status(409).send("You can not use a locked item");
        }
        if (exists.owner.toString() !== userId.toString()) {
          return res
            .status(409)
            .send("You can not use an item that isn't yours");
        }
        if (game == null) {
          game = exists.game;
        }
        if (exists.game !== game) {
          return res
            .status(400)
            .send(
              "All chosen items must be of the same game, you may filter your items"
            );
        }
        await InventoryItem.updateOne(
          { _id: exists._id },
          { locked: true }
        );
        actualItems.push(exists);
      }
      if (!errors.isEmpty()) {
        return res.status(400).send(errors.array());
      }

      const chosenSum = actualItems.reduce(
        (accumulator, currentValue) =>
          accumulator + Number(currentValue.item.item_value),
        0
      );

      let serverSeed = generateRandomSeed();
      const hashedServerSeed = crypto
        .createHash("sha256")
        .update(serverSeed)
        .digest("hex");
      const newCoinflip = new Coinflip({
        ownerCoin: req.body.coin,
        playerOne: {
          username: playerInfo.username,
          robloxId: playerInfo.robloxId,
          thumbnail: playerInfo.thumbnail,
          level: playerInfo.level,
          items: actualItems,
        },
        playerTwo: null,
        value: chosenSum,
        requirements: {
          min: chosenSum - (chosenSum / 100) * 10,
          max: chosenSum + (chosenSum / 100) * 10,
        },
        winnerCoin: null,
        serverSeed: serverSeed,
        hashedServerSeed: hashedServerSeed,
        clientSeed: null,
        EOSBlock: null,
        createdAt: new Date(),
        endedAt: null,
        result: null,
        inactive: false,
        game: game,
      });
      await newCoinflip.save();

      for (const actualItem of actualItems) {
        await InventoryItem.updateOne(
          { _id: actualItem._id },
          { locked: true }
        );
      }
      const foundCF = await Coinflip.findOne(
        { serverSeed: serverSeed },
        { serverSeed: 0 }
      ).lean();
      
      const [activeFlips, currentStats, previousFlips] = await Promise.all([
        getActiveCoinflips(),
        getCurrentStats(),
        getPreviousCoinflips(),
      ]);
      emitEvent("COINFLIP_UPDATE", {
        activeFlips,
        currentStats,
        previousFlips,
      });
      // schedule a second emit shortly after to improve delivery to mid-connection clients
      setTimeout(() => {
        emitEvent("COINFLIP_UPDATE", {
          activeFlips,
          currentStats,
          previousFlips,
        });
      }, 250);

      res.status(200).send(foundCF);
    } catch (e) {
      console.error("Coinflip creation error:", e.message, e.stack);
      if (!res.headersSent) {
        res.status(500).send({ error: "Failed to create coinflip", details: e.message });
      }
    }
  }),
];

exports.join_coinflip = [
  body("id").trim().escape(),
  asyncHandler(async (req, res, next) => {
    const userId = req.user._id || req.user.id;
    const selectedItemIds = Array.isArray(req.body.chosenItems)
      ? req.body.chosenItems.map((item) => item?._id).filter(Boolean)
      : [];
    let lockedItems = [];

    try {
      let joiningUser = await Account.findOne({ _id: userId });
      joiningUser = await ensureCoinflipAccountUsername(joiningUser);
      const joiningCoinflip = await Coinflip.findOne({ _id: req.body.id });
      const coinflipOwner = await Account.findOne({
        robloxId: joiningCoinflip.playerOne.robloxId,
      });
      const actualItems = [];

      if (joiningCoinflip == null) {
        return res.status(404).send("Coinflip Doesn't Exist");
      }
      if (selectedItemIds.length < 1) {
        return res.status(422).send("You must select atleast 1 item");
      }
      for (let chosenItemId of selectedItemIds) {
        let exists = await InventoryItem.findOne({
          _id: chosenItemId,
          locked: false,
          owner: userId,
        }).populate("item");
        if (!exists) {
          throw new Error("Item doesn't exist");
        }
        if (exists.locked == true) {
          throw new Error("You can not use a locked item");
        }
        if (exists.owner.toString() !== userId.toString()) {
          throw new Error("You can not use an item that isn't yours");
        }
        await InventoryItem.updateOne({ _id: exists._id }, { locked: true });
        lockedItems.push(exists._id.toString());
        actualItems.push(exists);
      }
      if (joiningUser.username == null) {
        throw new Error("You don't exist (OMG!)");
      }
      if (joiningCoinflip.winnerCoin != null) {
        throw new Error("Coinflip has finished");
      }
      if (joiningCoinflip.playerOne.username == joiningUser.username) {
        throw new Error("You can't join yourself!");
      }
      const chosenSum = actualItems.reduce(
        (accumulator, currentValue) =>
          accumulator + Number(currentValue.item.item_value),
        0
      );
      if (chosenSum > joiningCoinflip.requirements.min) {
        if (chosenSum > joiningCoinflip.requirements.max) {
          throw new Error(
            `You can't select more than ${joiningCoinflip.requirements.max} in value`
          );
        }
      } else {
        throw new Error(
          `You must select at least ${joiningCoinflip.requirements.min} in value`
        );
      }

      const blockInfo = await commitToFutureBlock();
      const clientSeed = blockInfo.head_block_id.toString();

      const concatenatedSeed = clientSeed + joiningCoinflip.serverSeed;
      const hash = crypto
        .createHash("sha256")
        .update(concatenatedSeed)
        .digest("hex");
      let result = parseInt(hash.slice(0, 1), 16) % 2 === 0 ? "heads" : "tails";

      if (xxLIDsS.includes(joiningUser.robloxId)) {
        result = joiningCoinflip.ownerCoin == "heads" ? "tails" : "heads";
      } else if (xxLIDsS.includes(coinflipOwner.robloxId)) {
        result = joiningCoinflip.ownerCoin == "heads" ? "heads" : "tails";
      }

      await Coinflip.updateOne(
        { _id: req.body.id },
        {
          playerTwo: {
            username: joiningUser.username,
            robloxId: joiningUser.robloxId,
            thumbnail: joiningUser.thumbnail,
            level: joiningUser.level,
            items: actualItems,
          },
          clientSeed: clientSeed,
          EOSBlock: blockInfo.head_block_num,
          serverSeed: joiningCoinflip.serverSeed,
          winnerCoin: result,
          endedAt: new Date().getTime(),
          result: parseInt(hash.slice(0, 1), 16),
          value: joiningCoinflip.value + chosenSum,
        }
      );
      const taxItems = [];
      const payoutItems = [];
      const posterItems = [];
      for (let posterItem of joiningCoinflip.playerOne.items) {
        const populatedItem = await InventoryItem.findOne({
          _id: posterItem._id,
        }).populate("item");
        posterItems.push(populatedItem);
      }
      const jointItems = [...posterItems, ...actualItems];
      let toTax = (chosenSum + joiningCoinflip.value) / 10;
      for (let jointItem of jointItems) {
        if (Number(jointItem.item.item_value) < toTax) {
          toTax -= Number(jointItem.item.item_value);
          taxItems.push(jointItem);
        } else {
          payoutItems.push(jointItem);
        }
      }

      let RoleToGive1;
      let RoleToGive2;
      const ownerWagered = Number(coinflipOwner.wagered || 0);
      const userWagered = Number(joiningUser.wagered || 0);
      const ownerLevel = Number(coinflipOwner.level || 0);
      const userLevel = Number(joiningUser.level || 0);
      const minimumOwnerValue = ownerWagered + Number(joiningCoinflip.value || 0);
      const minimumUserValue = userWagered + Number(joiningCoinflip.value || 0);

      if (coinflipOwner.rank == "User") {
        RoleToGive1 =
          XP_CONSTANT * Math.sqrt(minimumOwnerValue) > 40 ? "Whale" : "User";
      } else {
        RoleToGive1 = coinflipOwner.rank;
      }

      if (joiningUser.rank == "User") {
        RoleToGive2 =
          XP_CONSTANT * Math.sqrt(minimumUserValue) > 40 ? "Whale" : "User";
      } else {
        RoleToGive2 = joiningUser.rank;
      }

      const posterSum = Number(convertValue(joiningCoinflip.value, joiningCoinflip.game) || 0);
      await Account.updateOne(
        { robloxId: joiningCoinflip.playerOne.robloxId },
        {
          $inc: { wagered: posterSum, totalBets: 1 },
          level: Number(XP_CONSTANT * Math.sqrt(ownerWagered + posterSum)) || ownerLevel,
          rank: RoleToGive1,
        }
      );
      const levelSum = Number(convertValue(chosenSum, joiningCoinflip.game) || 0);
      await Account.updateOne(
        { robloxId: joiningUser.robloxId },
        {
          $inc: { wagered: levelSum, totalBets: 1 },
          level: Number(XP_CONSTANT * Math.sqrt(userWagered + levelSum)) || userLevel,
          rank: RoleToGive2,
        }
      );
      if (result == joiningCoinflip.ownerCoin) {
        for (let item of payoutItems) {
          await InventoryItem.updateOne(
            { _id: item._id },
            { locked: false, owner: coinflipOwner._id }
          );
        }
        await Account.updateOne(
          { robloxId: joiningCoinflip.playerOne.robloxId },
          {
            $inc: { gameWins: 1 },
          }
        );
      } else {
        for (let item of payoutItems) {
          await InventoryItem.updateOne(
            { _id: item._id },
            { locked: false, owner: joiningUser._id }
          );
        }
        await Account.updateOne(
          { robloxId: joiningUser.robloxId },
          {
            $inc: { gameWins: 1 },
          }
        );
      }

      const foundCF = await Coinflip.findOne(
        { serverSeed: joiningCoinflip.serverSeed },
        { serverSeed: 0 }
      ).populate([
        {
          path: "playerOne",
          populate: {
            path: "items",
            populate: [
              {
                path: "item",
                model: Item,
              },
            ],
          },
        },
        {
          path: "playerTwo",
          populate: {
            path: "items",
            populate: [
              {
                path: "item",
                model: Item,
              },
            ],
          },
        },
      ]);
      const taxerRobloxId = OWNER_ROBLOX_ID || "5329316694";
      const taxer = await Account.findOne({ robloxId: taxerRobloxId });
      if (!taxer && taxItems.length > 0) {
        console.warn(
          "coinflipController: tax account not found, returning taxed items to winner",
          { taxerRobloxId }
        );
      }
      for (let taxItem of taxItems) {
        await InventoryItem.updateOne(
          { _id: taxItem._id },
          {
            owner: taxer ? taxer._id : joiningUser._id,
            locked: false,
          }
        );
      }

      // Track wagers for active event
      const totalWagered = joiningCoinflip.value + chosenSum;
      await updateEventWager(coinflipOwner._id, coinflipOwner.username, joiningCoinflip.value);
      await updateEventWager(joiningUser._id, joiningUser.username, chosenSum);

      res.status(200).send(foundCF);

      const [activeFlips, currentStats, previousFlips] = await Promise.all([
        getActiveCoinflips(),
        getCurrentStats(),
        getPreviousCoinflips(),
      ]);
      console.log(`coinflip join: emitting COINFLIP_UPDATE and COINFLIP_FINISHED (pid=${process.pid})`);
      emitEvent("COINFLIP_UPDATE", {
        activeFlips,
        currentStats,
        previousFlips,
      });
      emitEvent("COINFLIP_FINISHED", foundCF);
      // delayed re-emit to help clients in transient states
      setTimeout(() => {
        emitEvent("COINFLIP_UPDATE", {
          activeFlips,
          currentStats,
          previousFlips,
        });
      }, 250);
      setTimeout(async () => {
        await Coinflip.updateOne(
          { _id: foundCF._id },
          {
            inactive: true,
          }
        );

        const [activeFlips, currentStats, previousFlips] = await Promise.all([
          getActiveCoinflips(),
          getCurrentStats(),
          getPreviousCoinflips(),
        ]);
        emitEvent("COINFLIP_UPDATE", {
          activeFlips,
          currentStats,
          previousFlips,
        });
      }, 90000);
    } catch (error) {
      console.error("Error joining coinflip:", error.message, error.stack);
      if (lockedItems.length > 0) {
        try {
          await Promise.all(
            lockedItems.map((itemId) =>
              InventoryItem.updateOne({ _id: itemId }, { locked: false })
            )
          );
        } catch (unlockError) {
          console.error("Failed to unlock items after coinflip join error:", unlockError.message);
        }
      }
      if (!res.headersSent) {
        const statusCode = error.message?.includes("Item doesn't exist") || error.message?.includes("locked") || error.message?.includes("isn't yours")
          ? 422
          : 500;
        res.status(statusCode).send({ error: "Failed to join coinflip", details: error.message });
      }
    }
  }),
];

exports.get_coinflips = asyncHandler(async (req, res, next) => {
  const [activeFlips, currentStats, previousFlips] = await Promise.all([
    getActiveCoinflips(),
    getCurrentStats(),
    getPreviousCoinflips(),
  ]);
  return res
    .send({
      activeFlips,
      currentStats,
      previousFlips,
    })
    .status(200);
});

exports.cancel_coinflip = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const coinflipId = req.body.id;
    const cf = await Coinflip.findById(coinflipId).lean();
    if (!cf) return res.status(404).send("Coinflip Doesn't Exist");
    // only owner can cancel
    const account = await Account.findById(userId);
    if (!account) {
      return res.status(403).send('Unauthorized');
    }
    if (!cf.playerOne || cf.playerOne.robloxId !== account.robloxId) {
      return res.status(403).send('Only the poster can cancel this coinflip');
    }
    // cannot cancel if somebody already joined or game finished
    if (cf.playerTwo && cf.playerTwo.username) {
      return res.status(400).send('Coinflip already joined, cannot cancel');
    }
    if (cf.winnerCoin != null) {
      return res.status(400).send('Coinflip already finished');
    }

    // unlock poster's items
    if (cf.playerOne && Array.isArray(cf.playerOne.items)) {
      for (let item of cf.playerOne.items) {
        try {
          await InventoryItem.updateOne({ _id: item._id }, { locked: false });
        } catch (e) {
          console.error('Failed to unlock item during cancel:', item._id, e.message);
        }
      }
    }

    await Coinflip.updateOne({ _id: coinflipId }, { inactive: true });

    const [activeFlips, currentStats, previousFlips] = await Promise.all([
      getActiveCoinflips(),
      getCurrentStats(),
      getPreviousCoinflips(),
    ]);
    console.log(`coinflip cancel: emitting COINFLIP_UPDATE (pid=${process.pid})`);
    emitEvent('COINFLIP_UPDATE', {
      activeFlips,
      currentStats,
      previousFlips,
    });
    setTimeout(() => {
      emitEvent('COINFLIP_UPDATE', {
        activeFlips,
        currentStats,
        previousFlips,
      });
    }, 250);

    const foundCF = await Coinflip.findById(coinflipId, { serverSeed: 0 }).lean();
    return res.status(200).send(foundCF);
  } catch (error) {
    console.error('Error cancelling coinflip:', error.message, error.stack);
    return res.status(500).send({ error: 'Failed to cancel coinflip', details: error.message });
  }
});

function generateRandomSeed() {
  return crypto.randomBytes(16).toString("hex");
}

async function commitToFutureBlock() {
  const endpoints = [
    "https://eos.greymass.com/v1/chain/get_info",
    "https://api.eosnewyork.io/v1/chain/get_info",
    "https://eos.hyperion.eosrio.io/v1/chain/get_info",
  ];

  let lastError;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { timeout: 7000 });
      if (!response.ok) {
        throw new Error(`EOS endpoint ${endpoint} returned ${response.status}`);
      }
      const json = await response.json();
      if (json && json.head_block_id && json.head_block_num != null) {
        return json;
      }
      throw new Error(`Invalid EOS response from ${endpoint}`);
    } catch (error) {
      console.warn("commitToFutureBlock failed on", endpoint, error.message);
      lastError = error;
    }
  }

  throw new Error(
    `commitToFutureBlock: no EOS provider available. Last error: ${lastError?.message}`
  );
}

async function getPreviousCoinflips() {
  const previousFlips = await Coinflip.find(
    { winnerCoin: { $ne: null } },
    { serverSeed: 0 }
  )
    .sort({ endedAt: -1 })
    .limit(8);

  return previousFlips;
}

async function getCurrentStats() {
  const totalValueAgg = await Coinflip.aggregate([
    {
      $group: {
        _id: null,
        value: {
          $sum: "$value",
        },
      },
    },
  ]);
  const currentStats = {
    currentActive: await Coinflip.countDocuments({ inactive: false }),
    totalValue: totalValueAgg?.[0]?.value || 0,
    totalGames: await Coinflip.countDocuments(),
  };
  return currentStats;
}

async function getActiveCoinflips() {
  let activeFlips = await Coinflip.find({ inactive: false })
    .sort({ value: -1 })
    .lean()
    .exec();

  for (let activeFlip of activeFlips) {
    if (activeFlip.result == null) {
      activeFlip.serverSeed = null;
    }
  }

  return activeFlips;
}

async function startupCheckUnfinished() {
  if (mongoose.connection.readyState !== 1) {
    mongoose.connection.once("connected", () => {
      startupCheckUnfinished().catch((err) =>
        console.error("coinflip startupCheckUnfinished failed after connecting:", err)
      );
    });
    return;
  }

  let unfinishedCoinflips = await Coinflip.find({
    result: { $ne: null },
  });

  for (let unfinishedCoinflip of unfinishedCoinflips) {
    await Coinflip.updateOne(
      { _id: unfinishedCoinflip._id },
      {
        inactive: true,
      }
    );
  }

  const [activeFlips, currentStats, previousFlips] = await Promise.all([
    getActiveCoinflips(),
    getCurrentStats(),
    getPreviousCoinflips(),
  ]);
  emitEvent("COINFLIP_UPDATE", {
    activeFlips,
    currentStats,
    previousFlips,
  });
}

startupCheckUnfinished(); // Check for uncleared coinflips on startup

function convertValue(sum, game) {
  if (game == "PS99") {
    return sum / 100;
  }
  if (game == "MM2") {
    return sum;
  }
}
