const { startOfWeek, addDays, addWeeks, format } = require("date-fns");

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
      startTime: "09:00",
      endTime: "17:00",
      duration: 8,
    })),
    hourlyWage: employee.hourlyWage,
    employeeName: employee.name,
  }));
};

//todo add date into shedule.

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
