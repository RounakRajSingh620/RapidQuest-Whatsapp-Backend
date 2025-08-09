const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const messagesRoute = require("./routes/messages");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server for WebSocket
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (change in prod)
    methods: ["GET", "POST"]
  }
});

// Store io in app locals so routes can access it
app.locals.io = io;

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/api/messages", messagesRoute);

// Socket.IO Connection
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on("disconnect", () => console.log(`❌ Client disconnected: ${socket.id}`));
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
