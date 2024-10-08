const User = require("../Models/User");
const Business = require("../Models/Business");
const { StatusCodes } = require("http-status-codes");

const getBusinessEmployees = async (req, res) => {
  const { userId } = req.user;

  try {
    // Fetch the user by ID
    const user = await User.findById(userId);

    // Check if user exists
    if (!user) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "No user supplied" }); // Return to stop further execution
    }

    console.log(user.business);

    // Fetch the business associated with the user
    const business = await Business.findById(user.business).populate(
      "employees"
    ); // Populate the employee IDs with user info

    console.log(business);

    // Check if business exists
    if (!business) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "No business found for this user" }); // Return to stop further execution
    }

    // Respond with the employees of the business
    return res.status(StatusCodes.OK).json({ employees: business.employees }); // Return to ensure response is sent once
  } catch (error) {
    console.error("Error fetching employees:", error.message);

    // Handle errors and return error response
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch employees" });
  }
};

const addNewEmployee = async (req, res) => {
  const { userId } = req.user;
  const { name, email, hourlyWage } = req.body; // Directly extracting these fields

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "No user supplied" });
    }

    const business = await Business.findById(user.business);
    if (!business) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "No business found for this user" });
    }

    const newUser = await User.create({
      name,
      email,
      password: "secret", // Ensure that password hashing is handled in the User model
      role: "employee",
      hourlyWage, // Add hourly wage
      business: business._id,
    });

    business.employees.push(newUser._id);
    await business.save();

    return res.status(StatusCodes.CREATED).json({ employee: newUser });
  } catch (error) {
    console.error("Error adding new employee:", error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to add new employee" });
  }
};

module.exports = { getBusinessEmployees, addNewEmployee };
