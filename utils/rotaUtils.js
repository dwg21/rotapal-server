const { startOfWeek, addDays, addWeeks, format } = require("date-fns");

// Function to generate weeks for the next 4 weeks starting from the Monday of the current week
const generateWeeks = () => {
  const weeks = [];
  let startDate = startOfWeek(new Date(), { weekStartsOn: 1 }); // Start from the current week's Monday

  for (let i = 0; i < 4; i++) {
    const week = [];
    for (let j = 0; j < 7; j++) {
      week.push(format(addDays(startDate, j), "yyyy-MM-dd"));
    }
    const weekStartDate = format(startDate, "yyyy-MM-dd");
    weeks.push({ startDate: weekStartDate, days: week });
    startDate = addWeeks(startDate, 1); // Move to the next week's Monday
  }

  return weeks;
};

//Function to create a rota for a given list of employees
const createRota = (employees, weekData) => {
  return employees.map((employee) => ({
    employee: employee._id,
    schedule: weekData.map(() => [
      { startTime: "09:00", endTime: "17:00", duration: 8 },
      { startTime: "09:00", endTime: "17:00", duration: 8 },
      { startTime: "09:00", endTime: "17:00", duration: 8 },
      { startTime: "09:00", endTime: "17:00", duration: 8 },
      { startTime: "09:00", endTime: "17:00", duration: 8 },
      { startTime: "", endTime: "", duration: 0 },
      { startTime: "", endTime: "", duration: 0 },
    ]),
    hourlyWage: employee.hourlyWage,
    employeeName: employee.name,
  }));
};

//todo add date into shedule.

// const createRota = (employees) => {
//   console.log(employees);
//   return employees.map((employee) => ({
//     employee: employee._id,
//     schedule: [
//       { startTime: "09:00", endTime: "17:00", duration: 8 },
//       { startTime: "09:00", endTime: "17:00", duration: 8 },
//       { startTime: "09:00", endTime: "17:00", duration: 8 },
//       { startTime: "09:00", endTime: "17:00", duration: 8 },
//       { startTime: "09:00", endTime: "17:00", duration: 8 },
//       { startTime: "", endTime: "", duration: 0 },
//       { startTime: "", endTime: "", duration: 0 },
//     ],
//     hourlyWage: employee.hourlyWage,
//     employeeName: employee.name,
//   }));
// };

// const createRota = (employees) => {
//   const weeks = generateWeeks();
//   return employees.map((employee) => ({
//     employee: employee._id, // Assuming employee._id exists
//     schedule: weeks.map(() => ({
//       startTime: "09:00",
//       endTime: "17:00",
//       duration: 8,
//     })),
//     hourlyWage: employee.hourlyWage,
//   }));
// };

module.exports = {
  createRota,
  generateWeeks,
};
