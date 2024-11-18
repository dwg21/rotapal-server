const mongoose = require("mongoose");
const User = require("../Models/User");
const Business = require("../Models/Business");
const Notification = require("../Models/Notification");
const ShiftSwapRequest = require("../Models/ShiftSwapRequest");
const Holiday = require("../Models/Holiday");

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

const getBusinessStatistics = async (req, res) => {
  const { business: businessId } = req.user;

  try {
    if (!mongoose.isValidObjectId(businessId)) {
      return res.status(400).json({ message: "Invalid business ID" });
    }

    const business = await Business.findById(businessId).populate("venues");

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    // Log the venues to inspect the statistics
    console.log("Venues:", business.venues);

    // Grouping statistics by venue
    const groupedStatistics = {};

    business.venues.forEach((venue) => {
      venue.statistics.forEach((stat) => {
        const venueId = venue._id.toString(); // Ensure venue ID is a string
        const venueName = venue.name;

        // Initialize the venue key if it doesn't exist
        if (!groupedStatistics[venueId]) {
          groupedStatistics[venueId] = {
            venueName,
            statistics: [],
          };
        }

        // Push the current stat to the relevant venue
        groupedStatistics[venueId].statistics.push({
          weekStarting: stat.weekStarting,
          totalStaffHours: stat.totalStaffHours,
          totalStaffCost: stat.totalStaffCost,
          totalHolidayDays: stat.totalHolidayDays,
          totalHolidayCost: stat.totalHolidayCost,
        });
      });
    });

    console.log("Grouped Statistics:", groupedStatistics); // Check the grouped statistics
    return res.status(200).json({ statistics: groupedStatistics });
  } catch (error) {
    console.error("Error retrieving business statistics:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getBusinessNotifications = async (req, res) => {
  const { business: businessId } = req.user;
  const { venueId } = req.params;

  try {
    let Notifications;
    let ShiftSwapRequests;
    let holidays;

    if (venueId) {
      Notifications = await Notification.find({ businessId, venueId });
      ShiftSwapRequests = await ShiftSwapRequest.find({
        businessId,
        venueId,
        status: "AdminPending",
      });
      holidays = await Holiday.find({ businessId, venueId, status: "Pending" });
    } else {
      Notifications = await Notification.find({
        businessId,
      });

      ShiftSwapRequests = await ShiftSwapRequest.find({
        businessId,
        status: "AdminPending",
      });
      holidays = await Holiday.find({ businessId, status: "Pending" });
      console.log("***********", holidays);
    }
    return res.status(200).json({
      Notifications: Notifications,
      swapRequests: ShiftSwapRequests,
      holidays,
    });
  } catch (error) {
    console.error("Error retrieving business Notification:", error);
    return res.status(500).json({ message: "Notification error" });
  }
};

module.exports = {
  getBusinessEmployees,
  addNewEmployee,
  getBusinessStatistics,
  getBusinessNotifications,
};
