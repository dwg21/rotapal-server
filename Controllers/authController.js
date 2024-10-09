const User = require("../Models/User");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const { attachCookiesToResponse, createTokenUser } = require("../utils");
const Business = require("../Models/Business");

const register = async (req, res) => {
  const { user, venue } = req.body;
  const { email, name, password } = user;

  // Check if the email already exists
  const emailAlreadyExists = await User.findOne({ email });
  if (emailAlreadyExists) {
    throw new CustomError.BadRequestError("Email already exists");
  }

  const role = "AccountOwner";

  // Create the new user (but don't save yet)
  const newUser = new User({ name, email, password, role });

  let newBusiness;

  if (venue) {
    const { name, address, phone, openingHours, employees = [] } = venue;

    // Check if a business with the same name already exists
    const businessAlreadyExists = await Business.findOne({ name });
    if (businessAlreadyExists) {
      throw new CustomError.BadRequestError(
        "Business with this name already exists"
      );
    }

    // Create the new business (venue)
    newBusiness = await Business.create({
      name,
      address,
      phone,
      openingHours,
      createdBy: newUser._id,
    });

    // Now assign the business ID to the user
    newUser.business = newBusiness._id;

    // Optionally create employees if provided
    if (employees.length > 0) {
      const employeePromises = employees.map(async (employee) => {
        const { name, email, hourlyWage } = employee;
        let existingUser = await User.findOne({ email });

        // Create a new user if not existing
        if (!existingUser) {
          existingUser = await User.create({
            name,
            email,
            password: "secret", // Ensure to hash the password in a real application
            role: "employee",
            business: newBusiness._id,
          });
        } else {
          // Link user as an employee in the venue
          existingUser.hourlyWage = hourlyWage;
          existingUser.venue.push(newBusiness._id); // Make sure to use newBusiness here
        }

        await existingUser.save();
        return existingUser;
      });

      const createdEmployees = await Promise.all(employeePromises);
      newBusiness.employees = createdEmployees.map((emp) => emp._id);
      await newBusiness.save();
    }
  }

  // Save the user after the business is assigned (if venue exists)
  await newUser.save();

  // Create tokenUser object AFTER business is assigned
  const tokenUser = createTokenUser(newUser);
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
    expires: new Date(0), // Set the expiration to a time in the past
  });
  res.status(StatusCodes.OK).json({ msg: "user logged out" });
};

module.exports = {
  register,
  login,
  logout,
};
