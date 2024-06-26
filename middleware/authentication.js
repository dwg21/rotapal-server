const CustomErr = require("../errors");
const { isTokenValid } = require("../utils");
const Venue = require("../Models/Venue");
const Rota = require("../Models/Rota");

// Checks user exists
const authenticateUser = async (req, res, next) => {
  const token = req.signedCookies.token;

  if (!token) {
    console.log("No token found in cookies");
    return next(new CustomErr.UnauthenticatedError("Authentication invalid"));
  }

  try {
    console.log(token);
    const payload = isTokenValid({ token });
    req.user = {
      name: payload.name,
      userId: payload.userId,
      role: payload.role,
    };
    next();
  } catch (error) {
    console.log("Token validation failed:", error);
    return next(new CustomErr.UnauthenticatedError("Authentication invalid"));
  }
};

// Checks user is the admin of the venue
const authoriseVenueAdmin = async (req, res, next) => {
  if (!req.user) {
    console.error("req.user is undefined");
    return next(new CustomErr.UnauthorizedError("Authentication required"));
  }

  const { userId, role } = req.user;
  const { id: rotaId } = req.params;

  if (role !== "admin") {
    return next(new CustomErr.UnauthorizedError("Not authorized"));
  }

  try {
    const rota = await Rota.findById(rotaId);
    if (!rota) {
      return next(new CustomErr.NotFoundError("Rota not found"));
    }

    const venue = await Venue.findById(rota.venue);
    if (!venue) {
      return next(new CustomErr.NotFoundError("Venue not found"));
    }

    if (venue.createdBy.toString() !== userId) {
      return next(
        new CustomErr.UnauthorizedError("Not authorized to access this venue")
      );
    }

    next();
  } catch (error) {
    console.error("Error in authoriseVenueAdmin middleware:", error);
    next(error);
  }
};

// Middleware to authorize based on roles
const authorisePermissions = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new CustomErr.UnauthorizedError("Unauthorized to access this route")
      );
    }
    next();
  };
};

module.exports = {
  authenticateUser,
  authorisePermissions,
  authoriseVenueAdmin,
};
