const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide name"],
    minlength: 3,
    maxlength: 50,
  },

  email: {
    type: String,
    unique: true,
    required: [true, "Please provide email"],
    validate: {
      validator: validator.isEmail,
      message: "Please provide a valid email",
    },
  },

  password: {
    type: String,
    required: [true, "Please provide password"],
    minlength: 6,
  },

  role: {
    type: String,
    enum: ["AccountOwner", "admin", "employee"],
    default: "AccountOwner",
  },

  hourlyWage: {
    type: Number,
    required: false,
  },

  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Venue",
    required: false,
  },

  rota: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rota",
    },
  ],

  accountActive: {
    type: Boolean,
    default: false,
  },
});

// Hash password before saving if it's modified
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  return isMatch;
};

module.exports = mongoose.model("User", UserSchema);
