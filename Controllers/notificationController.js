const Notification = require("../Models/Notification");
const Employee = require("../Models/Employee");
const { StatusCodes } = require("http-status-codes");

// Create a new notification
const createNotification = async (req, res) => {
  try {
    const { message, link, notifyType, senderId, recipientIds } = req.body;

    // Ensure recipientIds is an array and not empty
    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res
        .status(400)
        .json({ error: "recipientIds must be a non-empty array" });
    }

    // Create a new notification instance
    const newNotification = new Notification({
      message,
      link,
      notifyType,
      senderId,
      recipientIds,
    });

    // Save the notification to the database
    const savedNotification = await newNotification.save();

    // Send the response back to the client
    return res.status(201).json(savedNotification);
  } catch (error) {
    console.error("Error creating notification:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const getEmployeeNotificationsByUserId = async (req, res) => {
  const { userId } = req.user;

  try {
    // Find the employee by user ID
    const employee = await Employee.findOne({ userId });
    if (!employee) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: "Employee not found for the given user ID",
      });
    }

    // Find all notifications for the employee
    const notifications = await Notification.find({
      recipientId: employee._id,
    });

    res.status(StatusCodes.OK).json({
      employeeId: employee._id,
      notifications,
    });
  } catch (error) {
    console.error("Error fetching employee notifications:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Server error" });
  }
};

module.exports = {
  createNotification,
  getEmployeeNotificationsByUserId,
};
