const express = require("express");
const router = express.Router();
const {
  approveShiftSwap,
  declineShiftSwap,
  getPendingRequests,
  sendShiftSwapRequest,
  getEmployeeRequests,
  employeeAproveShiftSwap,
} = require("../Controllers/shiftSwapController");

const {
  authoriseVenueAdmin,
  authenticateUser,
} = require("../middleware/authentication");

// toDo fix authroise venue admin

router.post("/swapShiftRequest", authenticateUser, sendShiftSwapRequest);

router.get("/pendingShiftSwapRequests", authenticateUser, getPendingRequests);

router.get("/getEmployeeRequests", authenticateUser, getEmployeeRequests);

router.put(
  "/employeeApproveShiftSwap/:requestId",
  authenticateUser,
  employeeAproveShiftSwap
);

router.put("/approveShiftSwap/:requestId", authenticateUser, approveShiftSwap);

router.put("/declineShiftSwap/:requestId", authenticateUser, declineShiftSwap);

module.exports = router;
