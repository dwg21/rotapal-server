// controllers/venueController.js
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const mongoose = require("mongoose");
const User = require("../Models/User");
const Employee = require("../Models/Employee");
const Rota = require("../Models/Rota");
const Venue = require("../Models/Venue");
const { attachCookiesToResponse, createTokenUser } = require("../utils");

const { createRota, generateWeeks } = require("../utils/rotaUtils");

const createVenue = async (req, res) => {
  const { name, address, phone, openingHours, employees } = req.body;

  try {
    // Check if a venue with the same name already exists
    const venueAlreadyExists = await Venue.findOne({ name });
    if (venueAlreadyExists) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: "Venue with this name already exists",
      });
    }

    // Validate employees array
    if (
      !Array.isArray(employees) ||
      employees.some((emp) => !emp.name || !emp.email || !emp.hourlyWage)
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: "Each employee must have a name, email, and hourlyWage.",
      });
    }

    // Create the new venue first
    const newVenue = await Venue.create({
      name,
      address,
      phone,
      openingHours,
      createdBy: req.user.userId, // req.user is set by the authentication middleware
    });

    // Create employee accounts with default password "secret" and link them to the venue
    const employeePromises = employees.map(async (employee) => {
      const { name, email, hourlyWage } = employee;
      const existingUser = await User.findOne({ email });

      let userId;
      let newUser;
      if (!existingUser) {
        newUser = await User.create({
          name,
          email,
          password: "secret",
          role: "employee",
        });
        userId = newUser._id;
      } else {
        userId = existingUser._id;
      }

      // Check for existing employee
      const existingEmployee = await Employee.findOne({ email });
      if (existingEmployee) {
        throw new Error(`Employee with email ${email} already exists.`);
      }

      const newEmployee = await Employee.create({
        name,
        userId,
        email,
        hourlyWage,
        venue: newVenue._id, // Link to newly created venue
      });

      // Update the user document with the employee ID
      if (newUser) {
        newUser.employeeId = newEmployee._id;
        await newUser.save();
      } else {
        existingUser.employeeId = newEmployee._id;
        await existingUser.save();
      }

      return newEmployee; // Return the newly created employee document
    });

    const createdEmployees = await Promise.all(employeePromises);

    // Generate the weeks and corresponding rotas
    const weeks = generateWeeks();
    const rotaPromises = weeks.map(async ({ startDate, days }) => {
      const weekRotaData = createRota(createdEmployees, days);
      console.log("weekRotaData", weekRotaData);

      const newRota = await Rota.create({
        name: `${name} - Week starting ${startDate}`,
        weekStarting: `${startDate}`,
        rotaData: weekRotaData,
        venue: newVenue._id,
        employees: createdEmployees.map((emp) => emp._id), // Add employee IDs to the rota
      });

      return newRota._id;
    });

    const rotaIds = await Promise.all(rotaPromises);

    // Update each employee's rota field
    for (const employee of createdEmployees) {
      employee.rota = rotaIds;
      await employee.save();
    }

    // Update the venue document with employee IDs and rota IDs
    newVenue.employees = createdEmployees.map((emp) => emp._id);
    newVenue.rota = rotaIds;
    await newVenue.save();

    res.status(StatusCodes.CREATED).json({ venue: newVenue }); // Respond with the newly created venue
  } catch (error) {
    console.error(error);
    if (error.message.includes("Employee with email")) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
    } else {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: error.message });
    }
  }
};

const registerAndCreateVenue = async (req, res) => {
  const { user, venue } = req.body; // Destructure user and venue from the request body

  let newUser;
  let tokenUser;

  try {
    // Register the user if the user data is provided
    if (user) {
      const { email, name, password } = user;

      const emailAlreadyExists = await User.findOne({ email });
      if (emailAlreadyExists) {
        throw new CustomError.BadRequestError("Email already exists");
      }

      // Set the user's role to 'AccountOwner'
      const role = "AccountOwner";

      newUser = await User.create({ name, email, password, role });
      tokenUser = createTokenUser(newUser);
      attachCookiesToResponse({ res, user: tokenUser });
    }

    // Create the venue if the venue data is provided
    if (venue) {
      const { name, address, phone, openingHours, employees = [] } = venue;

      // Check if a venue with the same name already exists
      const venueAlreadyExists = await Venue.findOne({ name });
      if (venueAlreadyExists) {
        throw new CustomError.BadRequestError(
          "Venue with this name already exists"
        );
      }

      // Create the new venue
      const newVenue = await Venue.create({
        name,
        address,
        phone,
        openingHours,
        createdBy: tokenUser ? tokenUser.userId : req.user.userId, // Use newly registered user or the authenticated user
      });

      // Optionally create employees if provided
      if (employees.length > 0) {
        const employeePromises = employees.map(async (employee) => {
          const { name, email, hourlyWage } = employee;
          const existingUser = await User.findOne({ email });

          let userId;
          let newUser;

          if (!existingUser) {
            newUser = await User.create({
              name,
              email,
              password: "secret",
              role: "employee",
            });
            userId = newUser._id;
          } else {
            userId = existingUser._id;
          }

          const newEmployee = await Employee.create({
            name,
            userId,
            email,
            hourlyWage,
            venue: newVenue._id, // Link to newly created venue
          });

          if (newUser) {
            newUser.employeeId = newEmployee._id;
            await newUser.save();
          } else {
            existingUser.employeeId = newEmployee._id;
            await existingUser.save();
          }

          return newEmployee;
        });

        const createdEmployees = await Promise.all(employeePromises);

        // Generate rotas for the venue based on employees
        const weeks = generateWeeks();
        const rotaPromises = weeks.map(async ({ startDate, days }) => {
          const weekRotaData = createRota(createdEmployees, days);

          const newRota = await Rota.create({
            name: `${name} - Week starting ${startDate}`,
            weekStarting: `${startDate}`,
            rotaData: weekRotaData,
            venue: newVenue._id,
            employees: createdEmployees.map((emp) => emp._id), // Add employee IDs to the rota
          });

          return newRota._id;
        });

        const rotaIds = await Promise.all(rotaPromises);

        // Update the venue with employee and rota IDs
        newVenue.employees = createdEmployees.map((emp) => emp._id);
        newVenue.rota = rotaIds;
        await newVenue.save();

        // Update each employee's rota field
        for (const employee of createdEmployees) {
          employee.rota = rotaIds;
          await employee.save();
        }
      }

      res
        .status(StatusCodes.CREATED)
        .json({ user: tokenUser, venue: newVenue });
    } else if (newUser) {
      res.status(StatusCodes.CREATED).json({ user: tokenUser });
    } else {
      throw new CustomError.BadRequestError(
        "No data provided to create user or venue"
      );
    }
  } catch (error) {
    console.error(error);
    if (error.message.includes("Employee with email")) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
    } else {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: error.message });
    }
  }
};

// Get all venues for that spefic user
const getAllVenues = async (req, res) => {
  const venues = await Venue.find({ createdBy: req.user.userId });
  res.status(StatusCodes.OK).json({ venues });
};

const getVenueById = async (req, res) => {
  const { id } = req.params;
  console.log("venueibebd", id);
  console.log(req.params);

  try {
    const venue = await Venue.findById(id);
    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }
    res.status(200).json({ venue });
  } catch (error) {
    res.status(500).json({ error: "Error fetching venue details" });
  }
};

// Update a venue by ID
const updateVenue = async (req, res, next) => {
  try {
    const { name, address, phone, openingHours } = req.body;
    const venueId = req.params.id;

    // Validate the venue ID
    if (!venueId) {
      throw new CustomError.BadRequestError("Venue ID is required");
    }

    // Validate required fields
    if (!name || !address || !phone || !openingHours) {
      throw new CustomError.BadRequestError(
        "All fields (name, address, phone, opening hours) are required"
      );
    }

    // Update the venue details
    const venue = await Venue.findByIdAndUpdate(
      venueId,
      { name, address, phone, openingHours },
      { new: true, runValidators: true }
    );

    // Check if the venue exists
    if (!venue) {
      throw new CustomError.NotFoundError("Venue not found");
    }

    res.status(StatusCodes.OK).json({ venue });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateVenue,
};

// Delete a venue by ID
const deleteVenue = async (req, res) => {
  const venue = await Venue.findByIdAndDelete(req.params.id);
  if (!venue) {
    throw new CustomError.NotFoundError("Venue not found");
  }
  res.status(StatusCodes.OK).json({ venue });
};

// Add a staff member to a venue
const addStaff = async (req, res) => {
  const { name, hourlyWage, shifts } = req.body;
  const venue = await Venue.findById(req.params.id);
  if (!venue) {
    throw new CustomError.NotFoundError("Venue not found");
  }
  venue.employees.push({ name, hourlyWage, shifts });
  await venue.save();
  res.status(StatusCodes.OK).json({ venue });
};

// Remove a staff member from a venue
const removeStaff = async (req, res) => {
  const { staffId } = req.params;
  const venue = await Venue.findById(req.params.id);
  if (!venue) {
    throw new CustomError.NotFoundError("Venue not found");
  }
  venue.employees = venue.employees.filter(
    (employee) => employee._id.toString() !== staffId
  );
  await venue.save();
  res.status(StatusCodes.OK).json({ venue });
};

// Add a shift to the rota
const addShift = async (req, res) => {
  const { staffId } = req.params;
  const { weekIndex, dayIndex, shift } = req.body;
  const venue = await Venue.findById(req.params.id);
  if (!venue) {
    throw new CustomError.NotFoundError("Venue not found");
  }
  const employee = venue.employees.id(staffId);
  if (!employee) {
    throw new CustomError.NotFoundError("Employee not found");
  }
  employee.shifts[weekIndex][dayIndex] = shift;
  await venue.save();
  res.status(StatusCodes.OK).json({ venue });
};

// Remove a shift from the rota
const removeShift = async (req, res) => {
  const { staffId, weekIndex, dayIndex } = req.params;
  const venue = await Venue.findById(req.params.id);
  if (!venue) {
    throw new CustomError.NotFoundError("Venue not found");
  }
  const employee = venue.employees.id(staffId);
  if (!employee) {
    throw new CustomError.NotFoundError("Employee not found");
  }
  employee.shifts[weekIndex][dayIndex] = {
    startTime: "",
    endTime: "",
    duration: 0,
  };
  await venue.save();
  res.status(StatusCodes.OK).json({ venue });
};

const updateRota = async (req, res) => {
  const { id: venueId } = req.params;
  const { rota } = req.body;

  const venue = await Venue.findByIdAndUpdate(
    { _id: venueId, createdBy: req.user.userId },
    { rota },
    { new: true, runValidators: true }
  );

  if (!venue) {
    throw new CustomError.NotFoundError(`No venue with id: ${venueId}`);
  }

  res.status(StatusCodes.OK).json({ venue });
};

// Fetch common shifts for a venue
const getCommonShifts = async (req, res) => {
  const { venueId } = req.params;
  console.log("hhe", venueId);

  try {
    const venue = await Venue.findById(venueId);
    if (!venue) {
      throw new CustomError.NotFoundError("Venue not found");
    }

    res.status(StatusCodes.OK).json({ commonShifts: venue.commonShifts });
  } catch (error) {
    console.error("Error fetching common shifts:", error.message);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch common shifts" });
  }
};

// Fetch employees for a venue
// Fetch employees for a venue
const getVenueEmployees = async (req, res) => {
  const { venueId } = req.params;
  console.log("jeheh", venueId);

  try {
    if (!venueId) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "No venue id supplied" });
    }
    console.log(venueId);

    const employees = await Venue.findById(venueId).populate("employees");
    if (!employees) {
      throw new CustomError.NotFoundError("Venue or employes not found");
    }

    res.status(StatusCodes.OK).json({ employees });
  } catch (error) {
    console.error("Error fetching employees:", error.message);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch employees" });
  }
};

// Add a new common shift to a venue
const addCommonShift = async (req, res) => {
  const { venueId } = req.params;
  const { shift } = req.body;

  try {
    const venue = await Venue.findById(venueId);
    if (!venue) {
      throw new CustomError.NotFoundError("Venue not found");
    }

    venue.commonShifts.push(shift);
    await venue.save();

    res.status(StatusCodes.OK).json({ commonShifts: venue.commonShifts });
  } catch (error) {
    console.error("Error adding common shift:", error.message);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to add common shift" });
  }
};

// Remove a common shift from a venue
const removeCommonShift = async (req, res) => {
  const { venueId, shiftId } = req.params;

  try {
    const venue = await Venue.findById(venueId);
    if (!venue) {
      throw new CustomError.NotFoundError("Venue not found");
    }

    venue.commonShifts = venue.commonShifts.filter(
      (shift) => shift.id !== shiftId
    );
    await venue.save();

    res.status(StatusCodes.OK).json({ commonShifts: venue.commonShifts });
  } catch (error) {
    console.error("Error removing common shift:", error.message);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to remove common shift" });
  }
};

// Fetch common shifts for a venue
const getCommonRotas = async (req, res) => {
  const { venueId } = req.params;
  console.log("hhe", venueId);

  try {
    const venue = await Venue.findById(venueId);
    if (!venue) {
      throw new CustomError.NotFoundError("Venue not found");
    }

    res.status(StatusCodes.OK).json({ commonRotas: venue.commonRotas });
  } catch (error) {
    console.error("Error fetching common shifts:", error.message);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch common shifts" });
  }
};

// Add a new common shift to a venue
const addCommonRota = async (req, res) => {
  const { venueId } = req.params;
  const { rota } = req.body;

  try {
    const venue = await Venue.findById(venueId);
    if (!venue) {
      throw new CustomError.NotFoundError("Venue not found");
    }

    venue.commonRotas.push(rota);
    await venue.save();

    res.status(StatusCodes.OK).json({ commonRotas: venue.commonRotas });
  } catch (error) {
    console.error("Error adding common shift:", error.message);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to add common shift" });
  }
};

const removeCommonRota = async (req, res) => {
  const { venueId, rotaId } = req.params;

  try {
    const venue = await Venue.findById(venueId);
    if (!venue) {
      throw new CustomError.NotFoundError("Venue not found");
    }

    venue.commonRotas = venue.commonRotas.filter(
      (shift) => shift.id !== rotaId
    );
    await venue.save();

    res.status(StatusCodes.OK).json({ commonRotas: venue.commonRotas });
  } catch (error) {
    console.error("Error removing common shift:", error.message);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to remove common shift" });
  }
};

module.exports = {
  createVenue,
  registerAndCreateVenue,
  getAllVenues,
  getVenueById,
  updateVenue,
  deleteVenue,
  addStaff,
  removeStaff,
  addShift,
  removeShift,
  updateRota,
  getCommonShifts,
  addCommonShift,
  removeCommonShift,
  getCommonRotas,
  addCommonRota,
  removeCommonRota,
  getVenueEmployees,
};
