// controllers/venueController.js
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

const User = require("../Models/User");
const Employee = require("../Models/Employee");
const Rota = require("../Models/Rota");
const Venue = require("../Models/Venue");

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

// Get all venues for that spefic user
const getAllVenues = async (req, res) => {
  const venues = await Venue.find({ createdBy: req.user.userId });
  res.status(StatusCodes.OK).json({ venues });
};

// Get a single venue by ID
const getVenueById = async (req, res) => {
  const venue = await Venue.findById(req.params.id).populate("user");
  if (!venue) {
    throw new CustomError.NotFoundError("Venue not found");
  }
  res.status(StatusCodes.OK).json({ venue });
};

// Update a venue by ID
const updateVenue = async (req, res) => {
  const { name, address, phone, openingHours } = req.body;
  const venue = await Venue.findByIdAndUpdate(
    req.params.id,
    { name, address, phone, openingHours },
    { new: true, runValidators: true }
  );
  if (!venue) {
    throw new CustomError.NotFoundError("Venue not found");
  }
  res.status(StatusCodes.OK).json({ venue });
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
};
