const cron = require('node-cron');
const { resetMonthlyAttendance } = require('../controllers/attendenceController');

// Run at midnight on the first day of every month
cron.schedule('0 0 1 * *', async () => {
  console.log('Running monthly attendance reset...');
  try {
    const req = { user: { role: 'admin', id: 1 } };
    const res = {
      json: (data) => console.log('Reset successful:', data),
      status: () => ({ json: () => {} })
    };
    await resetMonthlyAttendance(req, res);
    console.log('Monthly attendance reset completed');
  } catch (error) {
    console.error('Cron job failed:', error);
  }
});