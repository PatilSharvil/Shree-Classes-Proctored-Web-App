const scheduledTaskService = require('./src/services/scheduledTaskService');
const db = require('./src/config/database');

function test() {
  try {
    console.log('Testing scheduledTaskService.start()...');
    scheduledTaskService.start();
    console.log('Scheduled tasks started.');
    // Keep alive for 2 seconds to see if anything crashes
    setTimeout(() => {
        console.log('Test complete.');
        process.exit(0);
    }, 2000);
  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  }
}

test();
