const express = require("express");
const router = express.Router();
const {
  createNotification,
  getEmployeeNotificationsByUserId,
} = require("../Controllers/notificationController");

const {
  authoriseVenueAdmin,
  authenticateUser,
} = require("../middleware/authentication");

router.get(
  "/getNotfications",
  authenticateUser,
  getEmployeeNotificationsByUserId
);

router.post(
  "/newNotification",
  authenticateUser,
  authoriseVenueAdmin,
  createNotification
);

module.exports = router;
