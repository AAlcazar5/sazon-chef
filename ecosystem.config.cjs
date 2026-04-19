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
  ],
};
