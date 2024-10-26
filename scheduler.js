const cron = require("node-cron");
const Rota = require("./Models/Rota"); // Adjust the path as needed
const Venue = require("./Models/Venue"); // Adjust the path as needed
const { generateWeeks, createRota } = require("./utils/rotaUtils"); // Ensure these utility functions are available
const { startOfWeek, isBefore, parseISO } = require("date-fns");
// Function to check and create new rotas
const checkAndCreateRotas = async () => {
  try {
    const venues = await Venue.find();

    for (const venue of venues) {
      const now = new Date();
      const rotas = await Rota.find({ venue: venue._id }).sort("weekStarting");

      const upcomingRotas = rotas.filter(
        (rota) => new Date(rota.weekStarting) >= now
      );

      if (upcomingRotas.length < 4) {
        const missingWeeksCount = 4 - upcomingRotas.length;
        const latestRotaDate =
          upcomingRotas.length > 0
            ? new Date(upcomingRotas[upcomingRotas.length - 1].weekStarting)
            : new Date();

        const weeks = generateWeeks(latestRotaDate, missingWeeksCount);
        const rotaPromises = weeks.map(async ({ startDate, days }) => {
          const weekRotaData = createRota(venue.employees, days);

          const newRota = await Rota.create({
            name: `${venue.name} - Week starting ${startDate}`,
            weekStarting: `${startDate}`,
            rotaData: weekRotaData,
            venue: venue._id,
            employees: venue.employees,
          });

          return newRota._id;
        });

        const rotaIds = await Promise.all(rotaPromises);

        // Update the venue document with new rota IDs
        venue.rota = [...venue.rota, ...rotaIds];
        await venue.save();
      }
    }
  } catch (error) {
    console.error("Error in scheduled rota creation:", error);
  }
};

const calculateStatistics = (rota) => {
  let totalStaffHours = 0;
  let totalStaffCost = 0;
  let totalHolidayDays = 0;
  let totalHolidayCost = 0;

  rota.rotaData.forEach((data) => {
    const hourlyWage = data.hourlyWage;
    data.schedule.forEach((shift) => {
      const startTime = new Date(`1970-01-01T${shift.shiftData.startTime}Z`);
      const endTime = new Date(`1970-01-01T${shift.shiftData.endTime}Z`);

      // Ensure valid start and end times
      if (!isNaN(startTime) && !isNaN(endTime) && startTime < endTime) {
        const hoursWorked = (endTime - startTime) / (1000 * 60 * 60);
        totalStaffHours += hoursWorked;
        totalStaffCost += hoursWorked * hourlyWage;
      }

      if (shift.holidayBooked) {
        totalHolidayDays += 1;
        totalHolidayCost += 8 * hourlyWage; // 8 hours per holiday day
      }
    });
  });

  // Handle cases where calculations might result in NaN
  totalStaffHours = isNaN(totalStaffHours) ? 0 : totalStaffHours;
  totalStaffCost = isNaN(totalStaffCost) ? 0 : totalStaffCost;
  totalHolidayDays = isNaN(totalHolidayDays) ? 0 : totalHolidayDays;
  totalHolidayCost = isNaN(totalHolidayCost) ? 0 : totalHolidayCost;

  return {
    totalStaffHours,
    totalStaffCost,
    totalHolidayDays,
    totalHolidayCost,
  };
};

const updateVenueStatistics = async (rota) => {
  const weekStarting = startOfWeek(new Date(rota.weekStarting), {
    weekStartsOn: 1,
  });

  // Check if statistics for this week already exist in the venue
  const venue = await Venue.findById(rota.venue);

  // Check if statistics for this week already exist in the venue
  const existingStat = venue.statistics.find(
    (stat) => stat.weekStarting.getTime() === weekStarting.getTime()
  );

  // If statistics for this week are already present, don't add them again
  if (existingStat) {
    return;
  }

  const stats = calculateStatistics(rota);

  await Venue.updateMany(
    { rota: rota._id },
    {
      $push: {
        statistics: {
          weekStarting,
          totalStaffHours: stats.totalStaffHours,
          totalStaffCost: stats.totalStaffCost,
          totalHolidayDays: stats.totalHolidayDays,
          totalHolidayCost: stats.totalHolidayCost,
        },
      },
    }
  );
};

const checkRotasExpired = async () => {
  try {
    const rotas = await Rota.find();

    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

    for (const rota of rotas) {
      let rotaWeekStart = new Date(rota.weekStarting);

      if (rotaWeekStart < currentWeekStart) {
        // Set rota.archived to true
        rota.archived = true;
        await rota.save();

        // Update statistics for the venue
        await updateVenueStatistics(rota);
      }
    }
  } catch (err) {
    console.log(err);
  }
};

// Schedule the task to run daily at midnight
//cron.schedule("0 0 * * *", checkAndCreateRotas);

//for testinng
// Schedule the task to run every minute for testing purposes

//cron.schedule("* * * * *", checkAndCreateRotas);
//cron.schedule("0 0 * * *", checkRotasExpired);

// Export the function to use it in your server file
module.exports = { checkAndCreateRotas, checkRotasExpired };
