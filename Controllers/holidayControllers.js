const Holiday = require("../Models/Holiday");
const Rota = require("../Models/Rota");
const { StatusCodes } = require("http-status-codes");
const Employee = require("../Models/Employee");
const CustomError = require("../errors");
const { startOfWeek, format } = require("date-fns");

//toDo find employeeId with user id
//fucntion to update any exisiting rotas with holiday
const updateExistingRotas = async ({ userId, holidayDate }) => {
  const employee = await Employee.findOne({ userId });

  // Calculate the start of the week for the given holidayDate
  const startOfWeekDate = startOfWeek(new Date(holidayDate), {
    weekStartsOn: 1,
  }); // Assuming week starts on Monday
  const formattedStartOfWeek = format(startOfWeekDate, "yyyy-MM-dd");
  console.log("startOfWeek", formattedStartOfWeek);

  const rotas = await Rota.find({
    weekStarting: formattedStartOfWeek,
    "rotaData.employee": employee._id,
  });

  for (const rota of rotas) {
    rota.rotaData.forEach((rotaEntry) => {
      if (rotaEntry.employee.equals(employee._id)) {
        console.log("employees rota found", rotaEntry);
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

const bookHoliday = async (req, res) => {
  const { date } = req.body;
  const { userId } = req.user;
  console.log(date, userId);

  try {
    const holidayDate = new Date(date);
    const currentDate = new Date();

    // Check if the holiday date is in the future
    if (holidayDate <= currentDate) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: "Holiday date must be in the future",
      });
    }

    // Check if holiday already exists for this user and date
    const existingHoliday = await Holiday.findOne({ user: userId, date });
    if (existingHoliday) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: "Holiday already booked for this date",
      });
    }

    // Create the new holiday
    const newHoliday = await Holiday.create({ user: userId, date });

    // Update existing rotas
    await updateExistingRotas({ userId, holidayDate: date });

    res.status(StatusCodes.CREATED).json({ holiday: newHoliday });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

module.exports = { bookHoliday };
