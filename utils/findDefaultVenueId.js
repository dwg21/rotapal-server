const Business = require("../Models/Business");

/**
 * Function to retrieve the default venue ID if not provided
 * @param {String} venueId - Venue ID parameter
 * @param {String} businessId - Business ID from the user
 * @returns {Promise<String|null>} - Returns the venue ID or null if no venue is found
 */
const findDefaultVenueId = async (venueId, businessId) => {
  // Check if venueId is valid
  if (
    venueId &&
    venueId !== "null" &&
    venueId !== "undefined" &&
    venueId !== "default" &&
    venueId !== ""
  ) {
    return venueId;
  }

  try {
    // Fetch the business details using the business ID from the user
    const businessDetails = await Business.findById(businessId);

    if (businessDetails && businessDetails.venues.length > 0) {
      return businessDetails.venues[0]; // Return the default venue ID
    }
    return null; // Return null if no venue is found
  } catch (error) {
    console.error("Error fetching default venue:", error);
    throw new Error("Error fetching default venue");
  }
};

module.exports = findDefaultVenueId;
