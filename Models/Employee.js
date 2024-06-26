const mongoose = require("mongoose");
const { Schema } = mongoose;

const employeeSchema = new Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  hourlyWage: { type: Number, required: true },
  email: { type: String, required: true },
  venue: { type: mongoose.Schema.Types.ObjectId, ref: "Venue" },
  rota: [{ type: mongoose.Schema.Types.ObjectId, ref: "Rota" }],
});

module.exports = mongoose.model("Employee", employeeSchema);
