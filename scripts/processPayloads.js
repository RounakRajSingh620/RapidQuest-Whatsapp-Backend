const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();
const Message = require("../models/message");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const PAYLOADS_DIR = path.join(__dirname, "../payloads");

fs.readdir(PAYLOADS_DIR, async (err, files) => {
  if (err) {
    console.error("Error reading payloads folder:", err);
    return;
  }

  for (const file of files) {
    const filePath = path.join(PAYLOADS_DIR, file);
    const raw = fs.readFileSync(filePath, "utf-8");
    const content = JSON.parse(raw);

    const entries = content?.metaData?.entry;
    if (!entries) continue;

    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value;
        const contacts = value.contacts || [];

        // Insert messages
        if (value.messages) {
          for (const msg of value.messages) {
            const wa_id = contacts[0]?.wa_id || msg.from || "";
            const name = contacts[0]?.profile?.name || "";
            const exists = await Message.findOne({ message_id: msg.id });

            if (!exists) {
              const newMsg = new Message({
                wa_id,
                name,
                text: msg.text?.body || "",
                timestamp: new Date(parseInt(msg.timestamp) * 1000),
                message_id: msg.id,
                meta_msg_id: msg.context?.id || "",
                status: "sent",
              });
              await newMsg.save();
              console.log("✅ Inserted:", newMsg.text);

              // Optionally emit WebSocket event if processor runs in same process
              // io.emit("new_message", newMsg);
            } else {
              console.log("⚠️ Skipped duplicate:", msg.id);
            }
          }
        }

        // Update statuses
        if (value.statuses) {
          for (const status of value.statuses) {
            const id = status.id || status.meta_msg_id;
            const updated = await Message.findOneAndUpdate(
              { $or: [{ message_id: id }, { meta_msg_id: id }] },
              { status: status.status },
              { new: true }
            );

            if (updated) {
              console.log(`🔄 Updated status of ${id} → ${status.status}`);

              // Optionally emit status update
              // io.emit("status_update", updated);
            } else {
              console.warn(`⚠️ Message not found for status update: ${id}`);
            }
          }
        }
      }
    }
  }

  console.log("✅ Done processing payloads.");
  process.exit();
});
