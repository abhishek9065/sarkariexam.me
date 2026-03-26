const path = require('path');

module.exports = {
  apps: [
    {
      name: 'frontend-v2',
      cwd: path.join(__dirname, 'frontend-v2'),
      script: 'npm',
      args: 'start',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
        HOSTNAME: process.env.HOSTNAME || '0.0.0.0',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      time: true,
    },
  ],
};
