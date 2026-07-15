const Item = require("../../models/item");
const InventoryItem = require("../../models/inventoryItem");
const Listing = require("../../models/listing");
const Account = require("../../models/account");
const asyncHandler = require("express-async-handler");
const { Webhook } = require("discord-webhook-node");
const { emitEvent, emitBalanceUpdate } = require("../../utils/events");
const { body } = require("express-validator");
const marketplaceHook = new Webhook(
  "https://discord.com/api/webhooks/1227005816880631960/-VF7qi7OnAFZle_k-e_ZA8AwalBK5JdKDFdSTvO5AhqL_BLis-GJmlg4JHIy6b58bvSm"
);
marketplaceHook.setUsername("BLOXPVP");
marketplaceHook.setAvatar(
  "https://s3-alpha-sig.figma.com/img/2b34/f172/b5c4249c2ed513c73212e742814f4b54?Expires=1711324800&Key-Pair-Id=APKAQ4GOSFWCVNEHN3O4&Signature=Vpjq2og4gzlTx9nsXfXmBo9FYg3ZkHzKSVKf5gejUHqvUUSJLQpFaYLYowTYFB~gJ32aPnVwnrwP~oqKz2gmcrfjBleISf2gdDhXRdHWAc~mDfU33sf3Y6fKYww1pfkEjC17RAWHV60TUwmjauNfPG1-6jTOjYYwUO-X4nS7Dz1tr9OWjDYe2jAccfV4mApd83RFYASsJbnDNqbd7BCfAbiFR8VKe2jmsSBavksA~cBSWpNb4W4f7Udw7GzRgTTyjSodO3XFDxOiuYbsNHc-cTFa~7AIei7bYzibtLXQM09NXZBKhirk6jUhqb9tHvTiwF37jYYXepZemEmnTyz7qw__"
);

exports.create_listing = [
  asyncHandler(async (req, res, next) => {
    try {
      if (!req.body || !Array.isArray(req.body.chosenItems) || req.body.chosenItems.length < 1) {
        return res.status(422).send("You must select at least one item");
      }

      const playerInfo = await Account.findById(req.user.id).exec();
      if (!playerInfo || playerInfo.username == null) {
        return res.status(400).send("This giveaway doesn't exist");
      }

      for (const chosenItem of req.body.chosenItems) {
        const exists = await InventoryItem.findOne({
          _id: chosenItem._id,
          locked: false,
          owner: req.user.id,
        }).exec();

        if (!exists) {
          return res.status(422).send("One of your items are unavailable");
        }

        if (exists.locked === true) {
          return res.status(409).send("One of your items are locked");
        }

        if (exists.owner != req.user.id) {
          return res.status(409).send("One of your items are not owned by you");
        }

        await InventoryItem.updateOne(
          { _id: exists._id },
          { locked: true }
        ).exec();

        const newListing = new Listing({
          item: exists._id,
          poster: req.user.id,
          posterUsername: playerInfo.username,
          game: exists.game,
          rate: 5,
          status: "Listed",
        });

        await newListing.save();
      }

      res.sendStatus(200);

      const updatedListings = await getAllListings();
      emitEvent("MARKETPLACE_UPDATE", updatedListings);
    } catch (error) {
      console.error("Error: ", error);
      res.sendStatus(500);
    }
  }),
];

exports.purchase_listings = [
  asyncHandler(async (req, res, next) => {
    try {
      const playerInfo = await Account.findById(req.user.id).exec();
      if (!playerInfo || playerInfo.username == null) {
        return res.status(400).send("This giveaway doesn't exist");
      }

      if (!req.body || !Array.isArray(req.body.chosenListings) || req.body.chosenListings.length < 1) {
        return res.status(422).send("You must select at least one item");
      }

      const actualItems = [];
      const usersToUpdate = [playerInfo._id];

      for (const chosenListing of req.body.chosenListings) {
        const exists = await Listing.findOne({
          _id: chosenListing._id,
          status: "Listed",
        })
          .populate({
            path: "item",
            populate: {
              path: "item",
              model: Item,
            },
          })
          .exec();

        if (!exists) {
          const newItems = [];
          for (const cartItem of req.body.chosenListings) {
            const foundItem = await Listing.findOne({
              _id: cartItem._id,
              status: "Listed",
            })
              .populate({
                path: "item",
                populate: {
                  path: "item",
                  model: Item,
                },
              })
              .exec();
            if (foundItem) {
              newItems.push(foundItem);
            }
          }

          return res.status(422).send({
            error:
              "One of your items are unavailable, we have adjusted your cart",
            data: newItems,
          });
        }

        if (exists.rate != chosenListing.rate) {
          const newItems = [];
          for (const cartItem of req.body.chosenListings) {
            const foundItem = await Listing.findOne({
              _id: cartItem._id,
              status: "Listed",
            })
              .populate({
                path: "item",
                populate: {
                  path: "item",
                  model: Item,
                },
              })
              .exec();
            if (foundItem) {
              newItems.push(foundItem);
            }
          }

          return res.status(409).send({
            error:
              "One of your items rate has changed, we have adjusted your cart",
            data: newItems,
          });
        }

        await Account.updateOne(
          { _id: exists.poster },
          {
            $inc: {
              balance:
                (Number(exists.item.item.item_value) / 1000) * exists.rate,
            },
          }
        ).exec();

        await InventoryItem.updateOne(
          { _id: exists.item._id },
          {
            locked: false,
            owner: req.user.id,
          }
        ).exec();

        await Listing.deleteOne({ _id: exists._id }).exec();

        actualItems.push(exists);
        if (!usersToUpdate.includes(exists.poster)) {
          usersToUpdate.push(exists.poster);
        }
      }

      const actualSum = actualItems.reduce(
        (accumulator, currentValue) =>
          accumulator +
          (Number(currentValue.item.item.item_value) / 1000) * currentValue.rate,
        0
      );

      if (playerInfo.balance < actualSum) {
        return res
          .status(400)
          .send(
            `You need another $${
              Math.round((actualSum - playerInfo.balance) * 100) / 100
            } to complete this purchase`
          );
      }

      await Account.updateOne(
        { _id: req.user.id },
        {
          $inc: { balance: -actualSum },
        }
      ).exec();

      res.sendStatus(200);

      const updatedListings = await getAllListings();
      emitEvent("MARKETPLACE_UPDATE", updatedListings);
      emitBalanceUpdate(usersToUpdate);
    } catch (error) {
      console.error("Error: ", error);
      res.sendStatus(500);
    }
  }),
];

exports.delete_listing = [
  asyncHandler(async (req, res, next) => {
    try {
      if (!req.body || !req.body.listing || !req.body.listing._id) {
        return res.status(422).send("Invalid listing data");
      }

      const playerInfo = await Account.findById(req.user.id).exec();
      if (!playerInfo || playerInfo.username == null) {
        return res.status(400).send("This giveaway doesn't exist");
      }

      const listingInfo = await Listing.findById(req.body.listing._id)
        .populate({
          path: "item",
          populate: {
            path: "item",
            model: Item,
          },
        })
        .exec();

      if (!listingInfo) {
        return res.status(400).send("This listing can not be found");
      }

      if (listingInfo.poster != req.user.id) {
        return res.status(401).send("This listing is not owned by you");
      }

      if (listingInfo.status != "Listed") {
        return res.status(400).send("This listing is not available");
      }

      await InventoryItem.updateOne(
        { _id: listingInfo.item._id },
        {
          locked: false,
        }
      ).exec();

      await Listing.findByIdAndDelete(listingInfo._id).exec();
      res.sendStatus(200);

      const updatedListings = await getAllListings();
      emitEvent("MARKETPLACE_UPDATE", updatedListings);
    } catch (error) {
      console.error("Error: ", error);
      res.sendStatus(500);
    }
  }),
];

exports.update_listing = [
  body("rate").trim().escape(),
  asyncHandler(async (req, res, next) => {
    try {
      const playerInfo = await Account.findById(req.user.id).exec();

      if (!playerInfo || playerInfo.username == null) {
        return res.status(400).send("This giveaway doesn't exist");
      }

      if (!req.body || !req.body.listing || !req.body.listing._id) {
        return res.status(422).send("Invalid listing data");
      }

      const listingInfo = await Listing.findById(req.body.listing._id)
        .populate({
          path: "item",
          populate: {
            path: "item",
            model: Item,
          },
        })
        .exec();

      if (!listingInfo) {
        return res.status(400).send("This listing can not be found");
      }

      if (listingInfo.poster != req.user.id) {
        return res.status(401).send("This listing is not owned by you");
      }

      if (listingInfo.rate == req.body.rate) {
        return res
          .status(400)
          .send("Make sure you change the rate in order to update a listing");
      }

      if (listingInfo.status != "Listed") {
        return res.status(400).send("This listing is not available");
      }

      if (req.body.rate < 3 || req.body.rate > 7) {
        return res.status(400).send("Your listing's rate must be between 3-7");
      }

      await Listing.findByIdAndUpdate(listingInfo._id, {
        rate: Number(req.body.rate),
      }).exec();
      res.sendStatus(200);

      const updatedListings = await getAllListings();
      emitEvent("MARKETPLACE_UPDATE", updatedListings);
    } catch (error) {
      console.error("Error: ", error);
      res.sendStatus(500);
    }
  }),
];

exports.get_all_listings = [
  asyncHandler(async (req, res, next) => {
    const allListings = await Listing.find({}, { poster: 0 })
      .populate({
        path: "item",
        populate: {
          path: "item",
          model: Item,
        },
      })
      .exec();

    return res.status(200).send(allListings);
  }),
];

async function getAllListings() {
  const allListings = await Listing.find({}, { poster: 0 })
    .populate({
      path: "item",
      populate: {
        path: "item",
        model: Item,
      },
    })
    .exec();
  return allListings;
}
