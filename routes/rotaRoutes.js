const express = require("express");
const router = express.Router();
const {
  getRotaById,
  updateRotaInfo,
  publishRota,
  getRotasByEmployeeId,
  getRotaByVenueIdAndDate,
  generateNewRota,
  getArchivedRotasbyVenueId,
} = require("../Controllers/rotaController");

const {
  authoriseVenueAdmin,
  authenticateUser,
} = require("../middleware/authentication");

router.get(
  "/archivedRoas/:venueId",
  authenticateUser,
  authoriseVenueAdmin,
  getArchivedRotasbyVenueId
);

router.get(
  "/rota/employee/:weekStarting",
  authenticateUser,
  getRotasByEmployeeId
);

router.get("/rota/:weekStarting", authenticateUser, getRotaByVenueIdAndDate);

// the ? makes venueId optional - where none is provided the  contorller will find the default venue
router.get(
  "/rota/:venueId?/:weekStarting",
  authenticateUser,
  getRotaByVenueIdAndDate
);

router.put(
  "/rota/generateRota/:venueId/:weekStarting",
  authenticateUser,
  authoriseVenueAdmin,
  generateNewRota
);

//router.get("/:id", authenticateUser, getRotaById);
router.post("/:rotaId", authenticateUser, authoriseVenueAdmin, updateRotaInfo);

router.post(
  "/:rotaId/publish",
  authenticateUser,
  authoriseVenueAdmin,
  publishRota
);

module.exports = router;
