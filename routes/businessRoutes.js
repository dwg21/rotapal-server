const express = require("express");
const router = express.Router();

const {
  authenticateUser,
  authoriseVenueAdmin,
  authoriseAccountOwner,
} = require("../middleware/authentication");

const {
  getBusinessEmployees,
  addNewEmployee,
} = require("../Controllers/BusinessController");

router.get("/getEmployees", authenticateUser, getBusinessEmployees);
router.post("/addEmployee", authenticateUser, addNewEmployee);

module.exports = router;
