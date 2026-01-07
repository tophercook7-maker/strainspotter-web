/**
 * PM2 Ecosystem Configuration
 * 
 * Manages pipeline processes with auto-restart and monitoring
 */

module.exports = {
  apps: [
    {
      name: 'pipeline-watchdog',
      script: './tools/pipeline_watchdog.mjs',
      cwd: process.cwd(),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/pipeline-watchdog-error.log',
      out_file: './logs/pipeline-watchdog-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Restart delay to avoid rapid restarts
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: 'strain-image-scraper',
      script: './tools/run_image_scraper.mjs',
      cwd: process.cwd(),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/image-scraper-error.log',
      out_file: './logs/image-scraper-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '30s',
      max_restarts: 20,
      restart_delay: 10000,
    },
    {
      name: 'image-fingerprinting',
      script: './tools/image_fingerprinting.mjs',
      cwd: process.cwd(),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/fingerprinting-error.log',
      out_file: './logs/fingerprinting-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '30s',
      max_restarts: 15,
      restart_delay: 10000,
    },
  ],
};
