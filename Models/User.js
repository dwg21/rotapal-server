const mongoose = require("mongoose");
const validator = require("validator");

const bycrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide name "],
    minlength: 3,
    maxlength: 50,
  },

  email: {
    type: String,
    unique: true,
    required: [true, "Please provide email "],
    validate: {
      validator: validator.isEmail,
      message: "Please provide valid email",
    },
  },

  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },

  password: {
    type: String,
    required: [true, "Please provide password "],
    minlength: 6,
  },

  role: {
    type: String,
    enum: ["AccountOwner", "admin", "employee"],
    default: "AccountOwner",
  },
});

//to access variables in schema use .this
// only rehashes password when password is being changed
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bycrypt.genSalt(10);
  this.password = await bycrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bycrypt.compare(candidatePassword, this.password);
  return isMatch;
};

module.exports = mongoose.model("User", UserSchema);
