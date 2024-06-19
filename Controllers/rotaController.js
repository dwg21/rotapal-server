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

    //todo use middleware for this
    // Check if the current user is authorized to update this rota
    // if (rota.createdBy.toString() !== req.user.userId.toString()) {
    //   throw new CustomError.UnauthorizedError(
    //     "You are not authorized to update this rota"
    //   );
    // }

    //console.log("data input", newRota[0].schedule);

    // Update the rota object with new data
    //rota.markModified("shifts"); // Example: markModified for nested array 'shifts'

    console.log(newRota);
    rota.rotaData = newRota;
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
};
