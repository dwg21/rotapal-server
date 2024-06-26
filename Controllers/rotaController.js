const Rota = require("../Models/Rota");
const Venue = require("../Models/Venue");
const Employee = require("../Models/Employee");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

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

const getRotaByVenueIdAndDate = async (req, res) => {
  const { venueId, weekStarting } = req.body;
  console.log("VenueId:", venueId, "WeekStarting:", weekStarting);

  try {
    const rota = await Rota.findOne({ venue: venueId, weekStarting });

    if (!rota) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Rota not found" });
    }

    res.status(StatusCodes.OK).json({ rota });
  } catch (error) {
    console.error("Error fetching rota:", error);
    res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid venue ID" });
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

const updateRotaInfo = async (req, res) => {
  const { id: rotaId } = req.params;
  const { newRota } = req.body;

  try {
    const rota = await Rota.findById(rotaId);

    if (!rota) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: `No rota with id: ${rotaId}` });
    }

    rota.rotaData = newRota;
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
};
