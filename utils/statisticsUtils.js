const calculateStatistics = (rota) => {
  let totalStaffHours = 0;
  let totalStaffCost = 0;
  let totalHolidayDays = 0;
  let totalHolidayCost = 0;

  rota.rotaData.forEach((data) => {
    const { hourlyWage, schedule } = data;

    schedule.forEach((shift) => {
      const startTime = new Date(`1970-01-01T${shift.shiftData.startTime}Z`);
      const endTime = new Date(`1970-01-01T${shift.shiftData.endTime}Z`);

      if (!isNaN(startTime) && !isNaN(endTime) && startTime < endTime) {
        const hoursWorked = (endTime - startTime) / (1000 * 60 * 60);
        totalStaffHours += hoursWorked;
        totalStaffCost += hoursWorked * hourlyWage;
      }

      if (shift.holidayBooked) {
        totalHolidayDays += 1;
        totalHolidayCost += 8 * hourlyWage; // Assuming 8 hours per holiday day
      }
    });
  });

  return {
    totalStaffHours: isNaN(totalStaffHours) ? 0 : totalStaffHours,
    totalStaffCost: isNaN(totalStaffCost) ? 0 : totalStaffCost,
    totalHolidayDays: isNaN(totalHolidayDays) ? 0 : totalHolidayDays,
    totalHolidayCost: isNaN(totalHolidayCost) ? 0 : totalHolidayCost,
  };
};

module.exports = calculateStatistics;
