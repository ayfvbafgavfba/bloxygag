const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");

let io;
/*
socket.send('40{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2Mjg1NTlmNDIzZmIzMDUxOGM3MWFjNiIsImlhdCI6MTcxMzkxOTUzMn0.o-OZBhhF2ZcQzrJvthkqD-aslKC3ixLIbTmCH4O8U5A"}')
console.log('Connected to WebSocket server.');
socket.emit('42["ONLINE_UPDATE",105]');
socket.emit('42["minesClick", 'row]');
*/
function initSocket(server) {
  io = socketIo(server, {
    cors: { origin: true, credentials: true },
  });
  console.log('attempt1');

  // If REDIS_URL is set, configure the Redis adapter so socket.io works across multiple processes
  const redisUrl = process.env.REDIS_URL || process.env.REDIS || null;
  if (redisUrl) {
    try {
      const pubClient = createClient({ url: redisUrl });
      const subClient = pubClient.duplicate();
      Promise.all([pubClient.connect(), subClient.connect()])
        .then(() => {
          io.adapter(createAdapter(pubClient, subClient));
          console.log('Socket.io Redis adapter connected');
        })
        .catch((err) => {
          console.error('Failed to connect Redis clients for socket adapter:', err);
        });
    } catch (err) {
      console.error('Error while initializing Redis adapter for socket.io:', err);
    }
  } else {
    console.log('No REDIS_URL configured; socket.io running in single-process mode or without adapter.');
  }

  io.on("connection", async (socket) => {
    console.log("socket connected:", socket.id, "auth-token-present:", !!socket.handshake?.auth?.token);
    socket.on("disconnect", (reason) => {
      console.log("socket disconnected:", socket.id, reason);
      io.emit("ONLINE_UPDATE", io.engine.clientsCount);
    });

    // Emit current online count immediately to all clients
    io.emit("ONLINE_UPDATE", io.engine.clientsCount);

    // Attempt to join per-user room if token provided
    try {
      joinRoom(socket);
    } catch (e) {
      console.warn("joinRoom failed:", e && e.message);
    }

    socket.on("message", (data) => {
      console.log("Message from client:", data);
    });
  });

  return io;
}

const getIO = () => {
  if (!io) {
    console.log("Socket.io not initialized!");
  }
  return io;
};

function joinRoom(socket) {
  const token = socket.handshake.auth.token;
  console.log(token);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (user) {
      const roomId = user.id; // Assuming user ID is the room ID
      socket.join(roomId);
    }
  });
}

module.exports = {
  initSocket,
  getIO,
};
