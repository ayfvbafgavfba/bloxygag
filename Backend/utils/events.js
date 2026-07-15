const { getIO } = require("./socket.js");
const Account = require("../models/account.js");
const Event = require("../models/event.js");
const EventParticipant = require("../models/eventParticipant.js");

function emitEvent(eventName, data) {
  const io = getIO();
  if (!io) {
    console.warn("emitEvent: socket.io not initialized!", eventName);
    return;
  }
  const clientCount = io.engine?.clientsCount || (io.sockets ? Object.keys(io.sockets.sockets).length : 0);
  console.log(`emitEvent (pid=${process.pid}): ${eventName} -> clients=${clientCount}`);
  io.emit(eventName, data);
}

async function emitBalanceUpdate(userIds) {
  const io = getIO();
  for (let userId of userIds) {
    const balance = await getBalance(userId);
    const accountId = userId.toString();
    io.to(accountId).emit("BALANCE_UPDATE", balance);
  }
}

async function getBalance(user) {
  const userAccount = await Account.findById(user);
  return userAccount.balance;
}

function getOnlineCount() {
  const io = getIO();
  return io.engine.clientsCount;
}

async function updateEventWager(userId, username, wagerAmount) {
  try {
    const now = new Date();
    
    // Find active event
    const activeEvent = await Event.findOne({
      status: "active",
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    if (!activeEvent) {
      return; // No active event, skip wager tracking
    }

    // Update or create participant
    const participant = await EventParticipant.findOneAndUpdate(
      { eventId: activeEvent._id, userId },
      {
        $inc: { totalWagered: wagerAmount },
        username,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Update event total wagered
    await Event.findByIdAndUpdate(
      activeEvent._id,
      { $inc: { totalWagered: wagerAmount } }
    );

    // Emit leaderboard update to all clients
    const leaderboard = await EventParticipant.find({ eventId: activeEvent._id })
      .sort({ totalWagered: -1 })
      .limit(10)
      .select("username totalWagered rank");

    const io = getIO();
    if (io) {
      io.emit("EVENT_LEADERBOARD_UPDATE", {
        event: activeEvent,
        leaderboard: leaderboard.map((entry, index) => ({
          ...entry.toObject(),
          rank: index + 1,
        })),
      });
    }
  } catch (error) {
    console.error("Error updating event wager:", error);
    // Don't throw error, just log it
  }
}

module.exports = {
  emitEvent,
  getOnlineCount,
  emitBalanceUpdate,
  updateEventWager,
};
