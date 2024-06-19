const mongoose = require("mongoose");
const { Schema } = mongoose;

const rotaSchema = new Schema({
  name: String,
  published: { type: Boolean, default: false }, // Add the published field with default value false
  rotaData: [
    {
      employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
      employeeName: String,
      hourlyWage: Number,

      schedule: [
        [
          {
            startTime: String,
            endTime: String,
            duration: Number,
            _id: false, // Prevent creation of _id for each schedule object
          },
        ],
      ],
      _id: false, // Prevent creation of _id for each schedule object
    },
  ],
  venue: { type: mongoose.Schema.Types.ObjectId, ref: "Venue" },
});

module.exports = mongoose.model("Rota", rotaSchema);
