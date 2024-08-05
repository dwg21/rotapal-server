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

router.post("/archivedRoas", authenticateUser, getArchivedRotasbyVenueId);
router.post("/rota", authenticateUser, getRotaByVenueIdAndDate);

router.post("/rota/generateRota", authenticateUser, generateNewRota);

router.post("/rota/employee", authenticateUser, getRotasByEmployeeId);

router.get("/:id", authenticateUser, getRotaById);
router.post("/:id", authenticateUser, updateRotaInfo);
router.post("/:id/publish", authenticateUser, publishRota);

module.exports = router;
