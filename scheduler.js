const cron = require("node-cron");
const Rota = require("./Models/Rota"); // Adjust the path as needed
const Venue = require("./Models/Venue"); // Adjust the path as needed
const { generateWeeks, createRota } = require("./utils/rotaUtils"); // Ensure these utility functions are available

// Function to check and create new rotas
const checkAndCreateRotas = async () => {
  console.log("ran");
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

// Schedule the task to run daily at midnight
//cron.schedule("0 0 * * *", checkAndCreateRotas);

//for testinng
// Schedule the task to run every minute for testing purposes
cron.schedule("* * * * *", checkAndCreateRotas);

// Export the function to use it in your server file
module.exports = { checkAndCreateRotas };
