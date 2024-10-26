const Rota = require("../Models/Rota");
const Venue = require("../Models/Venue");
const User = require("../Models/User");
const ShiftSwapRequest = require("../Models/ShiftSwapRequest");
const Notification = require("../Models/Notification");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const { generateWeeks, createRota } = require("../utils/rotaUtils");
const Business = require("../Models/Business");

const getRotasByEmployeeId = async (req, res) => {
  const { userId } = req.user;
  const { weekStarting } = req.params;
  console.log("userId:", userId, "weekStarting:", weekStarting);

  try {
    // Find the user by ID and populate the venue and rota fields
    const user = await User.findById(userId).populate("venue").populate("rota");

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "No user found for this ID" });
    }

    // checks  for any venue with ids from that list in user
    const rota = await Rota.find({
      venue: { $in: user.venue.map((v) => v._id) },
      weekStarting,
    });

    console.log("Rotas found: ", rota);

    // Filter out unpublished rotas
    const publishedRotas = rota.filter((rota) => rota.published);

    console.log("Published rotas: ", publishedRotas);
    // Check if there are any published rotas
    if (publishedRotas.length === 0) {
      return res
        .status(StatusCodes.OK)
        .json({ message: "No published rotas found" });
    }

    console.log("Rota found:", rota);

    res.status(StatusCodes.OK).json({ rota });
  } catch (error) {
    console.error("Error fetching rotas:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Server error " });
  }
};

//toDo , there is no venue id , needs to find by userid
const getArchivedRotasbyVenueId = async (req, res) => {
  const { venueId } = req.params;
  try {
    const rotas = await Rota.find({ archived: true, venue: venueId });
    if (!rotas) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "No archoved Rotas not found" });
    }
    res.status(StatusCodes.OK).json({ rotas });
  } catch (err) {
    console.log(err);
  }
};
const getRotaByVenueIdAndDate = async (req, res) => {
  let { venueId, weekStarting } = req.params;
  const { business } = req.user;

  console.log("You are here");

  console.log("Venue ID from params:", venueId);

  // If no venueId is provided, or it's an invalid placeholder value, find the default venue
  if (
    !venueId ||
    venueId === "null" ||
    venueId === "undefined" ||
    venueId === "default" ||
    venueId === ""
  ) {
    console.log("No valid venue ID was given, fetching default venue");

    try {
      // Fetch the business details using the business ID from the user
      const businessDetails = await Business.findById(business);

      // Ensure the business has at least one venue
      if (
        businessDetails &&
        businessDetails.venues &&
        businessDetails.venues.length > 0
      ) {
        venueId = businessDetails.venues[0]; // Set to default venue
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "No venues found for this business",
        });
      }
    } catch (error) {
      console.error("Error fetching business:", error);
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Error fetching business details",
      });
    }
  }

  console.log("The final venue ID is:", venueId);

  try {
    // Validate the venueId to ensure it's a proper ObjectId
    // if (!mongoose.Types.ObjectId.isValid(venueId)) {
    //   return res.status(StatusCodes.BAD_REQUEST).json({
    //     success: false,
    //     message: "Invalid venue ID",
    //   });
    //}

    // Fetch the rota by venue ID and weekStarting date
    const rota = await Rota.findOne({ venue: venueId, weekStarting });

    if (!rota) {
      const currentDate = new Date();
      const rotaDate = new Date(weekStarting);

      let message = "Rota not found";
      if (rotaDate < currentDate) {
        message = "Rota not found for a past date";
      } else {
        message = "Rota not found for a future date";
      }

      return res.status(StatusCodes.OK).json({
        success: false,
        message,
        pastDate: rotaDate < currentDate,
        futureDate: rotaDate >= currentDate,
      });
    }

    // Return the found rota
    res.status(StatusCodes.OK).json({
      success: true,
      rota,
    });
  } catch (error) {
    console.error("Error fetching rota:", error);
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Error fetching rota",
    });
  }
};

const generateNewRota = async (req, res) => {
  const { venueId, weekStarting } = req.params;
  console.log("VenueId:", venueId, "WeekStarting:", weekStarting);

  try {
    const venue = await Venue.findById(venueId).populate("employees");

    if (!venue) {
      console.error(`No venue found for id: ${venueId}`);
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "No venue found for that id" });
    }

    const weeks = generateWeeks(weekStarting, 1);
    console.log("Generated weeks:", weeks);

    const rotaData = createRota(venue.employees, weeks[0].days);
    console.log("Generated rota data:", rotaData);

    const newRota = await Rota.create({
      name: `${venue.name} - Week starting ${weekStarting}`,
      weekStarting: weekStarting,
      rotaData: rotaData,
      venue: venue._id,
      employees: venue.employees.map((emp) => emp._id),
    });
    console.log("New rota created:", newRota);

    venue.rota = [...venue.rota, newRota._id]; // Ensure you are pushing the new Rota ID
    await venue.save();
    console.log("Venue updated with new rota ID:", venue);

    res.status(StatusCodes.OK).json({ newRota });
  } catch (error) {
    console.error("Error generating rota:", error);
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Error generating rota" });
  }
};

const getRotaById = async (req, res) => {
  const { id } = req.params;
  console.log("Rota ID:", id);

  try {
    const rota = await Rota.findById(id);

    if (!rota) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Rota not found" });
    }

    res.status(StatusCodes.OK).json({ rota });
  } catch (error) {
    if (error.kind === "ObjectId") {
      console.error("Invalid Rota ID:", error);
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Invalid rota ID" });
    }
    console.error("Error fetching rota:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Server error" });
  }
};

// const updateRotaInfo = async (req, res) => {
//   const { id: rotaId } = req.params;
//   const { newRota } = req.body;

//   console.log(newRota[1].schedule);

//   try {
//     const rota = await Rota.findById(rotaId);

//     if (!rota) {
//       return res
//         .status(StatusCodes.NOT_FOUND)
//         .json({ message: `No rota with id: ${rotaId}` });
//     }

//     rota.rotaData = newRota;
//     await rota.save();

//     res.status(StatusCodes.OK).json({ rota });
//   } catch (error) {
//     console.error("Error updating rota info:", error);
//     res
//       .status(StatusCodes.BAD_REQUEST)
//       .json({ message: "Could not update rota info" });
//   }
// };

const updateRotaInfo = async (req, res) => {
  const { rotaId } = req.params;
  const { newRota } = req.body;

  console.log("hello");

  try {
    const rota = await Rota.findById(rotaId);

    if (!rota) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: `No rota with id: ${rotaId}` });
    }

    // Update rotaData by preserving existing holidayBooked entries
    rota.rotaData.forEach((employeeRota, index) => {
      const newEmployeeRota = newRota.find(
        (newRotaEntry) =>
          String(newRotaEntry.employee) === String(employeeRota.employee)
      );

      if (newEmployeeRota) {
        employeeRota.schedule.forEach((scheduleEntry, scheduleIndex) => {
          if (!scheduleEntry.holidayBooked) {
            employeeRota.schedule[scheduleIndex] =
              newEmployeeRota.schedule[scheduleIndex];
          }
        });
      }
    });

    await rota.save();

    res.status(StatusCodes.OK).json({ rota });
  } catch (error) {
    console.error("Error updating rota info:", error);
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Could not update rota info" });
  }
};

const publishRota = async (req, res) => {
  const { rotaId } = req.params;
  const { isPublished } = req.body;

  try {
    const rota = await Rota.findById(rotaId);

    if (!rota) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: `No rota with id: ${rotaId}` });
    }

    rota.published = isPublished;
    await rota.save();

    if (isPublished) {
      const message = `The rota for ${rota.weekStarting} has been published.`;
      const link = `/employeerota/${rota.weekStarting}`;
      const notifyType = "rota";
      const senderId = null; // Assuming the system is sending the notification

      const notifications = rota.employees.map((employeeId) => ({
        message,
        link,
        notifyType,
        senderId,
        recipientId: employeeId,
      }));

      await Notification.insertMany(notifications);
    }

    res.status(StatusCodes.OK).json({ rota });
  } catch (error) {
    console.error("Error publishing rota:", error);
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Could not update rota info" });
  }
};

module.exports = {
  getRotaById,
  updateRotaInfo,
  publishRota,
  getRotasByEmployeeId,
  getRotaByVenueIdAndDate,
  generateNewRota,
  getArchivedRotasbyVenueId,
};
