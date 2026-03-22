const authService = require('./src/modules/auth/auth.service');
const db = require('./src/config/database');

async function test() {
  try {
    console.log('Testing createAdminIfNotExists...');
    const admin = await authService.createAdminIfNotExists();
    console.log('Admin user:', admin);
    process.exit(0);
  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  }
}

test();
