const mongoose = require("mongoose");
const { Schema } = mongoose;

const rotaSchema = new Schema({
  name: String,
  weekStarting: String,
  archived: { type: Boolean, default: false }, // true when rota is expired
  statistics: {
    totalCost: Number,
    totalStaffHours: Number,
    holidayHoursTaken: Number,
  },
  published: { type: Boolean, default: false }, // Add the published field with default value false
  employees: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }],
  rotaData: [
    {
      employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
      employeeName: String,
      hourlyWage: Number,
      schedule: [
        {
          date: String,
          shiftData: {
            startTime: String,
            endTime: String,
            label: String,
            message: String,
            break_duration: Number,
            break_startTime: String,
          },
          holidayBooked: { type: Boolean, default: false },
        },
      ],
      _id: false, // Prevent creation of _id for each schedule object
    },
  ],
  venue: { type: mongoose.Schema.Types.ObjectId, ref: "Venue" },
});

module.exports = mongoose.model("Rota", rotaSchema);
