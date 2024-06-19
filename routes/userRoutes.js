const express = require("express");
const router = express.Router();
const {
  authenticateUser,
  authorisePermissions,
} = require("../middleware/authentication");

const {
  getAllUsers,
  getSingleUser,
  showCurrentUser,
  updateUser,
  updateUserPassword,
} = require("../Controllers/userController");

router
  .route("/")
  .get(authenticateUser, authorisePermissions("admin", "owner"), getAllUsers);
router.route("/updateUser").patch(authenticateUser, updateUser);
router.route("/updateUserPassword").patch(authenticateUser, updateUserPassword);

router.route("/showMe").get(authenticateUser, showCurrentUser);

router.route("/:id").get(authenticateUser, getSingleUser);

module.exports = router;
