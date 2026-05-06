module.exports = {
  apps: [
    {
      name: 'sazon-backend-3001',
      cwd: './backend',
      script: 'node_modules/.bin/ts-node',
      args: '-r tsconfig-paths/register src/server.ts',
      env: {
        NODE_ENV: 'development',
        PORT: '3001',
      },
      watch: false,
      max_memory_restart: '1G',
      error_file: '../logs/pm2-backend-error.log',
      out_file: '../logs/pm2-backend-out.log',
      time: true,
    },
    // ROADMAP 4.0 TB0.4 — quarterly refresh of Food.com embeddings +
    // catalog alignment. Runs at 03:00 on the 1st of every month;
    // schedule re-evaluated post-launch (move to quarterly once stable).
    // Trigger manually: `pm2 trigger recommender-refresh`.
    {
      name: 'recommender-refresh',
      cwd: './backend',
      script: 'node_modules/.bin/ts-node',
      args: '-r tsconfig-paths/register scripts/recommender/quarterlyRefresh.ts',
      autorestart: false,
      cron_restart: '0 3 1 * *',
      watch: false,
      env: { NODE_ENV: 'production' },
      error_file: '../logs/pm2-recommender-error.log',
      out_file: '../logs/pm2-recommender-out.log',
      time: true,
    },
  ],
};
