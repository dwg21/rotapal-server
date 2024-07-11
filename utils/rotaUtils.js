const { startOfWeek, addDays, addWeeks, format } = require("date-fns");
const Holiday = require("../Models/Holiday");

// Function to generate weeks for the next 4 weeks starting from the Monday of the current week
// const generateWeeks = () => {
//   const weeks = [];
//   const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
//   for (let i = 0; i < 4; i++) {
//     const week = [];
//     for (let j = 0; j < 7; j++) {
//       week.push(format(addDays(addWeeks(startDate, i), j), "yyyy-MM-dd"));
//     }
//     weeks.push(week);
//   }
//   return weeks;
// };

//Function to create a rota for a given list of employees
const createRota = (employees, weekData) => {
  return employees.map((employee) => ({
    employee: employee._id,
    schedule: weekData.map((date) => ({
      date,
      startTime: "",
      endTime: "",
      duration: 8,
      holidayBooked: false,
    })),
    hourlyWage: employee.hourlyWage,
    employeeName: employee.name,
  }));
};

// const createRota = async (employees, weekData) => {
//   const rotaData = [];

//   for (const employee of employees) {
//     // Fetch holidays for the current employee within the weekData range
//     const holidays = await Holiday.find({
//       user: employee.userId,
//       date: { $in: weekData },
//     });
//     // Extract dates of the holidays
//     const holidayDates = holidays.map((holiday) => holiday.date);

//     const schedule = weekData.map((date) => {
//       if (holidayDates.includes(date)) {
//         // If the date is a holiday, mark it as a holiday
//         return {
//           date,
//           startTime: null,
//           endTime: null,
//           duration: 0,
//           label: "Holiday",
//           holidayBooked: true,
//         };
//       }
//       // Otherwise, use the default work schedule
//       return {
//         date,
//         startTime: "09:00",
//         endTime: "17:00",
//         duration: 8,
//         holidayBooked: false,
//       };
//     });

//     rotaData.push({
//       employee: employee._id,
//       schedule,
//       hourlyWage: employee.hourlyWage,
//       employeeName: employee.name,
//     });
//   }

//   return rotaData;
// };

//attempt 3

const generateWeeks = () => {
  const weeks = [];
  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
  for (let i = 0; i < 4; i++) {
    const week = [];
    for (let j = 0; j < 7; j++) {
      week.push(format(addDays(addWeeks(startDate, i), j), "yyyy-MM-dd"));
    }
    weeks.push({ startDate: week[0], days: week });
  }
  return weeks;
};

// const createRota = (employees, weekData) => {
//   console.log(employees, weekData);
//   return employees.map((employee) => ({
//     employee: employee._id,
//     schedule: weekData.map((date) => [
//       { date, startTime: "09:00", endTime: "17:00", duration: 8 },
//       { date, startTime: "09:00", endTime: "17:00", duration: 8 },
//       { date, startTime: "09:00", endTime: "17:00", duration: 8 },
//       { date, startTime: "09:00", endTime: "17:00", duration: 8 },
//       { date, startTime: "09:00", endTime: "17:00", duration: 8 },
//       { date, startTime: "", endTime: "", duration: 0 },
//       { date, startTime: "", endTime: "", duration: 0 },
//     ]),
//     hourlyWage: employee.hourlyWage,
//     employeeName: employee.name,
//   }));
// };

module.exports = {
  createRota,
  generateWeeks,
};
