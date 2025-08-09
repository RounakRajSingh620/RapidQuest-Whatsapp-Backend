const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  wa_id: String,
  name: String,
  text: String,
  timestamp: Date,
  status: {
    type: String,
    default: "sent"
  },fromSelf: { type: Boolean, default: false },

  message_id: String,
  meta_msg_id: String
});

module.exports = mongoose.model("Message", messageSchema, "processed_messages");

