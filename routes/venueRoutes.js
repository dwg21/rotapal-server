// routes/venueRoutes.js
const express = require("express");
const router = express.Router();
const {
  createVenue,
  registerAndCreateVenue,
  getAllVenues,
  getVenueById,
  updateVenue,
  deleteVenue,
  addStaff,
  removeStaff,
  addShift,
  removeShift,
  updateRota,
  getCommonShifts,
  addCommonShift,
  removeCommonShift,
  getCommonRotas,
  addCommonRota,
  removeCommonRota,
  getVenueEmployees,
  makeAdmin,
} = require("../Controllers/venueController");

const {
  authenticateUser,
  authoriseVenueAdmin,
} = require("../middleware/authentication");

//Todo , make authenticateVenueAdmin work

router.post("/venues", authenticateUser, createVenue);
router.post("/registerAndCreateVenue", registerAndCreateVenue);

router.get("/venues", authenticateUser, getAllVenues);
router.get("/venues/:id", authenticateUser, getVenueById);
router.put("/venues/:id", authenticateUser, updateVenue);
router.delete("/venues/:id", authenticateUser, deleteVenue);
router.post("/venues/:id/addStaff", authenticateUser, addStaff);
router.delete("/venues/:id/staff/:staffId", authenticateUser, removeStaff);
router.post("/venues/:id/rota/:staffId", authenticateUser, addShift);
router.delete(
  "/venues/:id/rota/:staffId/:weekIndex/:dayIndex",
  authenticateUser,
  removeShift
);
router.route("/venues/:id/rota").patch(authenticateUser, updateRota); // New route for updating rota

router.get("/:venueId/common-shifts", authenticateUser, getCommonShifts);
router.get("/:venueId/employees", authenticateUser, getVenueEmployees);

router.post("/:venueId/common-shifts", authenticateUser, addCommonShift);

router.delete("/:venueId/common-shifts/:shiftId", removeCommonShift);

router.get("/:venueId/common-rotas", authenticateUser, getCommonRotas);

router.post("/:venueId/common-rotas", authenticateUser, addCommonRota);

router.delete("/:venueId/common-rotas/:rotaId", removeCommonRota);

router.post("/venues/:id/makeAdmin", authenticateUser, makeAdmin);

module.exports = router;
