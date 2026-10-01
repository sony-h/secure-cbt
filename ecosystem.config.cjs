/**
 * PM2 Process Management Configuration for Secure CBT Platform
 * 
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 reload ecosystem.config.cjs
 *   pm2 stop ecosystem.config.cjs
 *   pm2 logs
 */

module.exports = {
  apps: [
    {
      name: 'secure-cbt-backend',
      cwd: './apps/backend',
      script: 'dist/main.js',
      instances: 1, // Single instance preserves Socket.io in-memory room & presence maps
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1200M',
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'secure-cbt-dashboard',
      cwd: './apps/dashboard',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1200M',
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};
