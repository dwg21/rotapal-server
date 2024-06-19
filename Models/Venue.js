// models/Venue.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
// Define the schema for a shift
// const shiftSchema = new Schema(
//   {
//     startTime: { type: String, required: true },
//     endTime: { type: String, required: true },
//     duration: { type: Number, required: true },
//   },
//   { _id: false }
// );

// const employeeSchema = new Schema(
//   {
//     name: { type: String, required: true },
//     hourlyWage: { type: Number, required: true },
//     shifts: [[shiftSchema]], // Array of weeks, each containing an array of shifts
//   },
//   { _id: false }
// );

// const venueSchema = new Schema({
//   name: { type: String, required: true },
//   address: String,
//   phone: String,
//   openingHours: {
//     monday: { open: String, close: String },
//     tuesday: { open: String, close: String },
//     wednesday: { open: String, close: String },
//     thursday: { open: String, close: String },
//     friday: { open: String, close: String },
//     saturday: { open: String, close: String },
//     sunday: { open: String, close: String },
//   },
//   employees: [
//     {
//       name: { type: String, required: true },
//       hourlyWage: { type: Number, required: true },
//       email: { type: String, required: true },
//     },
//   ],
//   rota: [
//     {
//       name: String,
//       shifts: [
//         [
//           {
//             startTime: String,
//             endTime: String,
//             duration: Number,
//           },
//         ],
//       ],
//       hourlyWage: Number,
//     },
//   ],
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now },
// });

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
