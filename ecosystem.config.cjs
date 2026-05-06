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
    // ROADMAP 4.0 TB3.3 — weekly accuracy report. Mondays 09:00 UTC.
    {
      name: 'recommender-weekly',
      cwd: './backend',
      script: 'node_modules/.bin/ts-node',
      args: '-r tsconfig-paths/register scripts/recommender/weeklyReport.ts',
      autorestart: false,
      cron_restart: '0 9 * * 1',
      watch: false,
      env: { NODE_ENV: 'production' },
      error_file: '../logs/pm2-recommender-error.log',
      out_file: '../logs/pm2-recommender-out.log',
      time: true,
    },
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
    // Tier M1 — observation feeds. Mondays 04:00 UTC (competitor releases
    // weekly), the recipe-gap audit + food-media trends pieces are monthly
    // but cheap, so we let them run weekly too — last run wins per file.
    {
      name: 'self-improvement-feeds',
      cwd: './backend',
      script: 'node_modules/.bin/ts-node',
      args: '-r tsconfig-paths/register scripts/selfImprovement/runFeeds.ts',
      autorestart: false,
      cron_restart: '0 4 * * 1',
      watch: false,
      env: { NODE_ENV: 'production' },
      error_file: '../logs/pm2-self-improvement-error.log',
      out_file: '../logs/pm2-self-improvement-out.log',
      time: true,
    },
    // Tier M2 — weekly synthesis (Sonnet). Sundays 06:00 UTC, after Friday's
    // observations land.
    {
      name: 'self-improvement-synthesis',
      cwd: './backend',
      script: 'node_modules/.bin/ts-node',
      args: '-r tsconfig-paths/register scripts/selfImprovement/runSynthesis.ts',
      autorestart: false,
      cron_restart: '0 6 * * 0',
      watch: false,
      env: { NODE_ENV: 'production' },
      error_file: '../logs/pm2-self-improvement-error.log',
      out_file: '../logs/pm2-self-improvement-out.log',
      time: true,
    },
    // Tier M5 — monthly measurement loop. 1st of each month at 05:00 UTC.
    {
      name: 'self-improvement-measurement',
      cwd: './backend',
      script: 'node_modules/.bin/ts-node',
      args: '-r tsconfig-paths/register scripts/selfImprovement/runMeasurement.ts',
      autorestart: false,
      cron_restart: '0 5 1 * *',
      watch: false,
      env: { NODE_ENV: 'production' },
      error_file: '../logs/pm2-self-improvement-error.log',
      out_file: '../logs/pm2-self-improvement-out.log',
      time: true,
    },
  ],
};
