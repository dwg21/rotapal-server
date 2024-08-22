const Notification = require("../Models/Notification");
const User = require("../Models/User");
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
    // Find the user by user ID
    // const user = await User.findById(userId);
    // if (!user) {
    //   return res.status(StatusCodes.NOT_FOUND).json({
    //     error: "User not found for the given user ID",
    //   });
    // }

    // Find all notifications for the user
    const notifications = await Notification.find({
      recipientId: userId,
    });

    res.status(StatusCodes.OK).json({
      notifications,
    });
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Server error" });
  }
};

module.exports = {
  createNotification,
  getEmployeeNotificationsByUserId,
};
