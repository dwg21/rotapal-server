// models/Venue.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const BusinessSchemea = new Schema({
  name: { type: String, required: true },
  address: String,
  phone: String,
  employees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  venues: [{ type: mongoose.Schema.Types.ObjectId, ref: "Venue" }],
  statistics: [
    {
      weekStarting: Date, // First date of the week
      totalStaffHours: Number,
      totalStaffCost: Number,
      totalHolidayDays: Number,
      totalHolidayCost: Number,
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  BusinessAdmins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // New field
});

module.exports = mongoose.model("Business ", BusinessSchemea);
