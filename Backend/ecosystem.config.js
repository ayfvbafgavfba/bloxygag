module.exports = {
  apps: [
    {
      name: 'www',
      script: './bin/www',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
      }
    }
  ]
};
