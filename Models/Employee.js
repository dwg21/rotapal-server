const mongoose = require("mongoose");
const { Schema } = mongoose;

const employeeSchema = new Schema({
  name: { type: String, required: true },
  hourlyWage: { type: Number, required: true },
  email: { type: String, required: true },
  venue: { type: mongoose.Schema.Types.ObjectId, ref: "Venue" },
  rotas: [{ type: mongoose.Schema.Types.ObjectId, ref: "Rota" }],
});

module.exports = mongoose.model("Employee", employeeSchema);
