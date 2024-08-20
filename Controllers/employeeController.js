const Employee = require("../Models/Employee");
const { StatusCodes } = require("http-status-codes");
const customError = require("../errors/");

const getAllEmployees = async (req, res) => {
  const employees = await Employee.find({ venue: req.params.venueId });
  res.status(StatusCodes.OK).json({ employees });
};

const getSingleEmployee = async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    throw new customError.NotFoundError(
      `No employee found with ID ${req.params.id}`
    );
  }
  res.status(StatusCodes.OK).json({ employee });
};

const updateEmployee = async (req, res) => {
  const { name, email, hourlyWage } = req.body;
  if (!name || !email || hourlyWage === undefined) {
    throw new customError.BadRequestError(
      "Please provide name, email, and hourly wage"
    );
  }

  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    throw new customError.NotFoundError(
      `No employee found with ID ${req.params.id}`
    );
  }

  employee.name = name;
  employee.email = email;
  employee.hourlyWage = hourlyWage;

  await employee.save();

  res.status(StatusCodes.OK).json({ employee });
};

const deleteEmployee = async (req, res) => {
  const employee = await Employee.findByIdAndDelete(req.params.id);
  if (!employee) {
    throw new customError.NotFoundError(
      `No employee found with ID ${req.params.id}`
    );
  }

  res.status(StatusCodes.OK).json({ msg: "Employee deleted" });
};

module.exports = {
  getAllEmployees,
  getSingleEmployee,
  updateEmployee,
  deleteEmployee,
};
