module.exports = {
  apps: [
    {
      name: 'timesheet-backend',
      script: 'src/index.js',
      cwd: './backend',

      // Restart policy
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      restart_delay: 2000,
      max_restarts: 10,

      // Environment
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // Logging
      out_file: './logs/backend-out.log',
      error_file: './logs/backend-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
