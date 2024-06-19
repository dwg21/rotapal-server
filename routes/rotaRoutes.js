const express = require("express");
const router = express.Router();
const {
  getRotaById,
  updateRotaInfo,
  publishRota,
} = require("../Controllers/rotaController");

const {
  authoriseVenueAdmin,
  authenticateUser,
} = require("../middleware/authentication");
router.get("/:id", authenticateUser, getRotaById);
router.post("/:id", authenticateUser, authoriseVenueAdmin, updateRotaInfo);
router.post("/:id/publish", authenticateUser, authoriseVenueAdmin, publishRota);

module.exports = router;
