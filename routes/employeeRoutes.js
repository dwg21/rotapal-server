const express = require("express");
const router = express.Router();

const {
  authenticateUser,
  authoriseVenueAdmin,
  authoriseAccountOwner,
} = require("../middleware/authentication");

const {
  getAllEmployees,
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

// Route to update a specific employee by ID
router.put("/:id", authenticateUser, authoriseAccountOwner, updateEmployee);

// Route to delete a specific employee by ID
router.delete("/:id", authenticateUser, authoriseAccountOwner, deleteEmployee);

module.exports = router;
