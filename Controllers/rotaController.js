const Rota = require("../Models/Rota");
const Venue = require("../Models/Venue");
const ShiftSwapRequest = require("../Models/ShiftSwapRequest");
const Notification = require("../Models/Notification");
const Employee = require("../Models/Employee");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const { generateWeeks, createRota } = require("../utils/rotaUtils");
const { trusted } = require("mongoose");

const getRotasByEmployeeId = async (req, res) => {
  const { userId } = req.user;
  const { weekStarting } = req.body;
  console.log("userId:", userId, "weekStarting:", weekStarting);

  try {
    // Find the employee by user ID and populate the venue and rota fields
    const employee = await Employee.findOne({ userId })
      .populate("venue")
      .populate("rota");

    if (!employee) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "No employee found for this user" });
    }

    const rota = await Rota.findOne({
      venue: employee.venue._id,
      weekStarting,
    });

    if (!rota) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Rota not found" });
    }

    console.log("Rota found:", rota);

    if (!rota.published) {
      return res
        .status(StatusCodes.OK)
        .json({ message: "This rota is not published yet" });
    }

    res.status(StatusCodes.OK).json({ rota });
  } catch (error) {
    console.error("Error fetching rotas:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Server error" });
  }
};

//toDo , there is no venue id , needs to find by userid
const getArchivedRotasbyVenueId = async (req, res) => {
  const { venueId } = req.body;
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
  const { venueId, weekStarting } = req.body;
  //console.log("VenueId:", venueId, "WeekStarting:", weekStarting);

  try {
    const rota = await Rota.findOne({ venue: venueId, weekStarting });

    if (!rota) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Rota not found" });
    }
    if (rota.archived === true) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Rota is archived" });
    }

    res.status(StatusCodes.OK).json({ rota });
  } catch (error) {
    console.error("Error fetching rota:", error);
    res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid venue ID" });
  }
};

const generateNewRota = async (req, res) => {
  const { venueId, weekStarting } = req.body;
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
  const { id: rotaId } = req.params;
  const { newRota } = req.body;

  try {
    const rota = await Rota.findById(rotaId);
    console.log("hhdh", rota);

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

      console.log(newEmployeeRota);

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
  const { id: rotaId } = req.params;
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
