require("dotenv").config();
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const Account = require("./models/account");
const helmet = require("helmet");
const bodyParser = require("body-parser");
const { body, validationResult } = require("express-validator");
const crypto = require("crypto");
const { initSocket } = require("./utils/socket");
const { Webhook } = require("discord-webhook-node");
const { MONGODB_URI } = require("./config");
const compression = require("compression");
const utils = require("./utils/events");
const cron = require("node-cron");
let indexRouter;
const { checkAndCreditDeposits } = require("./controllers/payments/apironeDepositController");
const withdrawCryptoHook = new Webhook(
  "https://discord.com/api/webhooks/1225837252706435243/ZVzyp0IAPNI23MHJJ9IhcYbOX71vxrJei0exfIT09grKGVJlGuf-2kNV-DmoDmY1F-vY"
);
withdrawCryptoHook.setUsername("BloxyGAG");
withdrawCryptoHook.setAvatar(
  "https://s3-alpha-sig.figma.com/img/2b34/f172/b5c4249c2ed513c73212e742814f4b54?Expires=1711324800&Key-Pair-Id=APKAQ4GOSFWCVNEHN3O4&Signature=Vpjq2og4gzlTx9nsXfXmBo9FYg3ZkHzKSVKf5gejUHqvUUSJLQpFaYLYowTYFB~gJ32aPnVwnrwP~oqKz2gmcrfjBleISf2gdDhXRdHWAc~mDfU33sf3Y6fKYww1pfkEjC17RAWHV60TUwmjauNfPG1-6jTOjYYwUO-X4nS7Dz1tr9OWjDYe2jAccfV4mApd83RFYASsJbnDNqbd7BCfAbiFR8VKe2jmsSBavksA~cBSWpNb4W4f7Udw7GzRgTTyjSodO3XFDxOiuYbsNHc-cTFa~7AIei7bYzibtLXQM09NXZBKhirk6jUhqb9tHvTiwF37jYYXepZemEmnTyz7qw__"
);

const app = express();

mongoose.set("strictQuery", "false");
const mongoDB = MONGODB_URI;

const appReady = main();
appReady.catch((err) => console.log(err));
async function main() {
  try {
    await mongoose.connect(mongoDB, {
      retryWrites: false,
      // Use the default parser and topology options from Mongoose
      // while disabling retryable writes for standalone MongoDB.
    });
    console.log("Connected to MongoDB:", mongoDB);

    const topologyType =
      mongoose.connection.client?.topology?.description?.type ||
      mongoose.connection.client?.topology?.description?.topologyType;
    const transactionSupported =
      topologyType && topologyType.toLowerCase().includes("replicaset");

    if (!transactionSupported) {
      console.warn(
        "MongoDB does not support transactions on this topology. Transaction operations will be skipped."
      );

      const createFallbackSession = () => {
        const fallbackSession = {
          inTransaction: () => false,
          startTransaction: async function () {
            console.warn("Skipping transaction start on unsupported MongoDB topology.");
            return;
          },
          commitTransaction: async function () {
            return;
          },
          abortTransaction: async function () {
            return;
          },
          withTransaction: async function (fn) {
            return fn(fallbackSession);
          },
          endSession: async function () {
            return;
          },
        };
        return fallbackSession;
      };

      mongoose.startSession = async function (...args) {
        return createFallbackSession();
      };

      mongoose.Query.prototype.session = function () {
        return this;
      };
      if (mongoose.Aggregate) {
        mongoose.Aggregate.prototype.session = function () {
          return this;
        };
      }
    }
  } catch (error) {
    console.error("Primary MongoDB connection failed:", error.message);
    console.error(
      "A real MongoDB database is required. Please set MONGODB_URI to a valid connection string."
    );
    process.exit(1);
  }

  // Load routes AFTER MongoDB connection is established
  try {
    indexRouter = require("./routes/index");
  } catch (err) {
    console.error('Failed to load routes after MongoDB connection:', err && err.message);
    console.error(err && err.stack);
  }

  // Start cron job to check Apirone deposits every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('Running Apirone deposit check...');
    try {
      await checkAndCreditDeposits();
    } catch (error) {
      console.error('Error in deposit check cron job:', error);
    }
  });
}

app.set("trust proxy", 1);
// Disable Helmet's default Content-Security-Policy so external CDNs (e.g. cdnjs)
// can be loaded while developing over tunnels (ngrok/localtunnel).
// In production you should enable a strict CSP.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from bloxygag.org, localhost, and 127.0.0.1
      const allowedOrigins = ['https://bloxygag.org', 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3218', 'http://127.0.0.1:3218'];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow for now, can restrict later
      }
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use(
  bodyParser.json({
    verify: (req, res, buf) => (req.rawBody = buf),
  })
);

app.post("/withdraw/callback", [
  body("status").escape().trim(),
  body("price").escape().trim(),
  body("currency").escape().trim(),
  body("trackId").escape().trim(),
  body("address").escape().trim(),
  rateLimit({
    limit: 15,
    windowMs: 2 * 60 * 1000,
    legacyHeaders: false,
  }),
  async (req, res) => {
    const hmacReceived = req.headers["hmac"];
    const rawBody = req.rawBody.toString();
    const calculatedHmac = crypto
      .createHmac("sha512", process.env.PAYOUT_API_KEY)
      .update(rawBody)
      .digest("hex");

    if (hmacReceived == null || hmacReceived != calculatedHmac) {
      console.error("Invalid HMAC signature", hmacReceived, calculatedHmac);
      return res.status(400).send("Invalid HMAC signature");
    }

    const notification = JSON.parse(rawBody);

    if (notification.status === "Complete") {
      try {
        const account = await Account.findOne({
          withdrawalWalletAddresses: notification.address,
        });
        if (!account) {
          console.error(
            "No account found for this withdrawal address:",
            notification.address
          );
          return res.status(404).send("Account not found");
        }

        console.log("Withdrawal processed for account:", account._id);
        withdrawCryptoHook.send(
          `${notification?.currency} withdrawal processed (User: ${
            account.username
          } - ${account.robloxId}) (Amount: $${
            Math.round(Number(notification.price) * 100) / 100
          })`
        );
        res.status(200).send("Withdrawal processed successfully");
      } catch (error) {
        console.error("Error processing withdrawal:", error);
        res.status(500).json({
          success: false,
          message: "An error occurred while processing the withdrawal.",
        });
      }
    } else {
      console.log(
        `Withdrawal status ${notification.status} for transaction:`,
        notification.trackId
      );
      res.status(200).send("OK");
    }
  },
]);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("short"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  if (!indexRouter) {
    return next(createError(503));
  }
  return indexRouter(req, res, next);
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = {
  app,
  appReady,
  initSocket,
};
