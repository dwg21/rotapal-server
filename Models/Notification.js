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
  venueId: {
    type: Schema.Types.ObjectId,
    ref: "Venue",
    required: false, // This makes the  field optional
  },
  businessId: {
    type: Schema.Types.ObjectId,
    ref: "Business",
  },
});

module.exports = mongoose.model("Notification", NotificationSchema);
