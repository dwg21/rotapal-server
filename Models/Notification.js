const mongoose = require("mongoose");
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  created: {
    type: Date,
    default: Date.now,
  },
  message: {
    type: String,
    required: true,
  },
  link: { type: String, required: false },

  notifyType: {
    type: String,
    enum: ["rota", "message", "system"],
    default: "system",
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  senderId: {
    type: Schema.Types.ObjectId,
    required: false, // This makes the senderId field optional
  },
  recipientId: {
    type: Schema.Types.ObjectId,
  },
});

module.exports = mongoose.model("Notification", NotificationSchema);
