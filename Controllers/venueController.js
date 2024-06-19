// controllers/venueController.js
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

const User = require("../Models/User");
const Employee = require("../Models/Employee");
const Rota = require("../Models/Rota");
const Venue = require("../Models/Venue");

const { createRota, generateWeeks } = require("../utils/rotaUtils");

// Create a new venue
// const createVenue = async (req, res) => {
//   const { name, address, phone, openingHours, employees } = req.body;

//   // Check if a venue with the same name already exists
//   const venueAlreadyExists = await Venue.findOne({ name });
//   if (venueAlreadyExists) {
//     throw new CustomError.BadRequestError(
//       "Venue with this name already exists"
//     );
//   }

//   // Validate employees array
//   if (
//     !Array.isArray(employees) ||
//     employees.some((emp) => !emp.name || !emp.email || !emp.hourlyWage)
//   ) {
//     throw new CustomError.BadRequestError(
//       "Each employee must have a name, email, and hourlyWage."
//     );
//   }

//   // Generate the initial rota for the venue
//   const rota = createRota(employees);

//   // Create employee accounts with default password "secret"
//   const employeePromises = employees.map(async (employee) => {
//     const { name, email, hourlyWage } = employee; // Extract name and email
//     const existingUser = await User.findOne({ email });

//     let userId;
//     if (!existingUser) {
//       const newUser = await User.create({
//         name, // Use provided name
//         email, // Use provided email
//         password: "secret", // Hashed password
//         role: "employee",
//       });
//       userId = newUser._id;
//     } else {
//       // If user already exists, just return their ID
//       userId = existingUser._id;
//     }
//     return { _id: userId, name, email, hourlyWage };
//   });

//   // Wait for all employee accounts to be created
//   const employeeData = await Promise.all(employeePromises);

//   // Create a new venue with complete employee objects
//   const venue = await Venue.create({
//     name,
//     address,
//     phone,
//     openingHours,
//     employees: employeeData, // Full employee objects with required fields
//     rota,
//     createdBy: req.user.userId, // req.user is set by the authentication middleware
//   });

//   res.status(StatusCodes.CREATED).json({ venue });
// };

// const createVenue = async (req, res) => {
//   const { name, address, phone, openingHours, employees } = req.body;

//   try {
//     // Check if a venue with the same name already exists
//     const venueAlreadyExists = await Venue.findOne({ name });
//     if (venueAlreadyExists) {
//       throw new CustomError.BadRequestError(
//         "Venue with this name already exists"
//       );
//     }

//     // Validate employees array
//     if (
//       !Array.isArray(employees) ||
//       employees.some((emp) => !emp.name || !emp.email || !emp.hourlyWage)
//     ) {
//       throw new CustomError.BadRequestError(
//         "Each employee must have a name, email, and hourlyWage."
//       );
//     }

//     // Create the new venue first
//     const newVenue = await Venue.create({
//       name,
//       address,
//       phone,
//       openingHours,
//       createdBy: req.user.userId, // req.user is set by the authentication middleware
//     });

//     // Create employee accounts with default password "secret" and link them to the venue
//     const employeePromises = employees.map(async (employee) => {
//       const { name, email, hourlyWage } = employee;
//       const existingUser = await User.findOne({ email });

//       let userId;
//       if (!existingUser) {
//         const newUser = await User.create({
//           name,
//           email,
//           password: "secret",
//           role: "employee",
//         });
//         userId = newUser._id;
//       } else {
//         userId = existingUser._id;
//       }

//       const newEmployee = await Employee.create({
//         name,
//         email,
//         hourlyWage,
//         venue: newVenue._id, // Link to newly created venue
//       });

//       return newEmployee._id;
//     });

//     const employeeIds = await Promise.all(employeePromises);

//     // Update employees data with IDs
//     const employeesWithIds = employees.map((emp, index) => ({
//       ...emp,
//       _id: employeeIds[index], // Assign fetched _id to each employee
//     }));

//     // Generate the initial rota for the venue using updated employees data
//     const rotaData = createRota(employeesWithIds);

//     // Create a new rota with complete employee objects
//     const newRota = await Rota.create({
//       name: "Default Rota",
//       rotaData: rotaData,
//       venue: newVenue._id, // Link to newly created venue
//     });

//     // Update the venue document with employee IDs and rota ID
//     newVenue.employees = employeeIds;
//     newVenue.rota = [newRota._id];
//     await newVenue.save();

//     res.status(StatusCodes.CREATED).json({ venue: newVenue }); // Respond with the newly created venue
//   } catch (error) {
//     // Handle errors
//     console.error(error);
//     res
//       .status(StatusCodes.INTERNAL_SERVER_ERROR)
//       .json({ error: error.message });
//   }
// };

const createVenue = async (req, res) => {
  const { name, address, phone, openingHours, employees } = req.body;

  try {
    // Check if a venue with the same name already exists
    const venueAlreadyExists = await Venue.findOne({ name });
    if (venueAlreadyExists) {
      throw new CustomError.BadRequestError(
        "Venue with this name already exists"
      );
    }

    // Validate employees array
    if (
      !Array.isArray(employees) ||
      employees.some((emp) => !emp.name || !emp.email || !emp.hourlyWage)
    ) {
      throw new CustomError.BadRequestError(
        "Each employee must have a name, email, and hourlyWage."
      );
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
      if (!existingUser) {
        const newUser = await User.create({
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
        email,
        hourlyWage,
        venue: newVenue._id, // Link to newly created venue
      });

      return { _id: newEmployee._id, name, hourlyWage }; // Return necessary employee data
    });

    const employeesWithIds = await Promise.all(employeePromises);

    // Generate the weeks and corresponding rotas
    const weeks = generateWeeks();
    const rotaPromises = weeks.map(async ({ startDate, days }, index) => {
      const weekRotaData = createRota(employeesWithIds, days);
      const newRota = await Rota.create({
        name: `${name} - Week starting ${startDate}`,
        rotaData: weekRotaData,
        venue: newVenue._id,
      });
      return newRota._id;
    });

    const rotaIds = await Promise.all(rotaPromises);

    // Update the venue document with employee IDs and rota IDs
    newVenue.employees = employeesWithIds.map((emp) => emp._id);
    newVenue.rota = rotaIds;
    await newVenue.save();

    res.status(StatusCodes.CREATED).json({ venue: newVenue }); // Respond with the newly created venue
  } catch (error) {
    // Handle errors
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
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
};
