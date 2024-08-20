const User = require("../Models/User");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const { attachCookiesToResponse, createTokenUser } = require("../utils");

const register = async (req, res) => {
  const { email, name, password } = req.body;
  const emailAlreadyExists = await User.findOne({ email });
  if (emailAlreadyExists) {
    throw new CustomError.BadRequestError("Email already exits");
  }

  //first registered user is an admin
  const isFirstAccount = (await User.countDocuments({})) === 0;
  const role = isFirstAccount ? "admin" : "user";

  const user = await User.create({ name, email, password, role });
  const tokenUser = createTokenUser(user);
  attachCookiesToResponse({ res, user: tokenUser });

  res.status(StatusCodes.CREATED).json({ user: tokenUser });
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if both email and password are provided
    if (!email || !password) {
      throw new CustomError.BadRequestError(
        "Please provide email and password"
      );
    }

    // Find the user by email
    const user = await User.findOne({ email });

    // If user is not found, throw an authentication error
    if (!user) {
      throw new CustomError.UnauthenticatedError("Invalid Credentials");
    }

    // Check if the password is correct
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      throw new CustomError.UnauthenticatedError("Invalid Credentials");
    }

    // Create a token for the user
    const tokenUser = createTokenUser(user);

    // Attach the token to the response as a cookie
    attachCookiesToResponse({ res, user: tokenUser });

    // Send a success response
    res.status(StatusCodes.OK).json({ user: tokenUser });
  } catch (error) {
    // Pass the error to the next middleware (could be an error handler)
    next(error);
  }
};

// 'token' was previosuly chosen as the name for the cookie sent to browser
const logout = async (req, res) => {
  res.cookie("token", "logout", {
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  res.status(StatusCodes.OK).json({ msg: "user logged out" });
};

module.exports = {
  register,
  login,
  logout,
};
