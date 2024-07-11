const express = require("express");
const router = express.Router();

const {
  authoriseVenueAdmin,
  authenticateUser,
} = require("../middleware/authentication");

const { bookHoliday } = require("../Controllers/holidayControllers");

router.post("/book-holiday", authenticateUser, bookHoliday);

module.exports = router;
