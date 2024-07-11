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

// Checks user is the admin of the venue
const authoriseVenueAdmin = async (req, res, next) => {
  if (!req.user) {
    console.error("req.user is undefined");
    const authError = new Error("Authentication invalid");
    authError.statusCode = 401; // HTTP Status Code for Unauthorized
    return next(authError);
  }

  const { userId, role } = req.user;
  const { id: rotaId } = req.params;

  if (role !== "admin") {
    const authError = new Error("Authentication invalid");
    authError.statusCode = 401; // HTTP Status Code for Unauthorized
    return next(authError);
  }

  try {
    const rota = await Rota.findById(rotaId);
    if (!rota) {
      const authError = new Error("Authentication invalid");
      authError.statusCode = 401; // HTTP Status Code for Unauthorized
      return next(authError);
    }

    const venue = await Venue.findById(rota.venue);
    if (!venue) {
      const authError = new Error("Authentication invalid");
      authError.statusCode = 401; // HTTP Status Code for Unauthorized
      return next(authError);
    }

    if (venue.createdBy.toString() !== userId) {
      const authError = new Error("Authentication invalid");
      authError.statusCode = 401; // HTTP Status Code for Unauthorized
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
};
