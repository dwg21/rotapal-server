const User = require("../Models/User");
const { StatusCodes } = require("http-status-codes");
//const customError = require("../errors/");

//const { findById } = require("../models/User");

const {
  attachCookiesToResponse,
  createTokenUser,
  checkPermissions,
} = require("../utils");

const getAllUsers = async (req, res) => {
  const users = await User.find({ role: "user" }).select("-password");
  res.status(StatusCodes.OK).json({ users });
};

const getSingleUser = async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) {
    throw new customError.NotFoundError(`No user found with ${req.params.id}`);
  }
  checkPermissions(req.user, user._id);

  res.status(StatusCodes.OK).json({ user });
};

const showCurrentUser = async (req, res) => {
  res.status(StatusCodes.OK).json({ user: req.user });
};

// Update user with find and update function

// const updateUser = async (req, res) => {
//     const {name, email} = req.body ;
//     if (!name || !email) {
//         throw new customError.BadRequestError('Enter all fields')
//     }
//     const user = await User.findByIdAndUpdate(
//         {_id:req.user.userId},
//         {email, name},
//         {new:true, runValidators: true}
//         )
//     const tokenUser = createTokenUser(user);
//     attachCookiesToResponse({res, user:tokenUser});
//     res.status(StatusCodes.OK).json({user: tokenUser})

// }

//update user with user.save() -> will aply any pre save hooks
const updateUser = async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    throw new customError.BadRequestError("Enter all fields");
  }
  const user = await User.findOne({ _id: req.user.userId });

  user.email = email;
  user.name = name;

  await user.save();

  const tokenUser = createTokenUser(user);
  attachCookiesToResponse({ res, user: tokenUser });
  res.status(StatusCodes.OK).json({ user: tokenUser });
};

const updateUserPassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    throw new customError.BadRequestError("Enter both values");
  }
  const user = await User.findOne({ _id: req.user.userId });
  const passwordIsValid = await user.comparePassword(oldPassword);
  if (!passwordIsValid) {
    throw new customError.UnauthenticatedError("Invalid credentials");
  }
  user.password = newPassword;

  await user.save();
  res.status(StatusCodes.OK).json({ msg: "Success - password updated" });
};

module.exports = {
  getAllUsers,
  getSingleUser,
  showCurrentUser,
  updateUser,
  updateUserPassword,
};
