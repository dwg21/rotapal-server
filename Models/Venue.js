// models/Venue.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const defaultCommonShifts = [
  {
    id: "day-off",
    desc: "Day Off",
    shiftData: { startTime: "", endTime: "", label: "Day Off" },
  },
  {
    id: "9-to-5",
    desc: "9 to 5",
    shiftData: { startTime: "09:00", endTime: "17:00", label: "" },
  },
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
  employees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  rota: [{ type: mongoose.Schema.Types.ObjectId, ref: "Rota" }],
  statistics: [
    {
      weekStarting: Date, // First date of the week
      totalStaffHours: Number,
      totalStaffCost: Number,
      totalHolidayDays: Number,
      totalHolidayCost: Number,
    },
  ],
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
  },
  commonShifts: {
    type: [
      {
        id: { type: String, required: true },
        desc: String,
        shiftData: { startTime: String, endTime: String, label: String },
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
  rotaAdmins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // New field
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Middleware to update the 'updatedAt' field before saving
venueSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Venue", venueSchema);
