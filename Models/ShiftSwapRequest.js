// models/ShiftSwapRequest.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const shiftSwapRequestSchema = new Schema({
  fromShiftId: { type: mongoose.Schema.Types.ObjectId, required: true },
  toShiftId: { type: mongoose.Schema.Types.ObjectId, required: true },
  fromEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  toEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  rotaId: { type: mongoose.Schema.Types.ObjectId, ref: "Rota", required: true },
  venueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Venue",
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Declined"],
    default: "Pending",
  },
  message: {
    type: String,
    required: true,
  },

  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model("shiftSwapRequest", shiftSwapRequestSchema);
