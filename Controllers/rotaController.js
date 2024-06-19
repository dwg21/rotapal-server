const Rota = require("../Models/Rota");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

const getRotaById = async (req, res) => {
  const { id } = req.params;
  console.log(id);

  //in rota where there is an id populatw will return that data
  try {
    const rota = await Rota.findById(id);
    //   .populate("shifts.employee")
    //   .populate("venue");

    if (!rota) {
      throw new CustomError.NotFoundError("Rota not found");
    }

    res.status(StatusCodes.OK).json({ rota });
  } catch (error) {
    if (error.kind === "ObjectId") {
      // Handle invalid ObjectId error
      throw new CustomError.BadRequestError("Invalid rota ID");
    }
    throw error;
  }
};

const updateRotaInfo = async (req, res) => {
  const { id: rotaId } = req.params;
  const { newRota } = req.body;

  try {
    // Find the rota by ID and ensure it belongs to the current admin user
    const rota = await Rota.findById(rotaId);

    if (!rota) {
      throw new CustomError.NotFoundError(`No rota with id: ${rotaId}`);
    }

    rota.rotaData = newRota;
    // Save the updated rota document
    await rota.save();

    res.status(StatusCodes.OK).json({ rota });
  } catch (error) {
    console.error("Error updating rota info:", error);
    throw new CustomError.BadRequestError("Could not update rota info", error);
  }
};

const publishRota = async (req, res) => {
  const { id: rotaId } = req.params;
  const { isPublished } = req.body;

  try {
    // Find the rota by ID and ensure it belongs to the current admin user
    const rota = await Rota.findById(rotaId);

    if (!rota) {
      throw new CustomError.NotFoundError(`No rota with id: ${rotaId}`);
    }

    rota.published = isPublished;
    // Save the updated rota document
    await rota.save();

    res.status(StatusCodes.OK).json({ rota });
  } catch (error) {
    console.error("Error updating rota info:", error);
    throw new CustomError.BadRequestError("Could not update rota info", error);
  }
};

module.exports = {
  getRotaById,
  updateRotaInfo,
  publishRota,
};
