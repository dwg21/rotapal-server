const Holiday = require("../Models/Holiday");
const Rota = require("../Models/Rota");
const Notification = require("../Models/Notification");
const User = require("../Models/User"); // Import User model
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const { startOfWeek, format } = require("date-fns");

// Function to update any existing rotas with holiday
const updateExistingRotas = async ({ userId, holidayDate }) => {
  const user = await User.findById(userId);

  // Calculate the start of the week for the given holidayDate
  const startOfWeekDate = startOfWeek(new Date(holidayDate), {
    weekStartsOn: 1,
  }); // Assuming week starts on Monday
  const formattedStartOfWeek = format(startOfWeekDate, "yyyy-MM-dd");
  console.log("startOfWeek", formattedStartOfWeek);

  const rotas = await Rota.find({
    weekStarting: formattedStartOfWeek,
    "rotaData.employee": user._id,
  });

  for (const rota of rotas) {
    rota.rotaData.forEach((rotaEntry) => {
      if (rotaEntry.employee.equals(user._id)) {
        console.log("user's rota found", rotaEntry);
        rotaEntry.schedule.forEach((scheduleEntry) => {
          if (scheduleEntry.date === holidayDate) {
            console.log("bingo");
            scheduleEntry.shiftData.startTime = null;
            scheduleEntry.shiftData.endTime = null;
            scheduleEntry.shiftData.duration = 0;
            scheduleEntry.shiftData.label = "Holiday";
            scheduleEntry.holidayBooked = true;
          }
        });
      }
    });
    await rota.save();
  }
};

const createHolidayRequest = async (req, res) => {
  const { date, venueId } = req.body; // Including venueId in the request
  const { userId } = req.user;

  console.log("venueId", venueId);

  try {
    const holidayDate = new Date(date);
    const currentDate = new Date();

    // Check if the holiday date is in the future
    if (holidayDate <= currentDate) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: "Holiday date must be in the future",
      });
    }

    // Check if a holiday already exists for this user and date
    const existingHoliday = await Holiday.findOne({ user: userId, date });
    if (existingHoliday) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: "Holiday already requested for this date",
      });
    }

    // Create the holiday request with status 'Pending'
    const newHoliday = await Holiday.create({
      user: userId,
      venueId,
      date,
      status: "Pending",
    });

    // Notify user that their request has been sent for approval
    const notificationMessage = `Your holiday request for ${date} has been sent to the venue admin for approval.`;
    const notificationLink = `/user/holidays`; // Adjust the link as needed
    const notificationType = "system";
    const senderId = null; // System or admin
    const recipientId = userId;

    await Notification.create({
      message: notificationMessage,
      link: notificationLink,
      notifyType: notificationType,
      senderId,
      recipientId,
    });

    res.status(StatusCodes.CREATED).json({ holiday: newHoliday });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const approveHoliday = async (req, res) => {
  const { holidayId } = req.params; // Assuming holidayId is passed as a URL parameter

  try {
    // Find the holiday by ID
    const holiday = await Holiday.findById(holidayId);
    if (!holiday) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: "Holiday not found",
      });
    }

    // Update the holiday status to 'Approved'
    holiday.status = "Approved";
    await holiday.save();

    // Update existing rotas
    await updateExistingRotas({
      userId: holiday.user,
      holidayDate: holiday.date,
    });

    // Notify user that their request has been approved
    const notificationMessage = `Your holiday request for ${holiday.date} has been approved.`;
    const notificationLink = `/user/holidays`; // Adjust the link as needed
    const notificationType = "system";
    const senderId = req.user._id; // Assuming admin user ID
    const recipientId = holiday.user;

    await Notification.create({
      message: notificationMessage,
      link: notificationLink,
      notifyType: notificationType,
      senderId,
      recipientId,
    });

    res.status(StatusCodes.OK).json({ message: "Holiday approved", holiday });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const getUserPendingHolidays = async (req, res) => {
  const { userId } = req.params; // Assuming userId is passed as a URL parameter

  try {
    // Fetch all pending holidays for the given userId
    const pendingHolidays = await Holiday.find({
      user: userId,
      status: "Pending",
    }).populate("user", "name email");

    // Check if there are any pending holidays
    if (pendingHolidays.length === 0) {
      return res.status(StatusCodes.OK).json({
        message: "No pending holidays found for this user",
        holidays: [],
      });
    }

    // Return the list of pending holidays
    res.status(StatusCodes.OK).json({ holidays: pendingHolidays });
  } catch (error) {
    console.error("Error fetching pending holidays:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const getVenueHolidays = async (req, res) => {
  const { venueId } = req.params; // Assuming venueId is passed as a URL parameter

  try {
    // Fetch all holidays for the given venueId
    const venueHolidays = await Holiday.find({
      venueId: venueId,
      status: "Pending",
    }).populate("user", "name email");

    // Check if there are any holidays for the venue
    if (venueHolidays.length === 0) {
      return res.status(StatusCodes.OK).json({
        message: "No holidays found for this venue",
        holidays: [],
      });
    }

    // Return the list of holidays
    res.status(StatusCodes.OK).json({ holidays: venueHolidays });
  } catch (error) {
    console.error("Error fetching holidays for venue:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const declineHoliday = async (req, res) => {
  const { requestId } = req.params;

  try {
    const holiday = await Holiday.findById(requestId);
    if (!holiday) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "Holiday request not found" });
    }

    // Decline the holiday request
    holiday.status = "Declined"; // Ensure status value is consistent
    await holiday.save();

    // Notify user that their request has been declined
    const notificationMessage = `Your holiday request for ${holiday.date} has been declined.`;
    const notificationLink = `/user/holidays`; // Adjust the link as needed
    const notificationType = "system";
    const senderId = req.user._id; // Assuming admin user ID
    const recipientId = holiday.user;

    await Notification.create({
      message: notificationMessage,
      link: notificationLink,
      notifyType: notificationType,
      senderId,
      recipientId,
    });

    res.status(StatusCodes.OK).json({ message: "Holiday request declined" });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

module.exports = {
  createHolidayRequest,
  approveHoliday,
  getUserPendingHolidays,
  getVenueHolidays,
  declineHoliday,
};
