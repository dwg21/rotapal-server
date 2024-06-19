const express = require("express");
const router = express.Router();
const {
  getRotaById,
  updateRotaInfo,
} = require("../Controllers/rotaController");

const {
  authoriseVenueAdmin,
  authenticateUser,
} = require("../middleware/authentication");
router.get("/:id", authenticateUser, getRotaById);
router.post("/:id", authenticateUser, authoriseVenueAdmin, updateRotaInfo);
module.exports = router;
