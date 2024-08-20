const express = require("express");
const router = express.Router();

const {
  authenticateUser,
  authoriseVenueAdmin,
} = require("../middleware/authentication");

const {
  getAllEmployees,
  getSingleEmployee,
  updateEmployee,
  deleteEmployee,
} = require("../Controllers/employeeController");

// Route to get all employees for a specific venue
router.get(
  "/venue/:venueId",
  authenticateUser,
  authoriseVenueAdmin,
  getAllEmployees
);

// Route to get a single employee by ID
router.get("/:id", authenticateUser, getSingleEmployee);

// Route to update a specific employee by ID
router.put("/:id", authenticateUser, updateEmployee);

// Route to delete a specific employee by ID
router.delete("/:id", authenticateUser, deleteEmployee);

module.exports = router;
