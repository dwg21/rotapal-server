// controllers/venueController.js
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const mongoose = require("mongoose");
const User = require("../Models/User");
const Rota = require("../Models/Rota");
const Venue = require("../Models/Venue");
const Business = require("../Models/Business");
const { attachCookiesToResponse, createTokenUser } = require("../utils");
const findDefaultVenueId = require("../utils/findDefaultVenueId");

const { createRota, generateWeeks } = require("../utils/rotaUtils");

const createVenue = async (req, res) => {
  const { name, address, phone, openingHours, employees } = req.body;
  const { userId } = req.user;

  try {
    // Fetch the user by ID
    const user = await User.findById(userId);

    // Check if user exists
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND) // 404 for "No user found"
        .json({ error: "No user supplied" });
    }

    const business = await Business.findById(user.business);

    // Check if business exists
    if (!business) {
      return res
        .status(StatusCodes.NOT_FOUND) // 404 for "No business found"
        .json({ error: "No business found for this user" });
    }

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
      employees.some(
        (emp) => !emp.name || !emp.email || emp.hourlyWage === undefined
      )
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
      createdBy: userId, // Use userId from the authenticated user
    });

    business.venues.push(newVenue._id);

    // Create employee accounts with default password and link them to the venue
    const employeePromises = employees.map(async (employee) => {
      const { name, email, hourlyWage } = employee;
      let existingUser = await User.findOne({ email });

      if (existingUser) {
        // Update existing user if found
        existingUser.hourlyWage = hourlyWage;
        existingUser.venue.push(newVenue._id); // Link to newly created venue
        return existingUser.save(); // Save and return updated user
      }

      // Create new user if not found
      const newUser = await User.create({
        name,
        email,
        password: "secret", // Ensure password hashing happens in the relevant process
        role: "employee",
        hourlyWage, // Add hourly wage to the user object
        venue: newVenue._id, // Link to newly created venue
        business: business._id, // Set the business field here
      });

      business.employees.push(newUser._id);
      return newUser;
    });

    const createdEmployees = await Promise.all(employeePromises);

    // Generate the weeks and corresponding rotas
    const weeks = generateWeeks();
    const rotaPromises = weeks.map(async ({ startDate, days }) => {
      const weekRotaData = createRota(createdEmployees, days);

      const newRota = await Rota.create({
        name: `${name} - Week starting ${startDate}`,
        weekStarting: startDate,
        rotaData: weekRotaData,
        venue: newVenue._id,
        employees: createdEmployees.map((emp) => emp._id), // Add employee IDs to the rota
      });

      return newRota._id;
    });

    const rotaIds = await Promise.all(rotaPromises);

    // Update each employee's rota field
    await Promise.all(
      createdEmployees.map(async (employee) => {
        employee.rota = rotaIds;
        return employee.save();
      })
    );

    // Update the venue document with employee IDs and rota IDs
    newVenue.employees = createdEmployees.map((emp) => emp._id);
    newVenue.rota = rotaIds;
    await newVenue.save();
    await business.save();

    res.status(StatusCodes.CREATED).json({ venue: newVenue }); // Respond with the newly created venue
  } catch (error) {
    console.error("Error creating venue:", error.message);

    if (error.message.includes("Employee with email")) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
    } else {
      return res
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
          let existingUser = await User.findOne({ email });

          // Create a new user if not existing
          if (!existingUser) {
            existingUser = await User.create({
              name,
              email,
              password: "secret",
              role: "employee",
            });
          }

          // Link user as employee in venue
          existingUser.hourlyWage = hourlyWage;
          existingUser.venue.push(newVenue._id);

          //existingUser.venue = newVenue._id;
          await existingUser.save();

          return existingUser;
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
        await Promise.all(
          createdEmployees.map(async (employee) => {
            employee.rota = rotaIds;
            return employee.save();
          })
        );
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
    console.error("Error registering user and creating venue:", error);
    if (error.message.includes("Email already exists")) {
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
  console.log("venue id given", id);

  try {
    const venue = await Venue.findById(id).populate("employees");
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
  const { id } = req.params;
  const { employeeId } = req.body;
  const venue = await Venue.findById(id);
  venue.employees.push(employeeId);
  await venue.save();
  console.log(venue);

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
  let { venueId } = req.params;
  console.log("hhe", venueId);
  const { business } = req.user;

  try {
    //If no valid venueId is provided returns the defualt for user
    venueId = await findDefaultVenueId(venueId, business);

    if (!venueId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "No valid venue ID could be determined",
      });
    }
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
  let { venueId } = req.params;
  const { business } = req.user;

  console.log("hhe", venueId);

  try {
    //If no valid venueId is provided returns the defualt for user
    venueId = await findDefaultVenueId(venueId, business);

    if (!venueId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "No valid venue ID could be determined",
      });
    }
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

const makeAdmin = async (req, res) => {
  const { id: venueId } = req.params; // Get venue ID from URL parameters
  const { staffId } = req.body; // Get staffId from the request body

  try {
    // Find the venue
    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(StatusCodes.NOT_FOUND).json({ msg: "Venue not found" });
    }

    // Check if the staff member is already an admin
    if (venue.rotaAdmins.includes(staffId)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "Staff member is already an admin" });
    }

    // Add the staff member to rotaAdmins
    venue.rotaAdmins.push(staffId);

    await venue.save();
    //Change the role of user account to admin

    const user = await User.findById(staffId);

    // Check if user exists
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND) // 404 for "No user found"
        .json({ error: "No user supplied" });
    }

    user.role = "admin";

    await user.save();

    res.status(StatusCodes.OK).json({ msg: "Staff promoted to admin", venue });
  } catch (error) {
    console.error("Failed to promote staff:", error.message);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to promote staff" });
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
  makeAdmin,
};
