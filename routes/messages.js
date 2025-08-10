const express = require("express");
const router = express.Router();
const Message = require("../models/message");

// GET all messages grouped by wa_id
router.get("/grouped", async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 });
    const grouped = {};

    messages.forEach((msg) => {
      if (!grouped[msg.wa_id]) {
        grouped[msg.wa_id] = {
          name: msg.name,
          wa_id: msg.wa_id,
          messages: [],
        };
      }

      grouped[msg.wa_id].messages.push({
        wa_id: msg.wa_id,
        fromSelf: msg.fromSelf || false, // default to false if not set
        text: msg.text,
        status: msg.status,
        timestamp: msg.timestamp,
      });
    });

    res.status(200).json(grouped);
  } catch (err) {
    console.error("❌ Error in /grouped:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST send message (store only)
router.post("/send", async (req, res) => {
  try {
    const { wa_id, name, text } = req.body;
    if (!wa_id || !name || !text) {
      return res.status(400).json({ message: "wa_id, name, and text are required" });
    }

    // Create and save message
    const newMessage = new Message({
      wa_id,
      name,
      text,
      status: "sent",
      timestamp: new Date(),
      message_id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      meta_msg_id: "",
      fromSelf: true, // This message is from the UI sender
    });

    const savedMessage = await newMessage.save();

    // Emit via Socket.IO to all clients
    const io = req.app.locals.io;
    io.emit("new_message", {
      wa_id: savedMessage.wa_id,
      name: savedMessage.name,
      text: savedMessage.text,
      status: savedMessage.status,
      timestamp: savedMessage.timestamp,
      fromSelf: savedMessage.fromSelf,
    });
req.app.locals.io.emit("new_message", { ...savedMessage.toObject(), temp_id });

    res.status(201).json(savedMessage);
  } catch (err) {
    console.error("❌ Error in /send:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
