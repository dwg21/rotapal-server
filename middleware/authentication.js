const CustomErr = require("../errors");
const { isTokenValid } = require("../utils");
const Venue = require("../Models/Venue");
const Rota = require("../Models/Rota");

// Checks user exists
const authenticateUser = async (req, res, next) => {
  const token = req.signedCookies.token;

  if (!token) {
    console.log("No token found in cookies");
    throw new CustomErr.UnauthenticatedError("Authentication invalid");
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
    throw new CustomErr.UnauthenticatedError("Authentication invalid");
  }
};

//todo just autorise is admin.
//todo middleware tro aurhorise is the amdin of the vneu for any routes editinf rota

// Checks user is the admin of then venue
const authoriseVenueAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      console.error("req.user is undefined");
      throw new CustomErr.UnauthorizedError("Authentication required");
    }

    const { userId, role } = req.user;
    const { id: rotaId } = req.params;

    if (role === "admin") {
      // Find the venue associated with the rota
      const rota = await Rota.findById(rotaId);
      if (!rota) {
        throw new CustomErr.NotFoundError("Rota not found");
      }

      const venueId = rota.venue; // Assuming you have a reference to the venue in the rota model

      const venue = await Venue.findById(venueId);
      if (!venue) {
        throw new CustomErr.NotFoundError("Venue not found");
      }

      if (venue.createdBy.toString() !== userId) {
        throw new CustomErr.UnauthorizedError(
          "Not authorized to access this venue"
        );
      }

      return next();
    } else {
      throw new CustomErr.UnauthorizedError("Not authorized");
    }
  } catch (error) {
    console.error("Error in authoriseVenueAdmin middleware:", error);
    next(error);
  }
};
const authorisePermissions = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new CustomErr.UnauthorisedError(
        "Unauthorised to access this route"
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
