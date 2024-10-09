const ShiftSwapRequest = require("../Models/ShiftSwapRequest");
const Rota = require("../Models/Rota");
const { StatusCodes } = require("http-status-codes");
const Notification = require("../Models/Notification");
const User = require("../Models/User");
const Business = require("../Models/Business");

const sendShiftSwapRequest = async (req, res) => {
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

    // Check if the shift dates are in the future
    const currentDate = new Date();
    const fromShiftDate = new Date(fromShiftData.date);
    const toShiftDate = new Date(toShiftData.date);

    if (fromShiftDate <= currentDate || toShiftDate <= currentDate) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Shifts must be in the future" });
    }

    const detailedMessage = `${fromEmployee.employeeName} wants to swap their shift on ${fromShiftData.date} (${fromShiftData.shiftData.startTime} - ${fromShiftData.shiftData.endTime}) with ${toEmployee.employeeName}'s shift on ${toShiftData.date} (${toShiftData.shiftData.startTime} - ${toShiftData.shiftData.endTime})`;

    // Create a shift swap request with the detailed message
    const shiftSwapRequest = new ShiftSwapRequest({
      fromShiftId,
      toShiftId,
      fromEmployeeId: fromEmployee.employee,
      toEmployeeId: toEmployee.employee,
      rotaId: rota._id,
      venueId: venueId,
      message: detailedMessage,
      businessId: req.user.business,
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
};

//Plan
// Account owner can see all of the requests
// Rota Admins see requests relvnat to their rota
// check user , if admin respond with relevant
//ToDo add admin part

//Returns any request that have been approved by employee
const getPendingRequests = async (req, res) => {
  const { userId, business } = req.user;

  const { venueId } = req.query;

  try {
    const user = await User.findById(userId);

    // Check if user exists
    if (!user) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "No user supplied" }); // Return to stop further execution
    }

    if (user.role !== "AccountOwner") {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "User is not accountOwner" }); // Return to stop further execution
    }

    const requests = await ShiftSwapRequest.find({
      status: "AdminPending",
      businessId: business,
    }).populate("fromEmployeeId toEmployeeId rotaId");

    console.log("request", requests);

    res.status(StatusCodes.OK).json(requests);
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "An error occurred", error });
  }
};

const employeeAproveShiftSwap = async (req, res) => {
  // Fetch the shift swap request
  const { requestId } = req.params;
  const request = await ShiftSwapRequest.findById(requestId);

  if (!request) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Shift swap request not found" });
  }

  request.status = "AdminPending";

  request.save();
  res
    .status(StatusCodes.OK)
    .json({ message: "Shift swap approved by employee", request });
};

const approveShiftSwap = async (req, res) => {
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

    const fromShiftIndex = fromEmployee.schedule.findIndex((shift) =>
      shift._id.equals(request.fromShiftId)
    );
    const toShiftIndex = toEmployee.schedule.findIndex((shift) =>
      shift._id.equals(request.toShiftId)
    );

    if (fromShiftIndex === -1 || toShiftIndex === -1) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Shifts not found in the employee schedules" });
    }

    const fromShift = fromEmployee.schedule[fromShiftIndex];
    const toShift = toEmployee.schedule[toShiftIndex];

    if (fromShift.holidayBooked || toShift.holidayBooked) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Can not swap booked holidays" });
    }

    // Swap the shifts
    const tempShiftData = { ...fromShift.shiftData };
    fromShift.shiftData = { ...toShift.shiftData };
    toShift.shiftData = { ...tempShiftData };

    await rota.save();

    // Update the shift swap request status
    request.status = "Approved";
    await request.save();

    // Create and send notifications
    const fromMessage = `Your shift on ${fromShift.date} (${fromShift.shiftData.startTime} - ${fromShift.shiftData.endTime}) has been swapped with ${toEmployee.employeeName}'s shift on ${toShift.date} (${toShift.shiftData.startTime} - ${toShift.shiftData.endTime}).`;
    const toMessage = `Your shift on ${toShift.date} (${toShift.shiftData.startTime} - ${toShift.shiftData.endTime}) has been swapped with ${fromEmployee.employeeName}'s shift on ${fromShift.date} (${fromShift.shiftData.startTime} - ${fromShift.shiftData.endTime}).`;
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
};

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

const getEmployeeRequests = async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await User.findById(userId);

    // Find requests where the user is the toEmployeeId with status "EmployeePending"
    const incomingRequests = await ShiftSwapRequest.find({
      toEmployeeId: user._id,
      status: "EmployeePending",
    }).populate("fromEmployeeId toEmployeeId rotaId");

    // Find requests where the user is the fromEmployeeId
    const sentRequests = await ShiftSwapRequest.find({
      fromEmployeeId: user._id,
    }).populate("fromEmployeeId toEmployeeId rotaId");

    if (!incomingRequests && !sentRequests) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Shift swap requests not found" });
    }

    // Return the results as separate objects
    res.status(StatusCodes.OK).json({
      incomingRequests,
      sentRequests,
    });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "An error occurred", error });
  }
};

module.exports = {
  sendShiftSwapRequest,
  getPendingRequests,
  approveShiftSwap,
  declineShiftSwap,
  getEmployeeRequests,
  employeeAproveShiftSwap,
};
