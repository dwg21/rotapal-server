const User = require("../Models/User");
const Venue = require("../Models/Venue");
const { StatusCodes } = require("http-status-codes");
const customError = require("../errors/");

const getAllEmployees = async (req, res) => {
  const { venueId } = req.params;

  try {
    const venue = await Venue.findById(venueId).populate("employees");

    if (!venue) {
      throw new customError.NotFoundError("Venue not found");
    }

    const employees = venue.employees;

    res.status(StatusCodes.OK).json({ employees });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const updateEmployee = async (req, res) => {
  const { userId } = req.user;
  const { name, hourlyWage } = req.body;
  console.log(name, hourlyWage);

  if (!name || hourlyWage === undefined) {
    throw new customError.BadRequestError(
      "Please provide name, email, and hourly wage"
    );
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new customError.NotFoundError("User not found");
    }

    if (user.name !== name) {
      user.name = name;
    }

    if (user.hourlyWage !== hourlyWage) {
      user.hourlyWage = hourlyWage;
    }

    await user.save();

    res.status(StatusCodes.OK).json({ employee: user });
  } catch (error) {
    console.error("Error updating employee:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const deleteEmployee = async (req, res) => {
  const { venueId } = req.params;
  const { userId } = req.user;

  try {
    const venue = await Venue.findById(venueId);

    if (!venue) {
      throw new customError.NotFoundError("Venue not found");
    }

    const employees = venue.employees.filter(
      (employee) => employee.toString() !== userId
    );

    if (employees.length === venue.employees.length) {
      throw new customError.NotFoundError("Employee not found in venue");
    }

    venue.employees = employees;
    await venue.save();

    res.status(StatusCodes.OK).json({ msg: "Employee removed from venue" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

module.exports = {
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
};
