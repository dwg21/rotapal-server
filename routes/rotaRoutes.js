const express = require("express");
const router = express.Router();
const {
  getRotaById,
  updateRotaInfo,
  publishRota,
  getRotasByEmployeeId,
  getRotaByVenueIdAndDate,
  swapShifts,
} = require("../Controllers/rotaController");

const {
  authoriseVenueAdmin,
  authenticateUser,
} = require("../middleware/authentication");

router.post("/rota", authenticateUser, getRotaByVenueIdAndDate);
router.post("/rota/employee", authenticateUser, getRotasByEmployeeId);
router.post("/rota/swapshifts", authenticateUser, swapShifts);

router.get("/:id", authenticateUser, getRotaById);
router.post("/:id", authenticateUser, authoriseVenueAdmin, updateRotaInfo);
router.post("/:id/publish", authenticateUser, authoriseVenueAdmin, publishRota);

module.exports = router;
