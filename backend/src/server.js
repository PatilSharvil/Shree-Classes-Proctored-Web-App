const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const authService = require('./modules/auth/auth.service');
const scheduledTaskService = require('./services/scheduledTaskService');

const PORT = env.port;

// Create default admin user
authService.createAdminIfNotExists()
  .then(() => {
    // Start scheduled tasks
    scheduledTaskService.start();

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running in ${env.nodeEnv} mode on port ${PORT}`);
      console.log(`
╔══════════════════════════════════════════════════════════╗
║           Proctored Exam System - Backend                ║
╠══════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                          ║
║  Health: http://localhost:${PORT}/health                   ║
║  Mode:   ${env.nodeEnv}                                        ║
╠══════════════════════════════════════════════════════════╣
║  Default Admin:                                          ║
║  Email: ${env.adminEmail.padEnd(42)}║
║  (Change password after first login!)                    ║
╠══════════════════════════════════════════════════════════╣
║  Scheduled Tasks:                                        ║
║  ✓ Exam timeout checks (30s)                             ║
║  ✓ Exam reminders (5m)                                   ║
║  ✓ GitHub sync (5m)                                      ║
║  ✓ Stale session cleanup (1h)                            ║
╚══════════════════════════════════════════════════════════╝
      `);
    });
  })
  .catch((error) => {
    logger.error('Failed to create admin user:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  scheduledTaskService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  scheduledTaskService.stop();
  process.exit(0);
});
