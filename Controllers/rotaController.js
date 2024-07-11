const Rota = require("../Models/Rota");
const Venue = require("../Models/Venue");
const ShiftSwapRequest = require("../Models/ShiftSwapRequest");
const Notification = require("../Models/Notification");
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

module.exports = { updateRotaInfo };

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

async function swapShifts(req, res) {
  try {
    const { fromShiftId, toShiftId, venueId } = req.body;
    console.log(fromShiftId, toShiftId, venueId);

    // Fetch the rota that contains the shifts
    const rota = await Rota.findOne({
      "rotaData.schedule._id": { $in: [fromShiftId, toShiftId] },
      venue: venueId,
    });

    if (!rota) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Rota not found" });
    }

    // Find the shifts in the rotaData
    const fromEmployee = rota.rotaData.find((employee) =>
      employee.schedule.some((shift) => shift._id.equals(fromShiftId))
    );

    const toEmployee = rota.rotaData.find((employee) =>
      employee.schedule.some((shift) => shift._id.equals(toShiftId))
    );

    if (!fromEmployee || !toEmployee) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Shifts not found" });
    }

    const fromShiftData = fromEmployee.schedule.id(fromShiftId);
    const toShiftData = toEmployee.schedule.id(toShiftId);

    const detailedMessage = `${fromEmployee.employeeName} wants to swap their shift on ${fromShiftData.date} (${fromShiftData.startTime} - ${fromShiftData.endTime}) with ${toEmployee.employeeName}'s shift on ${toShiftData.date} (${toShiftData.startTime} - ${toShiftData.endTime})`;

    // Create a shift swap request with the detailed message
    const shiftSwapRequest = new ShiftSwapRequest({
      fromShiftId,
      toShiftId,
      fromEmployeeId: fromEmployee.employee,
      toEmployeeId: toEmployee.employee,
      rotaId: rota._id,
      venueId: venueId,
      message: detailedMessage,
      status: "Pending",
    });

    await shiftSwapRequest.save();
    console.log(shiftSwapRequest);

    res
      .status(StatusCodes.OK)
      .json({ message: "Shift swap request created", shiftSwapRequest });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "An error occurred", error });
  }
}

module.exports = {
  getRotaById,
  updateRotaInfo,
  publishRota,
  getRotasByEmployeeId,
  getRotaByVenueIdAndDate,
  swapShifts,
};
