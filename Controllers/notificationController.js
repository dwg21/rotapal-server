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
  const { includeRead } = req.query; // Get the includeRead parameter from the query string

  try {
    // Build the query based on includeRead parameter
    const query = { recipientId: userId };

    if (!includeRead || includeRead === "false") {
      // If includeRead is false or not provided, filter out read notifications
      query.isRead = false;
    }

    // Find all notifications for the user based on the query
    const notifications = await Notification.find(query);

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

const markNotificationAsRead = async (req, res) => {
  const { notificationId } = req.params;

  try {
    // Find the notification by ID and update its isRead status to true
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true } // Return the updated document
    );

    if (!notification) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "Notification not found" });
    }

    res.status(StatusCodes.OK).json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Server error" });
  }
};

module.exports = {
  createNotification,
  getEmployeeNotificationsByUserId,
  markNotificationAsRead,
};
