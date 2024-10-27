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
  getBusinessStatistics,
} = require("../Controllers/BusinessController");

router.get("/getEmployees", authenticateUser, getBusinessEmployees);
router.get("/getStatistics", authenticateUser, getBusinessStatistics);
router.post("/addEmployee", authenticateUser, addNewEmployee);

module.exports = router;
