const Item = require("../../models/item");
const InventoryItem = require("../../models/inventoryItem");
const Giveaway = require("../../models/giveaway");
const GiveawayEntry = require("../../models/giveawayEntry");
const Account = require("../../models/account");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { validationResult, body } = require("express-validator");
const { emitEvent } = require("../../utils/events");

exports.create_giveaway = [
  asyncHandler(async (req, res, next) => {
    try {
      const chosenItem = req.body.chosenItem;

      const userInfo = await Account.findOne({
        _id: req.user.id,
      });

      if (!chosenItem) {
        return res.status(400).send("Please choose an item");
      }

      if (userInfo.username == null) {
        return res.status(404).send("Your account does not exist");
      }

      const chosenItemLookup = await InventoryItem.findOne({
        _id: chosenItem._id,
        locked: chosenItem.locked,
        owner: req.user.id,
      }).exec();

      if (!chosenItemLookup) {
        return res.status(400).send("The item you chose is not available");
      }

      if (chosenItemLookup.owner != req.user.id) {
        return res.status(400).send("You do not own this item");
      }

      if (chosenItemLookup.locked == true) {
        return res.status(400).send("You can not select a locked item");
      }

      const newGw = new Giveaway({
        item: chosenItemLookup._id,
        host: req.user.id,
        winner: null,
        game: chosenItemLookup.game,
        endsAt: new Date().getTime() + 1800000,
        inactive: false,
        winnerImage: null,
        winnerName: null,
      });

      await InventoryItem.updateOne(
        { _id: chosenItemLookup._id },
        {
          locked: true,
        }
      );

      await newGw.save();

      res.sendStatus(200);

      const currentGiveaways = await getGiveaways();

      emitEvent("GIVEAWAY_UPDATE", currentGiveaways);
      setTimeout(async () => {
        await draw_giveaways();
        const currentGiveaways = await getGiveaways();
        emitEvent("GIVEAWAY_UPDATE", currentGiveaways);
        setTimeout(async () => {
          close_giveaways();
          const currentGiveaways = await getGiveaways();
          emitEvent("GIVEAWAY_UPDATE", currentGiveaways);
        }, 60000);
      }, 1800000);
    } catch (error) {
      console.error("Error: ", error);
      res.sendStatus(500);
    }
  }),
];

exports.join_giveaway = [
  body("giveaway").trim().escape(),
  asyncHandler(async (req, res, next) => {
      const Joiner = await Account.findOne({ _id: req.user.id }).exec();
      const JoiningGiveaway = await Giveaway.findOne({ _id: req.body.giveaway }).exec();
      const EntryFound = await GiveawayEntry.findOne({
        giveaway: JoiningGiveaway && JoiningGiveaway._id,
        joiner: req.user.id,
      }).exec();

      if (Joiner.wagered < 1000) {
        return res
          .status(400)
          .send(
            `You must wager ${
              1000 - Joiner.wagered
            } more value to join giveaways`
          );
      }

      if (JoiningGiveaway == null) {
        return res.status(400).send("This giveaway doesn't exist");
      }

      if (Joiner.username == null) {
        return res.status(404).send("Your account does not exist");
      }

      if (
        JoiningGiveaway.state == "Ended" ||
        JoiningGiveaway.endsAt < new Date()
      ) {
        return res.status(400).send("This giveaway has ended");
      }

      if (EntryFound != null) {
        return res.status(400).send("You have already joined this giveaway");
      }

      if (JoiningGiveaway.host == req.user.id) {
        return res.status(400).send("You can not join your own giveaway");
      }

      const newEntry = new GiveawayEntry({
        joiner: req.user.id,
        robloxId: Joiner.robloxId,
        giveaway: JoiningGiveaway._id,
      });

      await newEntry.save();

      return res.sendStatus(200);
  }),
];

async function draw_giveaways() {
  try {
    const activeGiveaways = await Giveaway.find({ inactive: false });

    for (let activeGiveaway of activeGiveaways) {
      if (activeGiveaway.endsAt < new Date() && activeGiveaway.winner == null) {
        const gwEntries = await GiveawayEntry.find({
          giveaway: activeGiveaway._id,
        }).populate("joiner");
        const winningTicket = Math.floor(Math.random() * gwEntries.length);
        const winningPlayer = gwEntries[winningTicket];

        if (gwEntries.length == 0) {
          console.log("Giveaway has no entries");

          await Giveaway.updateOne(
            { _id: activeGiveaway._id },
            {
              inactive: true,
            }
          );

          await InventoryItem.updateOne(
            { _id: activeGiveaway.item },
            {
              locked: false,
            }
          );
        } else {
          console.log(
            `Giveaway drawn, winner ${winningPlayer.joiner.robloxId}`
          );
          await Giveaway.updateOne(
            { _id: activeGiveaway._id },
            {
              winner: winningPlayer.joiner._id,
              winnerImage: winningPlayer.joiner.thumbnail,
              winnerName: winningPlayer.joiner.username,
            }
          );

          await InventoryItem.updateOne(
            { _id: activeGiveaway.item },
            {
              owner: winningPlayer.joiner,
              locked: false,
            }
          );
        }
      }
    }
  } catch (error) {
    console.error("Error: ", error);
  }
}

async function close_giveaways() {
  try {
    const activeGiveaways = await Giveaway.find({ inactive: false });

    for (let activeGiveaway of activeGiveaways) {
      if (activeGiveaway.endsAt < new Date()) {
        const gwEntries = await GiveawayEntry.find({
          giveaway: activeGiveaway._id,
        });

        if (gwEntries.length == 0) {
          await Giveaway.updateOne(
            { _id: activeGiveaway._id },
            {
              inactive: true,
            }
          );
        } else if (activeGiveaway.winner) {
          await Giveaway.updateOne(
            { _id: activeGiveaway._id },
            {
              inactive: true,
            }
          );
        }
      }
    }
  } catch (error) {
    console.error("Error: ", error);
  }
}

exports.get_giveaways = asyncHandler(async (req, res, next) => {
  const giveaways = await getGiveaways();

  return res.send(giveaways).status(200);
});

async function getGiveaways() {
  const newGiveaways = await Giveaway.find({ inactive: false }, { host: 0 })
    .sort({ $natural: -1 })
    .populate({
      path: "item",
      populate: {
        path: "item",
        model: Item,
      },
    });
  const userEntries = await GiveawayEntry.find({}, { joiner: 0 });

  return {
    newGiveaways,
    userEntries,
  };
}

async function startupCheckUnfinished() {
  if (mongoose.connection.readyState !== 1) {
    mongoose.connection.once("connected", () => {
      startupCheckUnfinished().catch((err) =>
        console.error("giveaway startupCheckUnfinished failed after connecting:", err)
      );
    });
    return;
  }

  await draw_giveaways();
  await close_giveaways();
}

startupCheckUnfinished(); // Check for broken giveaways on startup
