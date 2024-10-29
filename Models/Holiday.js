const mongoose = require("mongoose");
const { Schema } = mongoose;

const holidaySchema = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  venueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Venue",
  },
  businessId: {
    type: Schema.Types.ObjectId,
    ref: "Business",
    required: true,
  },

  date: { type: String, required: true },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Declined"],
    default: "Pending",
  },
});

module.exports = mongoose.model("Holiday", holidaySchema);
