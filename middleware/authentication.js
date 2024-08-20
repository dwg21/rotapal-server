const CustomErr = require("../errors");
const { UnauthorizedError } = require("../errors");
const { isTokenValid } = require("../utils");
const Venue = require("../Models/Venue");
const Rota = require("../Models/Rota");

// Checks user exists
const authenticateUser = async (req, res, next) => {
  const token = req.signedCookies.token;

  if (!token) {
    console.log("No token found in cookies");
    const error = new Error("Authentication invalid");
    error.statusCode = 401; // HTTP Status Code for Unauthorized
    return next(error);
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
    const authError = new Error("Authentication invalid");
    authError.statusCode = 401; // HTTP Status Code for Unauthorized
    return next(authError);
  }
};

const authoriseAccountOwner = async (req, res, next) => {
  if (!req.user) {
    console.error("req.user is undefined");
    const authError = new Error("Authentication invalid");
    authError.statusCode = 401; // Unauthorized
    return next(authError);
  }

  const { role } = req.user;

  if (role !== "AccountOwner") {
    const authError = new Error("Authorization invalid");
    authError.statusCode = 403; // Forbidden
    return next(authError);
  }

  try {
    // You might have additional checks here based on specific logic
    next();
  } catch (error) {
    console.error("Error in authoriseAccountOwner middleware:", error);
    next(error);
  }
};

const authoriseVenueAdmin = async (req, res, next) => {
  if (!req.user) {
    console.error("req.user is undefined");
    const authError = new Error("Authentication invalid");
    authError.statusCode = 401; // Unauthorized
    return next(authError);
  }

  const { userId } = req.user;
  const { rotaId, venueId } = req.params;

  try {
    let venue;

    if (rotaId) {
      const rota = await Rota.findById(rotaId);
      if (!rota) {
        const authError = new Error("Rota not found");
        authError.statusCode = 404; // Not Found
        return next(authError);
      }
      venue = await Venue.findById(rota.venue);
    } else if (venueId) {
      venue = await Venue.findById(venueId);
    }

    if (!venue) {
      const authError = new Error("Venue not found");
      authError.statusCode = 404; // Not Found
      return next(authError);
    }

    const isAdmin =
      venue.rotaAdmins.includes(userId) ||
      venue.createdBy.toString() === userId;
    if (!isAdmin) {
      const authError = new Error("Not authorized to edit this venue");
      authError.statusCode = 403; // Forbidden
      return next(authError);
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
      const authError = new Error("Authentication invalid");
      authError.statusCode = 401; // HTTP Status Code for Unauthorized
      return next(authError);
    }
    next();
  };
};

module.exports = {
  authenticateUser,
  authorisePermissions,
  authoriseVenueAdmin,
  authoriseAccountOwner,
};
