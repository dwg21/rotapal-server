const express = require("express");
const router = express.Router();
const {
  createNotification,
  getEmployeeNotificationsByUserId,
  markNotificationAsRead,
} = require("../Controllers/notificationController");

const {
  authoriseVenueAdmin,
  authenticateUser,
} = require("../middleware/authentication");

router.get(
  "/getNotifications",
  authenticateUser,
  getEmployeeNotificationsByUserId
);

router.post(
  "/newNotification",
  authenticateUser,
  authoriseVenueAdmin,
  createNotification
);

router.put("/read/:notificationId", authenticateUser, markNotificationAsRead);

module.exports = router;
