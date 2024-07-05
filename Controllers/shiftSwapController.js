const ShiftSwapRequest = require("../Models/ShiftSwapRequest");
const Rota = require("../Models/Rota");
const { StatusCodes } = require("http-status-codes");
const Notification = require("../Models/Notification");

async function getPendingRequests(req, res) {
  console.log("hellp");
  try {
    const { venueId } = req.query;
    console.log(venueId);

    const requests = await ShiftSwapRequest.find({
      status: "Pending",
      venueId,
    }).populate("fromEmployeeId toEmployeeId rotaId");
    res.status(StatusCodes.OK).json(requests);
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "An error occurred", error });
  }
}

// async function getPendingRequests(req, res) {
//   try {
//     const { venueId } = req.query;

//     const requests = await ShiftSwapRequest.find({ status: "Pending", venueId })
//       .populate("fromEmployeeId toEmployeeId rotaId")
//       .lean();

//     const detailedRequests = requests.map((request) => {
//       const fromEmployee = request.rotaId.rotaData.find((employee) =>
//         employee.schedule.some((shift) => shift._id.equals(request.fromShiftId))
//       );

//       const toEmployee = request.rotaId.rotaData.find((employee) =>
//         employee.schedule.some((shift) => shift._id.equals(request.toShiftId))
//       );

//       const fromShift = fromEmployee.schedule.find((shift) =>
//         shift._id.equals(request.fromShiftId)
//       );
//       const toShift = toEmployee.schedule.find((shift) =>
//         shift._id.equals(request.toShiftId)
//       );

//       return {
//         ...request,
//         fromShiftDetails: {
//           date: fromShift.date,
//           startTime: fromShift.startTime,
//           endTime: fromShift.endTime,
//           duration: fromShift.duration,
//           label: fromShift.label,
//         },
//         toShiftDetails: {
//           date: toShift.date,
//           startTime: toShift.startTime,
//           endTime: toShift.endTime,
//           duration: toShift.duration,
//           label: toShift.label,
//         },
//       };
//     });

//     res.status(StatusCodes.OK).json(detailedRequests);
//   } catch (error) {
//     console.error(error);
//     res
//       .status(StatusCodes.INTERNAL_SERVER_ERROR)
//       .json({ message: "An error occurred", error });
//   }
// }

async function approveShiftSwap(req, res) {
  try {
    const { requestId } = req.params;

    // Fetch the shift swap request
    const request = await ShiftSwapRequest.findById(requestId);

    if (!request) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Shift swap request not found" });
    }

    console.log("Shift swap request found:", request);
    console.log("Type of request.rotaId:", typeof request.rotaId);
    console.log("Looking for Rota with ID:", request.rotaId);

    // Fetch the rota
    const rota = await Rota.findById(request.rotaId);

    if (!rota) {
      console.log("No Rota found with ID:", request.rotaId);
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Rota not found" });
    }

    console.log("Found Rota:", rota);

    // Find the employees and their shifts
    const fromEmployee = rota.rotaData.find((employee) =>
      employee.schedule.some((shift) => shift._id.equals(request.fromShiftId))
    );

    const toEmployee = rota.rotaData.find((employee) =>
      employee.schedule.some((shift) => shift._id.equals(request.toShiftId))
    );

    if (!fromEmployee || !toEmployee) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Shifts not found" });
    }

    const fromShift = fromEmployee.schedule.id(request.fromShiftId);
    const toShift = toEmployee.schedule.id(request.toShiftId);

    // Swap the shifts
    [fromShift.startTime, toShift.startTime] = [
      toShift.startTime,
      fromShift.startTime,
    ];
    [fromShift.endTime, toShift.endTime] = [toShift.endTime, fromShift.endTime];
    [fromShift.date, toShift.date] = [toShift.date, fromShift.date];
    [fromShift.label, toShift.label] = [toShift.label, fromShift.label];

    await rota.save();

    // Update the shift swap request status
    request.status = "Approved";
    await request.save();

    // Create and send notifications
    const fromMessage = `Your shift on ${fromShift.date} (${fromShift.startTime} - ${fromShift.endTime}) has been swapped with ${toEmployee.employeeName}'s shift on ${toShift.date} (${toShift.startTime} - ${toShift.endTime}).`;
    const toMessage = `Your shift on ${toShift.date} (${toShift.startTime} - ${toShift.endTime}) has been swapped with ${fromEmployee.employeeName}'s shift on ${fromShift.date} (${fromShift.startTime} - ${fromShift.endTime}).`;
    const link = `/shiftswap/${requestId}`;
    const notifyType = "rota";
    const senderId = null; // System notification

    const notifications = [
      {
        message: fromMessage,
        link,
        notifyType,
        senderId,
        recipientId: request.fromEmployeeId,
      },
      {
        message: toMessage,
        link,
        notifyType,
        senderId,
        recipientId: request.toEmployeeId,
      },
    ];

    await Notification.insertMany(notifications);

    res.status(StatusCodes.OK).json({ message: "Shift swap approved", rota });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "An error occurred", error });
  }
}

async function declineShiftSwap(req, res) {
  try {
    const { requestId } = req.params;

    const request = await ShiftSwapRequest.findById(requestId);
    if (!request) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Shift swap request not found" });
    }

    request.status = "Declined";
    await request.save();

    // Create and send notifications
    const fromMessage = `Your shift swap request for the shift on ${request.fromShiftId} has been declined.`;
    const toMessage = `Your shift swap request for the shift on ${request.toShiftId} has been declined.`;
    const link = `/shiftswap/${requestId}`;
    const notifyType = "rota";
    const senderId = null; // System notification

    const notifications = [
      {
        message: fromMessage,
        link,
        notifyType,
        senderId,
        recipientId: request.fromEmployeeId,
      },
      {
        message: toMessage,
        link,
        notifyType,
        senderId,
        recipientId: request.toEmployeeId,
      },
    ];

    await Notification.insertMany(notifications);

    res.status(StatusCodes.OK).json({ message: "Shift swap request declined" });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "An error occurred", error });
  }
}

module.exports = {
  getPendingRequests,
  approveShiftSwap,
  declineShiftSwap,
};
