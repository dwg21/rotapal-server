const express = require("express");
const router = express.Router();

const {
  authoriseVenueAdmin,
  authenticateUser,
} = require("../middleware/authentication");

// For user requesting holiday
const {
  createHolidayRequest,
  approveHoliday,
  getUserPendingHolidays,
  getVenueHolidays,
} = require("../Controllers/holidayControllers");

router.post("/book-holiday", authenticateUser, createHolidayRequest);
router.put("/approveHoliday/:holidayId", authenticateUser, approveHoliday);
router.get("/getVenueHolidays/:venueId", authenticateUser, getVenueHolidays);
router.get("/getUserHolidays", authenticateUser, getUserPendingHolidays);

module.exports = router;
