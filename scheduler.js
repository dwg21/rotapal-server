const cron = require("node-cron");
const Rota = require("./Models/Rota");
const Venue = require("./Models/Venue");
const Business = require("./Models/Business");

const { generateWeeks, createRota } = require("./utils/rotaUtils"); // Ensure these utility functions are available
const { startOfWeek, isBefore, parseISO } = require("date-fns");
const calculateStatistics = require("./utils/statisticsUtils");

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

//Temprrary for checking changes made to stats is correct

// const updateArchivedVenueStatistics = async () => {
//   try {
//     console.log("Starting to update archived venue statistics...");

//     // Find all archived rotas
//     const archivedRotas = await Rota.find({ archived: true });
//     console.log(`Found ${archivedRotas.length} archived rotas.`);

//     for (const rota of archivedRotas) {
//       console.log(`Processing rota: ${rota._id}`);

//       // Get the venue for this rota
//       const venue = await Venue.findById(rota.venue);
//       if (!venue) {
//         console.error(`Missing venue for rota ${rota._id}`);
//         continue; // Skip if the venue is not found
//       }
//       console.log(`Found venue: ${venue.name} (ID: ${venue._id})`);

//       // Find the associated business using the venue's business ID
//       const business = await Business.findById(venue.business);
//       if (!business) {
//         console.error(`Missing business for venue ${venue._id}`);
//         continue; // Skip if the business is not found
//       }
//       console.log(`Found business: ${business.name} (ID: ${business._id})`);

//       // Ensure venueStatistics is initialized
//       if (!business.venueStatistics) {
//         business.venueStatistics = new Map();
//       }

//       // Iterate over venue statistics and copy them to the business model
//       for (const stat of venue.statistics) {
//         const statsRef = stat._id; // Get the ObjectId of the statistics

//         // Check if this venue's ID is already a key in the business's venueStatistics Map
//         if (!business.venueStatistics.has(venue._id.toString())) {
//           console.log(
//             `Creating entry for venue ${venue._id} in business ${business._id}.`
//           );

//           // Initialize a new entry for this venue in the Map
//           business.venueStatistics.set(venue._id.toString(), []);
//         }

//         // Push the statistics reference into the corresponding venue's entry
//         business.venueStatistics.get(venue._id.toString()).push(statsRef);
//         console.log(
//           `Added statistics reference ${statsRef} for venue ${venue._id}.`
//         );
//       }

//       await business.save(); // Save the business document
//       console.log(`Saved updated statistics for business ${business._id}.`);
//     }

//     console.log("Finished updating archived venue statistics.");
//   } catch (error) {
//     console.error("Error updating archived venue statistics:", error);
//   }
// };

//cron.schedule("* * * * *", updateArchivedVenueStatistics);

// Schedule the task to run daily at midnight
//cron.schedule("0 0 * * *", checkAndCreateRotas);

//for testinng
// Schedule the task to run every minute for testing purposes

//cron.schedule("* * * * *", checkAndCreateRotas);
//cron.schedule("0 0 * * *", checkRotasExpired);

// Export the function to use it in your server file
module.exports = {
  checkAndCreateRotas,
  checkRotasExpired,
};
