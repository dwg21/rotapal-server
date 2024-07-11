// models/Venue.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const defaultCommonShifts = [
  { id: "day-off", desc: "Day Off", startTime: "", endTime: "" },
  { id: "9-to-5", desc: "9 to 5", startTime: "09:00", endTime: "17:00" },
];

const venueSchema = new Schema({
  name: { type: String, required: true },
  address: String,
  phone: String,
  openingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String },
  },
  employees: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }],
  rota: [{ type: mongoose.Schema.Types.ObjectId, ref: "Rota" }],
  commonShifts: {
    type: [
      {
        id: { type: String, required: true },
        desc: String,
        startTime: String,
        endTime: String,
      },
    ],
    default: defaultCommonShifts,
  },
  commonRotas: [],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Middleware to update the 'updatedAt' field before saving
venueSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Venue", venueSchema);
