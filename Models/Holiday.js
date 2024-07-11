const mongoose = require("mongoose");
const { Schema } = mongoose;

const holidaySchema = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true },
});

module.exports = mongoose.model("Holiday", holidaySchema);
